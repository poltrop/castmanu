#!/bin/bash

echo "==> Renovando certificados con Certbot..."
certbot renew --quiet

echo "==> Iniciando NGINX..."
service nginx start

echo "==> Iniciando script Python de vigilancia..."
python3 /app/vigilante.py &

echo "==> Iniciando script Python de mover archivos..."
python3 /app/movedor.py &

echo "=> Iniciando servidor Flask..."
python3 /app/server.py &

wait -n