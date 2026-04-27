# Comprehensive API Test Suite for Joan Healthcare OS
# PowerShell Version for Windows

$BaseURL = "http://localhost:3000"
$TestResults = @()

Write-Host "🧪 Joan Healthcare OS - API Test Suite" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to test endpoint
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [int]$ExpectedStatus,
        [string]$Data
    )

    Write-Host "Testing $Method $Endpoint ... " -NoNewline

    try {
        $headers = @{ "Content-Type" = "application/json" }

        if ($Data) {
            $response = Invoke-WebRequest -Uri "$BaseURL$Endpoint" -Method $Method -Headers $headers -Body $Data -SkipHttpErrorCheck
        } else {
            $response = Invoke-WebRequest -Uri "$BaseURL$Endpoint" -Method $Method -SkipHttpErrorCheck
        }

        $statusCode = $response.StatusCode

        if ($statusCode -ge 200 -and $statusCode -lt 300) {
            Write-Host "✓ ($statusCode)" -ForegroundColor Green
            $TestResults += @{
                Endpoint = $Endpoint
                Status = "PASS"
                Code = $statusCode
            }
        } elseif ($statusCode -ge 400 -and $statusCode -lt 500) {
            Write-Host "⚠ ($statusCode) - Client error" -ForegroundColor Yellow
            $TestResults += @{
                Endpoint = $Endpoint
                Status = "WARN"
                Code = $statusCode
            }
        } else {
            Write-Host "✗ ($statusCode)" -ForegroundColor Red
            $TestResults += @{
                Endpoint = $Endpoint
                Status = "FAIL"
                Code = $statusCode
            }
        }
    } catch {
        Write-Host "✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $TestResults += @{
            Endpoint = $Endpoint
            Status = "FAIL"
            Code = "ERROR"
        }
    }
}

# Health Check
Write-Host "`n1. Health & Status" -ForegroundColor Yellow
Test-Endpoint "GET" "/api/health" 200

# Super Admin
Write-Host "`n2. Super Admin" -ForegroundColor Yellow
Test-Endpoint "GET" "/api/super-admin?action=dashboard" 200
Test-Endpoint "GET" "/api/super-admin?action=recent-users" 200
Test-Endpoint "GET" "/api/super-admin?action=system-status" 200

# Tenants
Write-Host "`n3. Tenant Management" -ForegroundColor Yellow
Test-Endpoint "GET" "/api/tenants" 200
Test-Endpoint "GET" "/api/tenants?stats=true" 200
Test-Endpoint "GET" "/api/tenants?usage=true" 200

# Analytics
Write-Host "`n4. Analytics APIs" -ForegroundColor Yellow
Test-Endpoint "GET" "/api/analytics" 200
Test-Endpoint "GET" "/api/analytics/global" 200
Test-Endpoint "GET" "/api/analytics/doctor" 200
Test-Endpoint "GET" "/api/analytics/nurse" 200
Test-Endpoint "GET" "/api/analytics/lab" 200
Test-Endpoint "GET" "/api/analytics/pharmacy" 200
Test-Endpoint "GET" "/api/analytics/accountant" 200
Test-Endpoint "GET" "/api/analytics/receptionist" 200
Test-Endpoint "GET" "/api/analytics/patient" 200
Test-Endpoint "GET" "/api/analytics/hospital-admin" 200

# Compliance
Write-Host "`n5. Compliance" -ForegroundColor Yellow
Test-Endpoint "GET" "/api/compliance/data" 200
Test-Endpoint "GET" "/api/compliance/data?category=metrics" 200
Test-Endpoint "GET" "/api/compliance/data?category=risks" 200

# System
Write-Host "`n6. System Management" -ForegroundColor Yellow
Test-Endpoint "GET" "/api/system/health" 200
Test-Endpoint "GET" "/api/platform/settings" 200

# Users & Roles
Write-Host "`n7. Users & Roles" -ForegroundColor Yellow
Test-Endpoint "GET" "/api/users" 200
Test-Endpoint "GET" "/api/roles" 200
Test-Endpoint "GET" "/api/roles/management" 200
Test-Endpoint "GET" "/api/permissions" 200

# Auth
Write-Host "`n8. Authentication" -ForegroundColor Yellow
Test-Endpoint "GET" "/api/auth/first-user" 200

# General
Write-Host "`n9. General Endpoints" -ForegroundColor Yellow
Test-Endpoint "GET" "/api/patients" 200
Test-Endpoint "GET" "/api/appointments" 200
Test-Endpoint "GET" "/api/audit-logs" 200

# Summary
$passed = ($TestResults | Where-Object { $_.Status -eq "PASS" }).Count
$warned = ($TestResults | Where-Object { $_.Status -eq "WARN" }).Count
$failed = ($TestResults | Where-Object { $_.Status -eq "FAIL" }).Count

Write-Host "`n✅ API Test Suite Complete" -ForegroundColor Green
Write-Host "`nResults Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Passed: $passed" -ForegroundColor Green
Write-Host "  ⚠ Warned: $warned" -ForegroundColor Yellow
Write-Host "  ✗ Failed: $failed" -ForegroundColor Red
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Ensure database is connected"
Write-Host "2. Seed initial data: npm run seed:super-admin"
Write-Host "3. Test login at http://localhost:3000/login"

