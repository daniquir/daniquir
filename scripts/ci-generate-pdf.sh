#!/usr/bin/env bash
# Genera el PDF en CI y lo coloca en _site (no en el repo fuente).
set -euo pipefail

cd "$(dirname "$0")/.."

BASE_PATH="${BASE_PATH:-/online-cv}"
SITE_DIR="${SITE_DIR:-_site}"
PORT="${PORT:-4000}"
CV_URL="http://127.0.0.1:${PORT}${BASE_PATH}/print/"
RAW_PDF="assets/pdf/Daniel_Quirant_Rico_CV.raw.pdf"
METRICS="assets/pdf/.pdf-metrics.json"
OUTPUT_PDF="${SITE_DIR}/assets/pdf/Daniel_Quirant_Rico_CV.pdf"

mkdir -p assets/pdf "${SITE_DIR}/assets/pdf"

bundle exec jekyll serve \
  --skip-initial-build \
  --host 127.0.0.1 \
  --port "${PORT}" \
  --baseurl "${BASE_PATH}" &
JEKYLL_PID=$!

cleanup() {
  kill "${JEKYLL_PID}" 2>/dev/null || true
  wait "${JEKYLL_PID}" 2>/dev/null || true
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 40); do
  if curl -sf "${CV_URL}" > /dev/null; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "${ready}" -ne 1 ]]; then
  echo "Error: no se pudo alcanzar ${CV_URL}" >&2
  exit 1
fi

CV_URL="${CV_URL}" \
  OUTPUT="$(pwd)/${RAW_PDF}" \
  METRICS="$(pwd)/${METRICS}" \
  node scripts/generate-pdf.js

node scripts/postprocess-pdf.js "${RAW_PDF}" "${OUTPUT_PDF}" "${METRICS}"

rm -f "${RAW_PDF}" "${METRICS}"

if [[ ! -s "${OUTPUT_PDF}" ]]; then
  echo "Error: no se generó ${OUTPUT_PDF}" >&2
  exit 1
fi

echo "PDF listo en ${OUTPUT_PDF} ($(wc -c < "${OUTPUT_PDF}") bytes)"
