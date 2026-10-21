#!/bin/bash
# Double-click to preview the site at http://localhost:8000 (Ctrl+C or close this window to stop)
cd "$(dirname "$0")"
PORT=8000
(sleep 1; open "http://localhost:$PORT") &
python3 -m http.server $PORT
