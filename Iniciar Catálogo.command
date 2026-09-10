#!/bin/bash
cd "$(dirname "$0")"

PORT=5173
LOG="/tmp/catalogo-creator-dev.log"

if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "El servidor ya está corriendo en el puerto $PORT."
else
  if [ ! -d node_modules ]; then
    echo "Primera vez: instalando dependencias..."
    npm install
  fi
  echo "Iniciando el servidor..."
  nohup npm run dev -- --port $PORT > "$LOG" 2>&1 &
  disown

  for i in $(seq 1 40); do
    if curl -s -o /dev/null "http://localhost:$PORT"; then
      break
    fi
    sleep 0.5
  done
fi

open "http://localhost:$PORT"

echo ""
echo "Listo. La app se abrió en el navegador."
echo "Podés cerrar esta ventana: el servidor sigue corriendo en segundo plano."
echo "Para detenerlo, usá 'Detener Catálogo.command'."
sleep 3
