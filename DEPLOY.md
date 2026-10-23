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

In CloudPanel, go to **Sites → disbunk.org → Vhost**. After deploying the build,
replace the broad `location /` SPA fallback with the generated contents of
`deploy/nginx-public-routes.conf`, inside the HTTPS server block. Keep existing
TLS, root, logs, global settings and ACME locations. CloudPanel validates Nginx
before reloading. Save a backup of the original vhost first.

The generated configuration serves public pages directly, restricts workspace
shells to registered routes, normalizes trailing slashes and returns real 404s.
It changes when the central route inventory changes; deploy files before updating
the vhost. Run `npm run check:seo` after every build.

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

## SEO and static-page delivery

`npm run build` now prerenders the public homepage and emits static metadata
shells for known application routes. The homepage HTML includes its content,
partner links, canonical URL, social preview, and WebSite structured data before
JavaScript runs. The sitemap lists only the public homepage; login and signed-in
routes use `noindex`. Titles and descriptions update when navigating or changing
between English and Albanian. Private claim contents are never prerendered.

Deploy the entire `dist/` directory, including its nested route directories,
`sitemap.xml`, `robots.txt`, and optimized partner images. The existing SCP
workflow already copies this tree. Keep the server's SPA fallback for dynamic
claim URLs. `404.html` is available for server-side 404 configuration, but the
application fallback alone cannot set HTTP status codes.

Serve hashed `/assets/` files with long-lived immutable caching and enable
Brotli or gzip in the hosting configuration. Keep HTML on revalidation caching
so new deployments load their current asset names. Font and partner URLs are
not fingerprinted; use revalidation or short cache lifetimes for those files.
These cache headers require hosting configuration and are not set by Vite's
static output. Search ranking and real-user performance require production
monitoring; local build checks cannot guarantee them.

## Account tools and pictures (October 2026)

Production migrations 006 and 007 are applied. The account-actions function and
updated notify-registration and send-auth-email functions are deployed. The
Supabase dashboard deployment inlines _shared/email.ts into each email entrypoint;
CLI deployment can use the shared source directly. Keep JWT gateway verification
off for these functions: account endpoints authenticate and authorize internally,
and the auth hook verifies its webhook signature.

Allow https://disbunk.org/reset-password in Authentication URL Configuration.
Recovery emails carry a token hash to that page, which verifies it before offering
a new password. Publish public/email-logo.png with the frontend for email branding.

Bulk actions support up to 50 selections, confirmations, and partial-failure
reporting. Deleting irreversibly removes sign-in access, anonymizes the profile,
and preserves investigation records. Self actions, the last approved administrator,
and deleting the last approved team lead are protected. Internal lifecycle RPCs
are service-only, including explicit revocation of Supabase browser-role defaults.

The private pictures bucket accepts JPEG, PNG and WebP up to 5 MB. The client
crops and compresses pictures; profile owners and team leads/admins manage their
own paths. Approved users view pictures through expiring signed URLs.

Regression tests and local builds cover these flows; production checks verify
permissions and deployment without modifying existing account passwords/statuses.

## C5, team management and translation

Migration 008 is applied to production. It adds C5 claim assessments, audited team
name/description editing for admins and team leads, and an admin-only integration
policy. Updated manage-users and account-actions support manual password login
with administrative email confirmation; self-registration stays verified by email.
Existing affected users can be repaired individually through Admin > Set password.

The translate-content endpoint authenticates approved admins internally. Configure
GOOGLE_TRANSLATION_API_KEY in Supabase secrets and enable Google Cloud Translation
API with billing, API restrictions and quotas. Never expose the key as a VITE_
variable. No text is sent until the admin selects the sharing checkbox and clicks
Translate. Originals remain unchanged. DeepL is an alternative, not implemented.

See REQUIREMENTS-REVIEW.md for the document comparison and remaining priorities.

## Facebook and X sign-in

The frontend supports Facebook and X OAuth 2.0 (`facebook` and `x`, not the
legacy `twitter` provider). Additional buttons appear only when the public
Supabase Auth settings report the corresponding provider as enabled.

Both providers were disabled when checked on 23 October 2026. Facebook's
credential fields were empty. Activation requires provider app credentials in
Supabase Authentication > Sign In / Providers. Use this callback in both apps:
https://evafhofcfslrkhvfplji.supabase.co/auth/v1/callback

Facebook needs its app ID/secret and email permission. X needs OAuth 2.0 client
ID/secret and the production website URL https://disbunk.org. Keep email required;
new social users still follow the existing Disbunk approval workflow. Never put
provider secrets in frontend variables. End-to-end sign-in awaits provider setup.

## Albanian default and public startup

The public homepage now renders directly through RootApp without loading the
Supabase/auth/workspace bundle first. Workspace routes still load on demand and
use a styled skeleton instead of a plain-text startup message. Public HTML stays
prerendered, with Albanian content and metadata available before JavaScript.

Albanian is the fallback language, independent of browser locale. The language
selector lists Shqip first and English second, and remembers explicit choices in
localStorage. Existing saved choices are preserved. The profile-language default
migration 202610230001 is applied in production; it changes new-profile defaults
without overwriting existing preferences.

The translation sweep covers claim status badges/actions, onboarding tips, account
roles/statuses, relative activity, date labels, profile calendar headings and
shared accessibility controls. User-generated titles, evidence and documents are
preserved in their original language. External API error messages may be supplied
by their providers. Browser checks verify the public route does not preload the
workspace and that language switching persists across reloads.

HDBSCAN-PLAN.md describes a proposed background clustering design; no clustering
worker, model downloads or external embedding calls are deployed by this update.
# Narrative clustering worker

The HDBSCAN worker runs separately from the static website, under the
`disbunk2` server user. It is not deployed by the frontend SCP workflow.
See [worker/README.md](worker/README.md) for dependencies, the dedicated database
login, resource limits, nightly scheduling, validation and rollback. Supabase
migrations `202610230002` and `202610230003` were applied in the SQL Editor;
do not rerun them against production. The first production batch completed with
zero recent claims; no campaign or investigation was created automatically.
