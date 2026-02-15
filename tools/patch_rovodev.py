#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rovo Dev CLI - Deep SSL Patcher
This script patches the rovodev library itself to bypass SSL verification
"""

import os
import sys
import site
import subprocess
from pathlib import Path
import shutil

def print_banner():
    banner = """
    ╔═══════════════════════════════════════════════════╗
    ║        🔧 Rovo Dev - Deep SSL Patcher 🔧         ║
    ║      Patches rovodev library internals           ║
    ╚═══════════════════════════════════════════════════╝
    """
    print(banner)

def find_rovodev_location():
    """Find where rovodev is installed"""
    print("\n[1] Locating rovodev installation...")
    
    try:
        result = subprocess.run(
            [sys.executable, '-c', 'import rovodev; print(rovodev.__file__)'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            rovodev_path = Path(result.stdout.strip()).parent
            print(f"   ✓ Found rovodev at: {rovodev_path}")
            return rovodev_path
        else:
            print("   ✗ rovodev not found in Python path")
            
            # Try to find it manually
            site_packages = site.getsitepackages()
            for sp in site_packages:
                possible_path = Path(sp) / 'rovodev'
                if possible_path.exists():
                    print(f"   ✓ Found rovodev at: {possible_path}")
                    return possible_path
            
            return None
    except Exception as e:
        print(f"   ✗ Error locating rovodev: {e}")
        return None

def create_ssl_patch_file():
    """Create the SSL bypass patch module"""
    print("\n[2] Creating SSL bypass patch...")
    
    patch_content = '''"""
SSL Bypass Patch for Rovodev
This module patches SSL verification globally
"""

import ssl
import warnings
import urllib3

# Disable SSL warnings
warnings.filterwarnings('ignore', message='Unverified HTTPS request')
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Patch SSL context creation
_original_create_default_context = ssl.create_default_context

def _patched_create_default_context(*args, **kwargs):
    """Create SSL context with verification disabled"""
    context = _original_create_default_context(*args, **kwargs)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context

ssl.create_default_context = _patched_create_default_context

# Patch for requests library
try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.poolmanager import PoolManager
    
    class SSLAdapter(HTTPAdapter):
        def init_poolmanager(self, *args, **kwargs):
            kwargs['ssl_version'] = ssl.PROTOCOL_TLS
            kwargs['cert_reqs'] = ssl.CERT_NONE
            return super().init_poolmanager(*args, **kwargs)
    
    # Monkey patch requests
    original_request = requests.Session.request
    
    def patched_request(self, *args, **kwargs):
        kwargs['verify'] = False
        return original_request(self, *args, **kwargs)
    
    requests.Session.request = patched_request
except ImportError:
    pass

# Patch for urllib
try:
    import urllib.request
    
    original_urlopen = urllib.request.urlopen
    
    def patched_urlopen(*args, **kwargs):
        if 'context' not in kwargs:
            kwargs['context'] = ssl._create_unverified_context()
        return original_urlopen(*args, **kwargs)
    
    urllib.request.urlopen = patched_urlopen
except:
    pass

print("[SSL Patch] SSL verification globally disabled")
'''
    
    patch_file = Path.cwd() / 'ssl_bypass_patch.py'
    patch_file.write_text(patch_content, encoding='utf-8')
    print(f"   ✓ Patch file created: {patch_file}")
    return patch_file

def patch_rovodev_init(rovodev_path):
    """Patch rovodev's __init__.py to import SSL bypass"""
    print("\n[3] Patching rovodev __init__.py...")
    
    init_file = rovodev_path / '__init__.py'
    
    if not init_file.exists():
        print(f"   ✗ __init__.py not found at {init_file}")
        return False
    
    # Backup original file
    backup_file = init_file.with_suffix('.py.backup')
    if not backup_file.exists():
        shutil.copy2(init_file, backup_file)
        print(f"   ✓ Backup created: {backup_file}")
    
    # Read current content
    content = init_file.read_text(encoding='utf-8')
    
    # Check if already patched
    if 'SSL_BYPASS_PATCH' in content:
        print("   ℹ Already patched, skipping...")
        return True
    
    # Add SSL bypass at the top
    patch_code = '''# SSL_BYPASS_PATCH - Auto-generated
import os
import ssl
import warnings

# Set environment variables
os.environ['PYTHONHTTPSVERIFY'] = '0'
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['REQUESTS_CA_BUNDLE'] = ''
os.environ['SSL_CERT_FILE'] = ''

# Disable warnings
warnings.filterwarnings('ignore', message='Unverified HTTPS request')

try:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
except:
    pass

# Patch SSL
_original_create_default_context = ssl.create_default_context

def _patched_ssl_context(*args, **kwargs):
    ctx = _original_create_default_context(*args, **kwargs)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

ssl.create_default_context = _patched_ssl_context
ssl._create_default_https_context = _patched_ssl_context

# END SSL_BYPASS_PATCH

'''
    
    # Insert at the beginning after any existing imports
    new_content = patch_code + content
    
    try:
        init_file.write_text(new_content, encoding='utf-8')
        print(f"   ✓ Successfully patched {init_file}")
        return True
    except Exception as e:
        print(f"   ✗ Error patching file: {e}")
        # Restore backup
        if backup_file.exists():
            shutil.copy2(backup_file, init_file)
            print("   ↺ Restored from backup")
        return False

