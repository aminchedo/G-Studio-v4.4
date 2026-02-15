$ErrorActionPreference = "Stop"
$root = "C:\project\G-studio\G-Studio-v2.3.0-Complete"
$src = Join-Path $root 'src'
$files = Get-ChildItem -Path $src -Recurse -Include *.ts,*.tsx

function Re($pattern,[string]$repl){ return @{Find=$pattern; Repl=$repl} }
function ApplyRules($f,$rules){
  $content = Get-Content $f -Raw
  $updated = $content
  foreach($r in $rules){ $updated = [regex]::Replace($updated,$r.Find,$r.Repl) }
  if($updated -ne $content){ Set-Content $f $updated -Encoding utf8 }
}

$rules = @()
# Generic short-ups to alias
$rules += Re('from\s+["\''](?:\.\./)+types(\.ts)?["\'']','from "@/types/types"')
$rules += Re('from\s+["\''](?:\.\./)+constants(\.ts)?["\'']','from "@/config/constants"')
$rules += Re('from\s+["\''](?:\.\./)+config(\.ts)?["\'']','from "@/config/config"')
$rules += Re('from\s+["\''](?:\.\./)+uiPatterns(\.ts)?["\'']','from "@/types/uiPatterns"')
$rules += Re('from\s+["\''](?:\.\./)+error-handler-global(\.ts)?["\'']','from "@/services/error-handler-global"')
$rules += Re('from\s+["\''](?:\.\./)+runtime-browser-stub(\.ts)?["\'']','from "@/runtime/browser-stub"')

# Components mapping
$rules += Re('from\s+["\'']\.\./layout/','from "@/components/layout/')
$rules += Re('from\s+["\'']\.\./chat/','from "@/components/chat/')
$rules += Re('from\s+["\'']\.\./editor/','from "@/components/editor/')
$rules += Re('from\s+["\'']\.\./common/','from "@/components/ui/')
$rules += Re('from\s+["\'']\.\./message-list','from "@/components/chat/message-list"')
$rules += Re('from\s+["\'']\.\./panels/','from "@/components/panels/')
$rules += Re('from\s+["\'']\.\./modals/','from "@/components/modals/')
$rules += Re('from\s+["\'']\.\./ribbon/','from "@/components/ribbon/')
$rules += Re('from\s+["\'']\.\./file-tree/','from "@/components/sidebar/file-tree/')

# Features mapping
$rules += Re('from\s+["\'']\.\./ai/','from "@/features/ai/')
$rules += Re('from\s+["\'']\.\./code-intelligence/','from "@/features/code-intelligence/')

# Handle index barrel references without trailing slash
$rules += Re('from\s+["\'']\.\./message-list["\'']','from "@/components/chat/message-list"')

foreach($f in $files){ ApplyRules $f.FullName $rules }
Write-Host "Alias import rewrite complete."