#!/usr/bin/env python3
"""Assemble the .dc.html boards from the shared kit and the page modules.

One stylesheet, one shell, one sheet and one behaviour file serve every board, so a
correction lands everywhere at once. Usage: python3 build.py [out_dir]
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / 'canvas' / 'project'
read = lambda p: (HERE / p).read_text()

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&amp;'
         'family=Space+Grotesk:wght@500;600;700&amp;display=swap" rel="stylesheet">')

HOMES = ['D-Admin.dc.html', 'D-Staff.dc.html', 'D-Client.dc.html']
# Every board is described by pages/<id>.board.json:
# {"file": "A-Clients.dc.html", "title": "Clients, Owner", "role": 0, "html": "a-clients.html",
#  "js": ["shared-x.js", "a-clients.js"], "css": ["shared-x.css"], "headact": "<button …>", "side": "", "overlay": ""}
BOARDS = [dict(json.loads(p.read_text()), id=p.name[:-11]) for p in sorted((HERE / 'pages').glob('*.board.json'))]


def expand(html):
    html = html.replace('%%SKELLIST%%', read('parts/skel-list.html')).replace('%%SKEL%%', read('parts/skel.html')).replace('%%DECK%%', read('parts/deck.html'))
    pager = read('parts/pager.html')
    tools = read('parts/tools.html')
    html = re.sub(r'%%TOOLS:([\w.]+):([^%]+)%%', lambda m: tools.replace('KEY', m.group(1)).replace('LABEL', m.group(2)), html)
    return re.sub(r'%%PAGER:([\w.]+):([^%]+)%%', lambda m: pager.replace('KEY', m.group(1)).replace('LABEL', m.group(2)), html)


def build(b):
    pop = read('popbody.html')
    shell = read('shell.html')
    shell = shell.replace('%%ROLEI%%', str(b['role']))
    for i, k in enumerate(['ADMIN', 'STAFF', 'CLIENT']):
        shell = shell.replace(f'%%HOME_{k}%%', HOMES[i]).replace(f'%%ON_{k}%%', 'on' if i == b['role'] else '')
    shell = (shell.replace('%%SIDECARD%%', read('pages/' + b['side']) if b.get('side') else '')
                  .replace('%%HEADACT%%', b.get('headact', ''))
                  .replace('%%MAIN%%', expand(read('pages/' + b['html'])))
                  .replace('%%POPBODY%%', pop)
                  .replace('%%SHEET%%', read('sheet.html')))
    if b.get('overlay'):
        shell = shell.replace('<sc-if value="{{sheetOpen}}"', read('pages/' + b['overlay']) + '\n    <sc-if value="{{sheetOpen}}"', 1)
    left = re.findall(r'%%[A-Z_:]+%%', shell)
    assert not left, f"{b['id']}: unreplaced {left}"
    css = read('kit.css')
    for c in b.get('css', []):
        css += '\n' + read('pages/' + c)
    logos = f"  socialLogos() {{ return {read('social.json').strip()}; }}\n  payLogos() {{ return {read('payments.json').strip()}; }}\n"
    js = read('kit.js') + '\n' + read('extras.js') + '\n' + read('kit2.js') + '\n' + read('tools.js') + '\n' + logos + '\n'.join(read('pages/' + j) for j in b['js'])
    props = json.dumps({'$preview': {'width': 1440, 'height': 1900}})
    doc = (f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>{b["title"]}</title>\n'
           f'<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n{FONTS}\n<style>\n{css}\n</style>\n</helmet>\n'
           f'{shell}\n</x-dc>\n<script type="text/x-dc" data-dc-script data-props=\'{props}\'>\n'
           f'class Component extends DCLogic {{\n{js}\n}}\n</script>\n</body>\n</html>\n')
    (OUT / b['file']).write_text(doc)
    print(f'{b["file"]}: {len(doc):,} bytes')


if __name__ == '__main__':
    only = set(sys.argv[2:])
    for b in BOARDS:
        if not only or b['id'] in only:
            build(b)
