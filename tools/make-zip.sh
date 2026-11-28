#!/bin/bash
# プロジェクト一式をZIPにまとめる（Mac / Linux / Git Bash）
# 使い方：  cd habit-forest && bash tools/make-zip.sh
set -e
cd "$(dirname "$0")/.."
OUT="../habit-forest-$(date +%Y%m%d).zip"
rm -f "$OUT"
zip -r "$OUT" . -x "*.zip" "server/node_modules/*" "server/.env" "server/subscriptions.json" ".git/*" > /dev/null
echo "作成しました: $OUT"
