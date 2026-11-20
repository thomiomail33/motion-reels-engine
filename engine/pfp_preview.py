# Shows profile picture options the way Instagram does: in a circle, big and at real phone size.
# Usage: python3 pfp_preview.py out.png pfp_A.png pfp_B.png pfp_C.png [more...]
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
n = len(files); W = n * 420 + 40
img = Image.new('RGB', (W, 640), '#ffffff'); d = ImageDraw.Draw(img)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB')
    for size, (x, y) in ((400, (20 + i * 420, 30)), (110, (165 + i * 420, 480))):
        sm = im.resize((size, size)); m = Image.new('L', (size, size), 0); ImageDraw.Draw(m).ellipse((0, 0, size - 1, size - 1), fill=255)
        img.paste(sm, (x, y), m)
    d.text((215 + i * 420, 455), chr(65 + i), fill='black')
img.save(out); print('saved', out)
