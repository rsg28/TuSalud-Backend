# OCR Python Service (opcional)

Microservicio OCR para PDF/imagenes, pensado para conectarse al backend Node sin cambiar el flujo actual.

## 1) Instalar dependencias del sistema

- Tesseract OCR
- Poppler (para `pdf2image`)

En Windows, asegure que `tesseract.exe` y Poppler esten en `PATH`.

## 2) Crear entorno e instalar

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## 3) Ejecutar

```bash
set OCR_PY_API_KEY=tu_clave_segura
set OCR_PY_LANG=spa+eng
python app.py
```

Servicio por defecto en `http://localhost:8001`.

## 4) Conectar con TuSalud-Backend

Configurar en `.env` del backend Node:

```env
OCR_PY_SERVICE_URL=http://localhost:8001
OCR_PY_API_KEY=tu_clave_segura
OCR_PY_TIMEOUT_MS=180000
```

Si `OCR_PY_SERVICE_URL` no existe, el backend mantiene el OCR local anterior (fallback actual).
