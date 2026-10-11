$ErrorActionPreference='Continue'
$log='out/unpack-log.txt'
function Log($t){ $t | Tee-Object -FilePath $log -Append }
Remove-Item -Recurse -Force work -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path work/sol | Out-Null
Expand-Archive base/blank.zip work/sol
$msapp = Get-ChildItem work/sol/CanvasApps -Filter *.msapp | Select-Object -First 1
Log ("msapp: " + $msapp.FullName)
Log (pac canvas unpack --msapp $msapp.FullName --sources work/src --layout SourceCode 2>&1 | Out-String)
Log ("exit " + $LASTEXITCODE)
if (Test-Path work/src) { Get-ChildItem work/src -Recurse -File | ForEach-Object { Log ($_.FullName.Substring((Resolve-Path work/src).Path.Length) + "  " + $_.Length) } }
Log "---- manifest"
if (Test-Path work/src/CanvasManifest.json) { Log (Get-Content work/src/CanvasManifest.json -Raw) }
Log "---- App.pa.yaml"
if (Test-Path work/src/Src/App.pa.yaml) { Log (Get-Content work/src/Src/App.pa.yaml -Raw) }
Get-ChildItem work/src/Src -Filter *.yaml -ErrorAction SilentlyContinue | Where-Object Name -ne 'App.pa.yaml' | ForEach-Object { Log ("---- " + $_.Name); Log (Get-Content $_.FullName -Raw) }
Log "---- DataSources"
Get-ChildItem work/src/DataSources -ErrorAction SilentlyContinue | ForEach-Object { Log $_.Name }
Log "---- solution CanvasApps in customizations.xml"
Log (Select-String -Path work/sol/customizations.xml -Pattern 'CanvasApp' -Context 0,40 | Out-String)
Copy-Item work/sol/customizations.xml out/base-customizations.xml
Copy-Item work/sol/solution.xml out/base-solution.xml
