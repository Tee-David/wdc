#!/usr/bin/env python3
"""Assemble the .dc.html boards from the shared kit and the page modules.

One stylesheet, one shell, one sheet and one behaviour file serve every board, so a
correction lands everywhere at once. Usage: python3 build.py [out_dir]
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'out'
OUT.mkdir(parents=True, exist_ok=True)
read = lambda p: (HERE / p).read_text()

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&amp;'
         'family=Space+Grotesk:wght@500;600;700&amp;display=swap" rel="stylesheet">')

PLUS = '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>'
BOARDS = [
    dict(file='D-Admin.dc.html', title='Flow, Owner Today', role=0, page='admin',
         headact=f'<button class="btn newBtn" data-menu="new" aria-haspopup="menu" onClick="{{{{openNew}}}}">{PLUS}<span class="hideS">New</span><span class="sr">Create something new</span></button>'),
    dict(file='D-Staff.dc.html', title='Flow, Staff My Day', role=1, page='staff', headact=''),
    dict(file='D-Client.dc.html', title='Flow, Client Home', role=2, page='client', headact=''),
]
HOMES = ['D-Admin.dc.html', 'D-Staff.dc.html', 'D-Client.dc.html']


def expand(html):
    html = html.replace('%%SKEL%%', read('parts/skel.html')).replace('%%DECK%%', read('parts/deck.html'))
    pager = read('parts/pager.html')
    return re.sub(r'%%PAGER:(\w+):([^%]+)%%', lambda m: pager.replace('KEY', m.group(1)).replace('LABEL', m.group(2)), html)


def build(b):
    page = b['page']
    pop = read('popbody.html')
    shell = read('shell.html')
    shell = shell.replace('%%ROLEI%%', str(b['role']))
    for i, k in enumerate(['ADMIN', 'STAFF', 'CLIENT']):
        shell = shell.replace(f'%%HOME_{k}%%', HOMES[i]).replace(f'%%ON_{k}%%', 'on' if i == b['role'] else '')
    side = HERE / 'pages' / f'{page}.side.html'
    shell = (shell.replace('%%SIDECARD%%', side.read_text() if side.exists() else '')
                  .replace('%%HEADACT%%', b['headact'])
                  .replace('%%MAIN%%', expand(read(f'pages/{page}.html')))
                  .replace('%%POPBODY%%', pop)
                  .replace('%%SHEET%%', read('sheet.html')))
    extra = HERE / 'pages' / f'{page}.overlay.html'
    if extra.exists():
        shell = shell.replace('<sc-if value="{{sheetOpen}}"', extra.read_text() + '\n    <sc-if value="{{sheetOpen}}"', 1)
    left = re.findall(r'%%[A-Z_:]+%%', shell)
    assert not left, f'{page}: unreplaced {left}'
    css = read('kit.css')
    pcss = HERE / 'pages' / f'{page}.css'
    if pcss.exists():
        css += '\n' + pcss.read_text()
    logos = f"  socialLogos() {{ return {read('social.json').strip()}; }}\n  payLogos() {{ return {read('payments.json').strip()}; }}\n"
    js = read('kit.js') + '\n' + read('extras.js') + '\n' + logos + read(f'pages/{page}.js')
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
        if (HERE / 'pages' / f'{b["page"]}.js').exists() and (not only or b['page'] in only):
            build(b)
