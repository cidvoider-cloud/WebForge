@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title WebForge Launcher

set "PORT=8000"
set "URL=http://127.0.0.1:%PORT%/index.html"
set "PYTHON_CMD="
set "NODE_CMD="
set "SERVER_MODE="

echo.
echo  ========================================
echo   WebForge — dependency check
echo  ========================================
echo.

REM ── 1) Required project files (no download; must ship with repo) ──
call :require_file "index.html" || goto :fail
call :require_file "css\app.css" || goto :fail
call :require_file "css\prompt-builder.css" || goto :fail
call :require_file "js\app.js" || goto :fail
call :require_file "js\providers.js" || goto :fail
call :require_file "js\preview.js" || goto :fail
call :require_file "js\prompt-builder.js" || goto :fail
call :require_file "js\skills.js" || goto :fail
call :require_file "js\demos.js" || goto :fail
call :require_file "tools\serve.mjs" || goto :fail
echo  [OK] Project files present

REM ── 2) Find Python 3 ──
where py >nul 2>&1
if not errorlevel 1 (
  py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,8) else 1)" >nul 2>&1
  if not errorlevel 1 set "PYTHON_CMD=py -3"
)
if not defined PYTHON_CMD (
  where python >nul 2>&1
  if not errorlevel 1 (
    python -c "import sys; raise SystemExit(0 if sys.version_info >= (3,8) else 1)" >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=python"
  )
)
if not defined PYTHON_CMD (
  where python3 >nul 2>&1
  if not errorlevel 1 (
    python3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3,8) else 1)" >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=python3"
  )
)

REM ── 3) Find Node (fallback server; also used if Python missing) ──
where node >nul 2>&1
if not errorlevel 1 (
  for /f "tokens=1 delims=v" %%V in ('node -v 2^>nul') do set "NODE_VER=%%V"
  set "NODE_CMD=node"
)

if defined PYTHON_CMD (
  echo  [OK] Python found: %PYTHON_CMD%
  set "SERVER_MODE=python"
) else (
  echo  [!!] Python 3 not found in PATH
)

if defined NODE_CMD (
  echo  [OK] Node.js found: node
  if not defined SERVER_MODE set "SERVER_MODE=node"
) else (
  echo  [!!] Node.js not found in PATH
)

REM ── 4) Auto-install Python via winget if nothing usable ──
if not defined SERVER_MODE (
  echo.
  echo  No local server runtime found.
  where winget >nul 2>&1
  if errorlevel 1 (
    echo  Install Python 3 from https://www.python.org/downloads/
    echo  ^(check "Add python.exe to PATH"^) then re-run start.bat
    goto :fail
  )
  echo  Attempting to install Python 3 via winget...
  winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
  if errorlevel 1 (
    echo  winget install failed. Install Python manually, then re-run.
    goto :fail
  )
  echo  Python installed. Close this window, open a NEW terminal, run start.bat again
  echo  ^(PATH refresh needed^).
  goto :fail
)

REM ── 5) Network check for CDN deps ^(preview needs these^) ──
echo.
echo  Checking internet ^(CDN: React, Tailwind, Babel, Lucide^)...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'https://unpkg.com/react@18.2.0/umd/react.development.js' -Method Head -UseBasicParsing -TimeoutSec 8; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo  [!!] CDN unreachable — UI may load, but live preview can fail offline.
  echo       Connect to the internet for full features.
) else (
  echo  [OK] CDN reachable
)

REM ── 6) Free the port or warn ──
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo.
  echo  [!!] Port %PORT% is already in use.
  echo       Close the other server, or edit PORT in start.bat.
  echo       Trying to open %URL% anyway...
  start "" "%URL%"
  goto :fail
)

echo.
echo  ========================================
echo   Starting server on %URL%
echo   Mode: %SERVER_MODE%
echo   Press Ctrl+C to stop
echo  ========================================
echo.

REM Start server in background, wait until ready, then open browser
if /i "%SERVER_MODE%"=="python" (
  start "WebForge Server" /Min cmd /c "%PYTHON_CMD% -m http.server %PORT% --bind 127.0.0.1"
) else (
  start "WebForge Server" /Min cmd /c "node tools\serve.mjs %PORT%"
)

call :wait_for_server
if errorlevel 1 (
  echo  Server did not become ready in time.
  goto :fail
)

echo  [OK] Server is ready
start "" "%URL%"
echo.
echo  Browser opened. Keep the server window open while you use WebForge.
echo  This window can be closed; stop the app via the minimized "WebForge Server" window.
echo.
pause
exit /b 0

:require_file
if not exist "%~1" (
  echo  [FAIL] Missing required file: %~1
  exit /b 1
)
exit /b 0

:wait_for_server
set /a _tries=0
:wait_loop
set /a _tries+=1
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 exit /b 0
if !_tries! GEQ 30 exit /b 1
timeout /t 1 /nobreak >nul
goto :wait_loop

:fail
echo.
pause
exit /b 1
