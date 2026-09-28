@echo off
cd /d "%~dp0DBARc-Rider"
title DBARc - Rider Mobile/Web App

echo =======================================================
echo              STARTING DBARC RIDER APP                  
echo =======================================================
echo.
echo Target Options:
echo   [1] Run in Google Chrome (Web Browser - Recommended for quick testing)
echo   [2] Run in Microsoft Edge (Web Browser)
echo   [3] Run as Windows Desktop Application
echo   [4] Run on Connected Android Device / Emulator
echo.
set /p target="Select target [1-4] (default is 1): "

if "%target%"=="2" (
    echo Launching DBARc Rider on Microsoft Edge...
    flutter run -d edge
) else if "%target%"=="3" (
    echo Launching DBARc Rider on Windows Desktop...
    flutter run -d windows
) else if "%target%"=="4" (
    echo Launching DBARc Rider on Android device/emulator...
    flutter run
) else (
    echo Launching DBARc Rider on Google Chrome...
    flutter run -d chrome
)

pause
