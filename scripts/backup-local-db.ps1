param(
    [string]$DbHost = "localhost",
    [int]$Port = 3306,
    [string]$Database = "student_guide_allocation_portal",
    [string]$User = "root"
)

$ErrorActionPreference = "Stop"

$mysqldumpCmd = Get-Command mysqldump -ErrorAction SilentlyContinue
if ($mysqldumpCmd) {
    $mysqldump = $mysqldumpCmd.Source
} elseif (Test-Path "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe") {
    $mysqldump = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
} else {
    Write-Error "mysqldump.exe not found. Add MySQL bin directory to PATH and retry."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $repoRoot "backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$fullBackupFile = Join-Path $backupDir "sgap_full_backup_$timestamp.sql"
$cloudDataFile = Join-Path $backupDir "sgap_cloud_data_$timestamp.sql"

$passwordPlain = $env:DB_PASSWORD
if ([string]::IsNullOrWhiteSpace($passwordPlain)) {
    $securePwd = Read-Host -Prompt "Enter local MySQL password for user '$User'" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePwd)
    try {
        $passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

$env:MYSQL_PWD = $passwordPlain
try {
    & $mysqldump `
        --host=$DbHost `
        --port=$Port `
        --user=$User `
        --set-gtid-purged=OFF `
        --single-transaction `
        --no-tablespaces `
        --skip-lock-tables `
        --default-character-set=utf8mb4 `
        --hex-blob `
        --databases $Database `
        --result-file="$fullBackupFile"

    if ($LASTEXITCODE -ne 0) {
        throw "Full mysqldump failed with exit code $LASTEXITCODE"
    }

    & $mysqldump `
        --host=$DbHost `
        --port=$Port `
        --user=$User `
        --set-gtid-purged=OFF `
        --single-transaction `
        --no-tablespaces `
        --skip-lock-tables `
        --skip-add-drop-table `
        --no-create-info `
        --insert-ignore `
        --complete-insert `
        --default-character-set=utf8mb4 `
        --hex-blob `
        $Database `
        --result-file="$cloudDataFile"

    if ($LASTEXITCODE -ne 0) {
        throw "Cloud data-only mysqldump failed with exit code $LASTEXITCODE"
    }

    Write-Host "Backup completed cleanly (local database untouched):" -ForegroundColor Green
    Write-Host "  Full backup (schema + data): $fullBackupFile"
    Write-Host "  Cloud data-only SQL:         $cloudDataFile"
} finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    $passwordPlain = $null
}
