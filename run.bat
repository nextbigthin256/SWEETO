@echo off
title SWEETOS Store Launcher
echo ==========================================
echo       SWEETOS Store Starter Tool
echo ==========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this computer!
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Check if node_modules folder exists, if not run npm install
if not exist "node_modules\" (
    echo [INFO] First-time setup detected. Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Please check your internet connection.
        pause
        exit /b
    )
)

:: Launch the application in browser after a short delay
echo [INFO] Launching local browser at http://localhost:2005 ...
start "" "http://localhost:2005"

:: Start the local Node.js server
echo [INFO] Starting SWEETOS server...
call npm start
pause
