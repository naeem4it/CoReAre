@echo off
title DBARc - Rider Mobile Experience
cd /d "%~dp0DBARc-Rider"

set "FLUTTER_CMD=flutter"
if exist "C:\src\flutter\bin\flutter.bat" (
    set "FLUTTER_CMD=C:\src\flutter\bin\flutter.bat"
)

echo ======================================================================
echo              DBARC RIDER - MOBILE TESTING ENVIRONMENT                
echo ======================================================================
echo.

:: Check Local Strapi Backend on Port 1337
echo [1/2] Checking Local DBARc Backend on Port 1337...
powershell -Command "if (Test-NetConnection -ComputerName 127.0.0.1 -Port 1337 -InformationLevel Quiet) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo       [OK] Local Backend is RUNNING on http://localhost:1337
) else (
    echo       [WARNING] Local Backend is NOT running on port 1337!
    echo       Start it with RUN_SYSTEM.bat to use the local database.
)

echo.
echo ----------------------------------------------------------------------
echo  LOCAL DATABASE RIDER ACCOUNT:
echo    Username: ginjeeerider#1
echo    Password: Password123!
echo    Active Run Sheet in DB: DS-8010475 (LHR-NORTH-01)
echo ----------------------------------------------------------------------
echo.

echo Select Mobile Testing Mode:
echo.
echo   [1] Mobile Simulation on PC (Chrome Mobile View 412x915 with Touch)
echo   [2] Real Physical Mobile Phone via Wi-Fi (http://192.168.100.6:5050)
echo   [3] Connected Android Phone or Emulator (Native APK)
echo.

set "mode=1"
set /p "mode=Choose option 1, 2 or 3 (Press Enter for Default 1): "

if "%mode%"=="2" goto opt_wifi
if "%mode%"=="3" goto opt_device
goto opt_chrome

:opt_chrome
echo.
echo ------------------------------------------------------------------
echo Launching Google Chrome in Mobile Phone Viewport 412x915...
echo Port: 5050
echo ------------------------------------------------------------------
echo.
call "%FLUTTER_CMD%" run -d chrome --web-port=5050 --web-browser-flag="--window-size=412,915" --web-browser-flag="--touch-events=enabled"
goto end

:opt_wifi
echo.
echo ------------------------------------------------------------------
echo Hosting DBARc Rider for Real Mobile Testing on Wi-Fi...
echo Connect your phone to the same Wi-Fi and open this URL on your phone:
echo    http://192.168.100.6:5050
echo ------------------------------------------------------------------
echo.
call "%FLUTTER_CMD%" run -d web-server --web-hostname=0.0.0.0 --web-port=5050
goto end

:opt_device
echo.
echo ------------------------------------------------------------------
echo Searching for connected Android devices or emulators...
echo ------------------------------------------------------------------
echo.
call "%FLUTTER_CMD%" run
goto end

:end
echo.
echo Execution finished.
pause
