@echo off
chcp 65001 >nul
color 0B
title Publicador Semi-Automatico - Sharkord

echo ====================================================
echo      PUBLICADOR DE VERSOES DO SHARKORD APP
echo ====================================================
echo Como o sistema de upload automatico do GitHub esta instavel
echo e falhando ao enviar o arquivo .exe pesado, nos vamos
echo automatizar a criacao, e voce faz o upload com 1 clique!
echo ====================================================
echo.
echo Qual o tamanho dessa atualizacao?
echo [0] Apenas Compilar - Nao mudar a versao (Manter a atual)
echo [1] Pequena (Patch) - Ex: arrumei um bug pequeno (v1.0.0 -^> v1.0.1)
echo [2] Media   (Minor) - Ex: adicionei uma tela nova (v1.0.0 -^> v1.1.0)
echo [3] Grande  (Major) - Ex: recriei o app do zero   (v1.0.0 -^> v2.0.0)
echo.
set /p tipo_up="Digite 0, 1, 2 ou 3 e aperte ENTER: "

if "%tipo_up%"=="0" set npm_cmd=none
if "%tipo_up%"=="1" set npm_cmd=patch
if "%tipo_up%"=="2" set npm_cmd=minor
if "%tipo_up%"=="3" set npm_cmd=major

if "%npm_cmd%"=="" (
    echo Opcao invalida.
    pause
    exit
)

echo.
echo ====================================================
echo 1/2: Ajustando a versao do aplicativo...
echo ====================================================
if not "%npm_cmd%"=="none" (
    call npm --no-git-tag-version version %npm_cmd%
) else (
    echo A versao atual foi mantida intacta.
)

echo.
echo ====================================================
echo Limpando a pasta de compilacao antiga...
echo ====================================================
if exist "dist" rmdir /s /q "dist"

echo.
echo ====================================================
echo 2/2: Compilando o Instalador Oficial (Aguarde alguns minutos)...
echo ====================================================
call npm run build

echo.
echo ====================================================
echo COMPILACAO CONCLUIDA COM SUCESSO!
echo ====================================================
echo A pasta "dist" acabou de ser aberta ai na sua tela.
echo.
echo PASSO FINAL:
echo 1. Va no seu GitHub e crie um "New Release"
echo 2. Coloque o nome da versao atual.
echo 3. ARRASTE os 3 arquivos da pasta "dist" para o GitHub:
echo    - O arquivo .exe
echo    - O arquivo .yml
echo    - O arquivo .blockmap
echo 4. Clique em Publish release. E pronto!
echo ====================================================
explorer dist
pause
