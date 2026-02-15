#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rovo Dev CLI - SSL Problem Solver
This script fixes SSL connection issues by configuring proxy settings and disabling SSL verification
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def print_banner():
    """Display script banner"""
    banner = """
    ╔═══════════════════════════════════════════════════╗
    ║     🔧 Rovo Dev CLI - SSL Problem Solver 🔧      ║
    ║         Fix SSL & Network Connection Issues       ║
    ╚═══════════════════════════════════════════════════╝
    """
    print(banner)

def detect_proxy():
    """Auto-detect common VPN/proxy ports"""
    print("\n[1] Detecting VPN/Proxy settings...")
    
    common_ports = [10809, 10808, 1080, 7890, 2080, 8080, 9090]
    detected_proxy = None
    
    # Check environment variables first
    for var in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
        if os.environ.get(var):
            detected_proxy = os.environ[var]
            print(f"   ✓ Found proxy in environment: {detected_proxy}")
            return detected_proxy
    
    # Try to detect common proxy ports
    print("   Checking common VPN/proxy ports...")
    for port in common_ports:
        try:
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.5)
            result = sock.connect_ex(('127.0.0.1', port))
            sock.close()
            if result == 0:
                detected_proxy = f"http://127.0.0.1:{port}"
                print(f"   ✓ Detected proxy on port {port}")
                return detected_proxy
        except:
            pass
    
    print("   ⚠ No proxy detected automatically")
    print("   Please make sure your VPN/proxy is running")
    return None

def setup_proxy_environment(proxy_url=None):
    """Setup proxy environment variables"""
    print("\n[2] Configuring proxy environment...")
    
    if not proxy_url:
        # Ask user for proxy settings
        print("\n   Common VPN/Proxy ports:")
        print("   - V2Ray/V2RayN: 10809, 10808")
        print("   - Clash: 7890")
        print("   - Shadowsocks: 1080")
        print("   - Custom: Enter your port")
        
        try:
            port = input("\n   Enter your proxy port (or press Enter to skip): ").strip()
            if port:
                proxy_url = f"http://127.0.0.1:{port}"
        except:
            pass
    
    if proxy_url:
        # Set environment variables
        proxy_vars = {
            'HTTP_PROXY': proxy_url,
            'HTTPS_PROXY': proxy_url,
            'http_proxy': proxy_url,
            'https_proxy': proxy_url,
            'ALL_PROXY': proxy_url,
            'all_proxy': proxy_url
        }
        
        for var, value in proxy_vars.items():
            os.environ[var] = value
            print(f"   ✓ {var} = {value}")
        
        # Save to system environment on Windows
        if platform.system() == 'Windows':
            print("\n   Adding to system environment variables...")
            for var, value in proxy_vars.items():
                try:
                    subprocess.run(
                        ['setx', var, value],
                        capture_output=True,
                        check=False
                    )
                except:
                    pass
        
        return True
    else:
        print("   ⚠ Skipping proxy configuration")
        return False

def disable_ssl_verification():
    """Disable SSL verification for Python"""
    print("\n[3] Disabling SSL verification...")
    
    # Set environment variables
    env_vars = {
        'PYTHONHTTPSVERIFY': '0',
        'CURL_CA_BUNDLE': '',
        'REQUESTS_CA_BUNDLE': '',
        'SSL_CERT_FILE': '',
        'NODE_TLS_REJECT_UNAUTHORIZED': '0',
        'PYTHONWARNINGS': 'ignore:Unverified HTTPS request'
    }
    
    for var, value in env_vars.items():
        os.environ[var] = value
        print(f"   ✓ {var} = {value}")
    
    # Save to system environment on Windows
    if platform.system() == 'Windows':
        print("\n   Adding to system environment variables...")
        for var, value in env_vars.items():
            try:
                subprocess.run(
                    ['setx', var, value],
                    capture_output=True,
                    check=False
                )
            except Exception as e:
                print(f"   ⚠ Error setting {var}: {e}")
    
    return True

