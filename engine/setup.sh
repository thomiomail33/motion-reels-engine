#!/usr/bin/env bash
# Run once at the start of every chat (from inside engine/). Checks and installs the tools the kit needs.
cd "$(dirname "$0")"
[ -f ../my_page/page.js ] && cp ../my_page/page.js page.js && echo "page.js loaded from my_page/"
[ -d ../my_page ] || python3 pagepack.py new
command -v node >/dev/null || echo "!! node is missing"
command -v ffmpeg >/dev/null || echo "!! ffmpeg is missing (try: pip install imageio-ffmpeg, then use its binary)"
python3 -c "import numpy, scipy, PIL" 2>/dev/null || pip install -q numpy scipy pillow 2>/dev/null || pip install -q --break-system-packages numpy scipy pillow
node -e "require('playwright')" 2>/dev/null || (npm i -s playwright >/dev/null 2>&1 && npx playwright install chromium >/dev/null 2>&1)
node -e "require('playwright')" 2>/dev/null && echo "playwright OK" || echo "!! playwright could not be installed"
echo "SETUP DONE"
