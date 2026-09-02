# 💾 Database backups

Supabase Free has **no managed backups**. If the project is deleted, paused past its
retention window, or a bad migration truncates a table, there is nothing to roll back to.
`scripts/backup-db.ps1` is the whole backup story.

> **This matters more than usual here.** `supabase/schema.sql` is stale — it predates the
> WordPress work, and several constraints were created by hand in the SQL editor (see the
> comment at the top of `supabase/migrations/20260901_add_wordpress_platform.sql`). A
> `pg_dump` is currently the only complete copy of the live schema.

---

## 1. One-time setup

### Install pg_dump

Download the **PostgreSQL client tools** for Windows:
<https://www.postgresql.org/download/windows/>
In the installer you only need *Command Line Tools* — no local server.

Then add its `bin` to PATH:

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\17\bin"   # this shell only
```

`pg_dump` must be **the same version as the Supabase server or newer**, otherwise it
refuses to run. Supabase is on Postgres 15+, so install 16 or 17.

Check:

```powershell
pg_dump --version
```

### Get the connection string

Supabase dashboard → **Project Settings → Database → Connection string → URI**.

Use the **direct connection** (`db.<ref>.supabase.co`, port **5432**). The transaction
pooler on port **6543** does not support `pg_dump`.

The URI contains your database password. If you never saved it, use *Reset database
password* on the same page and take the new one.

### Set SUPABASE_DB_URL

The script reads only this variable. It never touches `.env.local`, and it never prints
the connection string.

```powershell
# this shell only
$env:SUPABASE_DB_URL = "postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres"

# or persist for your Windows user (reopen the terminal afterwards)
[Environment]::SetEnvironmentVariable("SUPABASE_DB_URL", "postgresql://...", "User")
```

---

## 2. Run it

```powershell
cd "C:\Users\ASCC\hassan-project\Social Media Scheduler + Auto Repurpose SaaS"
.\scripts\backup-db.ps1
```

Writes `backups\backup_YYYY-MM-DD_HHMMSS.dump` (Postgres custom format, compressed) and
deletes dumps older than 14 days. `backups/` is gitignored — dumps contain OAuth tokens
and user data, so never commit or email them.

| Option | Meaning |
|---|---|
| `-RetentionDays 30` | Keep 30 days instead of 14. `0` disables pruning. |
| `-OutputDir D:\backups` | Write somewhere else (e.g. a synced drive). |
| `-SchemaOnly` | DDL only, no rows. Used to seed staging — see `docs/STAGING.md`. |

If the first run fails, the error message tells you which of the three usual causes it is
(pg_dump too old, wrong password, or pointed at the pooler).

---

## 3. Schedule it — Windows Task Scheduler

The connection string must be visible to the task, so set it at **User** scope first
(see above), then:

1. Open **Task Scheduler** → *Create Task* (not *Basic Task*).
2. **General**: name `Supabase backup`. Select *Run whether user is logged on or not*
   only if you are happy entering your Windows password; otherwise leave the default and
   the task runs when you are logged in.
3. **Triggers** → *New* → Daily, 02:00.
4. **Actions** → *New* → Start a program:
   - Program: `powershell.exe`
   - Arguments:
     ```
     -NoProfile -ExecutionPolicy Bypass -File "C:\Users\ASCC\hassan-project\Social Media Scheduler + Auto Repurpose SaaS\scripts\backup-db.ps1"
     ```
5. **Conditions**: untick *Start the task only if the computer is on AC power* if it is a
   laptop you want backed up regardless.
6. **Settings**: tick *Run task as soon as possible after a scheduled start is missed* —
   the machine will not always be on at 02:00.

Verify by right-clicking the task → **Run**, then check for a new file in `backups\`.

> The dumps live on one laptop. Copy `backups\` to OneDrive/Google Drive occasionally, or
> point `-OutputDir` at a synced folder. A backup that dies with the disk is not a backup.

---

## 4. Restore

**A backup nobody has restored is not a backup.** Do a rehearsal restore into a scratch
Supabase project (or the staging one) at least once, before you ever need it.

### Restore into an empty database

```powershell
$env:PGPASSWORD = "TARGET_DB_PASSWORD"
pg_restore `
  --host db.TARGET.supabase.co --port 5432 --username postgres --dbname postgres `
  --no-owner --no-privileges --clean --if-exists `
  ".\backups\backup_2026-09-02_020000.dump"
$env:PGPASSWORD = $null
```

- `--no-owner --no-privileges` — the dump's roles do not exist in the target project.
- `--clean --if-exists` — drops each object before recreating it, so a re-run is safe.
- Expect **errors about `auth.*`, `storage.*`, `extensions` and `supabase_admin`**. Those
  schemas are Supabase-managed and your role cannot touch them. Errors that mention only
  those are normal — add `--schema public` to skip them entirely.

### Restore one table only

```powershell
pg_restore --host ... --username postgres --dbname postgres `
  --no-owner --data-only --table posts ".\backups\backup_....dump"
```

### Just look inside a dump

```powershell
pg_restore --list ".\backups\backup_....dump"          # table of contents
pg_restore --schema-only --file schema.sql ".\backups\backup_....dump"   # readable SQL
```

### What a restore does *not* bring back

The dump is Postgres data only. After restoring into a fresh project you must also:

- Recreate the **`media` Storage bucket** and its policies (files are not in the dump).
- Re-run `supabase/migrations/20260831_harden_token_columns_and_policies.sql` if the
  column-level `REVOKE`s did not survive.
- Update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` in Vercel — they are per-project.
- Ask users to reconnect their social accounts if the tokens are older than the dump.

---

## 5. Quick checklist

- [ ] `pg_dump --version` >= server version
- [ ] `SUPABASE_DB_URL` set at User scope
- [ ] First manual run produced a file in `backups\`
- [ ] Scheduled task runs and creates a file
- [ ] Dumps copied somewhere off this machine
- [ ] **One rehearsal restore completed into a scratch project**
