$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $project

$input = "protocol=https`nhost=github.com`n`n"
$credOut = $input | & git credential fill 2>$null
$username = ($credOut | Where-Object { $_ -like 'username=*' }) -replace '^username=',''
$password = ($credOut | Where-Object { $_ -like 'password=*' }) -replace '^password=',''
if (-not $password) { Write-Output 'NO_CREDENTIALS'; exit 2 }

$changelogPath = Join-Path $project 'docs\CHANGELOG-2026-08-08.md'
$bodyText = [string]([System.IO.File]::ReadAllText($changelogPath, [System.Text.Encoding]::UTF8))

$tag = 'v1.0.0-2026-08-08'
$apiBase = "https://api.github.com/repos/$username/AuraCard"

$headers = @{
  Authorization = "Bearer $password"
  Accept = 'application/vnd.github+json'
  'User-Agent' = 'AuraCard-agent'
  'X-GitHub-Api-Version' = '2022-11-28'
}

# Update existing release by tag, or create new
$existing = $null
try {
  $existing = Invoke-RestMethod -Headers $headers -Uri "$apiBase/releases/tags/$tag" -Method Get
} catch {
  $existing = $null
}

if ($existing) {
  $payloadObj = [ordered]@{
    tag_name = $tag
    target_commitish = 'master'
    name = 'AuraCard v1.0.0 (2026-08-08)'
    body = $bodyText
    draft = $false
    prerelease = $false
  }
  $json = $payloadObj | ConvertTo-Json -Compress -Depth 3
  $rel = Invoke-RestMethod -Headers $headers -Uri "$apiBase/releases/$($existing.id)" -Method Patch -Body $json -ContentType 'application/json; charset=utf-8'
  Write-Output "RELEASE_UPDATED=$($rel.html_url)"
} else {
  $payloadObj = [ordered]@{
    tag_name = $tag
    target_commitish = 'master'
    name = 'AuraCard v1.0.0 (2026-08-08)'
    body = $bodyText
    draft = $false
    prerelease = $false
  }
  $json = $payloadObj | ConvertTo-Json -Compress -Depth 3
  $rel = Invoke-RestMethod -Headers $headers -Uri "$apiBase/releases" -Method Post -Body $json -ContentType 'application/json; charset=utf-8'
  Write-Output "RELEASE_CREATED=$($rel.html_url)"
}

$dir = 'E:\cursor-agent\deliverables\AuraCard-desktop-2026-08-08'
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
  # If asset with same name exists, delete first
  $dup = @($rel.assets | Where-Object { $_.name -eq $f.Name })
  foreach ($d in $dup) {
    Invoke-RestMethod -Headers $headers -Uri "$apiBase/releases/assets/$($d.id)" -Method Delete | Out-Null
    Write-Output "DELETED_OLD_ASSET=$($f.Name)"
  }
  $asset = Invoke-RestMethod -Headers $upHeaders -Uri $uri -Method Post -Body $bytes
  Write-Output "ASSET=$($asset.browser_download_url)"
}
Write-Output 'DONE'
