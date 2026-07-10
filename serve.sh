#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PORT=4000
LIVE_PORT=35729
IMAGE="jekyll/jekyll:4.2.2"

stop_project_containers() {
  local cid mount name

  for cid in $(docker ps -q 2>/dev/null); do
    mount=$(docker inspect "$cid" --format '{{range .Mounts}}{{if eq .Destination "/srv/jekyll"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)
    if [[ "$mount" == "$PWD" ]]; then
      name=$(docker inspect "$cid" --format '{{.Name}}' 2>/dev/null | sed 's|^/||')
      echo "Parando contenedor anterior: ${name} (${cid})"
      docker stop "$cid" >/dev/null
    fi
  done
}

stop_project_containers

if ss -tln 2>/dev/null | grep -q ":${PORT} " || ss -tln 2>/dev/null | grep -q ":${PORT}\];"; then
  blocker=$(docker ps --filter "publish=${PORT}" --format '{{.Names}}' 2>/dev/null | head -1 || true)
  if [[ -n "$blocker" ]]; then
    echo "Error: el puerto ${PORT} sigue ocupado por ${blocker}."
  else
    echo "Error: el puerto ${PORT} está ocupado por otro proceso."
  fi
  exit 1
fi

echo "Reconstruyendo e iniciando CV en http://localhost:${PORT}/online-cv/"
echo "Edita _data/data.yml y los archivos del proyecto; la página se regenera sola."
echo "Pulsa Ctrl+C para parar."

docker_tty=()
if [[ -t 0 ]]; then
  docker_tty=(-it)
fi

docker run --rm "${docker_tty[@]}" \
  -v "$PWD:/srv/jekyll:Z" \
  -p "${PORT}:${PORT}" \
  -p "${LIVE_PORT}:${LIVE_PORT}" \
  "${IMAGE}" \
  bash -lc "jekyll build --baseurl /online-cv && jekyll serve --force_polling --livereload --host 0.0.0.0 --baseurl /online-cv"
