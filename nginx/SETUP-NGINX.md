# Nginx + SSL para api.tu-salud.xyz (EC2)

Sirve el backend por HTTPS en `https://api.tu-salud.xyz` y redirige las peticiones al Node en el puerto 3000.

## 1. DNS (Route 53)

En la hosted zone de **tu-salud.xyz** crea un **record A**:

- **Nombre:** `api`
- **Tipo:** A
- **Valor:** IP pública de tu EC2 (ej. 54.235.48.67)
- **TTL:** 300

Así `api.tu-salud.xyz` apuntará al EC2.

## 2. En el EC2 (Ubuntu / Amazon Linux)

### Instalar Nginx

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y nginx

# Amazon Linux 2
sudo amazon-linux-extras install nginx1 -y
# o: sudo yum install -y nginx
```

### Copiar la configuración (primero la versión sin SSL para Certbot)

```bash
# 1) Primero usa la config solo HTTP (para que Certbot valide)
sudo cp /ruta/al/repo/TuSalud-Backend/nginx/api.tu-salud.xyz.conf.pre-ssl /etc/nginx/sites-available/api.tu-salud.xyz.conf
# En Amazon Linux: sudo cp .../api.tu-salud.xyz.conf.pre-ssl /etc/nginx/conf.d/api.tu-salud.xyz.conf

sudo ln -sf /etc/nginx/sites-available/api.tu-salud.xyz.conf /etc/nginx/sites-enabled/   # solo Ubuntu
sudo nginx -t && sudo systemctl reload nginx
```

### Instalar Certbot y obtener certificado

```bash
# Ubuntu
sudo apt install -y certbot python3-certbot-nginx

# Crear directorio para el challenge ACME
sudo mkdir -p /var/www/certbot

# Obtener certificado (Nginx parado o config en 80 con location /.well-known)
sudo certbot certonly --webroot -w /var/www/certbot -d api.tu-salud.xyz
```

Cuando Certbot pida email, usa uno válido. Acepta los términos si lo pide.

### Activar la config completa (con HTTPS)

Sustituye la config por la que incluye HTTPS (puerto 443) y redirección HTTP→HTTPS:

```bash
sudo cp /ruta/al/repo/TuSalud-Backend/nginx/api.tu-salud.xyz.conf /etc/nginx/sites-available/api.tu-salud.xyz.conf
``` Certbot habrá creado:

- `/etc/letsencrypt/live/api.tu-salud.xyz/fullchain.pem`
- `/etc/letsencrypt/live/api.tu-salud.xyz/privkey.pem`

Si falta `options-ssl-nginx.conf`:

```bash
sudo certbot install --nginx -d api.tu-salud.xyz
```

O crea el archivo de opciones SSL y dhparams:

```bash
sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048
```

En `options-ssl-nginx.conf` (puedes crearlo en `/etc/letsencrypt/`) algo como:

```
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...";
```

Luego:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Renovación automática

```bash
sudo certbot renew --dry-run
```

Si está ok, el cron/systemd timer de certbot renovará solo. En Ubuntu suele estar en `/etc/cron.d/certbot`.

## 3. Backend en marcha

Asegúrate de que el backend Node escucha en **puerto 3000** en localhost (por defecto ya lo hace):

```bash
cd /ruta/TuSalud-Backend
node server.js
# o con pm2: pm2 start server.js --name tusalud-api
```

## 4. Firewall

- En el EC2 (Security Group): abre **80** (HTTP) y **443** (HTTPS). El 3000 puede quedar solo para localhost.
- Si usas ufw: `sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable`

Tras esto, el frontend en `https://www.tu-salud.xyz` puede usar `https://api.tu-salud.xyz` sin Mixed Content.
