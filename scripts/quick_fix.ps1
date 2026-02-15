# Quick Fix for Rovo Dev CLI
# Run this before starting rovodev

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Quick SSL & Proxy Fix for Rovo Dev CLI" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Detect and set proxy
$commonPorts = @(10809, 10808, 1080, 7890, 2080)
$proxyFound = $false

foreach ($port in $commonPorts) {
    try {
        $connection = New-Object System.Net.Sockets.TcpClient("127.0.0.1", $port)
        if ($connection.Connected) {
            $env:HTTP_PROXY = "http://127.0.0.1:$port"
            $env:HTTPS_PROXY = "http://127.0.0.1:$port"
            Write-Host "✓ Proxy detected on port $port" -ForegroundColor Green
            $proxyFound = $true
            $connection.Close()
            break
        }
    } catch {
        # Port not available, continue
    }
}

if (-not $proxyFound) {
    Write-Host "⚠ No proxy detected. Make sure your VPN is running!" -ForegroundColor Yellow
}

# Disable SSL verification
$env:PYTHONHTTPSVERIFY = "0"
$env:CURL_CA_BUNDLE = ""
$env:REQUESTS_CA_BUNDLE = ""
$env:SSL_CERT_FILE = ""
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:PYTHONWARNINGS = "ignore:Unverified HTTPS request"

Write-Host "✓ SSL verification disabled" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run: acli rovodev run" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
