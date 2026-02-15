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
# Clean erroneous '../../src/...' prefixes created before
$rules += Re('from\s+["\'']\.+\/src\/components\/preview["\'']','from "@/components/preview"')
$rules += Re('from\s+["\'']\.+\/src\/components\/conversation["\'']','from "@/components/conversation"')
$rules += Re('from\s+["\'']\.+\/src\/stores\/conversationStore["\'']','from "@/stores/conversationStore"')

# General aliasing for common relative imports
$rules += Re('from\s+["\'']\.\./layout\/','from "@/components/layout/')
$rules += Re('from\s+["\'']\.\./panels\/','from "@/components/panels/')
$rules += Re('from\s+["\'']\.\./common\/','from "@/components/ui/')
$rules += Re('from\s+["\'']\.\./chat\/','from "@/components/chat/')
$rules += Re('from\s+["\'']\.\./editor\/','from "@/components/editor/')
$rules += Re('from\s+["\'']\.\./message-list["\'']','from "@/components/chat/message-list"')
$rules += Re('from\s+["\'']\.\./message-list\/','from "@/components/chat/message-list/')
$rules += Re('from\s+["\'']\.\./ribbon\/','from "@/components/ribbon/')

# Features
$rules += Re('from\s+["\'']\.\./ai\/','from "@/features/ai/')
$rules += Re('from\s+["\'']\.\./code-intelligence\/','from "@/features/code-intelligence/')
$rules += Re('from\s+["\'']\.\./gemini-tester["\'']','from "@/features/ai/gemini-tester"')

# Services, hooks, stores -> alias
$rules += Re('from\s+["\'']\.+\/services\/','from "@/services/')
$rules += Re('from\s+["\'']\.+\/hooks\/','from "@/hooks/')
$rules += Re('from\s+["\'']\.+\/stores\/','from "@/stores/')

# Config/types
$rules += Re('from\s+["\'']\.+\/types["\'']','from "@/types/types"')
$rules += Re('from\s+["\'']\.+\/types\.ts["\'']','from "@/types/types"')
$rules += Re('from\s+["\'']\.+\/constants["\'']','from "@/config/constants"')
$rules += Re('from\s+["\'']\.+\/config["\'']','from "@/config/config"')

# Case-sensitive component barrels to alias versions (Ribbon/Sidebar)
$rules += Re('from\s+["\'']\.\./Ribbon["\'']','from "@/components/ribbon"')
$rules += Re('from\s+["\'']\.\./Sidebar["\'']','from "@/components/sidebar"')
$rules += Re('from\s+["\'']\.\./RightActivityBar["\'']','from "@/components/layout/RightActivityBar"')

foreach($f in $files){ ApplyRules $f.FullName $rules }
Write-Host "Alias import rewrite pass 2 complete."