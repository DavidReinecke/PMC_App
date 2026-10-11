$ErrorActionPreference = 'Continue'
$o = 'out/explore.txt'
function Log($t) { $t | Out-File -FilePath $o -Append -Encoding utf8 }
Log "=== skip create ==="
Log "=== pac canvas pack help ==="
Log (pac canvas pack help 2>&1 | Out-String)
Log "=== pac canvas unpack help ==="
Log (pac canvas unpack help 2>&1 | Out-String)
git clone --depth 1 https://github.com/microsoft/PowerApps-Language-Tooling.git ../plt 2>&1 | Out-Null
$blank = Get-ChildItem ../plt -Recurse -Filter AppWithLabel.msapp | Select-Object -First 1
Remove-Item -Recurse -Force ../blank -ErrorAction SilentlyContinue
Log (pac canvas unpack --msapp $blank.FullName --sources ../blank --layout SourceCode 2>&1 | Out-String)
Log "tree:"
Get-ChildItem ../blank -Recurse -File | ForEach-Object { Log ($_.FullName.Substring((Resolve-Path ../blank).Path.Length) + "  " + $_.Length) }
Get-ChildItem ../blank/Src -File -Filter *.yaml | Select-Object -First 3 | ForEach-Object { Log ("---- Src/" + $_.Name); Log (Get-Content $_.FullName -Raw) }
Log "---- CanvasManifest tail"; $m = Get-Content ../blank/CanvasManifest.json -Raw; Log $m.Substring([Math]::Min(2800, $m.Length))
Log "---- Entropy.json"; Log (Get-Content ../blank/Entropy/Entropy.json -Raw)
Log "---- ControlTemplates.json (head)"; $c = Get-Content ../blank/ControlTemplates.json -Raw; Log $c.Substring(0, [Math]::Min(1500, $c.Length))
Log "---- Src/EditorState/App.editorstate.json"; Log (Get-Content ../blank/Src/EditorState/App.editorstate.json -Raw)
Log "---- repack test"
Log (pac canvas pack --sources ../blank --msapp out/repack.msapp 2>&1 | Out-String)
Log "=== sample apps that use data sources (names) ==="
git clone --depth 1 https://github.com/microsoft/PowerApps-Language-Tooling.git ../plt 2>&1 | Out-Null
Get-ChildItem ../plt -Recurse -Filter *.msapp | ForEach-Object {
  $d = "../s_" + $_.BaseName; Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue
  pac canvas unpack --msapp $_.FullName --sources $d --layout SourceCode 2>&1 | Out-Null
  $ds = Get-ChildItem "$d/DataSources" -File -ErrorAction SilentlyContinue
  if ($ds) { Log ($_.Name + " -> " + (($ds | ForEach-Object Name) -join ", ")) }
}
exit 0
