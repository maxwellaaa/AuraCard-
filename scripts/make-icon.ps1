Add-Type -AssemblyName System.Drawing
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -ErrorAction SilentlyContinue
# script is in AuraCard/scripts → parent is AuraCard
$project = Split-Path $PSScriptRoot -Parent
$src = Join-Path $project "public\logo.png"
$outDir = Join-Path $project "electron\build"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$bmp = New-Object System.Drawing.Bitmap $src
# Use classic BMP-in-ICO for NSIS compatibility (not PNG-compressed)
function Write-BmpIconEntry([System.Drawing.Bitmap]$source, [int]$size) {
  $resized = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($resized)
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($source, 0, 0, $size, $size)
  $g.Dispose()

  $ms = New-Object System.IO.MemoryStream
  # 32bpp ARGB bitmap without file header for ICO
  $w = $size
  $h = $size
  $xorSize = $w * $h * 4
  $andRow = [Math]::Ceiling($w / 32.0) * 4
  $andSize = $andRow * $h
  $bw = New-Object System.IO.BinaryWriter $ms
  # BITMAPINFOHEADER
  $bw.Write([UInt32]40)
  $bw.Write([Int32]$w)
  $bw.Write([Int32]($h * 2))
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]0)
  $bw.Write([UInt32]($xorSize + $andSize))
  $bw.Write([Int32]0)
  $bw.Write([Int32]0)
  $bw.Write([UInt32]0)
  $bw.Write([UInt32]0)
  for ($y = $h - 1; $y -ge 0; $y--) {
    for ($x = 0; $x -lt $w; $x++) {
      $c = $resized.GetPixel($x, $y)
      $bw.Write([byte]$c.B)
      $bw.Write([byte]$c.G)
      $bw.Write([byte]$c.R)
      $bw.Write([byte]$c.A)
    }
  }
  $andBytes = New-Object byte[] $andSize
  $bw.Write($andBytes)
  $resized.Dispose()
  $bw.Flush()
  return $ms.ToArray()
}

$sizes = @(256, 128, 64, 48, 32, 16)
$images = @()
foreach ($s in $sizes) {
  $images += ,(Write-BmpIconEntry $bmp $s)
}
$bmp.Dispose()

$icoPath = Join-Path $outDir "icon.ico"
$fs = [System.IO.File]::Open($icoPath, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$images.Count)
$offset = 6 + (16 * $images.Count)
for ($i = 0; $i -lt $images.Count; $i++) {
  $data = $images[$i]
  $s = $sizes[$i]
  $dim = 0
  if ($s -lt 256) { $dim = $s }
  $bw.Write([byte]$dim)
  $bw.Write([byte]$dim)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([UInt16]1)
  $bw.Write([UInt16]32)
  $bw.Write([UInt32]$data.Length)
  $bw.Write([UInt32]$offset)
  $offset += $data.Length
}
foreach ($data in $images) {
  $bw.Write($data)
}
$bw.Flush()
$fs.Close()

# also keep a resized png for electron-builder fallback
$pngOut = Join-Path $outDir "icon.png"
$pngBmp = New-Object System.Drawing.Bitmap 256, 256
$g2 = [System.Drawing.Graphics]::FromImage($pngBmp)
$srcBmp = New-Object System.Drawing.Bitmap $src
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($srcBmp, 0, 0, 256, 256)
$g2.Dispose()
$srcBmp.Dispose()
$pngBmp.Save($pngOut, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBmp.Dispose()

Write-Output "Wrote $icoPath ($((Get-Item $icoPath).Length) bytes)"
Write-Output "Wrote $pngOut ($((Get-Item $pngOut).Length) bytes)"