def create_pip_config():
    """Create pip configuration file to disable SSL"""
    print("\n[4] Configuring pip...")
    
    if platform.system() == 'Windows':
        pip_config_dir = Path(os.environ.get('APPDATA', '')) / 'pip'
    else:
        pip_config_dir = Path.home() / '.config' / 'pip'
    
    pip_config_dir.mkdir(parents=True, exist_ok=True)
    pip_config_file = pip_config_dir / 'pip.ini' if platform.system() == 'Windows' else pip_config_dir / 'pip.conf'
    
    config_content = """[global]
trusted-host = pypi.python.org
               pypi.org
               files.pythonhosted.org
cert = 
"""
    
    try:
        pip_config_file.write_text(config_content, encoding='utf-8')
        print(f"   ✓ Config file created: {pip_config_file}")
        return True
    except Exception as e:
        print(f"   ✗ Error creating config: {e}")
        return False

def create_rovodev_wrapper(proxy_url=None):
    """Create wrapper script to run rovodev with SSL and proxy settings"""
    print("\n[5] Creating wrapper script...")
    
    if platform.system() == 'Windows':
        wrapper_path = Path.cwd() / 'run_rovodev.bat'
        
        proxy_lines = ""
        if proxy_url:
            proxy_lines = f"""set HTTP_PROXY={proxy_url}
set HTTPS_PROXY={proxy_url}
set http_proxy={proxy_url}
set https_proxy={proxy_url}
set ALL_PROXY={proxy_url}
"""
        
        wrapper_content = f"""@echo off
REM Rovo Dev CLI Wrapper with SSL fix and Proxy support

{proxy_lines}
set PYTHONHTTPSVERIFY=0
set CURL_CA_BUNDLE=
set REQUESTS_CA_BUNDLE=
set SSL_CERT_FILE=
set NODE_TLS_REJECT_UNAUTHORIZED=0
set PYTHONWARNINGS=ignore:Unverified HTTPS request

echo ================================================
echo   Starting Rovo Dev CLI
echo   - SSL verification: DISABLED
echo   - Proxy: {"ENABLED (" + proxy_url + ")" if proxy_url else "NOT SET"}
echo ================================================
echo.

acli rovodev run %*
"""
    else:
        wrapper_path = Path.cwd() / 'run_rovodev.sh'
        
        proxy_lines = ""
        if proxy_url:
            proxy_lines = f"""export HTTP_PROXY="{proxy_url}"
export HTTPS_PROXY="{proxy_url}"
export http_proxy="{proxy_url}"
export https_proxy="{proxy_url}"
export ALL_PROXY="{proxy_url}"
"""
        
        wrapper_content = f"""#!/bin/bash
# Rovo Dev CLI Wrapper with SSL fix and Proxy support

{proxy_lines}
export PYTHONHTTPSVERIFY=0
export CURL_CA_BUNDLE=
export REQUESTS_CA_BUNDLE=
export SSL_CERT_FILE=
export NODE_TLS_REJECT_UNAUTHORIZED=0
export PYTHONWARNINGS="ignore:Unverified HTTPS request"

echo "================================================"
echo "  Starting Rovo Dev CLI"
echo "  - SSL verification: DISABLED"
echo "  - Proxy: {"ENABLED (" + proxy_url + ")" if proxy_url else "NOT SET"}"
echo "================================================"
echo

acli rovodev run "$@"
"""
    
    try:
        wrapper_path.write_text(wrapper_content, encoding='utf-8')
        if platform.system() != 'Windows':
            os.chmod(wrapper_path, 0o755)
        print(f"   ✓ Wrapper created: {wrapper_path}")
        print(f"\n   From now on, use this command:")
        if platform.system() == 'Windows':
            print(f"   .\\run_rovodev.bat")
        else:
            print(f"   ./run_rovodev.sh")
        return True
    except Exception as e:
        print(f"   ✗ Error creating wrapper: {e}")
        return False