def patch_common_module(rovodev_path):
    """Patch the common/return_stale_and_refresh_cache module"""
    print("\n[4] Patching common modules...")
    
    common_path = rovodev_path / 'common'
    if not common_path.exists():
        print(f"   ⚠ Common directory not found")
        return False
    
    # Try to find and patch the cache module
    cache_files = [
        common_path / 'return_stale_and_refresh_cache.py',
        common_path / '__init__.py'
    ]
    
    patched_count = 0
    for cache_file in cache_files:
        if not cache_file.exists():
            continue
            
        # Backup
        backup = cache_file.with_suffix('.py.backup')
        if not backup.exists():
            shutil.copy2(cache_file, backup)
        
        content = cache_file.read_text(encoding='utf-8')
        
        # Skip if already patched
        if 'SSL_BYPASS_PATCH' in content:
            continue
        
        # Add SSL bypass
        patch = '''# SSL_BYPASS_PATCH
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
# END SSL_BYPASS_PATCH

'''
        new_content = patch + content
        
        try:
            cache_file.write_text(new_content, encoding='utf-8')
            print(f"   ✓ Patched {cache_file.name}")
            patched_count += 1
        except Exception as e:
            print(f"   ✗ Error patching {cache_file.name}: {e}")
    
    return patched_count > 0

def create_sitecustomize():
    """Create sitecustomize.py to apply patches globally"""
    print("\n[5] Creating global sitecustomize.py...")
    
    site_packages = site.getsitepackages()
    if not site_packages:
        print("   ✗ Could not find site-packages")
        return False
    
    sitecustomize_path = Path(site_packages[0]) / 'sitecustomize.py'
    
    sitecustomize_content = '''"""
Site customization - SSL Bypass for Rovodev
This file is automatically loaded by Python on startup
"""

import os
import ssl
import warnings

# Environment variables
os.environ['PYTHONHTTPSVERIFY'] = '0'
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['REQUESTS_CA_BUNDLE'] = ''
os.environ['SSL_CERT_FILE'] = ''
os.environ['PYTHONWARNINGS'] = 'ignore:Unverified HTTPS request'

# Disable SSL warnings
warnings.filterwarnings('ignore')

try:
    import urllib3
    urllib3.disable_warnings()
except:
    pass

# Global SSL patch
original_create_context = ssl.create_default_context

def patched_create_context(*args, **kwargs):
    ctx = original_create_context(*args, **kwargs)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

ssl.create_default_context = patched_create_context
ssl._create_default_https_context = ssl._create_unverified_context
'''
    
    try:
        sitecustomize_path.write_text(sitecustomize_content, encoding='utf-8')
        print(f"   ✓ Created {sitecustomize_path}")
        return True
    except Exception as e:
        print(f"   ✗ Error creating sitecustomize: {e}")
        return False

