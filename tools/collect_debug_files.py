import shutil
from pathlib import Path

# =====================================================
# Flat Debug File Collector
# - Script lives inside src/
# - Files are copied to PROJECT ROOT (one level up)
# - All files are placed in ONE directory
# - Name conflicts are resolved by appending folder name
# =====================================================

SRC_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = SRC_ROOT.parent
DEBUG_DIR = PROJECT_ROOT / "debug"

DEBUG_DIR.mkdir(exist_ok=True)

FILES = [
    "services/utilityTools.ts",
    "stores/conversationStore.ts",
    "stores/projectStore.ts",
    "stores/settingsStore.ts",
    "test-local-model.ts",
    "test/setup.ts",
    "theme/designTokens.ts",
    "types/editor.ts",
    "types/index.ts",
    "types/preview.ts",
    "utils/apiClient.ts",
    "utils/errorHandler.ts",
    "utils/EventBus.ts",
    "utils/logger.ts",
    "utils/monitoring.ts",
    "utils/performanceUtils.ts",
    "utils/stateUpdateLogger.ts",
    "utils/storageManager.ts",

    # Priority 2
    "services/mcpService.ts",
    "services/ai/geminiService.ts",
    "hooks/core/useMcp.tsx",
    "components/app/App.tsx",
]

def resolve_name_conflict(dest_dir: Path, src_path: Path) -> Path:
    """
    If a file with the same name already exists,
    append the parent folder name using underscore.
    """
    dest_file = dest_dir / src_path.name
    if not dest_file.exists():
        return dest_file

    parent_name = src_path.parent.name
    new_name = f"{src_path.stem}_{parent_name}{src_path.suffix}"
    return dest_dir / new_name


copied = 0

for rel_path in FILES:
    src_file = SRC_ROOT / rel_path

    if not src_file.exists():
        print(f"WARNING: File not found - {rel_path}")
        continue

    dest_file = resolve_name_conflict(DEBUG_DIR, src_file)
    shutil.copy2(src_file, dest_file)
    copied += 1

print(f"\nDone. {copied} files copied into: {DEBUG_DIR}")
