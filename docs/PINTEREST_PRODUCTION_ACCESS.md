# Pinterest Production Access Guide

While your application is in **Trial mode**, you can only create Pins in the **Pinterest API Sandbox**. To create public Pins in the production environment, you must request **Standard (Production) access**.

## Steps to Apply for Production Access

### 1. Complete Your App Profile
Ensure your Pinterest Developer App profile is complete:
- Go to [Pinterest Developer Portal](https://developers.pinterest.com/)
- Select your app.
- Fill in the **App Name**, **Description**, and **Category**.
- Upload an **App Icon**.

### 2. Provide a Valid Privacy Policy
Pinterest requires a link to a valid privacy policy that clearly states how you use their data.

### 3. Record a Screencast
Prepare a short video (under 2 minutes) showing:
- How a user logs in via Pinterest.
- How the user creates/schedules a Pin.
- Where the Pin appears (in the sandbox).

### 4. Submit for Review
- Go to the **App Review** section in your app dashboard.
- Select the permissions you need (usually `pins:write`, `boards:read`, etc.).
- Provide the screencast and description of your app's value to users.
- Click **Submit**.

### 5. Review Timeline
Pinterest typically reviews applications within **5-7 business days**. You will receive an email once your application is approved or if more information is needed.

## Switching Environments in This App

Once you have production access:
1. Go to your `.env.local` (or Vercel environment variables).
2. Change `PINTEREST_API_BASE_URL` from `https://api-sandbox.pinterest.com` to `https://api.pinterest.com`.
3. Delete the `PINTEREST_API_BASE_URL` variable entirely to default back to production.

---

> [!TIP]
> Make sure your app complies with [Pinterest's Developer Policy](https://developers.pinterest.com/policy/) before submitting.
