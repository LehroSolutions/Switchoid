param([switch]$AllowExistingInstall)

$ErrorActionPreference = 'Stop'
function Get-LaunchHash([string]$LaunchFilePath) {
  $launchStream = [System.IO.File]::OpenRead((Resolve-Path -LiteralPath $LaunchFilePath).Path)
  $launchAlgorithm = [System.Security.Cryptography.SHA256]::Create()
  try { return [BitConverter]::ToString($launchAlgorithm.ComputeHash($launchStream)).Replace('-', '') }
  finally { $launchAlgorithm.Dispose(); $launchStream.Dispose() }
}
$launchRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $launchRoot
$launchVersion = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version
$launchInstaller = (Resolve-Path "release/Switchoid-Setup-$launchVersion-x64.exe").Path
$launchInstallDirectory = Join-Path $env:LOCALAPPDATA 'Programs/Switchoid'
$launchExecutable = Join-Path $launchInstallDirectory 'Switchoid.exe'
$launchUninstaller = Join-Path $launchInstallDirectory 'Uninstall Switchoid.exe'
$launchHadInstallation = Test-Path -LiteralPath $launchExecutable
if (Get-Process Switchoid -ErrorAction SilentlyContinue) { throw 'Close Switchoid before testing its installer.' }
if ($launchHadInstallation -and -not $AllowExistingInstall) { throw 'An existing install was found. Use -AllowExistingInstall to test upgrading it; the current installer will be reinstalled afterward.' }
$launchExpectedHash = ((Get-Content -LiteralPath "$launchInstaller.sha256" -Raw) -split '\s+')[0]
if ((Get-LaunchHash $launchInstaller) -ne $launchExpectedHash) { throw 'Installer checksum mismatch.' }

function Get-LaunchProfileHashes {
  $launchHashes = @{}
  foreach ($launchName in @('settings.json', 'history.json', 'presets.json')) {
    $launchDataFile = Join-Path $env:APPDATA "Switchoid/$launchName"
    $launchHashes[$launchName] = if (Test-Path -LiteralPath $launchDataFile) { Get-LaunchHash $launchDataFile } else { $null }
  }
  return $launchHashes
}

function Invoke-LaunchInstaller {
  $launchProcess = Start-Process -FilePath $launchInstaller -ArgumentList '/S' -WindowStyle Hidden -PassThru -Wait
  if ($launchProcess.ExitCode -ne 0) { throw "Installer failed: $($launchProcess.ExitCode)" }
  if (-not (Test-Path -LiteralPath $launchExecutable)) { throw 'Installed executable is missing.' }
}

$launchCreatedProfileFiles = @{}
$launchProfileDirectory = Join-Path $env:APPDATA 'Switchoid'
$launchPriorProfileHashes = Get-LaunchProfileHashes
New-Item -ItemType Directory -Path $launchProfileDirectory -Force | Out-Null
foreach ($launchName in $launchPriorProfileHashes.Keys) {
  if ($null -eq $launchPriorProfileHashes[$launchName]) {
    $launchFixture = Join-Path $launchProfileDirectory $launchName
    $launchFixtureValue = if ($launchName -eq 'settings.json') { '{}' } else { '[]' }
    New-Item -ItemType File -Path $launchFixture -Value $launchFixtureValue | Out-Null
    $launchCreatedProfileFiles[$launchFixture] = Get-LaunchHash $launchFixture
  }
}
$launchOriginalHashes = Get-LaunchProfileHashes
$launchPriorExecutable = $env:SWITCHOID_EXECUTABLE
try {
  Invoke-LaunchInstaller
  $launchPackagedHash = Get-LaunchHash 'release/win-unpacked/Switchoid.exe'
  if ((Get-LaunchHash $launchExecutable) -ne $launchPackagedHash) { throw 'Installed executable differs from the verified package.' }
  $env:SWITCHOID_EXECUTABLE = $launchExecutable
  & bun run test:ui
  if ($LASTEXITCODE -ne 0) { throw 'Installed application verification failed.' }
  $launchUIResults = Get-Content -LiteralPath 'artifacts/ui-results.json' -Raw | ConvertFrom-Json
  $launchDesktopShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Switchoid.lnk'
  $launchMenuShortcut = Join-Path ([Environment]::GetFolderPath('Programs')) 'Switchoid.lnk'
  if (-not (Test-Path -LiteralPath $launchDesktopShortcut) -or -not (Test-Path -LiteralPath $launchMenuShortcut)) { throw 'Installer shortcuts are missing.' }
  if (-not (Test-Path -LiteralPath $launchUninstaller)) { throw 'Uninstaller is missing.' }
  $launchUninstallProcess = Start-Process -FilePath $launchUninstaller -ArgumentList '/S' -WindowStyle Hidden -PassThru -Wait
  if ($launchUninstallProcess.ExitCode -ne 0) { throw "Uninstaller failed: $($launchUninstallProcess.ExitCode)" }
  $launchDeadline = (Get-Date).AddSeconds(30)
  while ((Test-Path -LiteralPath $launchExecutable) -and (Get-Date) -lt $launchDeadline) { Start-Sleep -Milliseconds 500 }
  if ((Test-Path -LiteralPath $launchExecutable) -or (Test-Path -LiteralPath $launchDesktopShortcut) -or (Test-Path -LiteralPath $launchMenuShortcut)) { throw 'Uninstallation did not remove the app and shortcuts.' }
  $launchRemainingEntry = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -eq 'Switchoid' }
  if ($launchRemainingEntry) { throw 'Uninstall registration remains.' }
  $launchAfterHashes = Get-LaunchProfileHashes
  foreach ($launchName in $launchOriginalHashes.Keys) {
    if ($launchOriginalHashes[$launchName] -ne $launchAfterHashes[$launchName]) { throw "Uninstallation changed $launchName" }
  }
  $launchResults = @{ installer = Split-Path -Leaf $launchInstaller; sha256 = $launchExpectedHash; install = 'passed'; installedUI = $launchUIResults.passed; uninstall = 'passed'; userData = 'preserved'; restoredExistingInstall = [bool]$launchHadInstallation }
} finally {
  $env:SWITCHOID_EXECUTABLE = $launchPriorExecutable
  if ($launchHadInstallation) { Invoke-LaunchInstaller }
  foreach ($launchFixture in $launchCreatedProfileFiles.Keys) {
    if (Test-Path -LiteralPath $launchFixture) {
      if ((Get-LaunchHash $launchFixture) -ne $launchCreatedProfileFiles[$launchFixture]) { throw 'A preservation fixture was modified; it has been kept for inspection.' }
      Remove-Item -LiteralPath $launchFixture
    }
  }
}
New-Item -ItemType Directory -Path artifacts -Force | Out-Null
$launchResults | ConvertTo-Json | Set-Content -LiteralPath 'artifacts/installer-verification.json' -Encoding UTF8
Write-Output 'PASS installer: installed app, shortcuts, uninstall registration, uninstallation, and user-data preservation'
