# Create Gradle Wrapper (run from android folder)
# Option 1: If you have Gradle installed (e.g. winget install gradle.gradle)
& { Set-Location $PSScriptRoot; gradle wrapper --gradle-version=8.5 2>&1 }
if ($LASTEXITCODE -eq 0) {
    Write-Host "Wrapper created. Run: .\gradlew.bat :app:assembleDebug"
} else {
    Write-Host "Gradle not found in PATH. Use Android Studio instead:"
    Write-Host "  1. Open Android Studio"
    Write-Host "  2. File > Open > select the 'android' folder"
    Write-Host "  3. Build > Build APK(s)"
}
