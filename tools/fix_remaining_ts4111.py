#!/usr/bin/env python3
import re
from pathlib import Path

# Manually fix the specific remaining TS4111 errors
fixes = [
    ('src/services/utilityTools.ts', 111, 'format', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 177, 'version', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 178, 'count', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 241, 'text', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 242, 'algorithm', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 308, 'text', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 347, 'text', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 392, 'json', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 393, 'indent', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 439, 'text', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 440, 'operation', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 533, 'type', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 534, 'min', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 535, 'max', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 536, 'length', r"validated\.sanitized!\.", "validated.sanitized!['"),
    ('src/services/utilityTools.ts', 537, 'includeSpecialChars', r"validated\.sanitized!\.", "validated.sanitized!['"),
]

for filepath, line_num, prop, pattern, replacement in fixes:
    path = Path('/home/claude') / filepath
    with open(path, 'r') as f:
        lines = f.readlines()
    
    idx = line_num - 1
    line = lines[idx]
    new_line = re.sub(pattern + prop + r'\b', replacement + prop + "']", line)
    
    if new_line != line:
        lines[idx] = new_line
        print(f"✅ Fixed line {line_num}: {prop}")
    
    with open(path, 'w') as f:
        f.writelines(lines)

print("Done!")
