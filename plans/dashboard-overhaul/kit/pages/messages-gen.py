#!/usr/bin/env python3
"""Regenerates messages.html and messages-overlay.html from messages.src.html and messages-info.part.html.
The details panel is one piece of markup used twice: as the third column on wide screens and inside the
slide over / bottom sheet below that. Run `python3 pages/messages-gen.py` after editing either source."""
from pathlib import Path
H = Path(__file__).parent
info = (H / 'messages-info.part.html').read_text()
(H / 'messages.html').write_text((H / 'messages.src.html').read_text().replace('%%INFO%%', info))
ov = ('<sc-if value="{{ovOn}}" hint-placeholder-val="{{ false }}">\n'
      '      <div class="mxScrim" onClick="{{inf.close}}"></div>\n'
      '      <aside class="mxOv {{ovCls}}" id="mxOv" role="dialog" aria-modal="true" aria-label="Conversation details" tabindex="-1" onKeyDown="{{ovKey}}">\n'
      '        <span class="mxGrab" aria-hidden="true"></span>\n' + info +
      '      </aside>\n    </sc-if>\n')
(H / 'messages-overlay.html').write_text(ov)
print('ok')
