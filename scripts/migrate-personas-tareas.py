#!/usr/bin/env python3
"""Migra el campo personas de todas las tareas al handle canónico."""

import json
import re
import unicodedata
import urllib.request
import urllib.error
import time

API_URL = "https://script.google.com/macros/s/AKfycbzd8lCW7XVpO_M2teBGKdsQP8ShHqKAiPORn3a4KjQyGswGpHfaB6HRGw9g3ryow00wrg/exec"
TOKEN = "tmk2026"
ROBIN_USER = "mbonilla"

ALIAS_TO_CANONICAL = {
    "miguel": "mbonilla",
    "bonilla": "mbonilla",
    "miguel bonilla": "mbonilla",
    "mbonilla": "mbonilla",
    "ricardo": "ralvarez",
    "alvarez": "ralvarez",
    "ricardo alvarez": "ralvarez",
    "ralvarez": "ralvarez",
    "daniela": "dsalavarria",
    "salavarria": "dsalavarria",
    "daniela salavarria": "dsalavarria",
    "dsalavarria": "dsalavarria",
    "francisco": "fcolmenares",
    "colmenares": "fcolmenares",
    "francisco colmenares": "fcolmenares",
    "fcolmenares": "fcolmenares",
    "genesis": "gnebrus",
    "nebrus": "gnebrus",
    "genesis nebrus": "gnebrus",
    "gnebrus": "gnebrus",
    "sofia": "sgiucastro",
    "giucastro": "sgiucastro",
    "sofia giucastro": "sgiucastro",
    "sgiucastro": "sgiucastro",
    "admin": "admin",
}

SORTED_ALIASES = sorted(ALIAS_TO_CANONICAL.keys(), key=len, reverse=True)


def normalize_key(value):
    s = str(value or "").strip().lower().replace("@", "")
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", s)


def resolve_canonical(value):
    return ALIAS_TO_CANONICAL.get(normalize_key(value), "")


def format_handle(handle):
    return f"@{normalize_key(handle)}"


def tokenize_personas(raw):
    text = str(raw or "").strip()
    if not text:
        return []

    if "," in text:
        return [t.strip() for t in text.split(",") if t.strip()]

    if text.count("@") > 1:
        return [t.strip() for t in re.split(r"(?=@)", text) if t.strip()]

    if "@" not in text:
        tokens = []
        remaining = text
        while remaining:
            key_remaining = normalize_key(remaining)
            alias_found = ""
            for alias in SORTED_ALIASES:
                if key_remaining == alias or key_remaining.startswith(alias + " "):
                    alias_found = alias
                    break
            if not alias_found:
                parts = remaining.split()
                tokens.append(parts[0])
                remaining = " ".join(parts[1:]).strip()
                continue
            word_count = len(alias_found.split())
            parts = remaining.split()
            tokens.append(" ".join(parts[:word_count]))
            remaining = " ".join(parts[word_count:]).strip()
        return tokens

    return [text]


def normalize_personas_field(raw):
    tokens = tokenize_personas(raw)
    if not tokens:
        return ""

    seen = set()
    out = []
    for token in tokens:
        canonical = resolve_canonical(token)
        if canonical:
            if canonical not in seen:
                seen.add(canonical)
                out.append(format_handle(canonical))
            continue

        clean = str(token or "").strip()
        if not clean:
            continue
        key = normalize_key(clean)
        if key in seen:
            continue
        seen.add(key)
        out.append(clean if clean.startswith("@") else f"@{key}")

    return ", ".join(out)


def fetch_tasks():
    url = f"{API_URL}?token={TOKEN}&robinUser={ROBIN_USER}"
    with urllib.request.urlopen(url) as resp:
        payload = json.load(resp)
    if not payload.get("success"):
        raise RuntimeError(payload.get("error", "fetch failed"))
    return payload.get("data", [])


def update_task(task, personas):
    body = {
        "token": TOKEN,
        "robinUser": ROBIN_USER,
        "marca": task.get("marca", ""),
        "idTarea": task.get("idTarea", ""),
        "info": task.get("info", ""),
        "categoria": task.get("categoria", ""),
        "personas": personas,
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
        original = str(task.get("personas") or "").strip()
        if not original:
            continue
        normalized = normalize_personas_field(original)
        if normalized != original:
            changes.append((task, original, normalized))

    print(f"Tareas con personas: {sum(1 for t in tasks if str(t.get('personas') or '').strip())}")
    print(f"Tareas a actualizar: {len(changes)}\n")

    for i, (task, original, normalized) in enumerate(changes, 1):
        print(f"[{i}/{len(changes)}] {task.get('idTarea')} | {task.get('info')[:50]}")
        print(f"  ANTES: {original}")
        print(f"  DESPUÉS: {normalized}")
        update_task(task, normalized)
        time.sleep(0.4)

    print(f"\nListo. {len(changes)} tarea(s) actualizada(s).")


if __name__ == "__main__":
    main()
