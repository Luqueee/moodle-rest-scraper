#!/bin/bash

# Define your application name and script
APP_NAME="moodle-api"
SCRIPT_PATH="src/index.ts" # Update this with the path to your app script
LOG_FILE="app.log" # Update this with the desired log file path

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null
then
    echo "PM2 not found. Installing PM2 globally..."
    npm install -g pm2
fi

# Start or restart the application
echo "Starting or restarting the PM2 instance for $APP_NAME..."

pm2 start $SCRIPT_PATH --name "$APP_NAME" --log $LOG_FILE --no-daemon

# Optional: Save the PM2 process list to be resurrected on reboot
pm2 save

# Optional: Set up PM2 to start on system boot
pm2 startup

echo "PM2 instance for $APP_NAME has been started/restarted and configured."
