#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Iniciando CV en http://localhost:4000/online-cv/"
echo "Edita _data/data.yml y los archivos del proyecto; la página se regenera sola."
echo "Pulsa Ctrl+C para parar."

docker run --rm -it \
  -v "$PWD:/srv/jekyll:Z" \
  -p 4000:4000 \
  -p 35729:35729 \
  jekyll/jekyll:4.2.2 \
  jekyll serve --force_polling --livereload --host 0.0.0.0 --baseurl /online-cv
