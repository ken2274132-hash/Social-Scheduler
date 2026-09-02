<#
.SYNOPSIS
    Dumps the Supabase Postgres database to a timestamped, compressed file in backups/.

.DESCRIPTION
    Supabase Free has no managed backups, so this is the only copy of the data
    and -- since the base schema DDL is not in git -- of most of the schema too.

    Reads the connection string from the SUPABASE_DB_URL environment variable.
    Nothing is read from .env.local, and the connection string is never printed.

.PARAMETER RetentionDays
    Delete dumps older than this many days. Default 14. Use 0 to keep everything.

.PARAMETER OutputDir
    Where to write dumps. Default: the backups/ directory next to this repo's root.

.PARAMETER SchemaOnly
    Dump the schema (DDL) only, no rows. Useful for seeding a staging project --
    see docs/STAGING.md.

.EXAMPLE
    $env:SUPABASE_DB_URL = "postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres"
    .\scripts\backup-db.ps1

.EXAMPLE
    .\scripts\backup-db.ps1 -SchemaOnly -RetentionDays 0
#>

[CmdletBinding()]
param(
    [int]$RetentionDays = 14,
    [string]$OutputDir,
    [switch]$SchemaOnly
)

$ErrorActionPreference = 'Stop'

function Fail($Message) {
    Write-Host ""
    Write-Host "BACKUP FAILED" -ForegroundColor Red
    Write-Host $Message -ForegroundColor Red
    Write-Host ""
    exit 1
}

# --- 1. Connection string -----------------------------------------------------

$dbUrl = $env:SUPABASE_DB_URL
if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    Fail @"
SUPABASE_DB_URL is not set.

Get it from the Supabase dashboard:
  Project Settings -> Database -> Connection string -> URI
Use the DIRECT connection (port 5432). The transaction pooler on port 6543
does not support pg_dump.

Set it for this shell only:
  `$env:SUPABASE_DB_URL = "postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres"

Or persist it for your user account (new shells only, reopen the terminal after):
  [Environment]::SetEnvironmentVariable("SUPABASE_DB_URL", "postgresql://...", "User")
"@
}

# --- 2. pg_dump on PATH -------------------------------------------------------

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Fail @"
pg_dump was not found on PATH.

Install the PostgreSQL client tools (the installer's "Command Line Tools"
component is enough -- you do not need to run a local server):
  https://www.postgresql.org/download/windows/

Then add the bin directory to PATH, e.g.:
  `$env:Path += ";C:\Program Files\PostgreSQL\17\bin"

The pg_dump version must be >= the Supabase server's Postgres version, or it
refuses to run. Supabase is on 15+, so install 16 or newer to be safe.
"@
}

$dumpVersion = (& $pgDump.Source --version) -join ' '
Write-Host "Using $dumpVersion"

# --- 3. Parse the URL so the password never lands on a command line -----------
# Anything passed as a pg_dump argument is visible to other processes in the
# Windows task list. PGPASSWORD is not.

try {
    $uri = [System.Uri]$dbUrl
} catch {
    Fail "SUPABASE_DB_URL is not a valid URI. Expected postgresql://user:password@host:port/database"
}

if ($uri.Scheme -notin @('postgres', 'postgresql')) {
    Fail "SUPABASE_DB_URL must start with postgresql:// (got '$($uri.Scheme)://')."
}

$userInfoParts = $uri.UserInfo -split ':', 2
$dbUser = [System.Uri]::UnescapeDataString($userInfoParts[0])
$dbPass = ''
if ($userInfoParts.Count -gt 1) {
    $dbPass = [System.Uri]::UnescapeDataString($userInfoParts[1])
}
$dbHost = $uri.Host
$dbPort = $uri.Port
if ($dbPort -le 0) { $dbPort = 5432 }
$dbName = $uri.AbsolutePath.TrimStart('/')
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = 'postgres' }

if ([string]::IsNullOrWhiteSpace($dbUser) -or [string]::IsNullOrWhiteSpace($dbHost)) {
    Fail "SUPABASE_DB_URL is missing a username or host. Expected postgresql://user:password@host:port/database"
}

if ($dbPort -eq 6543) {
    Write-Warning "Port 6543 is Supabase's transaction pooler; pg_dump usually fails against it. Use the direct connection on port 5432."
}

# --- 4. Output path -----------------------------------------------------------

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $OutputDir = Join-Path $repoRoot 'backups'
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
if ($SchemaOnly) {
    $fileName = "schema_$stamp.dump"
} else {
    $fileName = "backup_$stamp.dump"
}
$outFile = Join-Path $OutputDir $fileName

# --- 5. Dump ------------------------------------------------------------------
# -Fc is the custom format: compressed, and restorable selectively with pg_restore.

$pgArgs = @(
    '--host', $dbHost
    '--port', $dbPort
    '--username', $dbUser
    '--dbname', $dbName
    '--format', 'custom'
    '--compress', '9'
    '--no-owner'
    '--no-privileges'
    '--file', $outFile
)
if ($SchemaOnly) { $pgArgs += '--schema-only' }

Write-Host "Dumping $dbName from $dbHost -> $fileName"

$previousPassword = $env:PGPASSWORD
$previousSslMode = $env:PGSSLMODE
try {
    $env:PGPASSWORD = $dbPass
    if ([string]::IsNullOrWhiteSpace($env:PGSSLMODE)) { $env:PGSSLMODE = 'require' }

    & $pgDump.Source @pgArgs
    $exitCode = $LASTEXITCODE
} finally {
    $env:PGPASSWORD = $previousPassword
    $env:PGSSLMODE = $previousSslMode
}

if ($exitCode -ne 0) {
    if (Test-Path $outFile) { Remove-Item $outFile -Force -ErrorAction SilentlyContinue }
    Fail @"
pg_dump exited with code $exitCode. Common causes:

  * "server version mismatch" -- your pg_dump is older than the Supabase server.
    Install newer PostgreSQL client tools and put their bin/ first on PATH.
  * "password authentication failed" -- the password in SUPABASE_DB_URL is stale.
    Reset it in Supabase: Project Settings -> Database -> Reset database password.
  * Connection timed out -- you are pointed at the pooler (port 6543) instead of
    the direct connection (port 5432), or your network blocks outbound 5432.
"@
}

if (-not (Test-Path $outFile)) {
    Fail "pg_dump reported success but wrote no file to $outFile."
}

$size = (Get-Item $outFile).Length
if ($size -lt 1024) {
    Remove-Item $outFile -Force -ErrorAction SilentlyContinue
    Fail "The dump was only $size bytes, which means it is empty or truncated. Deleted it rather than keep a fake backup."
}

if ($size -ge 1MB) {
    $sizeText = "{0} MB" -f [math]::Round($size / 1MB, 2)
} else {
    $sizeText = "{0} KB" -f [math]::Round($size / 1KB, 1)
}
Write-Host "OK  $fileName  ($sizeText)" -ForegroundColor Green

# --- 6. Prune -----------------------------------------------------------------

if ($RetentionDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    $stale = @(Get-ChildItem -Path $OutputDir -Filter '*.dump' -File |
        Where-Object { $_.LastWriteTime -lt $cutoff })

    foreach ($old in $stale) {
        Remove-Item $old.FullName -Force
        Write-Host "Pruned $($old.Name)"
    }
    if ($stale.Count -eq 0) {
        Write-Host "Nothing older than $RetentionDays days to prune."
    }
}

$kept = @(Get-ChildItem -Path $OutputDir -Filter '*.dump' -File)
Write-Host "$($kept.Count) dump(s) in $OutputDir"
