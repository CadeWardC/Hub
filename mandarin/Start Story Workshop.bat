@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo The local Workshop environment is not installed yet.
  echo Follow the one-time setup steps in mandarin\README.md.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" start_workshop.py
if errorlevel 1 pause
