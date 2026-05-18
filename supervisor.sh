#!/bin/bash
# Simple supervisor that keeps services running

start_next() {
  while true; do
    cd /home/z/my-project
    node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/server.log 2>&1
    echo "[$(date)] Next.js died, restarting in 3s..." >> /home/z/my-project/server.log
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

start_next &
start_ws &
wait
