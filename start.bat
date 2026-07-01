@echo off
echo ===================================================
echo 🚀 Launching TrustBuy Ecosystem...
echo ===================================================

:: Start Backend
echo Starting FastAPI Backend on Port 8001...
start "TrustBuy Backend" cmd /k "python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8001"

:: Start Frontend
echo Starting React Frontend on Port 5173...
start "TrustBuy Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Both services are launching in separate windows!
echo 👉 Dashboard will be available at: http://localhost:5173
echo.
pause
