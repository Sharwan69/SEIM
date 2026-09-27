#!/bin/bash
# SIEM Quick Start Script

set -e

echo "====================================="
echo "SIEM - Security Information & Event Management"
echo "Quick Start Setup"
echo "====================================="

echo "\n[*] Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed"
  exit 1
fi

if ! command -v mongod &> /dev/null; then
  echo "WARNING: MongoDB not found. Install it or use Docker."
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[✓] .env file created"
fi

echo "\n[*] Installing dependencies..."
npm install

echo "\n====================================="
echo "Setup Complete!"
echo "====================================="
echo "Run: npm run dev"
echo "Open: http://localhost:5000"
