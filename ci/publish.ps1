git config user.name "github-actions"
git config user.email "actions@users.noreply.github.com"
$tmp = Join-Path $env:RUNNER_TEMP "publish"
git fetch origin build-output 2>$null
if ($LASTEXITCODE -eq 0) { git worktree add $tmp origin/build-output } else { git worktree add --orphan -b build-output $tmp }
Push-Location $tmp
Copy-Item -Recurse -Force "$env:GITHUB_WORKSPACE/out/*" .
git add -A
git commit -m "Build output for $env:GITHUB_SHA" 2>&1 | Out-Null
git push origin HEAD:build-output 2>&1
Pop-Location
