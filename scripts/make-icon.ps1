Add-Type -AssemblyName System.Drawing
$src = Join-Path $PSScriptRoot "..\public\logo.png"
$outDir = Join-Path $PSScriptRoot "..\electron\build"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$bmp = New-Object System.Drawing.Bitmap $src
$sizes = @(256, 128, 64, 48, 32, 16)
$iconImages = New-Object System.Collections.Generic.List[byte[]]
foreach ($s in $sizes) {
  $resized = New-Object System.Drawing.Bitmap $s, $s
  $g = [System.Drawing.Graphics]::FromImage($resized)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($bmp, 0, 0, $s, $s)
  $g.Dispose()
  $pngMs = New-Object System.IO.MemoryStream
  $resized.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
  $iconImages.Add($pngMs.ToArray())
  $resized.Dispose()
  $pngMs.Dispose()
}
$bmp.Dispose()

$icoPath = Join-Path $outDir "icon.ico"
$fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$iconImages.Count)
$offset = 6 + (16 * $iconImages.Count)
for ($i = 0; $i -lt $iconImages.Count; $i++) {
  $data = $iconImages[$i]
  $s = $sizes[$i]
  $bw.Write([byte](if ($s -ge 256) { 0 } else { $s }))
  $bw.Write([byte](if ($s -ge 256) { 0 } else { $s }))
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]$data.Length)
  $bw.Write([UInt32]$offset)
  $offset += $data.Length
}
foreach ($data in $iconImages) {
  $bw.Write($data)
}
$bw.Flush()
$fs.Close()
Copy-Item $src (Join-Path $outDir "icon.png") -Force
Write-Output "Wrote $icoPath size=$((Get-Item $icoPath).Length)"
