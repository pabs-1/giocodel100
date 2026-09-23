#!/usr/bin/env bash
# Carica il sito statico su Neocities via API.
#
#   export NEOCITIES_API_KEY=...   # mai scriverla in un file del repo
#   ./deploy.sh
#
# Lo stesso script gira nella GitHub Action (.github/workflows/deploy.yml).
# Vengono caricati SOLO i file elencati in FILES (più le cartelle delle
# lingue): .git, .github, README, test, tools e questo script restano fuori.
set -euo pipefail

if [ -z "${NEOCITIES_API_KEY:-}" ]; then
  echo "Errore: variabile NEOCITIES_API_KEY non impostata." >&2
  echo "  export NEOCITIES_API_KEY='la-tua-chiave'   (Neocities → Settings → API)" >&2
  exit 1
fi

cd "$(dirname "$0")"

FILES=(
  index.html
  rules.html
  style.css
  i18n.js
  logic.js
  gamepad.js
  share.js
  game.js
  sw.js
  manifest.json
  icons/icon.svg
  icons/icon-192.png
  icons/icon-512.png
  icons/icon-maskable-512.png
  icons/apple-touch-icon.png
  og-image.png
  robots.txt
  sitemap.xml
  not_found.html
)

# Pagine tradotte generate da tools/build-pages.js: /it/, /en/, /fr/…
for page in */index.html */rules.html; do
  [ -f "$page" ] && FILES+=("$page")
done

for f in "${FILES[@]}"; do
  [ -f "$f" ] || { echo "Errore: manca $f" >&2; exit 1; }
done

# Versione della cache del service worker: hash del commit (o timestamp),
# così ogni deploy invalida la cache offline dei visitatori.
BUILD="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || date -u +%Y%m%d%H%M%S)}"
BUILD="${BUILD:0:12}"
# Deploy locale con modifiche non committate: stesso hash ma file diversi.
# Senza un suffisso sw.js resterebbe identico e i visitatori non vedrebbero
# la nuova versione.
if [ -z "${GITHUB_SHA:-}" ] && [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  BUILD="$BUILD-$(date -u +%Y%m%d%H%M%S)"
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$f" "$STAGE/$f"
done
sed -i.bak "s/__BUILD__/$BUILD/g" "$STAGE/sw.js" && rm -f "$STAGE/sw.js.bak"

ARGS=()
for f in "${FILES[@]}"; do
  ARGS+=(-F "$f=@$STAGE/$f")
done

echo "Carico ${#FILES[@]} file su Neocities (build $BUILD)..."
# La chiave passa via file di config su stdin: non compare in `ps` né nei log.
RESPONSE="$(printf 'header = "Authorization: Bearer %s"\n' "$NEOCITIES_API_KEY" |
  curl -sS --retry 3 --retry-delay 2 -K - "${ARGS[@]}" https://neocities.org/api/upload)" || {
  echo "Errore: richiesta a Neocities fallita." >&2
  exit 1
}

if printf '%s' "$RESPONSE" | grep -q '"result": *"success"'; then
  echo "Fatto: https://giocodel100.neocities.org/"
else
  echo "Errore da Neocities: $RESPONSE" >&2
  exit 1
fi
