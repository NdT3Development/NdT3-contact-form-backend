#!/bin/bash
echo Flushing logs from previous run
sleep 1
pm2 flush
sleep 2
pm2 start app.js --max-memory-restart 70M --name contactapi
sleep 1
pm2 logs contactapi
