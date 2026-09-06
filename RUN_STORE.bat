@echo off
cd /d "%~dp0DBARc-Store"
title DBARC - Sample Shirt Store (Port 3002)

echo =======================================================
echo          STARTING DBARC SAMPLE SHIRT STORE             
echo =======================================================
echo.
echo Local Store URL: http://localhost:3002
echo Forwarding to:   http://localhost:1337 (Strapi API)
echo.
echo [1/2] Launching Storefront Server on Port 3002...
start /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3002"
node server.js
