import base64
import os
import tempfile
from typing import Optional

from flask import Flask, jsonify, request

try:
    import pytesseract
except Exception:
    pytesseract = None

try:
    from PIL import Image
except Exception:
    Image = None

try:
    from pdf2image import convert_from_bytes
except Exception:
    convert_from_bytes = None


APP_API_KEY = os.getenv("OCR_PY_API_KEY", "").strip()
DEFAULT_MAX_PAGES = int(os.getenv("OCR_PY_DEFAULT_MAX_PAGES", "150"))
OCR_LANG = os.getenv("OCR_PY_LANG", "spa+eng")

app = Flask(__name__)


def _auth_ok(req) -> bool:
    if not APP_API_KEY:
        return True
    return req.headers.get("x-api-key", "") == APP_API_KEY


def _decode_file_base64(payload: dict) -> bytes:
    raw = payload.get("file_base64", "")
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("file_base64 es requerido")
    try:
        return base64.b64decode(raw, validate=True)
    except Exception:
        raise ValueError("file_base64 no es valido")


def _ocr_image_bytes(file_bytes: bytes) -> str:
    if pytesseract is None or Image is None:
        raise RuntimeError("Dependencias OCR no instaladas (pytesseract/Pillow)")
    with tempfile.NamedTemporaryFile(suffix=".png", delete=True) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        with Image.open(tmp.name) as img:
            text = pytesseract.image_to_string(
                img,
                lang=OCR_LANG,
                config="--oem 1 --psm 3 -c preserve_interword_spaces=1",
            )
            return (text or "").strip()


def _ocr_pdf_bytes(file_bytes: bytes, max_pages: Optional[int]) -> str:
    if pytesseract is None or convert_from_bytes is None:
        raise RuntimeError("Dependencias OCR PDF no instaladas (pytesseract/pdf2image)")
    pages_limit = max_pages if isinstance(max_pages, int) and max_pages > 0 else DEFAULT_MAX_PAGES
    images = convert_from_bytes(file_bytes, dpi=200)
    if len(images) > pages_limit:
        raise ValueError(f"El PDF tiene {len(images)} paginas; maximo permitido {pages_limit}.")

    parts = []
    for img in images[:pages_limit]:
        txt = pytesseract.image_to_string(
            img,
            lang=OCR_LANG,
            config="--oem 1 --psm 6 -c preserve_interword_spaces=1",
        )
        if txt and txt.strip():
            parts.append(txt.strip())
    return "\n\n".join(parts).strip()


@app.get("/health")
def health():
    return jsonify({"ok": True})


@app.post("/ocr/image")
def ocr_image():
    if not _auth_ok(request):
        return jsonify({"error": "No autorizado"}), 401
    try:
        payload = request.get_json(silent=True) or {}
        file_bytes = _decode_file_base64(payload)
        text = _ocr_image_bytes(file_bytes)
        return jsonify({"text": text, "mode": "ocr-python-image"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/ocr/pdf")
def ocr_pdf():
    if not _auth_ok(request):
        return jsonify({"error": "No autorizado"}), 401
    try:
        payload = request.get_json(silent=True) or {}
        file_bytes = _decode_file_base64(payload)
        max_pages = payload.get("max_pages")
        if isinstance(max_pages, str) and max_pages.isdigit():
            max_pages = int(max_pages)
        text = _ocr_pdf_bytes(file_bytes, max_pages=max_pages)
        return jsonify({"text": text, "mode": "ocr-python"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    app.run(host="0.0.0.0", port=port)
