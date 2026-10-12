$ErrorActionPreference='Continue'
$log='out/assemble-log.txt'
function Log($t){ $t | Tee-Object -FilePath $log -Append }
# replace screens/app with ours
Remove-Item work/src/Src/*.pa.yaml -Force
Copy-Item canvas/Src/*.pa.yaml work/src/Src/
$hdr = "EditorState:`n  ScreensOrder:`n    - scrTO`n    - scrVac`n    - scrAppr`n    - scrLabor`n    - scrPMC`n    - scrInc`n    - scrRoles`n"
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
  $sx = $sx -replace '<Managed>1</Managed>','<Managed>0</Managed>'
  Set-Content work/sol/solution.xml $sx -Encoding utf8 -NoNewline

  $sx = Get-Content work/sol/solution.xml -Raw
  $sx = ([regex]'<Version>[^<]*</Version>').Replace($sx, '<Version>1.0.0.20</Version>', 1)
  Set-Content work/sol/solution.xml $sx -Encoding utf8 -NoNewline
  # merge the Position Requests and Incumbent Updates tables unless the base already has them
  try {
    Expand-Archive -Path out/WorkforcePlanner_NewTables.zip -DestinationPath work/nt -Force
    $nt = New-Object System.Xml.XmlDocument; $nt.PreserveWhitespace = $true
    $nt.Load((Resolve-Path work/nt/customizations.xml).Path)
    $cxPath = (Resolve-Path work/sol/customizations.xml).Path
    $cx = New-Object System.Xml.XmlDocument; $cx.PreserveWhitespace = $true
    $cx.Load($cxPath)
    $ents = $cx.SelectSingleNode('/ImportExportXml/Entities')
    $rels = $cx.SelectSingleNode('/ImportExportXml/EntityRelationships')
    $sx = Get-Content work/sol/solution.xml -Raw
    foreach ($e in $nt.SelectNodes('/ImportExportXml/Entities/Entity')) {
      $nm = $e.SelectSingleNode('Name').InnerText
      if ($cx.SelectSingleNode("/ImportExportXml/Entities/Entity[Name='$nm']")) { Log ("already in base: " + $nm); continue }
      [void]$ents.AppendChild($cx.ImportNode($e, $true))
      foreach ($r in $nt.SelectNodes("/ImportExportXml/EntityRelationships/EntityRelationship[ReferencingEntityName='$nm']")) { [void]$rels.AppendChild($cx.ImportNode($r, $true)) }
      $sx = $sx.Replace('</RootComponents>', ('<RootComponent type="1" schemaName="' + $nm + '" behavior="0" /></RootComponents>'))
      Log ("merged " + $nm)
    }
    [System.IO.File]::WriteAllText($cxPath, $cx.OuterXml, (New-Object System.Text.UTF8Encoding($false)))
    Set-Content work/sol/solution.xml $sx -Encoding utf8 -NoNewline
  } catch { Log ("new table merge failed: " + $_) }
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