def create_quick_fix_script():
    """Create a quick one-line fix script"""
    print("\n[6] Creating quick-fix PowerShell script...")
    
    if platform.system() == 'Windows':
        quick_fix_path = Path.cwd() / 'quick_fix.ps1'
        quick_fix_content = """# Quick Fix for Rovo Dev CLI
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
"""
        
        try:
            quick_fix_path.write_text(quick_fix_content, encoding='utf-8')
            print(f"   ✓ Quick-fix script created: {quick_fix_path}")
            print(f"\n   Quick usage:")
            print(f"   . .\\quick_fix.ps1; acli rovodev run")
            return True
        except Exception as e:
            print(f"   ✗ Error creating quick-fix: {e}")
            return False
    
    return False

def test_connection():
    """Test internet connection through proxy"""
    print("\n[7] Testing connection...")
    
    try:
        import urllib.request
        import ssl
        
        # Create unverified SSL context
        ssl_context = ssl._create_unverified_context()
        
        # Test URLs
        test_urls = [
            'https://www.google.com',
            'https://pypi.org',
            'https://www.python.org'
        ]
        
        for url in test_urls:
            try:
                req = urllib.request.Request(url)
                response = urllib.request.urlopen(req, context=ssl_context, timeout=5)
                print(f"   ✓ Successfully connected to {url}")
                return True
            except Exception as e:
                print(f"   ✗ Failed to connect to {url}: {str(e)[:50]}")
        
        print("   ⚠ Connection test failed. Please check your VPN/proxy.")
        return False
        
    except Exception as e:
        print(f"   ⚠ Could not perform connection test: {e}")
        return False

def print_final_instructions(proxy_detected):
    """Print final instructions"""
    print("\n" + "="*60)
    print("📋 FINAL INSTRUCTIONS")
    print("="*60)
    print("""
METHOD 1 - Using Wrapper Script (RECOMMENDED):
   Close and reopen PowerShell, then:
   cd C:\\project\\G-studio\\G-Studio-v2.3.0-Complete
   .\\run_rovodev.bat

METHOD 2 - Using Quick Fix:
   . .\\quick_fix.ps1
   acli rovodev run

METHOD 3 - Manual (one-time):
   $env:PYTHONHTTPSVERIFY='0'""")
    
    if proxy_detected:
        print(f"   $env:HTTPS_PROXY='{proxy_detected}'")
    
    print("""   acli rovodev run

IMPORTANT NOTES:
""")
    
    if not proxy_detected:
        print("""   ⚠ NO PROXY DETECTED!
   Make sure your VPN/proxy is running before using rovodev.
   Common VPN software: V2RayN, Clash, Shadowsocks
""")
    else:
        print(f"""   ✓ Proxy configured: {proxy_detected}
   Make sure your VPN stays connected.
""")
    
    print("""
   ⚠ SECURITY WARNING:
   SSL verification is disabled. Use only in development.
   Do not use for production or sensitive operations.
""")
    
    print("="*60 + "\n")

def main():
    """Main function"""
    print_banner()
    
    print("This script will fix SSL issues by:")
    print("• Auto-detecting and configuring your VPN/proxy")
    print("• Disabling SSL verification")
    print("• Creating helper scripts for easy execution")
    print("\n" + "="*60 + "\n")
    
    # Execute all steps
    success_count = 0
    total_steps = 7
    
    # Step 1: Detect proxy
    proxy_url = detect_proxy()
    success_count += 1
    
    # Step 2: Setup proxy environment
    if setup_proxy_environment(proxy_url):
        success_count += 1
    
    # Step 3: Disable SSL verification
    if disable_ssl_verification():
        success_count += 1
    
    # Step 4: Configure pip
    if create_pip_config():
        success_count += 1
    
    # Step 5: Create wrapper
    if create_rovodev_wrapper(proxy_url):
        success_count += 1
    
    # Step 6: Create quick fix
    if create_quick_fix_script():
        success_count += 1
    
    # Step 7: Test connection
    if test_connection():
        success_count += 1
    
    # Final result
    print("\n" + "="*60)
    print(f"✅ Result: {success_count}/{total_steps} steps completed successfully")
    print("="*60)
    
    # Print final instructions
    print_final_instructions(proxy_url)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Script stopped by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
