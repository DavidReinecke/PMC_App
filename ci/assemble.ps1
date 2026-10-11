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

  # ---- import flow
  $wf='5D0E5F4A-3C2B-4F6E-9A71-0C1D2E3F4A51'
  $crDv='wfp_sharedcommondataserviceforapps_a1f3c'; $crXl='wfp_sharedexcelonlinebusiness_b7d2e'
  New-Item -ItemType Directory -Force -Path work/sol/Workflows | Out-Null
  Copy-Item "flows/WorkforcePlannerImport-$wf.json" "work/sol/Workflows/WorkforcePlannerImport-$wf.json"
  $cx = Get-Content work/sol/customizations.xml -Raw
  $nm = "Workforce Planner - Import from Excel"
  $wfx = "<Workflows><Workflow WorkflowId=`"{$($wf.ToLower())}`" Name=`"$nm`"><JsonFileName>/Workflows/WorkforcePlannerImport-$wf.json</JsonFileName><Type>1</Type><Subtype>0</Subtype><Category>5</Category><Mode>0</Mode><Scope>4</Scope><OnDemand>0</OnDemand><TriggerOnCreate>0</TriggerOnCreate><TriggerOnDelete>0</TriggerOnDelete><AsyncAutodelete>0</AsyncAutodelete><SyncWorkflowLogOnFailure>0</SyncWorkflowLogOnFailure><StateCode>0</StateCode><StatusCode>1</StatusCode><RunAs>1</RunAs><IsTransacted>1</IsTransacted><IntroducedVersion>1.0.0.0</IntroducedVersion><IsCustomizationEnabled>1</IsCustomizationEnabled><IsCustomProcessingStepAllowedForOtherPublishers>1</IsCustomProcessingStepAllowedForOtherPublishers><ModernFlowType>0</ModernFlowType><PrimaryEntity>none</PrimaryEntity><LocalizedNames><LocalizedName languagecode=`"1033`" description=`"$nm`" /></LocalizedNames></Workflow></Workflows>"
  $cx = $cx.Replace('<Workflows></Workflows>', $wfx)
  $crx = "<connectionreferences><connectionreference connectionreferencelogicalname=`"$crDv`"><connectionreferencedisplayname>Dataverse (Workforce Planner)</connectionreferencedisplayname><connectorid>/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps</connectorid><iscustomizable>1</iscustomizable><promptingbehavior>0</promptingbehavior><statecode>0</statecode><statuscode>1</statuscode></connectionreference><connectionreference connectionreferencelogicalname=`"$crXl`"><connectionreferencedisplayname>Excel Online Business (Workforce Planner)</connectionreferencedisplayname><connectorid>/providers/Microsoft.PowerApps/apis/shared_excelonlinebusiness</connectorid><iscustomizable>1</iscustomizable><promptingbehavior>0</promptingbehavior><statecode>0</statecode><statuscode>1</statuscode></connectionreference></connectionreferences>"
  $cx = $cx.Replace('</CanvasApps>', "</CanvasApps>`n  $crx")
  Set-Content work/sol/customizations.xml $cx -Encoding utf8 -NoNewline
  $sx = Get-Content work/sol/solution.xml -Raw
  $sx = $sx.Replace('</RootComponents>', "  <RootComponent type=`"29`" id=`"{$($wf.ToLower())}`" behavior=`"0`" />`n      <RootComponent type=`"372`" schemaName=`"$crDv`" behavior=`"0`" />`n      <RootComponent type=`"372`" schemaName=`"$crXl`" behavior=`"0`" />`n    </RootComponents>")
  $sx = $sx.Replace('<Version>1.0.0.2</Version>','<Version>1.0.0.3</Version>')
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
