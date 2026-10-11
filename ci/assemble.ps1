$ErrorActionPreference='Continue'
$log='out/assemble-log.txt'
function Log($t){ $t | Tee-Object -FilePath $log -Append }
# replace screens/app with ours
Remove-Item work/src/Src/*.pa.yaml -Force
Copy-Item canvas/Src/*.pa.yaml work/src/Src/
$hdr = "EditorState:`n  ScreensOrder:`n    - scrTO`n    - scrVac`n    - scrAppr`n    - scrRoles`n"
Set-Content work/src/Src/_EditorState.pa.yaml $hdr -Encoding utf8
Log (pac canvas pack --sources work/src --msapp out/WorkforcePlanner.msapp 2>&1 | Out-String)
Log ("pack exit " + $LASTEXITCODE)
if (Test-Path out/WorkforcePlanner.msapp) {
  $dst = (Get-ChildItem work/sol/CanvasApps -Filter *.msapp | Select-Object -First 1).FullName
  Copy-Item out/WorkforcePlanner.msapp $dst -Force
  $sx = Get-Content work/sol/solution.xml -Raw
  $sx = $sx -replace '<Managed>1</Managed>','<Managed>0</Managed>' -replace '<Version>1.0.0.1</Version>','<Version>1.0.0.2</Version>'
  Set-Content work/sol/solution.xml $sx -Encoding utf8 -NoNewline

  $sx = Get-Content work/sol/solution.xml -Raw
  $sx = $sx.Replace('<Version>1.0.0.2</Version>','<Version>1.0.0.6</Version>')
  Set-Content work/sol/solution.xml $sx -Encoding utf8 -NoNewline
  Copy-Item flows/WorkforcePlanner_Import_Sample.xlsx out/
  # zip with forward slashes via .NET
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip='out/WorkforcePlanner_full.zip'
  if (Test-Path $zip) { Remove-Item $zip }
  $root=(Resolve-Path work/sol).Path
  $fs=[System.IO.File]::Open((Join-Path (Get-Location) $zip),'Create')
  $za=New-Object System.IO.Compression.ZipArchive($fs,'Create')
  Get-ChildItem work/sol -Recurse -File | ForEach-Object {
    $rel=$_.FullName.Substring($root.Length+1).Replace('\','/')
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($za,$_.FullName,$rel)
  }
  $za.Dispose(); $fs.Dispose()
  Log "zip built"
}
