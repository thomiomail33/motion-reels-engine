#!/usr/bin/env bash
# One command: overlap audit -> render -> sound -> mux -> compress.
# Usage: bash make_reel.sh <scene.html> <sfx.py> <seconds> <OutputName>
# Run from inside the engine/ folder (scene and sfx files live next to engine.js).
set -e
SCENE=$1; SFX=$2; DUR=$3; NAME=$4
echo "== 1/4 overlap audit"
AUD=$(node render.js audit "$SCENE" "$DUR")
echo "$AUD"
if ! echo "$AUD" | grep -q "^AUDIT CLEAN"; then echo "!! Fix the overlaps above before rendering (move or time the elements apart)."; exit 1; fi
echo "== 2/4 render video"
node render.js video "$SCENE" "$DUR" _raw.mp4
echo "== 3/4 build sound effects"
python3 "$SFX"
WAV=$(python3 -c "import re,sys;s=open('$SFX').read();print(re.findall(r\"save\\('([^']+)'\",s)[-1])")
echo "== 4/4 mux + compress"
ffmpeg -v error -y -i _raw.mp4 -i "$WAV" -map 0:v -map 1:a -c:v libx264 -crf 21 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "$NAME.mp4"
rm -f _raw.mp4
COVER_T=$(grep -oP "COVER_T\s*=\s*\K[0-9.]+" "$SCENE" || echo 8)
node render.js cover "$SCENE" "$COVER_T" "${NAME}_cover.jpg"
echo "DONE -> $NAME.mp4 + ${NAME}_cover.jpg"
