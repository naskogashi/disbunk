#!/bin/bash
set -e

echo "🔧 Installing dependencies..."
npm ci

echo "🏗️  Building Disbunk.org..."
npm run build

echo "📦 Syncing to CloudPanel htdocs..."
rsync -av --delete dist/ /home/disbunk/htdocs/disbunk.org/

echo "✅ Done. Site live at https://disbunk.org"
