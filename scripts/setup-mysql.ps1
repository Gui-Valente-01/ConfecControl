$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$mysqlCandidates = @(
  "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
  "C:\Program Files\MySQL\MySQL Workbench 8.0\mysql.exe"
)

$mysql = $mysqlCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $mysql) {
  $mysql = (Get-Command mysql.exe -ErrorAction SilentlyContinue).Source
}

if (-not $mysql) {
  throw "mysql.exe nao foi encontrado. Confirme se o MySQL Server esta instalado."
}

$dbName = (Read-Host "Nome do banco").Trim()
if ([string]::IsNullOrWhiteSpace($dbName)) {
  $dbName = "confeccontrol"
}

$dbUser = (Read-Host "Usuario do MySQL").Trim()
if ([string]::IsNullOrWhiteSpace($dbUser)) {
  $dbUser = "root"
}

$securePassword = Read-Host "Senha do MySQL" -AsSecureString
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)

Write-Host "Criando banco '$dbName' se ele ainda nao existir..."
$env:MYSQL_PWD = $dbPassword
& $mysql -u $dbUser -e "CREATE DATABASE IF NOT EXISTS ``$dbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) {
  throw "Nao consegui conectar no MySQL. Confira usuario e senha."
}
$env:MYSQL_PWD = $null

$encodedPassword = [System.Uri]::EscapeDataString($dbPassword)
$databaseUrl = "mysql://${dbUser}:${encodedPassword}@localhost:3306/${dbName}"
$envPath = Join-Path $projectRoot ".env.local"
$prismaEnvPath = Join-Path $projectRoot ".env"
"DATABASE_URL=""$databaseUrl""" | Set-Content -LiteralPath $envPath -Encoding UTF8
"DATABASE_URL=""$databaseUrl""" | Set-Content -LiteralPath $prismaEnvPath -Encoding UTF8
$env:DATABASE_URL = $databaseUrl

Write-Host "Conexao salva em .env.local e .env"
Write-Host "Gerando cliente Prisma..."
Push-Location $projectRoot
npm run db:generate
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao gerar Prisma Client."
}

Write-Host "Criando tabelas no MySQL..."
npm run db:push
if ($LASTEXITCODE -ne 0) {
  throw "Falha ao criar tabelas no banco."
}
Pop-Location

Write-Host "Banco pronto."
