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
