$ErrorActionPreference = "Stop"
$root = "C:\project\G-studio\G-Studio-v2.3.0-Complete"
function New-Dir($p){ if(!(Test-Path $p)){ New-Item -ItemType Directory -Path $p | Out-Null } }
function Move-Tree($from,$to){
  $src = Join-Path $root $from
  if(!(Test-Path $src)){ return }
  $dst = Join-Path $root $to
  New-Dir $dst
  Get-ChildItem -Path $src -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($src.Length) -replace '^[\\/]+' , ''
    $destFile = Join-Path $dst $rel
    New-Dir (Split-Path $destFile -Parent)
    Move-Item -Force -Path $_.FullName -Destination $destFile
  }
  # remove empty dir
  Remove-Item $src -Recurse -Force -ErrorAction SilentlyContinue
}

Move-Tree 'contexts' 'src/contexts'
Move-Tree 'hooks' 'src/hooks'
Move-Tree 'services' 'src/services'
Move-Tree 'llm' 'src/llm'
Move-Tree 'mcp' 'src/mcp'
Move-Tree 'utils' 'src/utils'
Move-Tree 'stores' 'src/stores'
Write-Host "Core directories moved into src."