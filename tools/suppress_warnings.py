#!/usr/bin/env python3
"""
Suppress SSL Warnings for Rovodev
Updates sitecustomize.py to hide all SSL-related warnings
"""

import sys
from pathlib import Path

def update_sitecustomize():
    """Update sitecustomize.py with warning suppression"""
    
    # Find sitecustomize.py location
    site_packages = Path(sys.prefix)
    sitecustomize_path = site_packages / 'sitecustomize.py'
    
    if not sitecustomize_path.exists():
        print(f"❌ sitecustomize.py not found at {sitecustomize_path}")
        print("Run patch_rovodev.py first!")
        return False
    
    print(f"[*] Updating {sitecustomize_path}...\n")
    
    # New enhanced sitecustomize content
    new_content = '''"""
Site customization - SSL Bypass for Rovodev with Warning Suppression
This file is automatically loaded by Python on startup
"""

import os
import sys
import ssl
import warnings
import logging

# Environment variables
os.environ['PYTHONHTTPSVERIFY'] = '0'
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['REQUESTS_CA_BUNDLE'] = ''
os.environ['SSL_CERT_FILE'] = ''
os.environ['PYTHONWARNINGS'] = 'ignore'

# Disable ALL warnings
warnings.filterwarnings('ignore')
logging.captureWarnings(True)

# Suppress all logging except CRITICAL
logging.basicConfig(level=logging.CRITICAL)
logging.getLogger().setLevel(logging.CRITICAL)

# Suppress specific loggers
for logger_name in ['urllib3', 'requests', 'rovodev', 'rovodev.common']:
    logging.getLogger(logger_name).setLevel(logging.CRITICAL)

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

# Patch loguru if it gets imported
def patch_loguru():
    """Suppress loguru ERROR and WARNING for SSL"""
    try:
        from loguru import logger
        import sys
        
        # Remove default handler
        logger.remove()
        
        # Add custom filter that suppresses SSL errors
        def filter_ssl_messages(record):
            message = str(record["message"])
            # Block SSL-related messages
            if any(keyword in message for keyword in [
                'SSL', 'UNEXPECTED_EOF', 'Failed to fetch', 
                'Failed to retrieve dynamic', 'cache key',
                'EOF occurred in violation'
            ]):
                return False
            # Block ERROR and WARNING levels for rovodev.common
            if 'rovodev.common' in record.get("name", ""):
                if record["level"].name in ["ERROR", "WARNING"]:
                    return False
            return True
        
        # Re-add handler with filter
        logger.add(
            sys.stderr,
            filter=filter_ssl_messages,
            level="INFO",
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
        )
    except ImportError:
        pass

# Try to patch loguru immediately
patch_loguru()

# Hook into import system to patch loguru when it's imported
original_import = __builtins__.__import__

def custom_import(name, *args, **kwargs):
    module = original_import(name, *args, **kwargs)
    if name == 'loguru' or name.startswith('loguru.'):
        patch_loguru()
    return module

__builtins__.__import__ = custom_import
'''
    
    try:
        # Backup original
        backup = sitecustomize_path.with_suffix('.py.original')
        if not backup.exists():
            sitecustomize_path.rename(backup)
            print(f"✓ Backup created: {backup}")
        
        # Write new content
        sitecustomize_path.write_text(new_content, encoding='utf-8')
        print(f"✓ Updated sitecustomize.py with warning suppression")
        print(f"\n{'='*60}")
        print("✅ SUCCESS!")
        print("="*60)
        print("\nNow close PowerShell and reopen, then run:")
        print("  cd C:\\project\\G-studio\\G-Studio-v2.3.0-Complete")
        print("  acli rovodev run")
        print("\nAll SSL warnings will be hidden!\n")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    update_sitecustomize()
