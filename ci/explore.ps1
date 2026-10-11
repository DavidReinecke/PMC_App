$ErrorActionPreference = 'Continue'
$o = 'out/explore.txt'
function Log($t) { $t | Out-File -FilePath $o -Append -Encoding utf8 }
Log "=== pac canvas create help ==="
Log (pac canvas create help 2>&1 | Out-String)
Log "=== pac canvas pack help ==="
Log (pac canvas pack help 2>&1 | Out-String)
Log "=== pac canvas unpack help ==="
Log (pac canvas unpack help 2>&1 | Out-String)
Log "=== create blank ==="
Log (pac canvas create --msapp out/blank.msapp --name WorkforcePlanner 2>&1 | Out-String)
if (Test-Path out/blank.msapp) {
  Remove-Item -Recurse -Force ../blank -ErrorAction SilentlyContinue
  Log (pac canvas unpack --msapp out/blank.msapp --sources ../blank --layout SourceCode 2>&1 | Out-String)
  Log "tree:"
  Get-ChildItem ../blank -Recurse -File | ForEach-Object { Log ($_.FullName.Substring((Resolve-Path ../blank).Path.Length) + "  " + $_.Length) }
  foreach ($f in 'Src/App.pa.yaml','Src/App.fx.yaml') { if (Test-Path ../blank/$f) { Log ("---- " + $f); Log (Get-Content ../blank/$f -Raw) } }
  Get-ChildItem ../blank/Src -File -Filter *.yaml | Select-Object -First 2 | ForEach-Object { Log ("---- Src/" + $_.Name); Log (Get-Content $_.FullName -Raw) }
  Log "---- CanvasManifest tail"; $m = Get-Content ../blank/CanvasManifest.json -Raw; Log $m.Substring([Math]::Min(2800, $m.Length))
  Get-ChildItem ../blank/DataSources -File -ErrorAction SilentlyContinue | ForEach-Object { Log ("---- DataSources/" + $_.Name); Log (Get-Content $_.FullName -Raw) }
}
Log "=== sample apps that use data sources (names) ==="
git clone --depth 1 https://github.com/microsoft/PowerApps-Language-Tooling.git ../plt 2>&1 | Out-Null
Get-ChildItem ../plt -Recurse -Filter *.msapp | ForEach-Object {
  $d = "../s_" + $_.BaseName; Remove-Item -Recurse -Force $d -ErrorAction SilentlyContinue
  pac canvas unpack --msapp $_.FullName --sources $d --layout SourceCode 2>&1 | Out-Null
  $ds = Get-ChildItem "$d/DataSources" -File -ErrorAction SilentlyContinue
  if ($ds) { Log ($_.Name + " -> " + (($ds | ForEach-Object Name) -join ", ")) }
}
