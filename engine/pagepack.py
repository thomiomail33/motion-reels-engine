# The page pack: one text file (MY_PAGE.md) that holds everything Claude knows about the owner's page.
# Free Claude plans can't upload zips or folders, but they can upload a text file, so the page's memory lives in one.
#   python3 engine/pagepack.py import MY_PAGE.md   -> fills my_page/ from the file (start of every chat)
#   python3 engine/pagepack.py export MY_PAGE.md   -> writes my_page/ back into one file (end of every session)
#   python3 engine/pagepack.py new                 -> creates a fresh my_page/ for a brand-new page
import sys, os, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MP = os.path.join(ROOT, 'my_page'); TPL = os.path.join(ROOT, 'my_page_template')
FILES = ['page_profile.md', 'style_log.md', 'page.js', 'ideas_used.csv', 'my_ideas.csv']
HEAD = "# MY PAGE (Motion Reels Kit page pack)\nKeep this file. Upload it at the start of every new chat so Claude remembers your page.\n\n"
def new():
    os.makedirs(MP, exist_ok=True)
    for f in FILES:
        if not os.path.exists(os.path.join(MP, f)): shutil.copy(os.path.join(TPL, f), os.path.join(MP, f))
    print('fresh my_page/ ready')
def export(path):
    out = HEAD
    for f in FILES:
        p = os.path.join(MP, f); body = open(p, encoding='utf-8').read().rstrip('\n') if os.path.exists(p) else ''
        out += f'<<<FILE {f}>>>\n{body}\n<<<END {f}>>>\n\n'
    open(path, 'w', encoding='utf-8').write(out); print('saved', path)
def imp(path):
    new(); s = open(path, encoding='utf-8').read(); n = 0
    for f in FILES:
        a, b = f'<<<FILE {f}>>>\n', f'\n<<<END {f}>>>'
        if a in s and b in s:
            body = s.split(a, 1)[1].split(b, 1)[0]; open(os.path.join(MP, f), 'w', encoding='utf-8').write(body + '\n'); n += 1
    shutil.copy(os.path.join(MP, 'page.js'), os.path.join(ROOT, 'engine', 'page.js'))
    print(f'loaded {n} of {len(FILES)} files from {path}')
if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'new': new()
    elif cmd == 'export': export(sys.argv[2])
    elif cmd == 'import': imp(sys.argv[2])
    else: print(__doc__ or 'usage: pagepack.py new | import FILE | export FILE')
