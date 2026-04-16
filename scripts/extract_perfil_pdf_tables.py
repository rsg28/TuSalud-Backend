#!/usr/bin/env python3
"""
Extrae tablas de un PDF de perfil EMO con PyMuPDF (fitz).

Requisito: pip install pymupdf

Salida (stdout): JSON UTF-8 con tres tablas lógicas cuando el documento sigue el
formato TRANSALTISA: principal, adicionales (misma rejilla), condicional (bloque inferior).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def _cell_str(c) -> str:
    if c is None:
        return ""
    s = str(c).replace("\r", " ").strip()
    return " ".join(s.split())


def _normalize_matrix(rows: list[list]) -> list[list[str]]:
    out: list[list[str]] = []
    for row in rows:
        out.append([_cell_str(c) for c in row])
    return out


def _find_section_row_adicionales(matrix: list[list[str]]) -> int | None:
    """Primera fila donde alguna celda es exactamente ADICIONALES (mayúsculas ignoradas)."""
    for i, row in enumerate(matrix):
        for cell in row:
            if cell.strip().upper() == "ADICIONALES":
                return i
    return None


def main() -> int:
    if len(sys.argv) < 2:
        sys.stderr.write("Uso: extract_perfil_pdf_tables.py <archivo.pdf>\n")
        return 2

    pdf_path = Path(sys.argv[1])
    if not pdf_path.is_file():
        err = {"ok": False, "error": f"No existe el archivo: {pdf_path}"}
        print(json.dumps(err, ensure_ascii=False))
        return 1

    try:
        import fitz  # PyMuPDF
    except ImportError:
        err = {
            "ok": False,
            "error": "Falta el paquete pymupdf. Instale con: pip install pymupdf",
        }
        print(json.dumps(err, ensure_ascii=False))
        return 1

    doc = fitz.open(pdf_path)
    try:
        page = doc[0]
        tf = page.find_tables(strategy="lines")
        raw_tables = tf.tables if tf else []
        if not raw_tables:
            tf = page.find_tables(strategy="text")
            raw_tables = tf.tables if tf else []

        extracted: list[list[list[str]]] = []
        for t in raw_tables:
            data = t.extract()
            if not data:
                continue
            extracted.append(_normalize_matrix(data))

        if not extracted:
            out = {
                "ok": True,
                "numpages": doc.page_count,
                "tables": [],
                "meta": {"note": "No se detectaron tablas en la primera página."},
            }
            print(json.dumps(out, ensure_ascii=False))
            return 0

        # Caso típico TRANSALTISA: primera detección = bloque grande + adicionales; segunda = condicional.
        first = extracted[0]
        rest = extracted[1:]

        split_at = _find_section_row_adicionales(first)
        tables_out: list[dict] = []

        def _trim_trailing_empty(matrix: list[list[str]]) -> list[list[str]]:
            while matrix and all(not c.strip() for c in matrix[-1]):
                matrix = matrix[:-1]
            return matrix

        if split_at is not None and split_at > 0:
            principal = _trim_trailing_empty(first[:split_at])
            adicionales = _trim_trailing_empty(first[split_at:])
            tables_out.append(
                {
                    "id": 1,
                    "nombre": "Principal (exámenes y primer precio)",
                    "filas": len(principal),
                    "columnas": max((len(r) for r in principal), default=0),
                    "celdas": principal,
                }
            )
            tables_out.append(
                {
                    "id": 2,
                    "nombre": "Adicionales",
                    "filas": len(adicionales),
                    "columnas": max((len(r) for r in adicionales), default=0),
                    "celdas": adicionales,
                }
            )
        else:
            tables_out.append(
                {
                    "id": 1,
                    "nombre": "Documento (tabla 1)",
                    "filas": len(first),
                    "columnas": max((len(r) for r in first), default=0),
                    "celdas": first,
                }
            )

        next_id = len(tables_out) + 1
        for block in rest:
            nombre = f"Tabla {next_id}"
            for row in block[:4]:
                for c in row:
                    if "CONDICIONAL" in c.upper():
                        nombre = "Condicional"
                        break
                if nombre == "Condicional":
                    break

            tables_out.append(
                {
                    "id": next_id,
                    "nombre": nombre,
                    "filas": len(block),
                    "columnas": max((len(r) for r in block), default=0),
                    "celdas": block,
                }
            )
            next_id += 1

        out = {
            "ok": True,
            "numpages": doc.page_count,
            "tables": tables_out,
        }
        print(json.dumps(out, ensure_ascii=False))
        return 0
    finally:
        doc.close()


if __name__ == "__main__":
    raise SystemExit(main())
