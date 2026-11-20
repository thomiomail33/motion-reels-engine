# Caption checker. Usage: python3 check_caption.py <caption.txt> [KEYWORD|NONE]
# Fails if the caption breaks the house rules in PROJECT_INSTRUCTIONS.md section 6.
import sys, re
path = sys.argv[1]; kw = (sys.argv[2] if len(sys.argv) > 2 else 'ANIMATE').upper()
s = open(path, encoding='utf-8').read()
body = re.sub(r'#\w+', '', s)
words = len(body.split()); tags = re.findall(r'#\w+', s)
errs = []
if '—' in s or '–' in s: errs.append('contains an em/en dash; use a period or comma')
if not re.search(r'send this to', s, re.I): errs.append('no "Send this to ..." line naming a specific person')
if kw != 'NONE' and f'"{kw}"' not in s.upper().replace('“', '"').replace('”', '"'): errs.append(f'no comment keyword CTA with "{kw}" in quotes')
if not 3 <= len(tags) <= 5: errs.append(f'{len(tags)} hashtags; use 3 to 5')
if words > 140: errs.append(f'{words} words; keep it under 140')
if words < 35: errs.append(f'{words} words; too thin, the caption carries the lesson')
first = s.strip().splitlines()[0]
if len(first.split()) > 14: errs.append('hook line is too long; 14 words max')
if errs: print('CAPTION FAIL'); [print(' -', e) for e in errs]; sys.exit(1)
print(f'CAPTION OK  ({words} words, {len(tags)} hashtags)')
