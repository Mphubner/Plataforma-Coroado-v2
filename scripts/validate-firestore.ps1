$ErrorActionPreference = "Stop"

$portableJdk = "C:\Users\marco\.codex\tools\jdk-21"
$portableJava = Join-Path $portableJdk "bin\java.exe"

if (Test-Path $portableJava) {
  $env:JAVA_HOME = $portableJdk
  $env:Path = "$(Join-Path $portableJdk 'bin');$env:Path"
}

$javaCommand = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCommand) {
  throw "Java nao foi encontrado. Instale Java 21 ou mantenha o JDK portatil em $portableJdk."
}

Write-Host "Usando Java em: $($javaCommand.Source)"
cmd /c "java -version 2>&1"

$validationCommand = "node -e ""console.log('firestore-rules-ok')"""
& npx.cmd --yes firebase-tools emulators:exec --only firestore --project demo-coroado $validationCommand
exit $LASTEXITCODE
