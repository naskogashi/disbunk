# Disbunk.org

**Rapid, credible, coordinated.**

An open-source platform for rapid, credible, coordinated response to digital misinformation. Built for fact-checkers, journalists, and civil society organizations.

## Features

- 📋 **Claims Management** — Submit, track, and investigate misinformation claims
- 🗃️ **Evidence Vault** — Upload and organize evidence files linked to claims
- 🎯 **Campaign Detection** — Group related claims using similarity analysis
- 👥 **Team Coordination** — Create teams, assign roles, collaborate in real-time
- 📊 **Analytics** — Track contributions, impact scores, and response times
- 📰 **Sbunker Feed** — Auto-imported disinformation coverage from Sbunker.org
- 🌐 **Multilingual** — Albanian (sq) + English (en)
- 🔐 **Role-Based Access** — Visitor, Analyst, Editor, Team Lead, Admin

## Tech Stack

- React + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (auth, PostgreSQL, realtime, storage, edge functions)
- Vite

## Quick Start

```bash
git clone https://github.com/your-org/disbunk.git
cd disbunk
npm install
cp .env.example .env
npm run dev
```

## Deployment

See [DEPLOY.md](DEPLOY.md) for CloudPanel deployment instructions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
