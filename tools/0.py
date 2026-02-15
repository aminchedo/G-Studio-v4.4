import os
import shutil

PROJECT_ROOT = os.getcwd()
FINAL_DIR = os.path.join(PROJECT_ROOT, "final")

TARGET_FILES = {
    "App.tsx",
    "EditorLayout.tsx",
    "AISettingsHub.tsx",
    "additional.ts",
    "projectStore.ts",
    "geminiService.ts",
    "MainLayout.tsx",
    "VirtualizedMessageList.tsx",
    "ModalManager.tsx",
    "ToolUsageAnalyticsModal.tsx",
    "streamProcessor.ts",
}

def main():
    if not os.path.exists(FINAL_DIR):
        print("❌ 'final' folder not found.")
        return

    print("🔁 Restoring files from /final to original locations...\n")

    restored_count = 0

    # Loop through files inside final
    for file in os.listdir(FINAL_DIR):
        if file not in TARGET_FILES:
            continue

        source_path = os.path.join(FINAL_DIR, file)

        # Search entire project for matching filename
        for root, dirs, files in os.walk(PROJECT_ROOT):
            if "node_modules" in root or "final" in root:
                continue

            if file in files:
                target_path = os.path.join(root, file)

                try:
                    shutil.copy2(source_path, target_path)
                    print(f"✅ Restored: {file} → {target_path}")
                    restored_count += 1
                except Exception as e:
                    print(f"❌ Failed restoring {file}: {e}")

    print("\n📦 DONE")
    print(f"✅ Total restored copies: {restored_count}")

if __name__ == "__main__":
    main()
