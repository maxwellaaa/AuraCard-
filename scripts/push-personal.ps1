$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $project
Write-Output "CWD=$project"

$input = "protocol=https`nhost=github.com`n`n"
$credOut = $input | & git credential fill 2>$null
$username = ($credOut | Where-Object { $_ -like 'username=*' }) -replace '^username=',''
$password = ($credOut | Where-Object { $_ -like 'password=*' }) -replace '^password=',''

if (-not $username -or -not $password) {
  Write-Output 'NO_CREDENTIALS'
  exit 2
}
Write-Output "USERNAME=$username"

$headers = @{
  Authorization = "Bearer $password"
  Accept = 'application/vnd.github+json'
  'User-Agent' = 'AuraCard-agent'
  'X-GitHub-Api-Version' = '2022-11-28'
}

try {
  $existing = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$username/AuraCard" -Method Get
  Write-Output "REPO_EXISTS=$($existing.html_url)"
} catch {
  Write-Output 'REPO_MISSING_CREATING'
  $body = @{
    name = 'AuraCard'
    description = 'AuraCard desktop - AI card editor with Electron'
    private = $false
    auto_init = $false
  } | ConvertTo-Json
  $created = Invoke-RestMethod -Headers $headers -Uri 'https://api.github.com/user/repos' -Method Post -Body $body -ContentType 'application/json'
  Write-Output "REPO_CREATED=$($created.html_url)"
}

$remoteUrl = "https://github.com/$username/AuraCard.git"
$hasPersonal = (& git remote) -contains 'personal'
if ($hasPersonal) {
  & git remote set-url personal $remoteUrl
} else {
  & git remote add personal $remoteUrl
}

& git push -u personal HEAD:master
& git push personal HEAD:release/2026-08-07-desktop
Write-Output 'PUSH_OK'
Write-Output "URL=https://github.com/$username/AuraCard"
