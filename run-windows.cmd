@echo off
cd /d "%~dp0"
echo Calculated Visions local website
echo Open http://localhost:8080 after the server starts.
echo Keep this window open while presenting. Press Ctrl+C to stop.
echo.
where py >nul 2>&1
if not errorlevel 1 goto usepy
where python >nul 2>&1
if not errorlevel 1 goto usepython
where node >nul 2>&1
if not errorlevel 1 goto usenode
echo Python or Node.js is required to run the local copy.
echo See README.md for GitHub Pages publishing instructions.
pause
exit /b 1
:usepy
py -m http.server 8080 --bind 127.0.0.1 --directory .
goto finished
:usepython
python -m http.server 8080 --bind 127.0.0.1 --directory .
goto finished
:usenode
node server.mjs
:finished
pause
