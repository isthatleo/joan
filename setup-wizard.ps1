#!/usr/bin/env pwsh

# Joan Healthcare OS - Interactive Setup Wizard
# Run this script to automatically setup your system

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  JOAN HEALTHCARE OS - INTERACTIVE SETUP WIZARD" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Detect OS and setup
Write-Host "System Detection..." -ForegroundColor Yellow
$OSType = if ($IsWindows) { "Windows" } elseif ($IsLinux) { "Linux" } else { "macOS" }
Write-Host "   OS: $OSType" -ForegroundColor Green
Write-Host "   Node Version: $(node --version)" -ForegroundColor Green
Write-Host "   npm Version: $(npm --version)" -ForegroundColor Green
Write-Host ""

# Check .env
Write-Host "Checking configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   OK .env file exists" -ForegroundColor Green
    $dbUrl = (Get-Content .env | Select-String "DATABASE_URL").Line
    if ($dbUrl) {
        Write-Host "   OK DATABASE_URL configured" -ForegroundColor Green
        $dbStatus = $dbUrl.Substring(0, [Math]::Min(50, $dbUrl.Length)) + "..."
        Write-Host "     $dbStatus" -ForegroundColor Gray
    } else {
        Write-Host "   ERROR DATABASE_URL not found in .env" -ForegroundColor Red
    }
} else {
    Write-Host "   ERROR .env file not found" -ForegroundColor Red
    Write-Host "   Creating .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env" -ErrorAction SilentlyContinue
}
Write-Host ""

# Database selection
Write-Host "Database Setup" -ForegroundColor Yellow
Write-Host "   Choose your database solution:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Local PostgreSQL (Fastest - Recommended for development)"
Write-Host "   2. Neon Cloud (Production - Requires internet)"
Write-Host "   3. Docker (Containerized - Requires Docker)"
Write-Host "   4. Skip (I'll configure manually)"
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "LOCAL POSTGRESQL SETUP" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Prerequisites:"
        Write-Host "   - PostgreSQL installed and running"
        Write-Host "   - Can access from localhost:5432"
        Write-Host ""

        $pgUser = Read-Host "   PostgreSQL username (default: postgres)"
        $pgPass = Read-Host "   PostgreSQL password (default: postgres)" -AsSecureString
        $pgPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($pgPass))
        $pgDb = Read-Host "   Database name (default: joan)"

        if ([string]::IsNullOrEmpty($pgUser)) { $pgUser = "postgres" }
        if ([string]::IsNullOrEmpty($pgPass)) { $pgPass = "postgres" }
        if ([string]::IsNullOrEmpty($pgDb)) { $pgDb = "joan" }

        $dbURL = "postgresql://$pgUser`:$pgPass@localhost:5432/$pgDb"

        Write-Host ""
        Write-Host "   Updating .env..." -ForegroundColor Yellow
        (Get-Content .env) -replace 'DATABASE_URL=.*', "DATABASE_URL=`"$dbURL`"" | Set-Content .env
        Write-Host "   OK .env updated" -ForegroundColor Green
    }
    "2" {
        Write-Host ""
        Write-Host "NEON CLOUD SETUP" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "   1. Go to https://console.neon.tech" -ForegroundColor Yellow
        Write-Host "   2. Create a new project"
        Write-Host "   3. Copy the connection string"
        Write-Host "   4. Important: Enable Connection pooling option"
        Write-Host ""

        $neonUrl = Read-Host "   Paste your Neon connection string"

        if (-not [string]::IsNullOrEmpty($neonUrl)) {
            Write-Host ""
            Write-Host "   Updating .env..." -ForegroundColor Yellow
            (Get-Content .env) -replace 'DATABASE_URL=.*', "DATABASE_URL=`"$neonUrl`"" | Set-Content .env
            Write-Host "   OK .env updated" -ForegroundColor Green
        }
    }
    "3" {
        Write-Host ""
        Write-Host "DOCKER SETUP" -ForegroundColor Blue
        Write-Host ""
        Write-Host "   Creating docker-compose.yml..." -ForegroundColor Yellow

        $dockerCompose = @"
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: joan
      POSTGRES_USER: joan_user
      POSTGRES_PASSWORD: joan_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
"@

        $dockerCompose | Set-Content docker-compose.yml
        Write-Host "   OK docker-compose.yml created" -ForegroundColor Green

        Write-Host ""
        Write-Host "   Starting Docker container..." -ForegroundColor Yellow
        docker-compose up -d

        if ($LASTEXITCODE -eq 0) {
            Write-Host "   OK Docker container started" -ForegroundColor Green

            Write-Host ""
            Write-Host "   Updating .env..." -ForegroundColor Yellow
            (Get-Content .env) -replace 'DATABASE_URL=.*', 'DATABASE_URL="postgresql://joan_user:joan_password@localhost:5432/joan"' | Set-Content .env
            Write-Host "   OK .env updated" -ForegroundColor Green
        } else {
            Write-Host "   ERROR Failed to start Docker. Is Docker installed?" -ForegroundColor Red
        }
    }
    "4" {
        Write-Host ""
        Write-Host "Skipped - configure manually" -ForegroundColor Yellow
        Write-Host "   See DATABASE_SYNC_GUIDE.md for manual setup" -ForegroundColor Cyan
    }
    default {
        Write-Host "   Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Test database
Write-Host "Testing database connection..." -ForegroundColor Yellow
try {
    node verify-db.js
    Write-Host ""
} catch {
    Write-Host "   WARNING Could not test connection. Check .env and try again." -ForegroundColor Yellow
    Write-Host ""
}

# Push schema
Write-Host "Creating database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK Schema created successfully" -ForegroundColor Green
} else {
    Write-Host "   ERROR Failed to create schema" -ForegroundColor Red
    Write-Host "   See error above for details" -ForegroundColor Red
}

Write-Host ""

# Seed data
Write-Host "Seeding initial data..." -ForegroundColor Yellow
npm run seed:super-admin
if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK Initial data seeded" -ForegroundColor Green
    Write-Host ""
    Write-Host "   LOGIN CREDENTIALS:" -ForegroundColor Cyan
    Write-Host "      Email: leonardlomude@icloud.com" -ForegroundColor Yellow
    Write-Host "      Password: Myname@78" -ForegroundColor Yellow
} else {
    Write-Host "   WARNING Seeding may have failed - check output above" -ForegroundColor Yellow
}

Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  SETUP COMPLETE - READY TO START" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   1. Start development server:"
Write-Host "      npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "   2. In another terminal, test APIs:"
Write-Host "      .\test-apis.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "   3. Open in browser:"
Write-Host "      http://localhost:3000/master" -ForegroundColor Yellow
Write-Host ""
Write-Host "   4. Login with credentials above"
Write-Host ""
Write-Host "   5. Celebrate! Have fun!" -ForegroundColor Green
Write-Host ""

Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "   - ACTION_SUMMARY.md - Quick overview"
Write-Host "   - DATABASE_SYNC_GUIDE.md - Troubleshooting"
Write-Host "   - COMPLETE_SETUP_GUIDE.md - Full reference"
Write-Host "   - IMPLEMENTATION_COMPLETE_REPORT.md - Feature list"
Write-Host ""

$openBrowser = Read-Host "Start dev server now? (y/n)"
if ($openBrowser.ToLower() -eq "y") {
    Write-Host ""
    Write-Host "Starting development server..." -ForegroundColor Yellow
    npm run dev
}

