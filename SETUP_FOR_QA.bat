@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title DBARC - Initial QA Setup Automation

echo =======================================================
echo          DBARC SYSTEM - QA SETUP AUTOMATION           
echo =======================================================
echo.
echo Target Location: %~dp0
echo.

:: ---------------------------------------------------------
:: 1. Verify Node.js and npm
:: ---------------------------------------------------------
echo [1/6] Checking Node.js installation...
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is NOT installed or not found in system PATH!
    echo Please install Node.js [v20 or higher recommended] from https://nodejs.org/
    echo If you recently installed Node.js, please restart this command prompt.
    echo.
    goto ERROR_EXIT
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo  - Node.js is available: %NODE_VERSION%

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is NOT found in system PATH!
    echo.
    goto ERROR_EXIT
)
echo  - npm is ready.
echo.

:: ---------------------------------------------------------
:: 2. Prepare Environment Configuration (.env files)
:: ---------------------------------------------------------
echo [2/6] Checking and preparing environment (.env) files...

:: 2a. DBARc-backend .env
if not exist "%~dp0DBARc-backend\.env" (
    echo  - Creating DBARc-backend\.env from defaults...
    (
        echo # Server
        echo HOST=0.0.0.0
        echo PORT=1337
        echo.
        echo # Secrets
        echo APP_KEYS=RvnLKYnpzDH3u42Und2/Jg==,+x7Tz/KLzebkvKFm1Nh3gA==,4lDau6fO0xYSE1iOr2S6fA==,vf1JidXQilWVtuf6EGaZ5g==
        echo API_TOKEN_SALT=Amg6CXVP3orYVeMGp+dGow==
        echo ADMIN_JWT_SECRET=IfTgIVj8Ok530ZZaPQ8s+A==
        echo TRANSFER_TOKEN_SALT=Bw5eIHGh9G0rfkYpk9iw5Q==
        echo ENCRYPTION_KEY=rDxV7d0GKE6Y/JBlLyky4A==
        echo.
        echo # Database
        echo DATABASE_CLIENT=postgres
        echo DATABASE_HOST=127.0.0.1
        echo DATABASE_PORT=5432
        echo DATABASE_NAME=dbarc_db
        echo DATABASE_USERNAME=postgres
        echo DATABASE_PASSWORD=root
        echo DATABASE_SSL=false
        echo DATABASE_FILENAME=
        echo JWT_SECRET=1+9olMJ+IgamypaLZxHD/w==
    ) > "%~dp0DBARc-backend\.env"
    echo    DBARc-backend\.env created.
) else (
    echo  - DBARc-backend\.env already exists.
)

:: 2b. DBARc-Tenant .env.local
if not exist "%~dp0DBARc-Tenant\.env.local" (
    echo  - Creating DBARc-Tenant\.env.local...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:1337/api
    ) > "%~dp0DBARc-Tenant\.env.local"
    echo    DBARc-Tenant\.env.local created.
) else (
    echo  - DBARc-Tenant\.env.local already exists.
)

:: 2c. DBARc-Courier .env.local
if not exist "%~dp0DBARc-Courier\.env.local" (
    echo  - Creating DBARc-Courier\.env.local...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:1337/api
    ) > "%~dp0DBARc-Courier\.env.local"
    echo    DBARc-Courier\.env.local created.
) else (
    echo  - DBARc-Courier\.env.local already exists.
)
echo Environment files verified.
echo.

:: ---------------------------------------------------------
:: 3. Install NPM Dependencies
:: ---------------------------------------------------------
echo [3/6] Installing application dependencies...

echo   -- Installing DBARc-backend dependencies...
cd /d "%~dp0DBARc-backend"
call npm.cmd install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed for DBARc-backend!
    goto ERROR_EXIT
)

echo   -- Installing DBARc-Tenant dependencies...
cd /d "%~dp0DBARc-Tenant"
call npm.cmd install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed for DBARc-Tenant!
    goto ERROR_EXIT
)

echo   -- Installing DBARc-Courier dependencies...
cd /d "%~dp0DBARc-Courier"
call npm.cmd install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed for DBARc-Courier!
    goto ERROR_EXIT
)
echo All dependencies installed successfully.
echo.

:: ---------------------------------------------------------
:: 4. Configure PostgreSQL & Restore Schema
:: ---------------------------------------------------------
echo [4/6] Configuring PostgreSQL database and verifying schema...
cd /d "%~dp0DBARc-backend"
call node scripts/setup-database.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Could not connect to PostgreSQL!
    echo Please verify that:
    echo   1. The PostgreSQL service is running on 127.0.0.1:5432.
    echo   2. Password in DBARc-backend\.env matches PostgreSQL password (default: root).
    echo.
    goto ERROR_EXIT
)
echo Database configured and ready.
echo.

:: ---------------------------------------------------------
:: 5. Configure & Build Strapi Admin UI
:: ---------------------------------------------------------
echo [5/6] Configuring and building Strapi backend...
cd /d "%~dp0DBARc-backend"
call npm.cmd run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Strapi build failed! Please check error output above.
    goto ERROR_EXIT
)
echo Strapi build completed successfully.
echo.

:: ---------------------------------------------------------
:: 6. Seed QA Admin Roles & Test Users
:: ---------------------------------------------------------
echo [6/6] Seeding default QA roles and users...
cd /d "%~dp0DBARc-backend"
call npm.cmd run db:seed
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Seeding encountered an issue, but continuing setup.
)
echo.

echo =======================================================
echo           QA SETUP COMPLETED SUCCESSFULLY!             
echo =======================================================
echo.
echo All components configured and ready:
echo.
echo   [1] DBARc Backend API:    http://localhost:1337/admin
echo   [2] DBARc Tenant Portal:  http://localhost:3000
echo   [3] DBARc Courier Portal: http://localhost:3001
echo.
echo Default QA Credentials:
echo   - Super Admin:   naeem4it@gmail.com    / Password123!
echo   - Courier Admin: naeemcourier@test.com / Password123!
echo   - Shipper Admin: naeemshiper@test.com  / Password123!
echo.
echo =======================================================
echo You can run the entire system anytime by running:
echo                    RUN_SYSTEM.bat
echo =======================================================
echo.
set /p START_NOW="Would you like to launch the applications now? [Y/N]: "
if /i "%START_NOW%"=="Y" (
    cd /d "%~dp0"
    call RUN_SYSTEM.bat
)
pause
exit /b 0

:ERROR_EXIT
echo.
echo =======================================================
echo [SETUP FAILED] Please resolve the error above.
echo =======================================================
pause
exit /b 1
