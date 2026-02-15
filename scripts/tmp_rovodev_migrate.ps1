$ErrorActionPreference = "Stop"

function New-Dir($p) { if (!(Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

# Fixed project root (script may be run from elsewhere)
$root = "C:\project\G-studio\G-Studio-v2.3.0-Complete"

if (-not (Test-Path (Join-Path $root 'package.json'))) {
  Write-Error "Expected package.json at $root. Aborting."
}

# 1) Backup
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$parent = Split-Path $root -Parent
$backup = Join-Path $parent ("" + (Split-Path $root -Leaf) + "-backup-$stamp")
Write-Host "Creating backup at $backup (excluding heavy, reproducible folders like node_modules, dist) ..."
# Faster backup using robocopy, excluding large/generated directories
$excludeDirs = @("node_modules", ".git", "dist", "build", ".next", "out", "coverage")
$xdArgs = ($excludeDirs | ForEach-Object { "/XD`"" + (Join-Path $root $_) + "`"" }) -join ' '
$cmd = "robocopy `"$root`" `"$backup`" /E /COPYALL /R:2 /W:2 $xdArgs"
Write-Host "Running: $cmd"
cmd.exe /c $cmd | Out-Null
Write-Host "Backup complete."

# 2) Target dirs
$targets = @(
  "src/config",
  "src/services",
  "src/runtime",
  "src/types",
  "src/components",
  "src/components/chat",
  "src/components/conversation",
  "src/components/layout",
  "src/components/preview",
  "src/components/sidebar/file-tree",
  "src/components/modals",
  "src/components/monitoring",
  "src/components/panels",
  "src/components/ribbon",
  "src/components/ui",
  "src/components/editor",
  "src/features",
  "src/features/ai",
  "src/features/ai/AISettingsHub",
  "src/features/code-intelligence"
)
$targets | ForEach-Object { New-Dir (Join-Path $root $_) }

# 3) Move root-level files
$mapRoot = @{
  "config.ts"               = "src/config/config.ts";
  "constants.ts"            = "src/config/constants.ts";
  "types.ts"                = "src/types/types.ts";
  "uiPatterns.ts"           = "src/types/uiPatterns.ts";
  "error-handler-global.ts" = "src/services/error-handler-global.ts";
  "runtime-browser-stub.ts" = "src/runtime/browser-stub.ts";
  "index.tsx"               = "src/index.tsx";
}

foreach ($kv in $mapRoot.GetEnumerator()) {
  $src = Join-Path $root $kv.Key
  if (Test-Path $src) {
    $dst = Join-Path $root $kv.Value
    $dstDir = Split-Path $dst -Parent
    New-Dir $dstDir
    Write-Host "Moving $($kv.Key) -> $($kv.Value)"
    Move-Item -Path $src -Destination $dst -Force
  }
}

# 4) Move components subtrees
$moveMap = @(
  @{ From="components/ai";                To="src/features/ai" },
  @{ From="components/AISettingsHub";     To="src/features/ai/AISettingsHub" },
  @{ From="components/chat";              To="src/components/chat" },
  @{ From="components/code-intelligence"; To="src/features/code-intelligence" },
  @{ From="components/common";            To="src/components/ui" },
  @{ From="components/editor";            To="src/components/editor" },
  @{ From="components/features";          To="src/features" },
  @{ From="components/file-tree";         To="src/components/sidebar/file-tree" },
  @{ From="components/gemini-tester";     To="src/features/ai/gemini-tester" },
  @{ From="components/layout";            To="src/components/layout" },
  @{ From="components/message-list";      To="src/components/chat/message-list" },
  @{ From="components/modals";            To="src/components/modals" },
  @{ From="components/monitoring";        To="src/components/monitoring" },
  @{ From="components/panels";            To="src/components/panels" },
  @{ From="components/ribbon";            To="src/components/ribbon" }
)

foreach ($m in $moveMap) {
  $srcDir = Join-Path $root $m.From
  if (Test-Path $srcDir) {
    $dstDir = Join-Path $root $m.To
    New-Dir $dstDir
    Write-Host "Relocating $($m.From) -> $($m.To)"
    Get-ChildItem -Path $srcDir -Recurse -File | ForEach-Object {
      $rel = ($_.FullName.Substring($srcDir.Length) -replace '^[\\/]+','')
      $dst = Join-Path $dstDir $rel
      $dstParent = Split-Path $dst -Parent
      New-Dir $dstParent
      Move-Item -Path $_.FullName -Destination $dst -Force
    }
    # Attempt to remove empty source
    Remove-Item $srcDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

# 5) Handle PreviewPanel conflict (Strategy A/C)
$oldPreview = Join-Path $root "src/components/panels/PreviewPanel.tsx"
$newPreview = Join-Path $root "src/components/preview/PreviewPanel.tsx"
if ((Test-Path $oldPreview) -and (Test-Path $newPreview)) {
  $legacy = Join-Path $root "src/components/preview/PreviewPanelLegacy.tsx"
  Write-Host "Renaming panels/PreviewPanel.tsx -> preview/PreviewPanelLegacy.tsx"
  Move-Item -Path $oldPreview -Destination $legacy -Force
}

# 6) Create missing index.ts barrels
function Ensure-Barrel($dir) {
  if (Test-Path $dir) {
    $index = Join-Path $dir "index.ts"
    if (-not (Test-Path $index)) {
      "" | Out-File -Encoding utf8 $index
    }
  }
}
$barrelDirs = @(
  "src/components",
  "src/components/chat",
  "src/components/chat/message-list",
  "src/components/conversation",
  "src/components/layout",
  "src/components/preview",
  "src/components/sidebar",
  "src/components/sidebar/file-tree",
  "src/components/modals",
  "src/components/monitoring",
  "src/components/panels",
  "src/components/ribbon",
  "src/components/ui",
  "src/components/editor",
  "src/features",
  "src/features/ai",
  "src/features/ai/AISettingsHub",
  "src/features/code-intelligence"
)
$barrelDirs | ForEach-Object { Ensure-Barrel (Join-Path $root $_) }

# 7) Import path updates
# Use alias mapping if configured: @/* -> src/*
$useAlias = $true
$tsFiles = Get-ChildItem -Path (Join-Path $root "src") -Recurse -Include *.ts,*.tsx

function Replace-In-File($file, $find, $replace) {
  $content = Get-Content $file -Raw
  $new = [regex]::Replace($content, $find, $replace)
  if ($new -ne $content) {
    Set-Content $file $new -Encoding utf8
  }
}

if ($useAlias) {
  $replacements = @(
    @{Find='from\s+["\'']\.?/config(\.ts)?["\'']';            Repl='from "@/config/config"' },
    @{Find='from\s+["\'']\.?/constants(\.ts)?["\'']';         Repl='from "@/config/constants"' },
    @{Find='from\s+["\'']\.?/types(\.ts)?["\'']';             Repl='from "@/types/types"' },
    @{Find='from\s+["\'']\.?/uiPatterns(\.ts)?["\'']';        Repl='from "@/types/uiPatterns"' },
    @{Find='from\s+["\'']\.?/error-handler-global(\.ts)?["\'']'; Repl='from "@/services/error-handler-global"' },
    @{Find='from\s+["\'']\.?/runtime-browser-stub(\.ts)?["\'']'; Repl='from "@/runtime/browser-stub"' }
  )
} else {
  $replacements = @()
}

$componentReplacements = @(
  @{Find='["\'']/components/ai/';                Repl='"@/features/ai/' },
  @{Find='["\'']/components/AISettingsHub/';     Repl='"@/features/ai/AISettingsHub/' },
  @{Find='["\'']/components/chat/';              Repl='"@/components/chat/' },
  @{Find='["\'']/components/code-intelligence/'; Repl='"@/features/code-intelligence/' },
  @{Find='["\'']/components/common/';            Repl='"@/components/ui/' },
  @{Find='["\'']/components/editor/';            Repl='"@/components/editor/' },
  @{Find='["\'']/components/features/';          Repl='"@/features/' },
  @{Find='["\'']/components/file-tree/';         Repl='"@/components/sidebar/file-tree/' },
  @{Find='["\'']/components/gemini-tester/';     Repl='"@/features/ai/gemini-tester/' },
  @{Find='["\'']/components/layout/';            Repl='"@/components/layout/' },
  @{Find='["\'']/components/message-list/';      Repl='"@/components/chat/message-list/' },
  @{Find='["\'']/components/modals/';            Repl='"@/components/modals/' },
  @{Find='["\'']/components/monitoring/';        Repl='"@/components/monitoring/' },
  @{Find='["\'']/components/panels/';            Repl='"@/components/panels/' },
  @{Find='["\'']/components/ribbon/';            Repl='"@/components/ribbon/' }
)

foreach ($f in $tsFiles) {
  foreach ($r in $replacements) { Replace-In-File $f.FullName $r.Find $r.Repl }
  foreach ($r in $componentReplacements) { Replace-In-File $f.FullName $r.Find $r.Repl }
}

# 8) Type-check (best-effort)
try {
  Set-Location $root
  if (Test-Path (Join-Path $root 'package.json')) {
    Write-Host "Running type-check..."
    npm run -s type-check
  }
} catch { Write-Warning "Type-check failed; investigate errors." }

Write-Host "Migration script completed."