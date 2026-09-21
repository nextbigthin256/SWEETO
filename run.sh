#!/bin/bash

echo "=========================================="
echo "      SWEETOS Store Starter Tool"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed on this computer!"
    echo "Please download and install Node.js from: https://nodejs.org/"
    echo ""
    read -p "Press enter to exit..."
    exit 1
fi

# Check if node_modules exists, if not run npm install
if [ ! -d "node_modules" ]; then
    echo "[INFO] First-time setup detected. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] npm install failed. Please check your internet connection."
        read -p "Press enter to exit..."
        exit 1
    fi
fi

# Open browser based on OS
echo "[INFO] Launching local browser at http://localhost:2005 ..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:2005"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "http://localhost:2005"
fi

# Start server
echo "[INFO] Starting SWEETOS server..."
npm start
