@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title WebForge Studio Launcher
cd /d "%~dp0"

set "PORT=3000"
if not "%~1"=="" set "PORT=%~1"
set "URL=http://127.0.0.1:%PORT%"
set "ERR_COUNT=0"
set "NODE_VER="
set "NODE_MAJOR=0"

echo.
echo ==========================================================
echo   WEBFORGE STUDIO -- VERIFY, DOWNLOAD ^& LAUNCH
echo ==========================================================
echo   Folder : %CD%
echo   Target : %URL%
echo.

REM ==========================================================
REM  PHASE 1: BOOTSTRAP, DEPENDENCY CHECK ^& AUTO-DOWNLOAD
REM ==========================================================

echo [STEP 1/5] Checking launcher bootstrap files...
set "BOOT_MISSING="
for %%F in (
  "index.html"
  "tools\serve.mjs"
  "tools\preflight-check.mjs"
) do (
  if not exist "%%~F" (
    set "BOOT_MISSING=!BOOT_MISSING! %%~F"
  )
)

if defined BOOT_MISSING (
  call :add_error "ERR_BOOTSTRAP_MISSING" "Core Files" "Critical launcher files are missing:%BOOT_MISSING%" "Extract the complete WebForge ZIP archive (do not run start.bat from inside a compressed ZIP preview) and try again."
  goto :error_section
)
echo   [OK] Core launcher bootstrap files found.
echo.

echo [STEP 2/5] Checking Node.js runtime ^(v18+ required^)...
call :detect_node
if !NODE_MAJOR! GEQ 18 goto :node_ready

echo   [WARN] Node.js 18+ was not found ^(detected: !NODE_VER!^).
echo   [FIX]  Attempting automatic download ^& install of Node.js LTS via winget...

where winget >nul 2>&1
if errorlevel 1 (
  call :add_error "ERR_NODE_MISSING" "App Runtime" "Node.js 18 or newer is required to run WebForge and its local UI library server, and winget is not available for auto-install." "Download and install Node.js LTS from https://nodejs.org , restart your terminal, and run start.bat again."
  goto :error_section
)

winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  call :add_error "ERR_NODE_AUTO_INSTALL" "App Runtime" "Automatic Node.js LTS installation via winget failed or was cancelled." "Download and install Node.js LTS manually from https://nodejs.org , then run start.bat again."
  goto :error_section
)

REM Refresh PATH in current shell for newly installed Node.js
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%LocalAppData%\Programs\nodejs\node.exe" set "PATH=%LocalAppData%\Programs\nodejs;%PATH%"

call :detect_node
if !NODE_MAJOR! LSS 18 (
  call :add_error "ERR_NODE_PATH" "App Runtime" "Node.js LTS was installed, but this window could not detect Node.js 18+ yet." "Close this window and double-click start.bat again so Windows refreshes your PATH."
  goto :error_section
)

echo   [FIXED] Node.js v!NODE_VER! installed and ready.

:node_ready
echo   [OK] Using Node.js v!NODE_VER!
echo.

echo [STEP 3/5] Verifying all app files, UI assets, Preview Kit ^& Watermelon UI Library...
echo            ^(Missing or corrupted dependencies will be downloaded/repaired automatically.^)
echo.
node "tools\preflight-check.mjs" --repair
if errorlevel 1 (
  call :add_error "ERR_PREFLIGHT_FAILED" "Verification & Downloads" "One or more required files, UI dependencies, or Watermelon UI Library assets failed verification and could not be auto-repaired." "Review the detailed ERRORS section printed above [also saved to logs\startup-errors.log] and follow each Fix instruction."
  goto :error_section
)

echo [STEP 4/5] Checking port %PORT%...
set "PORT_BUSY=0"
netstat -ano 2>nul | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 set "PORT_BUSY=1"

if "%PORT_BUSY%"=="0" goto :start_server

REM Port is already in use -- check whether WebForge is already running on it
node -e "fetch('http://127.0.0.1:%PORT%/api/health').then(r=>r.ok?r.json():Promise.reject()).then(d=>process.exit(d&&d.ok?0:1)).catch(()=>process.exit(1))" >nul 2>&1
if not errorlevel 1 (
  echo   [OK] WebForge Studio is already running at %URL%.
  echo   Opening in your default browser...
  start "" "%URL%"
  echo.
  echo   Done! You can close this window safely.
  timeout /t 3 /nobreak >nul
  exit /b 0
)

