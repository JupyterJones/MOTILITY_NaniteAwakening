#!/usr/bin/env bash
# MOTILITY: Nanite Awakening - Local 3D Game Launcher
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

PORT=5300

echo "=========================================================="
echo "  MOTILITY: Nanite Awakening - 3D Cyborg Escape Game"
echo "  'Discovery via actual motion motivation'"
echo "=========================================================="
echo "Starting game server on port $PORT (LAN open)..."

# Start Vite dev server on firewall-open port 5300
npx vite --port $PORT --host &
SERVER_PID=$!

trap "echo 'Stopping server...'; kill $SERVER_PID 2>/dev/null; exit 0" SIGINT SIGTERM EXIT

sleep 1.2

# Open in browser
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:$PORT" >/dev/null 2>&1 &
elif command -v google-chrome >/dev/null 2>&1; then
  google-chrome "http://localhost:$PORT" >/dev/null 2>&1 &
elif command -v firefox >/dev/null 2>&1; then
  firefox "http://localhost:$PORT" >/dev/null 2>&1 &
fi

echo "Game running at http://localhost:$PORT"
echo "LAN Address:    http://192.168.1.41:$PORT"
echo "Press Ctrl+C in this terminal when finished playing."

wait $SERVER_PID
