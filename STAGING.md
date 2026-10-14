# MicDrop staging

Use a dedicated Supabase staging project and Vercel Preview deployment. Do not copy production users or performer emails into staging.

1. Create a Supabase project named `micdrop-staging`. Apply `scripts/000_full_schema.sql`, then audit/apply later numbered SQL scripts in sequence (some fields may already exist in the full schema). Apply `013_lock_down_rls.sql` before exposing the deployment. User accounts use Supabase Auth; no additional user table is required.
2. Enable email/password authentication and email confirmation. Set the Auth Site URL to the stable staging HTTPS origin. Allow only that origin's `/auth/callback` and `/auth/confirm` routes as redirect URLs. Use a dedicated test SMTP setup if needed.
3. For confirmation email templates that support another browser/device, use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. For password recovery use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`. The default PKCE callback works in the browser that requested the email.
4. Link the existing Micdrop Vercel project to the source repository. Set the variables in `.env.example` for Preview, scoped to a `staging` branch. Use staging Supabase URL/key/service role and a stable staging site URL. Keep service role, admin password, cron secret, and Blob token server-only. Set `EMAIL_ENABLED=false`; application mail is suppressed while Supabase auth emails remain available.
5. Configure the staging alias on Vercel and allow its origin on the Google Maps key. Deploy the `staging` branch as Preview; rebuild after setting public variables. Production's environment variables and domain stay unchanged. If a separate Vercel project uses Production deployments for staging, keep `EMAIL_ENABLED=false` and remove cron schedules from that project's deployment configuration.
6. Run `npm run check:staging` with staging variables loaded. Optionally set `PRODUCTION_SUPABASE_URL` so it can reject a matching database origin. This check cannot prove project isolation without that reference.
7. Smoke test `/`, `/login`, account creation, email confirmation, sign-in, `/account`, sign-out, password reset, hosting, and public performer signups. Verify `/account` redirects anonymous visitors to login and links never return to production.

## Account behavior

Accounts are optional in this first version. Hosts and performers retain their existing PIN and guest flows. Accounts do not grant admin access, claim existing mics, or replace host PIN authorization. The account page displays verified account identity and allows password changes; private pages/actions verify users with Supabase Auth. A future ownership migration can connect accounts to hosted mics.

## Deployment status

Prepared locally. Remote project creation, environment configuration, deployment, and live auth smoke tests require connected Vercel and Supabase access. No staging URL has been provisioned or verified yet.
