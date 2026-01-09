#!/bin/bash

# Start script for Client Mapping Portal
# Starts both the frontend and backend API

echo "🚀 Starting Client Mapping Portal..."
echo ""

# Check if API is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  API already running on port 3001"
else
    echo "📡 Starting API server on port 3001..."
    cd api && npm start &
    API_PID=$!
    echo "   API PID: $API_PID"
fi

# Wait a moment for API to start
sleep 2

# Check if frontend is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Frontend already running on port 3000"
else
    echo "🎨 Starting Frontend on port 3000..."
    npm run dev &
    FRONTEND_PID=$!
    echo "   Frontend PID: $FRONTEND_PID"
fi

echo ""
echo "✅ Client Mapping Portal is starting..."
echo ""
echo "   Frontend: http://localhost:3000"
echo "   API:      http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait


