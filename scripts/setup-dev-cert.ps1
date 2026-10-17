$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$certDirectory = Join-Path $projectRoot ".certificates"
$pfxPath = Join-Path $certDirectory "sevenwonders.pfx"
$passwordPath = Join-Path $certDirectory "sevenwonders.password"

if ((Test-Path -LiteralPath $pfxPath) -and (Test-Path -LiteralPath $passwordPath)) {
    Write-Host "Development certificate already exists at $certDirectory"
    exit 0
}

New-Item -ItemType Directory -Path $certDirectory -Force | Out-Null
$cert = New-SelfSignedCertificate `
    -DnsName "sevenwonders.tplinkdns.com", "localhost" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -Provider "Microsoft Software Key Storage Provider" `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -KeyExportPolicy Exportable `
    -NotAfter (Get-Date).AddYears(1) `
    -FriendlyName "Seven Wonders Vite development certificate"

$passwordText = [guid]::NewGuid().ToString()
$password = ConvertTo-SecureString -String $passwordText -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password | Out-Null
[System.IO.File]::WriteAllText($passwordPath, $passwordText, [System.Text.Encoding]::ASCII)
Remove-Item -LiteralPath "Cert:\CurrentUser\My\$($cert.Thumbprint)" -ErrorAction SilentlyContinue

Write-Host "Created a self-signed development certificate in $certDirectory"
Write-Host "Browsers will warn until this certificate is trusted or replaced by a trusted certificate."
