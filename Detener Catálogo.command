#!/bin/bash
PORT=5173
PID=$(lsof -tiTCP:$PORT -sTCP:LISTEN 2>/dev/null)

if [ -n "$PID" ]; then
  kill $PID
  echo "Servidor detenido (PID $PID)."
else
  echo "No había ningún servidor corriendo en el puerto $PORT."
fi

sleep 2
