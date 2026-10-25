@echo off
chcp 65001 >nul
title NexVen Studio Bot
cd /d "%~dp0"

echo ========================================
echo   NexVen Studio Telegram Bot
echo ========================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Install from https://www.python.org
    pause
    exit /b 1
)

echo Installing / checking aiogram...
python -m pip install aiogram -q
echo.

echo Closing old bot instances (if any)...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq NexVen Studio Bot" >nul 2>&1
timeout /t 1 /nobreak >nul

echo.
echo Starting bot...
echo ========================================
echo.

python bot.py

echo.
echo ========================================
echo Bot stopped.
pause
