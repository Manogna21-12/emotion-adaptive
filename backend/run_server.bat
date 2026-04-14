@echo off
echo KILLING ALL PYTHON PROCESSES...
taskkill /f /im python.exe /t 2>nul

echo STARTING BACKEND SERVER...
cd /d "%~dp0"
python simple_server.py

pause
