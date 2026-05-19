#!/bin/bash
# AIOS Supervisor - keeps all services running

start_next() {
  while true; do
    cd /home/z/my-project
    NODE_OPTIONS="--max-old-space-size=1536" node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1
    echo "[$(date)] Next.js died, restarting in 3s..." >> /home/z/my-project/dev.log
    sleep 3
  done
}

start_ws() {
  while true; do
    cd /home/z/my-project/mini-services/aios-ws
    bun --hot index.ts >> /home/z/my-project/mini-services/aios-ws/nohup.out 2>&1
    echo "[$(date)] WS died, restarting in 3s..." >> /home/z/my-project/mini-services/aios-ws/nohup.out
    sleep 3
  done
}

start_voice() {
  while true; do
    cd /home/z/my-project/mini-services/voice-service
    if [ -f "server.py" ]; then
      python3 server.py >> /home/z/my-project/mini-services/voice-service/nohup.out 2>&1
    fi
    sleep 3
  done
}

start_next &
start_ws &
start_voice &
wait