call :add_error "ERR_PORT_IN_USE" "Local Server" "Port %PORT% is already being used by another application on this PC." "Close the app using port %PORT%, or launch WebForge on another port by running: start.bat 3001"
goto :error_section

:start_server
echo   [OK] Port %PORT% is available.
echo.

echo [STEP 5/5] Starting WebForge Studio server on %URL%...
if not exist "logs" mkdir "logs" >nul 2>&1
if exist "logs\server-stderr.log" del /f /q "logs\server-stderr.log" >nul 2>&1

start "WebForge Studio Server" /Min cmd /c "node tools\serve.mjs %PORT% 2>logs\server-stderr.log"

set "SERVER_READY=0"
for /L %%I in (1,1,30) do (
  node -e "fetch('http://127.0.0.1:%PORT%/api/health').then(r=>r.ok?r.json():Promise.reject()).then(d=>process.exit(d&&d.ok?0:1)).catch(()=>process.exit(1))" >nul 2>&1
  if not errorlevel 1 (
    set "SERVER_READY=1"
    goto :server_online
  )
  timeout /t 1 /nobreak >nul
)

:server_online
if "%SERVER_READY%"=="0" (
  call :add_error "ERR_SERVER_START" "Local Server" "WebForge Studio server did not respond on %URL%/api/health within 30 seconds." "Check the server error log below [logs\server-stderr.log] or try another port with: start.bat 3001"
  goto :error_section
)

echo   [OK] WebForge Studio server is online and healthy!
echo   Opening %URL% in your default browser...
start "" "%URL%"
echo.
echo ==========================================================
echo   WEBFORGE STUDIO IS RUNNING
echo ==========================================================
echo   URL    : %URL%
echo   Server : Running in the minimized "WebForge Studio Server" window.
echo   Stop   : Close that server window whenever you want to stop WebForge.
echo ==========================================================
echo.
timeout /t 4 /nobreak >nul
exit /b 0


REM ==========================================================
REM  HELPER SUBROUTINES
REM ==========================================================

:detect_node
set "NODE_VER=none"
set "NODE_MAJOR=0"
where node >nul 2>&1
if errorlevel 1 exit /b 0
for /f "delims=" %%V in ('node -p "process.versions.node" 2^>nul') do set "NODE_VER=%%V"
for /f "tokens=1 delims=." %%M in ("!NODE_VER!") do set "NODE_MAJOR=%%M"
exit /b 0

:add_error
set /a ERR_COUNT+=1
set "ERR_CODE_!ERR_COUNT!=%~1"
set "ERR_CAT_!ERR_COUNT!=%~2"
set "ERR_PROB_!ERR_COUNT!=%~3"
set "ERR_FIX_!ERR_COUNT!=%~4"
exit /b 0


REM ==========================================================
REM  PHASE 2: DEDICATED ERRORS SECTION
REM ==========================================================

:error_section
echo.
echo ==========================================================
echo   ERRORS SECTION [!ERR_COUNT! error(s) prevented launch]
echo ==========================================================
for /L %%E in (1,1,!ERR_COUNT!) do (
  echo.
  echo   [%%E] !ERR_CODE_%%E! -- !ERR_CAT_%%E!
  echo       Problem : !ERR_PROB_%%E!
  echo       Fix     : !ERR_FIX_%%E!
)

if exist "logs\server-stderr.log" (
  for %%S in ("logs\server-stderr.log") do (
    if %%~zS GTR 0 (
      echo.
      echo ----------------------------------------------------------
      echo   SERVER ERROR LOG [logs\server-stderr.log]
      echo ----------------------------------------------------------
      type "logs\server-stderr.log"
    )
  )
)

if exist "logs\startup-errors.log" (
  echo.
  echo   Detailed diagnostic report saved at: logs\startup-errors.log
)

echo.
echo ==========================================================
echo   WebForge did not launch. Fix the error(s) above and run start.bat again.
echo ==========================================================
echo.
pause
exit /b 1
