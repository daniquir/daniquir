#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PORT=4000
PDF_FILE="assets/pdf/Daniel_Quirant_Rico_CV.pdf"
RAW_PDF_FILE="assets/pdf/Daniel_Quirant_Rico_CV.raw.pdf"
METRICS_FILE="assets/pdf/.pdf-metrics.json"
PUPPETEER_IMAGE="ghcr.io/puppeteer/puppeteer:23.11.1"
TEMP_CONTAINER=""
CV_URL=""

cleanup() {
  if [[ -n "$TEMP_CONTAINER" ]]; then
    docker stop "$TEMP_CONTAINER" >/dev/null 2>&1 || true
    docker rm "$TEMP_CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

wait_for_url() {
  local url=$1
  for _ in $(seq 1 40); do
    if curl -sf "$url" > /dev/null; then
      return 0
    fi
    sleep 2
  done
  return 1
}

if curl -sf "http://localhost:${PORT}/online-cv/print/" > /dev/null; then
  echo "Usando servidor en http://localhost:${PORT}/online-cv/"
  CV_URL="http://host.docker.internal:${PORT}/online-cv/print/"
else
  echo "Servidor no detectado. Construyendo sitio y arrancando Jekyll temporal..."
  TEMP_CONTAINER="cv-pdf-gen-$$"
  docker run -d --name "$TEMP_CONTAINER" \
    -v "$PWD:/srv/jekyll:Z" \
    -p "${PORT}:${PORT}" \
    jekyll/jekyll:4.2.2 \
    bash -lc "jekyll build --baseurl /online-cv && jekyll serve --host 0.0.0.0 --baseurl /online-cv --port ${PORT}"

  wait_for_url "http://localhost:${PORT}/online-cv/print/"
  CV_URL="http://host.docker.internal:${PORT}/online-cv/print/"
fi

mkdir -p assets/pdf
chmod 777 assets/pdf

PDF_TMP="${PDF_FILE}.tmp"

if [[ ! -d node_modules/pdf-lib ]]; then
  echo "Instalando dependencias Node (pdf-lib)..."
  npm install --no-fund --no-audit
fi

echo "Generando PDF con Chromium (Puppeteer)..."
docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -e CV_URL="$CV_URL" \
  -e OUTPUT="/out/Daniel_Quirant_Rico_CV.raw.pdf" \
  -e METRICS="/out/.pdf-metrics.json" \
  -e NODE_PATH=/home/pptruser/node_modules \
  -v "$PWD/scripts/generate-pdf.js:/scripts/generate-pdf.js:ro" \
  -v "$PWD/assets/pdf:/out:Z" \
  "$PUPPETEER_IMAGE" \
  node /scripts/generate-pdf.js

echo "Aplicando fondos de página completos..."
node scripts/postprocess-pdf.js "$RAW_PDF_FILE" "$PDF_TMP" "$METRICS_FILE"
mv "$PDF_TMP" "$PDF_FILE"
rm -f "$RAW_PDF_FILE" "$METRICS_FILE"

# Copia también a _site si existe (servidor Jekyll local)
if [[ -d _site/assets/pdf ]]; then
  cp "$PDF_FILE" _site/assets/pdf/Daniel_Quirant_Rico_CV.pdf
fi

echo "PDF listo: ${PDF_FILE}"
