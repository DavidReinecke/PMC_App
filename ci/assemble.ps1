$ErrorActionPreference='Continue'
$log='out/assemble-log.txt'
function Log($t){ $t | Tee-Object -FilePath $log -Append }
# replace screens/app with ours
Remove-Item work/src/Src/*.pa.yaml -Force
Copy-Item canvas/Src/*.pa.yaml work/src/Src/
$hdr = "EditorState:`n  ScreensOrder:`n    - scrTO`n    - scrVac`n    - scrAppr`n    - scrLabor`n    - scrRoles`n"
Set-Content work/src/Src/_EditorState.pa.yaml $hdr -Encoding utf8
Log (pac canvas pack --sources work/src --msapp out/WorkforcePlanner.msapp 2>&1 | Out-String)
Log ("pack exit " + $LASTEXITCODE)
if (Test-Path out/WorkforcePlanner.msapp) {
  try {
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $mp = (Resolve-Path out/WorkforcePlanner.msapp).Path
    $z = [System.IO.Compression.ZipFile]::Open($mp,'Update')
    $e = $z.Entries | Where-Object { $_.FullName -eq 'Properties.json' } | Select-Object -First 1
    if ($e) {
      $sr = New-Object System.IO.StreamReader($e.Open()); $t = $sr.ReadToEnd(); $sr.Close()
      $t = $t -replace '"DocumentLayoutScaleToFit"\s*:\s*[Tt]rue','"DocumentLayoutScaleToFit":false' -replace '"DocumentLayoutMaintainAspectRatio"\s*:\s*[Tt]rue','"DocumentLayoutMaintainAspectRatio":false'
      $e.Delete()
      $ne = $z.CreateEntry('Properties.json')
      $sw = New-Object System.IO.StreamWriter($ne.Open(), (New-Object System.Text.UTF8Encoding($false))); $sw.Write($t); $sw.Close()
      Log "layout flags patched"
    } else { Log "Properties.json not found in msapp" }
    $z.Dispose()
  } catch { Log ("layout patch failed: " + $_) }
}
if (Test-Path out/WorkforcePlanner.msapp) {
  $dst = (Get-ChildItem work/sol/CanvasApps -Filter *.msapp | Select-Object -First 1).FullName
  Copy-Item out/WorkforcePlanner.msapp $dst -Force
  $sx = Get-Content work/sol/solution.xml -Raw
  $sx = $sx -replace '<Managed>1</Managed>','<Managed>0</Managed>' -replace '<Version>1.0.0.1</Version>','<Version>1.0.0.2</Version>'
  Set-Content work/sol/solution.xml $sx -Encoding utf8 -NoNewline

  $sx = Get-Content work/sol/solution.xml -Raw
  $sx = $sx.Replace('<Version>1.0.0.2</Version>','<Version>1.0.0.15</Version>')
  Set-Content work/sol/solution.xml $sx -Encoding utf8 -NoNewline
  # merge the Pay Rates and Labor Settings tables into this solution
  try {
    Expand-Archive -Path out/WorkforcePlanner_PayTables.zip -DestinationPath work/pt -Force
    $pt = New-Object System.Xml.XmlDocument; $pt.PreserveWhitespace = $true
    $pt.Load((Resolve-Path work/pt/customizations.xml).Path)
    $cxPath = (Resolve-Path work/sol/customizations.xml).Path
    $cx = New-Object System.Xml.XmlDocument; $cx.PreserveWhitespace = $true
    $cx.Load($cxPath)
    $ents = $cx.SelectSingleNode('/ImportExportXml/Entities')
    foreach ($e in $pt.SelectNodes('/ImportExportXml/Entities/Entity')) { [void]$ents.AppendChild($cx.ImportNode($e, $true)) }
    $rels = $cx.SelectSingleNode('/ImportExportXml/EntityRelationships')
    foreach ($r in $pt.SelectNodes('/ImportExportXml/EntityRelationships/EntityRelationship')) { [void]$rels.AppendChild($cx.ImportNode($r, $true)) }
    [System.IO.File]::WriteAllText($cxPath, $cx.OuterXml, (New-Object System.Text.UTF8Encoding($false)))
    $sx = Get-Content work/sol/solution.xml -Raw
    $add = '<RootComponent type="1" schemaName="wfp_payrate" behavior="0" /><RootComponent type="1" schemaName="wfp_laborsetting" behavior="0" /></RootComponents>'
    $sx = $sx.Replace('</RootComponents>', $add)
    Set-Content work/sol/solution.xml $sx -Encoding utf8 -NoNewline
    Log "pay tables merged"
  } catch { Log ("pay table merge failed: " + $_) }
  Copy-Item flows/WorkforcePlanner_Import_Sample.xlsx out/
  Copy-Item flows/WorkforcePlanner_PayRates_2026.xlsx out/
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
