# Caddy para api.tu-salud.xyz (EC2)

Caddy hace de reverse proxy: sirve HTTPS en `https://api.tu-salud.xyz` y redirige al Node en el puerto 3000. Obtiene y renueva el certificado SSL solo (Let's Encrypt).

## 1. DNS (Route 53)

En la hosted zone de **tu-salud.xyz** crea un **record A**:

- **Nombre:** `api`
- **Tipo:** A
- **Valor:** IP pública de tu EC2 (ej. 54.235.48.67)
- **TTL:** 300

## 2. En el EC2

### Instalar Caddy

**Ubuntu/Debian:**

```bash
sudo apt install -y debian-keyring debian-archive-keyring curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

**Amazon Linux 2:**

```bash
sudo yum install yum-plugin-copr -y
sudo yum copr enable @caddy/caddy -y
sudo yum install caddy -y
```

### Copiar el Caddyfile

```bash
sudo mkdir -p /etc/caddy
sudo cp /ruta/al/repo/TuSalud-Backend/caddy/Caddyfile /etc/caddy/Caddyfile
```

### Puertos y firewall

- Security Group del EC2: abrir **80** y **443**.
- Si usas `ufw`: `sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable`

### Iniciar Caddy

```bash
sudo systemctl enable caddy
sudo systemctl start caddy
sudo systemctl status caddy
```

Caddy pedirá el certificado a Let's Encrypt en el primer request a `https://api.tu-salud.xyz` (necesita que el DNS ya apunte al EC2).

### Backend Node en marcha

Asegúrate de que el backend escucha en el puerto 3000:

```bash
cd /ruta/TuSalud-Backend
node server.js
# o: pm2 start server.js --name tusalud-api
```

## 3. Comandos útiles

```bash
# Recargar config tras cambiar el Caddyfile
sudo systemctl reload caddy

# Ver logs
sudo journalctl -u caddy -f
```

Tras esto, el frontend en `https://www.tu-salud.xyz` puede usar `https://api.tu-salud.xyz` sin Mixed Content.
