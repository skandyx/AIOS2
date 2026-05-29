#!/bin/bash
# Start AIOS development server
cd /home/z/my-project

# Kill any existing processes
pkill -f "next dev" 2>/dev/null
sleep 2

# Start WS service
cd /home/z/my-project/mini-services/aios-ws
bun run dev &
WS_PID=$!

# Start Next.js
cd /home/z/my-project
exec node --max-old-space-size=3072 node_modules/.bin/next dev -p 3000
