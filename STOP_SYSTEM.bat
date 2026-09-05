@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title DBARC - Stop System Services

echo =======================================================
echo                 STOPPING DBARC SYSTEM                 
echo =======================================================
echo.
echo Stopping services on ports 1337, 3000, and 3001...
echo.

set PORTS=1337 3000 3001

for %%p in (%PORTS%) do (
    echo Checking port %%p...
    for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr ":%%p" ^| findstr "LISTENING"') do (
        set PID=%%a
        if defined PID (
            echo   Terminating process with PID !PID! on port %%p...
            taskkill /F /PID !PID! >nul 2>&1
        )
    )
)

echo.
echo All DBARc background application processes stopped.
echo =======================================================
echo.
pause