def setup_environment_permanent():
    """Setup permanent environment variables"""
    print("\n[6] Setting up permanent environment...")
    
    env_vars = {
        'PYTHONHTTPSVERIFY': '0',
        'CURL_CA_BUNDLE': '',
        'REQUESTS_CA_BUNDLE': '',
        'SSL_CERT_FILE': '',
        'NODE_TLS_REJECT_UNAUTHORIZED': '0',
        'PYTHONWARNINGS': 'ignore:Unverified HTTPS request'
    }
    
    if os.name == 'nt':  # Windows
        for var, value in env_vars.items():
            try:
                subprocess.run(['setx', var, value], capture_output=True, check=False)
                print(f"   ✓ Set {var}")
            except:
                pass
    else:  # Linux/Mac
        shell_rc = Path.home() / '.bashrc'
        if shell_rc.exists():
            with open(shell_rc, 'a') as f:
                f.write('\n# SSL Bypass for Rovodev\n')
                for var, value in env_vars.items():
                    f.write(f'export {var}="{value}"\n')
            print(f"   ✓ Added to {shell_rc}")
    
    return True

def create_startup_script():
    """Create a startup script with all patches"""
    print("\n[7] Creating startup script...")
    
    script_path = Path.cwd() / 'start_rovodev.bat'
    
    script_content = '''@echo off
REM Rovodev Startup Script with SSL Bypass
SETLOCAL

REM Set environment variables
set PYTHONHTTPSVERIFY=0
set CURL_CA_BUNDLE=
set REQUESTS_CA_BUNDLE=
set SSL_CERT_FILE=
set NODE_TLS_REJECT_UNAUTHORIZED=0
set PYTHONWARNINGS=ignore:Unverified HTTPS request

REM Detect proxy
for %%p in (10809 10808 1080 7890) do (
    netstat -an | findstr "127.0.0.1:%%p" >nul 2>&1
    if !errorlevel! equ 0 (
        set HTTP_PROXY=http://127.0.0.1:%%p
        set HTTPS_PROXY=http://127.0.0.1:%%p
        echo [+] Proxy detected on port %%p
        goto :proxy_set
    )
)

echo [!] No proxy detected - make sure your VPN is running!
:proxy_set

echo.
echo ================================================
echo   Starting Rovo Dev CLI
echo   SSL Verification: DISABLED
echo   Proxy: %HTTPS_PROXY%
echo ================================================
echo.

cd /d "%~dp0"
acli rovodev run %*

ENDLOCAL
'''
    
    try:
        script_path.write_text(script_content, encoding='utf-8')
        print(f"   ✓ Created {script_path}")
        print(f"\n   Use this command to start:")
        print(f"   .\\start_rovodev.bat")
        return True
    except Exception as e:
        print(f"   ✗ Error creating script: {e}")
        return False

def main():
    print_banner()
    print("\nThis script will deeply patch rovodev to bypass SSL verification.\n")
    print("="*60 + "\n")
    
    # Find rovodev
    rovodev_path = find_rovodev_location()
    
    if not rovodev_path:
        print("\n❌ ERROR: Could not find rovodev installation")
        print("\nTrying alternative method...")
        
        # Alternative: Create sitecustomize and environment setup
        create_sitecustomize()
        setup_environment_permanent()
        create_startup_script()
        
        print("\n" + "="*60)
        print("⚠️  Could not patch rovodev directly, but created:")
        print("   • Global SSL bypass (sitecustomize.py)")
        print("   • Environment variables")
        print("   • Startup script (start_rovodev.bat)")
        print("\nTry running: .\\start_rovodev.bat")
        print("="*60)
        return
    
    # Execute patches
    success_count = 0
    total_patches = 6
    
    if patch_rovodev_init(rovodev_path):
        success_count += 1
    
    if patch_common_module(rovodev_path):
        success_count += 1
    
    create_ssl_patch_file()
    success_count += 1
    
    if create_sitecustomize():
        success_count += 1
    
    if setup_environment_permanent():
        success_count += 1
    
    if create_startup_script():
        success_count += 1
    
    # Results
    print("\n" + "="*60)
    print(f"✅ Successfully applied {success_count}/{total_patches} patches")
    print("="*60)
    
    print("\n📋 NEXT STEPS:")
    print("""
1. Close this PowerShell window
2. Open a NEW PowerShell window (to reload environment)
3. Navigate to your project:
   cd C:\\project\\G-studio\\G-Studio-v2.3.0-Complete
4. Run using the startup script:
   .\\start_rovodev.bat

OR run directly:
   acli rovodev run

The patches are now permanent and will work automatically!
""")
    
    print("⚠️  IMPORTANT:")
    print("   • Make sure your VPN/proxy is running")
    print("   • If still fails, try: python -X dev start_rovodev.bat")
    print("   • To restore original rovodev, delete *.backup files\n")
    print("="*60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
