$ErrorActionPreference = "Stop"
$root = "C:\project\G-studio\G-Studio-v2.3.0-Complete"
$tsFiles = Get-ChildItem -Path (Join-Path $root 'src') -Recurse -Include *.ts,*.tsx

function Replace-In-File($file, $find, $replace) {
  $content = Get-Content $file -Raw
  $new = [regex]::Replace($content, $find, $replace)
  if ($new -ne $content) { Set-Content $file $new -Encoding utf8 }
}

$rules = @(
  @{Find='from\s+["\''](?:\.{2}\/)+types(\.ts)?["\'']';              Repl='from "@/types/types"' },
  @{Find='from\s+["\''](?:\.{2}\/)+constants(\.ts)?["\'']';         Repl='from "@/config/constants"' },
  @{Find='from\s+["\''](?:\.{2}\/)+config(\.ts)?["\'']';            Repl='from "@/config/config"' },
  @{Find='from\s+["\''](?:\.{2}\/)+uiPatterns(\.ts)?["\'']';        Repl='from "@/types/uiPatterns"' },
  @{Find='from\s+["\''](?:\.{2}\/)+error-handler-global(\.ts)?["\'']'; Repl='from "@/services/error-handler-global"' },
  @{Find='from\s+["\''](?:\.{2}\/)+runtime-browser-stub(\.ts)?["\'']'; Repl='from "@/runtime/browser-stub"' }
)

foreach ($f in $tsFiles) {
  foreach ($r in $rules) { Replace-In-File $f.FullName $r.Find $r.Repl }
}
Write-Host "Relative import normalization complete."
