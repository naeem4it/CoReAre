@echo off
cd /d "%~dp0"
title DBARC - Update System

echo =======================================================
echo                 UPDATING DBARC SYSTEM                 
echo =======================================================
echo.
echo This script updates packages, database schemas, and seeds.
echo.

:: 1. Update backend dependencies
echo [1/4] Updating DBARc-backend dependencies...
cd /d "%~dp0DBARc-backend"
call npm.cmd install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backend npm install failed. Check internet connection.
    pause
    exit /b 1
)

:: 2. Update tenant dependencies
echo [2/4] Updating DBARc-Tenant dependencies...
cd /d "%~dp0DBARc-Tenant"
call npm.cmd install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Tenant npm install failed. Check internet connection.
    pause
    exit /b 1
)

:: 3. Update courier dependencies
echo [3/4] Updating DBARc-Courier dependencies...
cd /d "%~dp0DBARc-Courier"
call npm.cmd install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Courier npm install failed. Check internet connection.
    pause
    exit /b 1
)

:: 4. Sync database and seeds
echo [4/4] Syncing database settings and seeds...
cd /d "%~dp0DBARc-backend"
call node scripts/setup-database.js
call npm.cmd run db:seed

echo.
echo =======================================================
echo             UPDATE COMPLETED SUCCESSFULLY!             
echo =======================================================
echo You can start the applications anytime with:
echo                    RUN_SYSTEM.bat
echo =======================================================
pause
