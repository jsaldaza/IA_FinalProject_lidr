# TestForge - Crear Usuario con PowerShell
Write-Host "🚀 CREANDO USUARIO EN TESTFORGE" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Datos del usuario
$userData = @{
    email    = "admin@testforge.com"
    password = "TestForge2024!"
    name     = "Administrador TestForge"
} | ConvertTo-Json

Write-Host "📋 Datos del usuario:" -ForegroundColor Yellow
Write-Host "   Email: admin@testforge.com"
Write-Host "   Nombre: Administrador TestForge"
Write-Host "   Password: [OCULTO]"
Write-Host ""

try {
    # Verificar que el servidor esté corriendo
    Write-Host "🔗 Verificando servidor..." -ForegroundColor Yellow
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Servidor activo: $($healthCheck.status)" -ForegroundColor Green
    Write-Host ""
    
    # Crear usuario
    Write-Host "👤 Creando usuario..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method POST -Body $userData -ContentType "application/json" -TimeoutSec 10
    
    Write-Host "✅ USUARIO CREADO EXITOSAMENTE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Respuesta del servidor:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 3 | Write-Host
    
    if ($response.token) {
        $tokenPreview = $response.token.Substring(0, [Math]::Min(20, $response.token.Length))
        Write-Host ""
        Write-Host "🔑 Token generado: $tokenPreview..." -ForegroundColor Cyan
    }
    
    if ($response.user) {
        Write-Host "👤 Usuario ID: $($response.user.id)" -ForegroundColor Cyan
        Write-Host "📧 Email: $($response.user.email)" -ForegroundColor Cyan
    }
    
}
catch {
    Write-Host "❌ ERROR AL CREAR USUARIO" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Detalles del error:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "📡 Status Code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 400) {
            Write-Host "💡 Posible causa: Datos de entrada inválidos o usuario ya existe" -ForegroundColor Yellow
        }
        elseif ($statusCode -eq 500) {
            Write-Host "💡 Posible causa: Error interno del servidor o base de datos" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "🔧 Verificar que:" -ForegroundColor Yellow
    Write-Host "   - El servidor esté corriendo (npm run dev)"
    Write-Host "   - La base de datos esté configurada"
    Write-Host "   - El endpoint /api/auth/register exista"
}

Write-Host ""
Write-Host "✅ Script completado" -ForegroundColor Green
