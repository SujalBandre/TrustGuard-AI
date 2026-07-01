#!/bin/bash
echo "==================================================="
echo "🚀 Launching TrustBuy Ecosystem..."
echo "==================================================="

# Start Backend
echo "Starting FastAPI Backend on Port 8001..."
python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!

# Start Frontend
echo "Starting React Frontend on Port 5173..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both services are launching in the background!"
echo "👉 Dashboard will be available at: http://localhost:5173"
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID" SIGINT
wait
