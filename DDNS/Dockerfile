FROM nvidia/cuda:12.6.3-runtime-ubuntu22.04

# Establecer la variable para evitar interacciones
ENV DEBIAN_FRONTEND=noninteractive

# Configurar la zona horaria
RUN ln -snf /usr/share/zoneinfo/Europe/Madrid /etc/localtime && echo "Europe/Madrid" > /etc/timezone

# Instalar dependencias necesarias
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    nginx \
    curl \
    nvidia-container-toolkit \
    nvidia-utils-560 \
    nvidia-driver-560 \
    certbot \
    python3-certbot-nginx\
    && \
    pip install watchdog && \
    pip install flask && \
    pip install pillow && \
    apt-get clean

# Crear carpetas necesarias
RUN mkdir -p /app /media /media/videos /media/fotos /media/transform /media/tmp /var/www/html

# Copiar archivos
COPY default.conf /etc/nginx/sites-available/default
COPY vigilante.py /app/vigilante.py
COPY movedor.py /app/movedor.py
COPY server.py /app/server.py
COPY entrypoint.sh /entrypoint.sh

# Dar permisos
RUN chmod +x /entrypoint.sh

WORKDIR /app
ENTRYPOINT ["/entrypoint.sh"]