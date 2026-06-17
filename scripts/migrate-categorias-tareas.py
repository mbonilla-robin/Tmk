#!/usr/bin/env python3
"""Limpia y normaliza el campo categoria (y titulo) de todas las tareas."""

import json
import re
import unicodedata
import urllib.request
import time

API_URL = "https://script.google.com/macros/s/AKfycbzd8lCW7XVpO_M2teBGKdsQP8ShHqKAiPORn3a4KjQyGswGpHfaB6HRGw9g3ryow00wrg/exec"
TOKEN = "tmk2026"
ROBIN_USER = "mbonilla"

CATALOGO = [
    ("Solicitud", "sky", 1),
    ("Arte", "pink", 2),
    ("Reunión", "cyan", 3),
    ("Propuesta", "violet", 4),
    ("Robin", "orange", 5),
    ("Ideas", "lime", 6),
    ("Diseño", "indigo", 7),
    ("Finanzas", "emerald", 8),
    ("Proyecto", "teal", 9),
    ("PDV", "amber", 10),
    ("Presupuesto", "rose", 11),
    ("POP", "zinc", 12),
    ("ODC", "zinc", 13),
    ("Adaptación", "orange", 14),
    ("Otro", "zinc", 15),
]

INVALIDAS = {"pagopendiente", "status", "contenido", "produccion", "revision"}


def normalize_key(value):
    s = str(value or "").strip().lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", "", s)


ALIASES = {
    "robin": "Robin",
    "reunion": "Reunión",
    "diseno": "Diseño",
    "adaptacion": "Adaptación",
    "ppto": "Presupuesto",
    "pptototem": "Presupuesto",
    "cotizacion": "Presupuesto",
    "visitapdv": "PDV",
    "visita": "PDV",
    "pdv": "PDV",
    "pop": "POP",
    "odc": "ODC",
    "solicitudafinanzasparagarantizarpagoaproveedor": "Finanzas",
    "pagopendiente": None,
    "status": None,
}

for nombre, _, _ in CATALOGO:
    ALIASES[normalize_key(nombre)] = nombre


def resolver_canonica(valor):
    clave = normalize_key(valor)
    if not clave or clave in INVALIDAS:
        return None
    if clave in ALIASES:
        return ALIASES[clave]
    if len(clave) > 24:
        return None
    return None


def parse_categorias(raw):
    if not raw:
        return "", []
    partes = re.split(r"[,;]|\s+y\s+", str(raw), flags=re.I)
    unicas = []
    for p in partes:
        canon = resolver_canonica(p.strip())
        if canon and canon not in unicas:
            unicas.append(canon)
    if not unicas:
        return "", []
    return unicas[0], unicas[1:]


def serializar(principal, subs):
    todas = [c for c in [principal, *(subs or [])] if c]
    unicas = []
    for c in todas:
        if c not in unicas:
            unicas.append(c)
    return ", ".join(unicas)


def extraer_titulo_limpio(info, categoria_hint=""):
    raw = str(info or "").strip()
    if not raw:
        return ""
    principal, _ = parse_categorias(categoria_hint)
    if principal:
        prefijo = f"{principal} | "
        if raw.lower().startswith(prefijo.lower()):
            return raw[len(prefijo):].strip()
    match = re.match(r"^([^|]+)\s*\|\s*(.+)$", raw)
    if match:
        return match.group(2).strip()
    return raw


def aplicar_titulo(titulo_limpio, principal):
    limpio = str(titulo_limpio or "").strip()
    if not principal:
        return limpio
    sin_prefijo = extraer_titulo_limpio(limpio, principal)
    if not sin_prefijo:
        return f"{principal} | "
    return f"{principal} | {sin_prefijo}"


def limpiar_tarea(task):
    principal, subs = parse_categorias(task.get("categoria", ""))
    info = str(task.get("info") or "").strip()

    match = re.match(r"^([^|]+)\s*\|\s*(.+)$", info)
    if match:
        desde_titulo = resolver_canonica(match.group(1).strip())
        info = match.group(2).strip()
        if desde_titulo:
            if not principal:
                principal = desde_titulo
            elif desde_titulo != principal and desde_titulo not in subs:
                subs = [desde_titulo] + subs

    categoria = serializar(principal, subs)
    info_final = aplicar_titulo(extraer_titulo_limpio(info, categoria), principal)
    return categoria, info_final


def fetch_tasks():
    url = f"{API_URL}?token={TOKEN}&robinUser={ROBIN_USER}"
    with urllib.request.urlopen(url) as resp:
        payload = json.load(resp)
    if not payload.get("success"):
        raise RuntimeError(payload.get("error", "fetch failed"))
    return payload.get("data", [])


def update_task(task, categoria, info):
    body = {
        "token": TOKEN,
        "robinUser": ROBIN_USER,
        "marca": task.get("marca", ""),
        "idTarea": task.get("idTarea", ""),
        "info": info,
        "originalInfo": task.get("info", ""),
        "categoria": categoria,
        "personas": task.get("personas", ""),
        "detalles": task.get("detalles", ""),
        "estado": task.get("estado", ""),
        "deadline": task.get("deadline", ""),
        "prioridad": task.get("prioridad", ""),
        "campo": "todo",
    }
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "text/plain; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode("utf-8"))
    if not result.get("success"):
        raise RuntimeError(result.get("error", "update failed"))


def main():
    tasks = fetch_tasks()
    changes = []

    for task in tasks:
        id_tarea = str(task.get("idTarea") or "")
        if id_tarea.upper().startswith("PRESENCE-"):
            continue
        if not str(task.get("info") or "").strip():
            continue

        cat_nueva, info_nueva = limpiar_tarea(task)
        cat_vieja = str(task.get("categoria") or "").strip()
        info_vieja = str(task.get("info") or "").strip()

        if cat_nueva != cat_vieja or info_nueva != info_vieja:
            changes.append((task, cat_vieja, cat_nueva, info_vieja, info_nueva))

    print(f"Tareas revisadas: {len(tasks)}")
    print(f"Tareas a actualizar: {len(changes)}\n")

    for i, (task, cat_v, cat_n, info_v, info_n) in enumerate(changes, 1):
        print(f"[{i}/{len(changes)}] {task.get('idTarea')} | {info_v[:55]}")
        if cat_v != cat_n:
            print(f"  CAT  {cat_v!r} -> {cat_n!r}")
        if info_v != info_n:
            print(f"  INFO {info_v!r}")
            print(f"    -> {info_n!r}")
        update_task(task, cat_n, info_n)
        time.sleep(0.45)

    print(f"\nListo. {len(changes)} tarea(s) actualizada(s).")


if __name__ == "__main__":
    main()
