# Auth email templates

Supabase sends the signup, password reset and email-change messages. Its
defaults are a bare line of text and a raw link, and they point wherever the
project's **Site URL** says — which is how a confirmation email ends up naming a
host the person has never heard of.

These templates fix both halves: they look like Feedquill, and every link goes
through `/auth/confirm`, which verifies the token server-side. That matters more
than it sounds: `@supabase/ssr` uses PKCE, where the browser that started the
signup holds a verifier in its own storage. A link opened on a phone, in another
browser, or inside a mail client's in-app viewer has nothing to exchange and
fails silently. Verifying server-side works wherever the link is opened.

---

## 1. Settings that must be right first

**Supabase dashboard → Authentication → URL Configuration**

| Field | Value |
|---|---|
| Site URL | `https://feedquill.hassangujja98.workers.dev` |
| Redirect URLs | `https://feedquill.hassangujja98.workers.dev/**`<br>`http://localhost:3000/**`<br>`http://localhost:3005/**` |

The Site URL is what `{{ .SiteURL }}` expands to in every template below. The
redirect allow-list is separate: a link is refused unless its destination
matches an entry, so local development needs its own line.

## 2. The templates

**Authentication → Emails →** pick the template, paste the HTML, save.

Subjects are worth setting too — Supabase's defaults ("Confirm Your Signup")
read like a system notice.

---

### Confirm signup

**Subject:** `Confirm your Feedquill account`

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;">

            <tr>
              <td style="padding:32px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#c2410c;border-radius:6px;width:36px;height:36px;text-align:center;vertical-align:middle;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.5px;">FQ</td>
                    <td style="padding-left:12px;font-size:17px;font-weight:600;color:#1c1917;">Feedquill</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 0 32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:600;color:#1c1917;">Confirm your email</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#57534e;">
                  One click and your account is ready. This link works once, and expires in 24 hours.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 0 32px;">
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard"
                   style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:6px;">
                  Confirm my email
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <p style="margin:0 0 6px 0;font-size:13px;color:#78716c;">Or paste this into your browser:</p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#a8a29e;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard</p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px;border-top:1px solid #f5f5f4;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#a8a29e;">
                  Didn't sign up? Ignore this email — no account is created until the link is used.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

### Reset password

**Subject:** `Reset your Feedquill password`

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;">

            <tr>
              <td style="padding:32px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#c2410c;border-radius:6px;width:36px;height:36px;text-align:center;vertical-align:middle;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.5px;">FQ</td>
                    <td style="padding-left:12px;font-size:17px;font-weight:600;color:#1c1917;">Feedquill</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 0 32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:600;color:#1c1917;">Set a new password</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#57534e;">
                  Use the button below to choose a new password. The link works once, and expires in an hour.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 0 32px;">
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password"
                   style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:6px;">
                  Choose a new password
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <p style="margin:0 0 6px 0;font-size:13px;color:#78716c;">Or paste this into your browser:</p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#a8a29e;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password</p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px;border-top:1px solid #f5f5f4;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#a8a29e;">
                  Didn't ask for this? Ignore it — your password stays as it is until this link is used.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

### Change email address

**Subject:** `Confirm your new Feedquill email`

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;">

            <tr>
              <td style="padding:32px 32px 0 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#c2410c;border-radius:6px;width:36px;height:36px;text-align:center;vertical-align:middle;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.5px;">FQ</td>
                    <td style="padding-left:12px;font-size:17px;font-weight:600;color:#1c1917;">Feedquill</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 32px 0 32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;font-weight:600;color:#1c1917;">Confirm your new address</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#57534e;">
                  You asked to move your Feedquill account to <strong style="color:#1c1917;">{{ .Email }}</strong>. Confirm it to finish.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 0 32px;">
                <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/settings"
                   style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:6px;">
                  Confirm this address
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <p style="margin:0 0 6px 0;font-size:13px;color:#78716c;">Or paste this into your browser:</p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#a8a29e;word-break:break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/settings</p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px;border-top:1px solid #f5f5f4;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#a8a29e;">
                  Didn't ask for this? Ignore it — your address stays as it is.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 3. Why the HTML looks like 2005

Tables and inline styles, not flexbox and a stylesheet. Outlook renders through
Word's engine, Gmail strips `<style>` blocks in some clients, and neither
supports flex or grid. This is the shape that survives.

No web fonts and no images, deliberately: fonts fall back anyway, and images are
blocked by default in most clients, so a logo would frequently render as a
broken box. The "FQ" mark is a coloured table cell, which always draws.

## 4. Still to do — Supabase's own SMTP will not carry real users

The built-in sender allows only a few messages an hour and is rate-limited per
project. It is fine while testing; the day people sign up, confirmations start
failing silently.

The fix is custom SMTP under **Project Settings → Authentication → SMTP
Settings**. Resend's free tier covers 3,000 a month, which is far past what a
soft launch needs. It wants a verified sender domain, so it is worth doing at
the same time as a custom domain rather than twice.
