#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

patterns=(
  'cdn\.tailwindcss\.com'
  'apple-mobile-web-app-capable'
  'beforeinstallprompt'
  'BACKEND_URL'
  'SRFIX_BACKEND_URL'
  'apiRequest\('
  'requestBackend\('
  'fetch\(BACKEND_URL'
  'payload\.action \|\| "unknown"'
  'default_action'
  'q\.get\("action"\)'
)

echo "Legacy audit for: $(pwd)"
echo

declare -a frontend_pairs=(
  "js/api.js:src/api.ts"
  "js/lib/backend.js:src/lib/backend.ts"
  "js/pwa-init.js:src/pwa-init.ts"
  "js/security-guard.js:src/security-guard.ts"
  "js/Pagina-principal.js:src/Pagina-principal.ts"
  "js/integrador.js:src/integrador.ts"
  "js/panel-archivo.js:src/panel-archivo.ts"
  "js/panel-clientes.js:src/panel-clientes.ts"
  "js/panel-compras.js:src/panel-compras.ts"
  "js/panel-finanzas.js:src/panel-finanzas.ts"
  "js/panel-gastos.js:src/panel-gastos.ts"
  "js/panel-operativo.js:src/panel-operativo.ts"
  "js/panel-proveedores.js:src/panel-proveedores.ts"
  "js/panel-reportes.js:src/panel-reportes.ts"
  "js/panel-seguridad.js:src/panel-seguridad.ts"
  "js/panel-solicitudes.js:src/panel-solicitudes.ts"
  "js/panel-stock.js:src/panel-stock.ts"
  "js/panel-sucursales.js:src/panel-sucursales.ts"
  "js/panel-tareas.js:src/panel-tareas.ts"
  "js/panel-tecnico.js:src/panel-tecnico.ts"
  "js/portal-cliente.js:src/portal-cliente.ts"
)

for pattern in "${patterns[@]}"; do
  matches="$(rg -n \
    --glob '!node_modules/**' \
    --glob '!scripts/**' \
    --glob '!css/tailwind.generated.css' \
    --glob '!package-lock.json' \
    "$pattern" . || true)"
  if [[ -n "$matches" ]]; then
    echo "## Pattern: $pattern"
    printf '%s\n' "$matches"
    echo
  fi
done

echo "## JS/TS parity"
for pair in "${frontend_pairs[@]}"; do
  js_file="${pair%%:*}"
  ts_file="${pair#*:}"
  if [[ -f "$ts_file" ]]; then
    printf 'OK   %s -> %s\n' "$js_file" "$ts_file"
  else
    printf 'LEGACY %s (no matching %s)\n' "$js_file" "$ts_file"
  fi
done

echo
echo "## HTML runtime includes"
rg -n --glob '*.html' 'js/api\.js|js/pwa-init\.js|cdn\.tailwindcss\.com|manifest\.webmanifest|config\.js' .
