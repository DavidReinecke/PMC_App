# Diagnostics: unpack a known-good sample canvas app with this pac version so we can match its source layout.
$ErrorActionPreference = 'Continue'
$o = 'out/explore.txt'
function Log($t) { $t | Out-File -FilePath $o -Append -Encoding utf8 }
Log "pac canvas help:"
Log (pac canvas help 2>&1 | Out-String)
git clone --depth 1 https://github.com/microsoft/PowerApps-Language-Tooling.git ../plt 2>&1 | Out-Null
$apps = Get-ChildItem ../plt -Recurse -Filter *.msapp | Sort-Object Length | Select-Object -First 400
Log ("sample msapps found: " + $apps.Count)
$apps | Select-Object -First 25 | ForEach-Object { Log ($_.Length.ToString() + "  " + $_.FullName) }
$pick = $apps | Where-Object { $_.Name -match 'Cal|Empty|Blank|Hello|Simple|Test' } | Select-Object -First 1
if (-not $pick) { $pick = $apps | Select-Object -First 1 }
Log ("picked: " + $pick.FullName)
Remove-Item -Recurse -Force ../unp -ErrorAction SilentlyContinue
Log (pac canvas unpack --msapp $pick.FullName --sources ../unp 2>&1 | Out-String)
Log "tree:"
Get-ChildItem ../unp -Recurse -File | ForEach-Object { Log ($_.FullName.Substring((Resolve-Path ../unp).Path.Length) + "  " + $_.Length) }
foreach ($f in 'CanvasManifest.json') { Log ("---- " + $f); Log ((Get-Content ../unp/$f -Raw)) }
Get-ChildItem ../unp/Src -File | Select-Object -First 3 | ForEach-Object { Log ("---- Src/" + $_.Name); Log ((Get-Content $_.FullName -Raw)) }
Get-ChildItem ../unp/DataSources -File -ErrorAction SilentlyContinue | Select-Object -First 3 | ForEach-Object { Log ("---- DataSources/" + $_.Name); $c = Get-Content $_.FullName -Raw; Log $c.Substring(0,[Math]::Min(2500,$c.Length)) }
Get-ChildItem ../unp/Entropy -File -ErrorAction SilentlyContinue | Select-Object -First 2 | ForEach-Object { Log ("---- Entropy/" + $_.Name); $c = Get-Content $_.FullName -Raw; Log $c.Substring(0,[Math]::Min(1500,$c.Length)) }
