@echo off
chcp 65001 >nul
echo ========================================
echo   Follayt — запуск локального сервера
echo ========================================
echo.
cd /d "%~dp0"
echo Папка: %CD%
echo.
where python >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Запускаю python -m http.server 8080 ...
  echo Откройте в браузере: http://localhost:8080
  echo.
  start http://localhost:8080
  python -m http.server 8080
  goto :eof
)
where npx >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Запускаю npx serve ...
  start http://localhost:3000
  npx --yes serve -p 3000 .
  goto :eof
)
echo Не найден Python и Node.js.
echo Установите Python (https://python.org) или Node.js (https://nodejs.org)
echo и запустите этот файл снова.
pause
