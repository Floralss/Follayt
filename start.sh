#!/bin/bash
cd "$(dirname "$0")"
echo "Запуск Follayt..."
if command -v python3 &>/dev/null; then
  echo "Откройте http://localhost:8080"
  python3 -m http.server 8080
elif command -v npx &>/dev/null; then
  npx --yes serve -p 3000 .
else
  echo "Установите Python или Node.js"
fi
