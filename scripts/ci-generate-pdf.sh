#!/usr/bin/env bash
# Genera el PDF en CI y lo coloca en _site (no en el repo fuente).
set -euo pipefail

cd "$(dirname "$0")/.."

BASE_PATH="${BASE_PATH:-/online-cv}"
SITE_DIR="${SITE_DIR:-_site}"
PORT="${PORT:-4000}"
# Normaliza: "" o "/" → raíz; "/online-cv" → /online-cv
BASE_PATH="${BASE_PATH%/}"
[[ -z "${BASE_PATH}" || "${BASE_PATH}" == "/" ]] && BASE_PATH=""
CV_URL="http://127.0.0.1:${PORT}${BASE_PATH}/print/"
TMP_DIR="$(mktemp -d)"
SERVE_ROOT="$(mktemp -d)"
RAW_PDF="${TMP_DIR}/Daniel_Quirant_Rico_CV.raw.pdf"
METRICS="${TMP_DIR}/.pdf-metrics.json"
OUTPUT_PDF="${SITE_DIR}/assets/pdf/Daniel_Quirant_Rico_CV.pdf"

if [[ ! -d "${SITE_DIR}" ]]; then
  echo "Error: no existe ${SITE_DIR}; ejecuta jekyll build antes." >&2
  exit 1
fi

mkdir -p "${SITE_DIR}/assets/pdf"

# Jekyll escribe en _site/ pero los assets usan site.baseurl (/online-cv/...).
# Montamos _site bajo ese prefijo para que print y CSS resuelvan igual que en Pages.
SITE_ABS="$(cd "${SITE_DIR}" && pwd)"
if [[ -n "${BASE_PATH}" ]]; then
  mkdir -p "${SERVE_ROOT}${BASE_PATH%/*}"
  ln -s "${SITE_ABS}" "${SERVE_ROOT}${BASE_PATH}"
  SERVE_DIR="${SERVE_ROOT}"
else
  SERVE_DIR="${SITE_ABS}"
fi

python3 -m http.server "${PORT}" --directory "${SERVE_DIR}" &
SERVER_PID=$!

cleanup() {
  kill "${SERVER_PID}" 2>/dev/null || true
  wait "${SERVER_PID}" 2>/dev/null || true
  rm -rf "${TMP_DIR}" "${SERVE_ROOT}"
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
  OUTPUT="${RAW_PDF}" \
  METRICS="${METRICS}" \
  node scripts/generate-pdf.js

mkdir -p "$(dirname "${OUTPUT_PDF}")"
node scripts/postprocess-pdf.js "${RAW_PDF}" "${OUTPUT_PDF}" "${METRICS}"

if [[ ! -s "${OUTPUT_PDF}" ]]; then
  echo "Error: no se generó ${OUTPUT_PDF}" >&2
  exit 1
fi

echo "PDF listo en ${OUTPUT_PDF} ($(wc -c < "${OUTPUT_PDF}") bytes)"
