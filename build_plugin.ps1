$pluginDir = ".\plugin\buildbot-woocommerce"
$zipPath = ".\server\buildbot-woocommerce.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath
}

Compress-Archive -Path "$pluginDir\*" -DestinationPath $zipPath
Write-Host "Plugin successfully zipped to $zipPath!" -ForegroundColor Green
