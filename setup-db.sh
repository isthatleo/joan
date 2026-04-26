#!/bin/bash

# Joan Healthcare OS - Database Initialization Script
# This script ensures the system is properly synced with Neon PostgreSQL

set -e

echo "======================================"
echo "Joan Healthcare OS - DB Sync Script"
echo "======================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is not set"
  echo ""
  echo "Please set it with:"
  echo "  export DATABASE_URL='postgresql://...'"
  exit 1
fi

echo "📦 Environment:"
echo "  Node: $(node --version)"
echo "  npm: $(npm --version)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📥 Installing dependencies..."
  npm install
fi

echo "🔄 Running database migrations..."
npm run db:generate
npm run db:push

echo ""
echo "🌱 Seeding database..."
npx tsx seed-super-admin.ts

echo ""
echo "✅ Database synchronization complete!"
echo ""
echo "🚀 To start the development server, run:"
echo "  npm run dev"
echo ""
echo "📌 Login credentials (for super admin):"
echo "  Email: leonardlomude@icloud.com"
echo "  Password: Myname@78"

