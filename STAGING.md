# MicDrop staging

Use a dedicated Supabase staging project and Vercel Preview deployment. Do not copy production users or performer emails into staging.

1. Create a Supabase project named `micdrop-staging`. Apply `scripts/000_full_schema.sql`, then audit/apply later numbered SQL scripts in sequence (some fields may already exist in the full schema). Apply `013_lock_down_rls.sql` before exposing the deployment. User accounts use Supabase Auth. Apply `014_add_mic_accounts.sql` after 013 for account ownership and persistent claim attempt limits.
2. Enable email/password authentication and email confirmation. Set the Auth Site URL to the stable staging HTTPS origin. Allow only that origin's `/auth/callback` and `/auth/confirm` routes as redirect URLs. Use a dedicated test SMTP setup if needed.
3. For confirmation email templates that support another browser/device, use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. For password recovery use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. The default PKCE callback works in the browser that requested the email.
4. Link the existing Micdrop Vercel project to the source repository. Set the variables in `.env.example` for Preview, scoped to a `staging` branch. Use staging Supabase URL/key/service role and a stable staging site URL. Keep service role, admin password, cron secret, and Blob token server-only. Set `EMAIL_ENABLED=false`; application mail is suppressed while Supabase auth emails remain available.
5. Configure the staging alias on Vercel and allow its origin on the Google Maps key. Deploy the `staging` branch as Preview; rebuild after setting public variables. Production's environment variables and domain stay unchanged. If a separate Vercel project uses Production deployments for staging, keep `EMAIL_ENABLED=false` and remove cron schedules from that project's deployment configuration.
6. Run `npm run check:staging` with staging variables loaded. Optionally set `PRODUCTION_SUPABASE_URL` so it can reject a matching database origin. This check cannot prove project isolation without that reference.
7. Smoke test `/`, `/login`, account creation, email confirmation, sign-in, `/account`, sign-out, password reset, hosting, and public performer signups. Verify `/account` redirects anonymous visitors to login and links never return to production.

## Account behavior

Password, Google OAuth, and email magic-link sign-in share the same Supabase account sessions. Configure Google Client ID/secret in Supabase, with `https://phwbywnxprqtuuaqcjtk.supabase.co/auth/v1/callback` authorized in Google Cloud. Enable only `openid`, email, and profile scopes. New credential entry must be completed by the account owner.

Configure custom SMTP for auth emails to non-team addresses. For Resend, use `smtp.resend.com`, port 465, username `resend`, and a Resend API key as the password, with a verified sender address. The application `EMAIL_ENABLED=false` setting does not disable Supabase auth email.

The staging magic-link template uses `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email` to allow another browser/device to finish sign-in. Password signup and recovery retain their existing templates and PKCE browser requirements unless those templates are updated separately.

Accounts remain optional for guest hosting/performer signup. Signed-in hosts automatically own newly created mics. On `/account`, an existing host can enter a mic slug or URL plus its six-digit PIN to save an unclaimed mic. Server-verified identity, constant-time PIN validation, five attempts per account per hour, and atomic compare-and-set ownership prevent client-side ownership spoofing and racing claims. Already claimed mics cannot be transferred using a PIN. Enter any date in an existing recurring series once to save all unclaimed dates with that series and PIN. Migration 015 performs this atomically and leaves other accounts’ dates alone.

Saved mics appear only in their owner's account and unlock host management without re-entering the PIN. Every host action verifies the account or PIN on the server. Series changes are scoped to owned dates when using account access, or matching PIN hashes when using a PIN. Accounts do not grant site-wide admin access. Existing PIN access remains available.

`/staging-status` and `/api/health` are available only in Vercel Preview. They report database/auth connectivity and verify the expected staging project; they never return user data or credentials.

## Deployment status

Staging branch: `https://github.com/rayeschiller/mic-drop/tree/staging`.
Stable staging site: `https://v0-comedy-mic-signup-git-staging-raye-3578s-projects.vercel.app`.
Supabase staging project: `phwbywnxprqtuuaqcjtk` (restored).
Applied migrations: 012, 013, 014, 015. Read-only audits confirmed private-table restrictions, ownership column, and server-only claim limiter permissions.
Vercel Preview mail is disabled, and the staging branch's Site URL override is saved. Supabase Site URL and both staging auth redirects are saved. Magic-link template is saved. Google OAuth credentials and custom SMTP credentials are pending account-owner setup. Full account and mail-delivery smoke tests remain pending those credentials.

The branded magic-link email source is tracked at `supabase/templates/magic_link.html`. Saving that file to Git alone does not update Supabase; the staging dashboard template was explicitly updated and its delivery to the authorized test address was verified.
