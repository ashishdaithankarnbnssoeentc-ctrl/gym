# PowerShell script to setup security enforcement
# Creates the exec_sql function and runs CI checks

# Set environment variables
$env:SUPABASE_URL = "https://ozmmontfdlnzvqchhzdd.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = ""

Write-Host "🔒 Setting up security enforcement..." -ForegroundColor Green

# Read and execute the SQL setup
$sqlSetup = Get-Content -Path "database/schema/create.exec.sql" -Raw

# Create the exec_sql function using curl to Supabase REST API
$headers = @{
    "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer " + $env:SUPABASE_SERVICE_ROLE_KEY
    "Content-Type" = "application/json"
}

$body = @{
    "query" = $sqlSetup
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$($env:SUPABASE_URL)/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body
    Write-Host "✅ exec_sql function created successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create exec_sql function: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Now run the security enforcement CI
Write-Host "🔍 Running security enforcement checks..." -ForegroundColor Yellow
node scripts/security.enforcement.ci.js
