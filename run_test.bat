@echo off
cd /d "%~dp0"
title DBARC - Complete QA Test Suite (Ports 1337, 3000, 3001, 3002)

echo =======================================================
echo          STARTING DBARC QA INTEGRATION SUITE           
echo =======================================================
echo.
echo Location: %~dp0
echo.
echo Launching 4 local services:
echo   [1/4] DBARc Backend (Strapi API)     -> Port 1337
echo   [2/4] DBARc Tenant Portal            -> Port 3000
echo   [3/4] DBARc Courier & Shipper Portal -> Port 3001
echo   [4/4] DBARc Sample Shirt Store (QA)  -> Port 3002
echo.
echo =======================================================
echo.

:: 1. Launch DBARc Strapi Backend on port 1337
echo Starting [1/4] DBARc Backend API (:1337)...
start "DBARc [1/4] - Backend API (Port 1337)" cmd /k "cd /d ""%~dp0DBARc-backend"" && title DBARc Backend :1337 && call npm.cmd run develop"

:: 2. Launch DBARc Tenant Portal on port 3000
echo Starting [2/4] DBARc Tenant Portal (:3000)...
start "DBARc [2/4] - Tenant Portal (Port 3000)" cmd /k "cd /d ""%~dp0DBARc-Tenant"" && title DBARc Tenant Portal :3000 && call npm.cmd run dev -- -p 3000"

:: 3. Launch DBARc Courier & Shipper Portal on port 3001
echo Starting [3/4] DBARc Courier Portal (:3001)...
start "DBARc [3/4] - Courier Portal (Port 3001)" cmd /k "cd /d ""%~dp0DBARc-Courier"" && title DBARc Courier Portal :3001 && call npm.cmd run dev -- -p 3001"

:: 4. Launch DBARc Sample Shirt Store on port 3002
echo Starting [4/4] DBARc Sample Shirt Store (:3002)...
start "DBARc [4/4] - Sample Shirt Store (Port 3002)" cmd /k "cd /d ""%~dp0DBARc-Store"" && title DBARc Shirt Store :3002 && node server.js"

:: Automatically launch browser tabs once services initialize (~7 seconds)
start /b cmd /c "timeout /t 7 /nobreak >nul & start http://localhost:3000 & start http://localhost:3001/orders & start http://localhost:3002"

echo.
echo =======================================================
echo              ALL 4 APPLICATIONS INITIALIZED!             
echo =======================================================
echo.
echo Local URLs for Testing:
echo   - [Port 3000] Tenant Portal:         http://localhost:3000
echo   - [Port 3001] Shipper Orders Portal: http://localhost:3001/orders
echo   - [Port 3002] Sample Shirt Store:    http://localhost:3002
echo   - [Port 1337] Strapi Admin API:      http://localhost:1337/admin
echo.
echo How to Test Real-Time Flow:
echo   1. Go to http://localhost:3002 (Shirt Store)
echo   2. Select a shirt size (S, M, L, XL), enter name/address, select COD
echo   3. Click 'Place Order on COD'
echo   4. Switch to http://localhost:3001/orders to see the order appear in REAL TIME!
echo.
echo Default Credentials:
echo   - Portal Login: naeem4it@gmail.com / #0321Blouch
echo   - Strapi Admin: naeem4it@gmail.com / #0321Blouch
echo.
echo [NOTE] Keep all opened command windows OPEN while testing.
echo        To stop all services at once, run STOP_SYSTEM.bat
echo =======================================================
echo.
pause
