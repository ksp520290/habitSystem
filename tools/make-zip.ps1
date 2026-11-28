# プロジェクト一式をZIPにまとめる（Windows PowerShell）
# 使い方：  cd habit-forest ; powershell -ExecutionPolicy Bypass -File tools\make-zip.ps1
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path (Split-Path -Parent $root) ("habit-forest-" + (Get-Date -Format yyyyMMdd) + ".zip")
if (Test-Path $out) { Remove-Item $out }
$items = Get-ChildItem -Path $root -Force | Where-Object { $_.Name -notin @('.git') }
Compress-Archive -Path $items.FullName -DestinationPath $out
Write-Host "作成しました: $out"
