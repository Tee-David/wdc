import json, pathlib, re, sys
P=pathlib.Path('project'); t=json.loads((P/'tokens.json').read_text())
L=';'.join(f"--{c['name']}:{c['value']['light']}" for c in t['color']['tokens'])+';'+';'.join(f"--{c['name']}:{c['value']['light']}" for c in t['shadow']['tokens'])
D=';'.join(f"--{c['name']}:{c['value']['dark']}" for c in t['color']['tokens'] if 'dark' in c['value'])+';'+';'.join(f"--{c['name']}:{c['value']['dark']}" for c in t['shadow']['tokens'])
css=f':root{{{L}}}[data-theme=dark]{{{D}}}'+(P/'components/bundle.css').read_text()
out=pathlib.Path('_check'); out.mkdir(exist_ok=True)
for theme in ['light','dark']:
  parts=[]
  for d in sorted((P/'components').iterdir()):
    f=d/'preview.html'
    if not f.exists(): continue
    body=re.search(r'<body[^>]*>(.*)</body>', f.read_text(), re.S).group(1)
    body=body.replace('/_blob/e709e091bc9741c07bf024790bd68a9a','')
    parts.append(f'<section style="border-bottom:1px solid #888;padding:6px 0"><h4 style="margin:4px 8px;font:600 12px sans-serif;color:#888">{d.name}</h4><iframe-less>{body}</iframe-less></section>')
  html=f'<!doctype html><html data-theme="{theme}"><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet"><style>{css} body{{margin:0;background:#777}} iframe-less{{display:block}}</style></head><body>{"".join(parts)}<script src="../project/components/bundle.js"></script></body></html>'
  (out/f'{theme}.html').write_text(html)
