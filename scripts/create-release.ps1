$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $project

$input = "protocol=https`nhost=github.com`n`n"
$credOut = $input | & git credential fill 2>$null
$username = ($credOut | Where-Object { $_ -like 'username=*' }) -replace '^username=',''
$password = ($credOut | Where-Object { $_ -like 'password=*' }) -replace '^password=',''
if (-not $password) { Write-Output 'NO_CREDENTIALS'; exit 2 }

$changelogPath = Join-Path $project 'docs\CHANGELOG-2026-08-07.md'
$bodyText = [string]([System.IO.File]::ReadAllText($changelogPath, [System.Text.Encoding]::UTF8))

$payloadObj = [ordered]@{
  tag_name = 'v1.0.0-2026-08-07'
  target_commitish = 'master'
  name = 'AuraCard v1.0.0 (2026-08-07)'
  body = $bodyText
  draft = $false
  prerelease = $false
}
$json = $payloadObj | ConvertTo-Json -Compress -Depth 3

$headers = @{
  Authorization = "Bearer $password"
  Accept = 'application/vnd.github+json'
  'User-Agent' = 'AuraCard-agent'
  'X-GitHub-Api-Version' = '2022-11-28'
}

$rel = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$username/AuraCard/releases" -Method Post -Body $json -ContentType 'application/json; charset=utf-8'
Write-Output "RELEASE_URL=$($rel.html_url)"

$dir = 'E:\cursor-agent\deliverables\AuraCard-desktop-2026-08-07'
foreach ($f in (Get-ChildItem -LiteralPath $dir -Filter '*.exe')) {
  $uploadBase = ($rel.upload_url -replace '\{\?name,label\}','')
  $uri = $uploadBase + '?name=' + [uri]::EscapeDataString($f.Name)
  Write-Output "UPLOADING=$($f.Name) size=$($f.Length)"
  $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
  $upHeaders = @{
    Authorization = "Bearer $password"
    Accept = 'application/vnd.github+json'
    'User-Agent' = 'AuraCard-agent'
    'Content-Type' = 'application/octet-stream'
    'X-GitHub-Api-Version' = '2022-11-28'
  }
  $asset = Invoke-RestMethod -Headers $upHeaders -Uri $uri -Method Post -Body $bytes
  Write-Output "ASSET=$($asset.browser_download_url)"
}
Write-Output 'DONE'
