@echo off
setlocal
cd /d "%~dp0"

echo [setup-venv] Creating .venv in %cd% ...

where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -3 -m venv .venv
  if errorlevel 1 goto :nopy
) else (
  where python >nul 2>nul
  if %ERRORLEVEL%==0 (
    python -m venv .venv
    if errorlevel 1 goto :nopy
  ) else (
    goto :nopy
  )
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
echo.
echo [setup-venv] Done. From FrontEnd folder run: npm run dev
echo [start-dev] will use: %cd%\.venv\Scripts\python.exe
goto :eof

:nopy
echo.
echo [setup-venv] ERROR: No "py" or "python" on PATH.
echo Install Python 3 from https://www.python.org/downloads/
echo On the installer, enable "Add python.exe to PATH", then re-open this window.
exit /b 1
