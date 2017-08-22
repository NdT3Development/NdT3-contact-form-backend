#!/bin/bash
echo Stopping app
sleep 1
pm2 stop contactapi
sleep 1
echo Done
