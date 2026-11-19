@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title WebForge Launcher

set "PORT=3000"
set "URL=http://127.0.0.1:%PORT%/index.html"
set "HEALTH_URL=http://127.0.0.1:%PORT%/api/health"
set "NODE_CMD="
set "PYTHON_CMD="
set "SERVER_MODE="

echo.
echo  ==========================================================
echo   WebForge Studio — Automatic Setup & Free Web Search
echo  ==========================================================
echo.

REM ── 1) Verify required ES module & server files ──
call :require_file "index.html" || goto :fail
call :require_file "css\app.css" || goto :fail
call :require_file "css\prompt-builder.css" || goto :fail
call :require_file "js\main.mjs" || goto :fail
call :require_file "js\modules\studio.mjs" || goto :fail
call :require_file "js\modules\providers.mjs" || goto :fail
call :require_file "js\modules\skills.mjs" || goto :fail
call :require_file "js\modules\web-search.mjs" || goto :fail
call :require_file "js\modules\sub-agents.mjs" || goto :fail
call :require_file "tools\serve.mjs" || goto :fail
call :require_file "tools\search-engine.mjs" || goto :fail
echo  [OK] Core WebForge Studio modules present

REM ── 2) Prefer Node.js 18+ (powers built-in free keyless Web Search & GitHub Skill Discovery) ──
where node >nul 2>&1
if not errorlevel 1 (
  node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)" >nul 2>&1
  if not errorlevel 1 (
    set "NODE_CMD=node"
    set "SERVER_MODE=node"
    for /f "delims=" %%V in ('node -v 2^>nul') do echo  [OK] Node.js found ^(%%V^) — Free keyless Web Search enabled
  ) else (
    echo  [!!] Node.js found, but version 18+ is required for built-in Web Search.
  )
)

REM ── 3) Auto-install Node.js LTS via winget if missing so Web Search sets up automatically ──
if not defined NODE_CMD (
  echo  [..] Node.js 18+ not found. Attempting automatic setup via winget...
  where winget >nul 2>&1
  if not errorlevel 1 (
    winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if not errorlevel 1 (
      REM Refresh PATH for current session if installed in standard location
      if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
        set "NODE_CMD=node"
        set "SERVER_MODE=node"
        echo  [OK] Node.js LTS installed automatically! Free Web Search is ready.
      ) else (
        echo  [OK] Node.js LTS installed. Close this window and double-click start.bat again.
        goto :fail
      )
    )
  )
)

REM ── 4) Fallback to Python static server only if Node.js could not be installed ──
if not defined SERVER_MODE (
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
  if defined PYTHON_CMD (
    set "SERVER_MODE=python"
    echo  [!!] Running in static Python fallback mode ^(browser-direct fallback search only^).
    echo       Install Node.js LTS from https://nodejs.org for full DuckDuckGo Web Search.
  ) else (
    echo  [FAIL] Neither Node.js 18+ nor Python 3 was found.
    echo         Install Node.js LTS from https://nodejs.org and double-click start.bat again.
    goto :fail
  )
)

REM ── 5) Check internet connectivity for CDN preview & free Web Search ──
echo.
echo  Checking internet ^(Preview CDN + Free Web Search^)...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'https://unpkg.com/react@18.2.0/umd/react.development.js' -Method Head -UseBasicParsing -TimeoutSec 8; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  echo  [!!] Internet unreachable — offline mode ^(live preview CDN & web search require internet^).
) else (
  echo  [OK] Internet reachable — Preview CDN & Free Web Search ready ^(zero API keys needed^)
)

REM ── 6) Check if port is already serving WebForge ──
netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo.
  echo  [OK] Port %PORT% is already running. Opening %URL%...
  start "" "%URL%"
  goto :done
)

echo.
echo  ==========================================================
echo   Starting WebForge Studio on %URL%
echo   Server mode: %SERVER_MODE% ^(Zero-API-Key Web Search active^)
echo  ==========================================================
echo.

if /i "%SERVER_MODE%"=="node" (
  start "WebForge Studio Server" /Min cmd /c "node tools\serve.mjs %PORT%"
) else (
  start "WebForge Studio Server" /Min cmd /c "%PYTHON_CMD% -m http.server %PORT% --bind 127.0.0.1"
)

call :wait_for_server
if errorlevel 1 (
  echo  [FAIL] Server did not become ready in time.
  goto :fail
)

echo  [OK] WebForge Studio is live!
if /i "%SERVER_MODE%"=="node" (
  powershell -NoProfile -Command "try { $h = Invoke-RestMethod -Uri '%HEALTH_URL%' -TimeoutSec 3; if ($h.webSearch) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    echo  [OK] Free Keyless Web Search ^(DuckDuckGo + Wikipedia + Web Index^) initialized automatically
  )
)

start "" "%URL%"
echo.
echo  Browser opened. Keep the minimized "WebForge Studio Server" window open while using WebForge.
echo.

:done
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
