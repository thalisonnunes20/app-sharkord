@echo off
echo ========================================================
echo   Limpando dados e configuracoes do app Sharkord...
echo ========================================================
echo.

:: Tenta fechar o aplicativo caso ele esteja rodando no fundo
taskkill /F /IM electron.exe 2>NUL
taskkill /F /IM Sharkord.exe 2>NUL

:: Verifica e remove com seguranca apenas a pasta do app Sharkord
IF EXIST "%APPDATA%\sharkord-app-windows" (
    rmdir /S /Q "%APPDATA%\sharkord-app-windows"
    echo Sucesso! Todas as configuracoes foram limpas.
    echo O aplicativo voltara ao estado de fabrica na proxima vez que abrir.
) ELSE (
    echo Nenhum dado antigo foi encontrado. O app ja esta limpo!
)

echo.
pause
