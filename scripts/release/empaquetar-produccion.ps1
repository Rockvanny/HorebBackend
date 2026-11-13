<#
.SYNOPSIS
    Genera dist\backend.rar con solo lo necesario para instalar el backend
    en producción.

.DESCRIPTION
    El contenido sale del último commit (git archive), no de la carpeta: así
    nunca entran .env, backups\, logs\, node_modules\ ni nada sin versionar.
    Si hay cambios sin commit, se detiene: lo que va a producción tiene que
    ser lo que está en Git.

    Quita además lo que solo sirve para desarrollar (tests, configuración de
    eslint/jest/sequelize-cli y notas internas) y añade VERSION.txt con el
    commit y la fecha.

    Los archivos van en la raíz del .rar: en el otro equipo, "Extraer en
    backend\" los deja directamente en backend\. Allí se conserva el .env de
    ese equipo y se ejecuta:  docker compose up -d --build

    Uso, desde la carpeta Backend:
        powershell -ExecutionPolicy Bypass -File scripts\release\empaquetar-produccion.ps1
#>

$ErrorActionPreference = 'Stop'
$backendDir = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $backendDir

# Solo para desarrollo: no viajan a producción
$EXCLUDE = @(
    'test', 'jest.config.js', '.eslintrc.json', '.editorconfig', '.sequelizerc',
    'CLAUDE.md', 'BITACORA.md', 'SEGURIDAD.md', 'scripts/release'
)

# Nada de esto puede aparecer dentro del .rar
$FORBIDDEN = '(^|[\\/])(\.env(\..*)?|backups|logs|node_modules|postgres_data|license-generator)([\\/]|$)|\.(dump|lic|pfx|p12|key)$|\.pem$'
$ALLOWED = '(^|[\\/])\.env\.example$|config[\\/]license-public-key\.pem$'

function Fail($text) { Write-Host "ERROR: $text" -ForegroundColor Red; exit 1 }

function Invoke-Git {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & git @args 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = $previous
    if ($code -ne 0) { Fail "git $($args -join ' '): $($out -join ' ')" }
    return $out
}

$rar = @("$env:ProgramFiles\WinRAR\Rar.exe", "${env:ProgramFiles(x86)}\WinRAR\Rar.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $rar) { Fail 'No se encuentra WinRAR (Rar.exe) en Archivos de programa.' }

# --- Lo que va a producción es lo que está en Git ---------------------------
$pending = Invoke-Git status --porcelain
if ($pending) {
    Write-Host 'Hay cambios sin commit, que NO irían en el paquete:' -ForegroundColor Yellow
    $pending | ForEach-Object { Write-Host "    $_" }
    Fail 'Haz commit (o descarta los cambios) y vuelve a ejecutarlo.'
}

$commit = (Invoke-Git rev-parse --short HEAD) -join ''
$branch = (Invoke-Git rev-parse --abbrev-ref HEAD) -join ''
$subject = (Invoke-Git log -1 --format=%s) -join ''
$date = Get-Date -Format 'yyyy-MM-dd HH:mm'

# --- Copia limpia del commit, sin lo de desarrollo -------------------------
$work = Join-Path ([System.IO.Path]::GetTempPath()) "horeb-backend-$commit-$([guid]::NewGuid().ToString('N').Substring(0, 6))"
$zip = "$work.zip"
New-Item -ItemType Directory -Force $work | Out-Null

$pathspecs = @('.') + ($EXCLUDE | ForEach-Object { ":(exclude)$_" })
Invoke-Git archive --format=zip -o $zip HEAD -- @pathspecs | Out-Null
Expand-Archive -Path $zip -DestinationPath $work -Force
Remove-Item $zip

@"
Horeb · backend
Commit:  $commit ($branch)
Cambio:  $subject
Fecha:   $date

Instalar: extraer en la carpeta backend (conservando su .env) y ejecutar
    docker compose up -d --build
Ver docs\actualizar-postgres.md y docs\copias-de-seguridad.md.
"@ | Set-Content -Path (Join-Path $work 'VERSION.txt') -Encoding UTF8

# --- .rar -------------------------------------------------------------------
$distDir = Join-Path $backendDir 'dist'
New-Item -ItemType Directory -Force $distDir | Out-Null
$output = Join-Path $distDir 'backend.rar'
# El antivirus puede tener el .rar anterior abierto unos segundos tras crearlo
for ($i = 0; (Test-Path $output) -and $i -lt 10; $i++) {
    try { Remove-Item $output -ErrorAction Stop }
    catch { Start-Sleep -Seconds 1 }
}
if (Test-Path $output) {
    Remove-Item -Recurse -Force $work
    Fail "No se puede reemplazar $output : ciérralo si está abierto (WinRAR, explorador) y vuelve a ejecutarlo."
}

& $rar a -r -ep1 -m5 -idq $output (Join-Path $work '*') | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "WinRAR ha fallado (código $LASTEXITCODE)." }
Remove-Item -Recurse -Force $work

# --- Revisión: nada sensible dentro ----------------------------------------
$entries = & $rar lb $output
$bad = $entries | Where-Object { $_ -match $FORBIDDEN -and $_ -notmatch $ALLOWED }
if ($bad) {
    Remove-Item $output
    Fail ("El paquete contenía archivos que no deben salir de este equipo (se ha borrado):`n    " + ($bad -join "`n    "))
}
foreach ($required in @('Dockerfile', 'docker-compose.yml', 'package.json', 'package-lock.json', 'index.js', '.env.example')) {
    if ($entries -notcontains $required) { Remove-Item $output; Fail "Falta $required en el paquete." }
}

$sizeKB = [math]::Round((Get-Item $output).Length / 1KB)
Write-Host ''
Write-Host "Paquete listo: $output ($sizeKB KB, $($entries.Count) entradas)" -ForegroundColor Green
Write-Host "  Commit $commit ($branch): $subject"
Write-Host '  Sin .env, copias, logs, node_modules ni claves privadas (comprobado).'
Write-Host '  En producción: "Extraer en backend\", conservar su .env y'
Write-Host '    docker compose up -d --build'
