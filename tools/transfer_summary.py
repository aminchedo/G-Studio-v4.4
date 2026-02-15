"""Emit Transfer Summary after moves/patches. No MD."""
import json
from pathlib import Path

LOG_PATH = Path("mcp-audit.log")

def emit_transfer_summary(
    timestamp,
    total_scanned,
    n_moved,
    remaining_unused,
    patches_generated,
    patches_applied,
    pending_manual,
):
    report_path = f"reports/{timestamp}/"
    msg = f"""Transfer Summary - timestamp: {timestamp}
Total scanned: {total_scanned}
Moved to temp: {n_moved}
Remaining unused: {remaining_unused}
Patches generated: {patches_generated}
Patches applied: {patches_applied}
Pending manual approvals: {pending_manual}
Report: {report_path}"""
    print(msg)
    record = {
        "type": "transfer_summary",
        "timestamp": timestamp,
        "total_scanned": total_scanned,
        "moved_to_temp": n_moved,
        "remaining_unused": remaining_unused,
        "patches_generated": patches_generated,
        "patches_applied": patches_applied,
        "pending_manual": pending_manual,
        "report": report_path,
    }
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
    return 0
