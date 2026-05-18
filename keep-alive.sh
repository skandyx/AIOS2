#!/bin/bash
while true; do
  cd /home/z/my-project
  bun run dev 2>&1 | tee -a /home/z/my-project/server.log
  echo "[KEEP-ALIVE] Server died, restarting in 3s..." >> /home/z/my-project/server.log
  sleep 3
done
