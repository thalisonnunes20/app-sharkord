@echo off
echo ========================================
echo   Limpando pasta dist...
echo ========================================
if exist dist (
    rmdir /s /q dist
    echo Pasta dist removida!
) else (
    echo Pasta dist nao existe, pulando...
)
echo.
echo ========================================
echo   Compilando Sharkord...
echo ========================================
npx electron-builder --win
echo.
echo ========================================
echo   Build finalizada!
echo ========================================
pause
