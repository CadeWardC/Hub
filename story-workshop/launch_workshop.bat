@echo off
setlocal
cd /d "%~dp0"
title Story Workshop

set "RUNTIME_CHECK=import importlib.util,sys; names=('qwen_tts','torch','soundfile','numpy'); sys.exit(0 if all(importlib.util.find_spec(name) for name in names) else 1)"

py -3.10 -c "%RUNTIME_CHECK%" >nul 2>nul
if not errorlevel 1 (
    echo Starting Story Workshop with Python 3.10...
    py -3.10 server.py --open
    goto :end
)

python -c "%RUNTIME_CHECK%" >nul 2>nul
if not errorlevel 1 (
    echo Starting Story Workshop with the configured Python runtime...
    python server.py --open
    goto :end
)

py -3 -c "%RUNTIME_CHECK%" >nul 2>nul
if not errorlevel 1 (
    echo Starting Story Workshop with the default Python 3 runtime...
    py -3 server.py --open
    goto :end
)

echo.
echo Story Workshop could not find a Python installation containing:
echo qwen_tts, torch, soundfile, and numpy.
echo.
echo Install those packages into Python 3.10, then run this launcher again.
echo.
pause

:end
endlocal
