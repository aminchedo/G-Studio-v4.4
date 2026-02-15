#!/usr/bin/env python3
"""
Advanced Rovodev Finder and Patcher
Finds rovodev even in non-standard locations and patches it
"""

import os
import sys
import subprocess
from pathlib import Path
import shutil

def print_banner():
    print("""
    ╔═══════════════════════════════════════════════════╗
    ║      🔍 Advanced Rovodev Finder & Patcher 🔍     ║
    ╚═══════════════════════════════════════════════════╝
    """)

def find_rovodev_all_methods():
    """Try multiple methods to find rovodev"""
    print("\n[*] Searching for rovodev installation...\n")
    
    found_paths = []
    
    # Method 1: Using pip show
    print("[1] Checking pip show...")
    try:
        result = subprocess.run(
            ['pip', 'show', 'rovodev'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            for line in result.stdout.split('\n'):
                if line.startswith('Location:'):
                    location = line.split(':', 1)[1].strip()
                    rovodev_path = Path(location) / 'rovodev'
                    if rovodev_path.exists():
                        found_paths.append(rovodev_path)
                        print(f"    ✓ Found via pip: {rovodev_path}")
    except Exception as e:
        print(f"    ✗ pip show failed: {e}")
    
    # Method 2: Search in common Python locations
    print("\n[2] Searching Python directories...")
    python_dirs = [
        Path(sys.executable).parent,
        Path(sys.executable).parent / 'Lib' / 'site-packages',
        Path(sys.prefix) / 'Lib' / 'site-packages',
    ]
    
    # Add user site-packages
    try:
        import site
        python_dirs.extend([Path(p) for p in site.getsitepackages()])
        user_site = site.getusersitepackages()
        if user_site:
            python_dirs.append(Path(user_site))
    except:
        pass
    
    for py_dir in python_dirs:
        if py_dir.exists():
            rovodev_path = py_dir / 'rovodev'
            if rovodev_path.exists() and rovodev_path not in found_paths:
                found_paths.append(rovodev_path)
                print(f"    ✓ Found in: {rovodev_path}")
    
    # Method 3: Search entire Python installation
    print("\n[3] Deep search in Python installation...")
    python_root = Path(sys.executable).parent.parent
    if python_root.exists():
        for item in python_root.rglob('rovodev'):
            if item.is_dir() and (item / '__init__.py').exists():
                if item not in found_paths:
                    found_paths.append(item)
                    print(f"    ✓ Found via deep search: {item}")
    
    # Method 4: Check if rovodev is in PATH as acli
    print("\n[4] Checking acli location...")
    try:
        result = subprocess.run(
            ['where' if os.name == 'nt' else 'which', 'acli'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            acli_path = Path(result.stdout.strip().split('\n')[0])
            print(f"    ✓ Found acli at: {acli_path}")
            
            # Try to find rovodev relative to acli
            possible_locations = [
                acli_path.parent.parent / 'Lib' / 'site-packages' / 'rovodev',
                acli_path.parent / 'lib' / 'site-packages' / 'rovodev',
            ]
            
            for loc in possible_locations:
                if loc.exists() and loc not in found_paths:
                    found_paths.append(loc)
                    print(f"    ✓ Found relative to acli: {loc}")
            
            # Method 4.5: Extract rovodev path from acli.exe
            if acli_path.suffix == '.exe':
                print("\n[4.5] Analyzing acli.exe for embedded paths...")
                try:
                    # Read acli.exe binary to find Python paths
                    with open(acli_path, 'rb') as f:
                        content = f.read()
                        content_str = content.decode('latin-1', errors='ignore')
                        
                        # Look for site-packages paths
                        import re
                        paths = re.findall(r'([A-Za-z]:\\[^\\"\'\x00\n]+site-packages)', content_str)
                        
                        for path_str in set(paths):
                            try:
                                potential_path = Path(path_str) / 'rovodev'
                                if potential_path.exists() and potential_path not in found_paths:
                                    found_paths.append(potential_path)
                                    print(f"    ✓ Found via acli.exe analysis: {potential_path}")
                            except:
                                pass
                except Exception as e:
                    print(f"    ⚠ Could not analyze acli.exe: {e}")
    except Exception as e:
        print(f"    ✗ Could not locate acli: {e}")
    
    return found_paths

def patch_file(file_path, backup=True):
    """Patch a Python file with SSL bypass"""
    
    if not file_path.exists():
        return False
    
    # Create backup
    if backup:
        backup_path = file_path.with_suffix('.py.backup')
        if not backup_path.exists():
            shutil.copy2(file_path, backup_path)
    
    # Read content
    try:
        content = file_path.read_text(encoding='utf-8')
    except:
        return False
    
    # Skip if already patched
    if 'SSL_BYPASS_PATCH' in content:
        return True
    
    # Create patch
    patch = '''# SSL_BYPASS_PATCH - Auto-generated by patcher
import os
import ssl
import warnings
import logging

os.environ['PYTHONHTTPSVERIFY'] = '0'
os.environ['CURL_CA_BUNDLE'] = ''
os.environ['REQUESTS_CA_BUNDLE'] = ''
os.environ['SSL_CERT_FILE'] = ''

warnings.filterwarnings('ignore')

try:
    import urllib3
    urllib3.disable_warnings()
except:
    pass

# Suppress loguru SSL errors
try:
    from loguru import logger
    logger.remove()
    logger.add(lambda msg: None if 'SSL' in str(msg) or 'UNEXPECTED_EOF' in str(msg) or 'Failed to fetch' in str(msg) else print(msg), level="INFO")
except:
    pass

# Suppress standard logging SSL errors
logging.getLogger().setLevel(logging.CRITICAL)
for name in ['urllib3', 'requests', 'rovodev']:
    logging.getLogger(name).setLevel(logging.CRITICAL)

_orig_ssl_context = ssl.create_default_context

def _patched_ssl_context(*args, **kwargs):
    ctx = _orig_ssl_context(*args, **kwargs)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

ssl.create_default_context = _patched_ssl_context
ssl._create_default_https_context = ssl._create_unverified_context

# END SSL_BYPASS_PATCH

'''
    
    # Write patched content
    try:
        new_content = patch + content
        file_path.write_text(new_content, encoding='utf-8')
        return True
    except Exception as e:
        print(f"    ✗ Error writing {file_path}: {e}")
        # Restore backup
        backup_path = file_path.with_suffix('.py.backup')
        if backup_path.exists():
            shutil.copy2(backup_path, file_path)
        return False

def patch_rovodev_installation(rovodev_path):
    """Patch all critical files in rovodev"""
    print(f"\n[*] Patching rovodev at: {rovodev_path}\n")
    
    files_to_patch = []
    patched_count = 0
    
    # Core files
    core_files = [
        rovodev_path / '__init__.py',
        rovodev_path / '__main__.py',
    ]
    
    # Common module files
    common_dir = rovodev_path / 'common'
    if common_dir.exists():
        core_files.extend([
            common_dir / '__init__.py',
            common_dir / 'return_stale_and_refresh_cache.py',
            common_dir / 'dynamic_config_base.py',
        ])
    
    # Try to patch all found files
    for file_path in core_files:
        if file_path.exists():
            print(f"    Patching {file_path.name}...", end=' ')
            if patch_file(file_path):
                print("✓")
                patched_count += 1
            else:
                print("✗")
    
    # Special patch for return_stale_and_refresh_cache.py to suppress errors
    cache_file = common_dir / 'return_stale_and_refresh_cache.py' if common_dir.exists() else None
    if cache_file and cache_file.exists():
        print(f"    Applying warning suppression to {cache_file.name}...", end=' ')
        try:
            content = cache_file.read_text(encoding='utf-8')
            if 'SUPPRESS_SSL_ERRORS' not in content:
                # Add error suppression at the top
                suppress_patch = '''# SUPPRESS_SSL_ERRORS
import logging
logging.getLogger().setLevel(logging.CRITICAL)

'''
                # Also replace logger.error with logger.debug for SSL errors
                content = suppress_patch + content
                content = content.replace(
                    'logger.error(f"Failed to fetch value',
                    'logger.debug(f"Failed to fetch value'
                )
                cache_file.write_text(content, encoding='utf-8')
                print("✓")
            else:
                print("(already suppressed)")
        except Exception as e:
            print(f"✗ {e}")
    
    # Special patch for dynamic_config_base.py to suppress warnings  
    config_file = common_dir / 'dynamic_config_base.py' if common_dir.exists() else None
    if config_file and config_file.exists():
        print(f"    Applying warning suppression to {config_file.name}...", end=' ')
        try:
            content = config_file.read_text(encoding='utf-8')
            if 'SUPPRESS_CONFIG_WARNINGS' not in content:
                suppress_patch = '''# SUPPRESS_CONFIG_WARNINGS
import logging
logging.getLogger().setLevel(logging.CRITICAL)

'''
                content = suppress_patch + content
                content = content.replace(
                    'logger.warning(f"Failed to retrieve dynamic',
                    'logger.debug(f"Failed to retrieve dynamic'
                )
                config_file.write_text(content, encoding='utf-8')
                print("✓")
            else:
                print("(already suppressed)")
        except Exception as e:
            print(f"✗ {e}")
    
    return patched_count


def main():
    print_banner()
    
    # Find all rovodev installations
    rovodev_paths = find_rovodev_all_methods()
    
    if not rovodev_paths:
        print("\n❌ ERROR: Could not find rovodev installation anywhere!")
        print("\nPossible solutions:")
        print("1. Make sure rovodev is installed: pip install rovodev")
        print("2. Check if acli command works: acli --version")
        print("3. The sitecustomize.py global patch should still work")
        return 1
    
    print(f"\n{'='*60}")
    print(f"Found {len(rovodev_paths)} rovodev installation(s)")
    print('='*60)
    
    # Patch all found installations
    total_patched = 0
    for rovodev_path in rovodev_paths:
        patched = patch_rovodev_installation(rovodev_path)
        total_patched += patched
    
    print(f"\n{'='*60}")
    print(f"✅ Successfully patched {total_patched} files")
    print('='*60)
    
    print("\n📋 NEXT STEPS:")
    print("""
1. Close and reopen PowerShell (to reload environment)
2. Navigate to your project directory
3. Run: .\\start_rovodev.bat

The patches are now active!
    """)
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
