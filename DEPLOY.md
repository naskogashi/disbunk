# Deploying Disbunk.org on CloudPanel

> **Rapid, credible, coordinated.** — Step-by-step deployment guide for Linux servers running CloudPanel.

## Prerequisites

- Linux server with [CloudPanel](https://www.cloudpanel.io/) installed
- Node.js 20.x available via CloudPanel
- Domain `disbunk.org` pointed to server IP (A record)
- Supabase project created with URL and anon key

## Step 1: Create Node.js Site in CloudPanel

1. Log in to CloudPanel at `https://your-server:8443`
2. Go to **Sites → Add Site → Node.js**
3. Fill in:
   - **Domain**: `disbunk.org`
   - **Node.js Version**: `20.x`
   - **App Port**: (not needed — static SPA)
4. Click **Create**

## Step 2: Configure Nginx for SPA Routing

In CloudPanel, go to **Sites → disbunk.org → Vhost** and add this inside the server block:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

This ensures all routes (e.g., `/dashboard`, `/claims`) are handled by the React SPA.

## Step 3: Enable SSL

1. Go to **Sites → disbunk.org → SSL/TLS**
2. Click **Actions → New Let's Encrypt Certificate**
3. Select `disbunk.org` and `www.disbunk.org`
4. Click **Create and Install**

## Step 4: Set Environment Variables

In the CloudPanel vhost configuration or `.env` file on the server:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_APP_URL=https://disbunk.org
```

> Note: Vite embeds these at build time, so rebuild after changing.

## Step 5: Build and Deploy

### Option A: Manual Deploy

```bash
ssh user@your-server
cd /home/disbunk/htdocs/disbunk.org

# Clone or pull latest
git pull origin main

# Install and build
npm ci
npm run build

# Copy build output to document root
cp -r dist/* /home/disbunk/htdocs/disbunk.org/
```

### Option B: Use deploy.sh

```bash
chmod +x deploy.sh
./deploy.sh
```

### Option C: GitHub Actions CI/CD

Push to `main` branch — the workflow in `.github/workflows/deploy.yml` handles everything automatically.

## Step 6: Verify

### Response tools database and feed service

For an existing Supabase database, apply these migrations in order using the
Supabase SQL Editor or your normal migration deployment process:

0. `supabase/migrations/202610220000_restored_schema_prerequisites.sql` (legacy restored schemas)
1. `supabase/migrations/202610220001_protect_profile_fields.sql`
2. `supabase/migrations/202610220002_response_tools.sql`
3. `supabase/migrations/202610220003_registration_and_teams.sql`
4. `supabase/migrations/202610220004_restore_evidence_bucket.sql`
5. `supabase/migrations/202610220005_restored_access_policies.sql`

These add protected profile fields, response templates, investigation tasks,
notification preferences and events, private evidence storage, evidence hashes,
triage fields, and the atomic `import_sbunker_article` RPC. Back up the database
before production changes. Do not rerun `schema.sql` against an existing database.

Deploy the account and email Edge Functions to the same Supabase project.
For example, after authenticating the Supabase CLI:

```bash
supabase functions deploy manage-users --project-ref YOUR_PROJECT_REF
supabase functions deploy notify-registration --project-ref YOUR_PROJECT_REF
supabase functions deploy send-auth-email --project-ref YOUR_PROJECT_REF
```

The function verifies the caller and approved profile itself. Standard Supabase
function secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` must be available on the server. Never expose the
service role key in any `VITE_` environment variable.

The application links directly to `https://sbunker.org/category/disinfo/`.
The RSS panel, automatic fetching, and administrator refresh control have been
removed. The legacy crawler and import RPC remain available in the backend
source, but are not invoked by the frontend and need not be deployed.

GitHub's static frontend deployment does not apply Supabase SQL migrations or
deploy Edge Functions. Complete these backend steps before relying on the new
modules in production.

### Production activation on 22 October 2026

Applied migrations `202610220000` through `202610220005` through the SQL Editor
on project `evafhofcfslrkhvfplji`. These are not automatically recorded in CLI
migration history; reconcile that history before a future `supabase db push`.
Do not rerun the feature migrations, which create named policies and triggers.
The prerequisite migration preserves the restored text-valued status columns,
adds missing helper functions and team/audit fields, and preserves the existing
JSON return type of the profile RPC.

Deployed `manage-users`, `notify-registration`, and `send-auth-email`. Stored
SMTP2GO and webhook credentials only in Supabase secrets, set the requested
sender and production app URL, enabled the signed Send Email hook, and allowed
`https://disbunk.org/dashboard` as a redirect. Google provider settings were
not changed. The retired crawler was not redeployed.

Verified the live evidence storage policy and evidence insert including hash
fields in a transaction that was rolled back. No test evidence remains. All
three Edge Functions reject unauthenticated/unsigned requests with HTTP 401.
SMTP2GO accepted one authorized plain test email with one success and zero
failures; this confirms provider acceptance, not inbox delivery. A real browser
file upload and a complete invitation-link journey still need user verification.

### SMTP2GO and registration

Project reference: `evafhofcfslrkhvfplji`.
Sender: `DISBUNK.org <no-reply@disbunk.org>`.

Set `SMTP2GO_API_KEY`, `AUTH_EMAIL_FROM`, and `APP_URL=https://disbunk.org`
as Supabase Edge Function secrets. Keep the API key in the secret manager; never
commit it or use a `VITE_` prefix. `AUTH_EMAIL_FROM` must contain the exact sender
above. Verify `disbunk.org` or the sender address with SMTP2GO first.

For API delivery of all authentication emails, deploy `send-auth-email`, then
enable it under Supabase Authentication > Hooks > Send Email. The hook URL is
`https://evafhofcfslrkhvfplji.supabase.co/functions/v1/send-auth-email`.
Set the dashboard-generated signing secret as `SEND_EMAIL_HOOK_SECRET` on the
function. JWT verification is disabled for this hook because Standard Webhooks
signature verification authenticates each request before any email can be sent.
The hook supports sign-up, invitations, magic links, recovery, reauthentication,
and Supabase's secure email-change token mapping.

Alternatively, leave the email hook disabled and configure Supabase Auth's
custom SMTP transport with `mail.smtp2go.com`, port `587` with STARTTLS or the
provider's documented TLS settings, an SMTP2GO SMTP username and SMTP password,
sender email `no-reply@disbunk.org`, and sender name `DISBUNK.org`. SMTP credentials
are different from the HTTP API key. The separate `notify-registration` function
uses the HTTP API key for approval/rejection notices in either setup.

In Supabase Auth URL configuration, set the Site URL to `https://disbunk.org`
and allow `https://disbunk.org/dashboard`. Add localhost redirects separately
for development. Google OAuth remains unchanged.

Admin's **Add or invite user** supports email invitations for new/existing users
and manual account creation without a shared password. New invited users remain
pending approval. Team creation and role changes use transactional RPCs; the
creator is added as the first lead. Team leads can add existing approved users.
**Settings > SMTP2GO** checks secret presence without revealing credentials.
An accepted email request is not a delivery receipt; use SMTP2GO's activity log
for delivery and bounce status.

Templates support reviewed, manual copy and distribution. Automated translation,
email/SMS delivery, external integrations, web push, and ML clustering are not
connected. The Settings service catalog distinguishes these from implemented
features. Image metadata removal supports JPEG, PNG, and WebP input and produces
a PNG copy; other file formats are not sanitized.

1. Visit `https://disbunk.org` — you should see the landing page
2. Navigate to `/dashboard` — should load without 404
3. Check browser console for any Supabase connection errors

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on page refresh | Ensure Nginx `try_files` is configured |
| Blank page | Check `dist/` was copied correctly |
| Supabase errors | Verify env variables and rebuild |
| SSL not working | Re-run Let's Encrypt in CloudPanel |

## Directory Structure on Server

```
/home/disbunk/htdocs/disbunk.org/
├── index.html          ← Vite build output
├── assets/
│   ├── index-*.js
│   └── index-*.css
└── favicon.ico
```
