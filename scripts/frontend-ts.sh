#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '\n==> %s\n' "$1"
}

check_syntax() {
  local file="$1"
  node --check "$file"
}

log "Instalando dependencias"
npm install --no-fund --no-audit

log "Validando TypeScript"
npm run typecheck

log "Compilando TypeScript"
npm run build:ts

log "Compilando CSS"
npm run build:css

log "Validando sintaxis de JS compilado y runtime"
while IFS= read -r -d '' file; do
  check_syntax "$file"
done < <(find js -type f -name '*.js' -print0)
check_syntax sw.js

log "Auditoría de frontend TS"
bash ./scripts/audit-legacy.sh

log "Verificando activos críticos"
test -f favicon.ico
test -f manifest.webmanifest
test -f css/tailwind.generated.css
test -f js/lib/backend.js
test -f js/api.js
test -f js/pwa-init.js
test -f js/integrador.js
test -f js/Pagina-principal.js

log "Resumen"
echo "Frontend TypeScript verificado en $(pwd)"
echo "TypeScript, CSS, runtime compilado y paridad JS/TS quedaron consistentes."
echo "Si quieres servir localmente, usa el servidor/proxy que corresponda al árbol activo."
