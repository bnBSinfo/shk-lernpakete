#!/bin/bash
# Kopiert die Lernpakete (Quelle: ../<paket>) nach docs/ und überträgt sie. GitHub Pages zeigt docs/.
#   ./veroeffentlichen.sh
set -e
cd "$(dirname "$0")"
for P in hydraulischer-abgleich; do
  rsync -a --delete --exclude '.DS_Store' "../$P/" "docs/$P/"
  cp "../${P}_scorm12.zip" "docs/${P}_scorm12.zip"
done
touch docs/.nojekyll
git add -A
git commit -q -m "Pakete veröffentlicht" || echo "Keine Änderungen."
git push -q
echo "Online in 1–2 Minuten: https://bnbsinfo.github.io/shk-lernpakete/"
