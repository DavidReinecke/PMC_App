$ErrorActionPreference = 'Continue'
New-Item -ItemType Directory -Force -Path out | Out-Null
$log = 'out/build-log.txt'
function Log($t) { $t | Tee-Object -FilePath $log -Append }
Log "pac version:"
Log (pac help 2>&1 | Select-Object -First 3 | Out-String)

# 1. Tables solution
Log "=== pac solution pack (tables) ==="
Log (pac solution pack --zipfile out/WorkforcePlanner_tables.zip --folder solution_source --packagetype Unmanaged 2>&1 | Out-String)
Log ("exit code: " + $LASTEXITCODE)

# 2. Canvas app pack attempt
Log "=== pac canvas pack ==="
if (Test-Path canvas/CanvasManifest.json) {
  Log (pac canvas pack --sources canvas --msapp out/WorkforcePlanner.msapp --layout SourceCode 2>&1 | Out-String)
  Log ("exit code: " + $LASTEXITCODE)
  $pl="$env:USERPROFILE\.dotnet\tools\.store\microsoft.powerapps.cli.tool\2.13.1\microsoft.powerapps.cli.tool\2.13.1\tools\net10.0\any\logs\pac-log.txt"
  if (Test-Path $pl) { Copy-Item $pl out/pac-log.txt }
} else {
  Log "canvas/CanvasManifest.json not present yet"
}
Get-ChildItem out | ForEach-Object { Log ($_.Name + "  " + $_.Length) }

./ci/unpack.ps1
./ci/assemble.ps1
exit 0
