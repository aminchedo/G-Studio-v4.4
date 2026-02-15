import os
import re
import json
from concurrent.futures import ThreadPoolExecutor

# --- تنظیمات ---
ROOT_DIR = "C:/project/G-studio/G-Studio-v4.4_1-Integratedzi"  # مسیر پروژه
INCLUDE_EXT = (".ts", ".tsx", ".js", ".jsx", ".json", ".py")   # فایل‌های بررسی‌شده
EXCLUDE_DIRS = ("node_modules", "dist", ".git", "reports")      # پوشه‌های نادیده گرفته شده
EXTERNAL_PATH_PATTERN = re.compile(r"[A-Z]:/")                  # شناسایی مسیرهای خارجی ویندوز

results = []

def check_file(file_path):
    """چک کردن یک فایل و پیدا کردن مسیرهای خارجی"""
    found = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for i, line in enumerate(f, 1):
                if EXTERNAL_PATH_PATTERN.search(line):
                    found.append({"line": i, "content": line.strip()})
    except Exception as e:
        return {"file": file_path, "error": str(e), "matches": []}
    return {"file": file_path, "matches": found} if found else None

# --- جمع‌آوری فایل‌ها ---
all_files = []
for root, dirs, files in os.walk(ROOT_DIR):
    # حذف پوشه‌های نادیده گرفته شده
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    for file in files:
        if file.endswith(INCLUDE_EXT):
            all_files.append(os.path.join(root, file))

# --- بررسی موازی ---
with ThreadPoolExecutor(max_workers=8) as executor:
    for res in executor.map(check_file, all_files):
        if res:
            results.append(res)

# --- ذخیره خروجی ---
output_file = os.path.join(ROOT_DIR, "external_paths_report.json")
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print(f"✅ Scan complete! {len(results)} files contain external paths.")
print(f"Report saved to {output_file}")
