$ErrorActionPreference = "Stop"
$root = "C:\project\G-studio\G-Studio-v2.3.0-Complete"
$targetFiles = @(
  "$root\src\components\layout\MainLayout.tsx",
  "$root\src\components\layout\EditorLayout.tsx",
  "$root\src\components\layout\ChatLayout.tsx",
  "$root\src\components\app\App.tsx"
)

function ApplySimpleReplaces([string]$content, [hashtable]$map){
  $updated = $content
  foreach($k in $map.Keys){
    $updated = $updated.Replace($k, $map[$k])
  }
  return $updated
}

$replaces = @{
  'from "../Ribbon"' = 'from "@/components/ribbon"'
  'from ''../Ribbon''' = 'from ''@/components/ribbon''' 
  'from "../Sidebar"' = 'from "@/components/sidebar"'
  'from ''../Sidebar''' = 'from ''@/components/sidebar''' 
  'from "../RightActivityBar"' = 'from "@/components/layout/RightActivityBar"'
  'from ''../RightActivityBar''' = 'from ''@/components/layout/RightActivityBar''' 
  'from "../common/ErrorBoundary"' = 'from "@/components/ui/ErrorBoundary"'
  'from ''../common/ErrorBoundary''' = 'from ''@/components/ui/ErrorBoundary''' 
  'from "../common/NotificationToast"' = 'from "@/components/ui/NotificationToast"'
  'from ''../common/NotificationToast''' = 'from ''@/components/ui/NotificationToast''' 
  'from "../message-list"' = 'from "@/components/chat/message-list"'
  'from ''../message-list''' = 'from ''@/components/chat/message-list''' 
  'from "../chat/' = 'from "@/components/chat/'
  'from ''../chat/' = 'from ''@/components/chat/'
  'from "../editor/' = 'from "@/components/editor/'
  'from ''../editor/' = 'from ''@/components/editor/'
  'from "../panels/' = 'from "@/components/panels/'
  'from ''../panels/' = 'from ''@/components/panels/'
  'from "../ai/' = 'from "@/features/ai/'
  'from ''../ai/' = 'from ''@/features/ai/'
  'from "../code-intelligence/' = 'from "@/features/code-intelligence/'
  'from ''../code-intelligence/' = 'from ''@/features/code-intelligence/'
  'from "../gemini-tester"' = 'from "@/features/ai/gemini-tester"'
  'from ''../gemini-tester''' = 'from ''@/features/ai/gemini-tester''' 
  'from "../ribbon/' = 'from "@/components/ribbon/'
  'from ''../ribbon/' = 'from ''@/components/ribbon/'
  'from "../layout/' = 'from "@/components/layout/'
  'from ''../layout/' = 'from ''@/components/layout/'
  'from "../../src/components/preview"' = 'from "@/components/preview"'
  'from ''../../src/components/preview''' = 'from ''@/components/preview''' 
  'from "../../src/components/conversation"' = 'from "@/components/conversation"'
  'from ''../../src/components/conversation''' = 'from ''@/components/conversation''' 
  'from "../../src/stores/conversationStore"' = 'from "@/stores/conversationStore"'
  'from ''../../src/stores/conversationStore''' = 'from ''@/stores/conversationStore''' 
}

foreach($file in $targetFiles){
  if(Test-Path $file){
    $c = Get-Content $file -Raw
    $u = ApplySimpleReplaces $c $replaces
    if($u -ne $c){ Set-Content $file $u -Encoding utf8 }
  }
}
Write-Host "Layout/App simple import fixes applied."