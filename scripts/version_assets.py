#!/usr/bin/env python3
"""Version local CSS/JS URLs in published HTML; source files stay untouched."""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'version.json').read_text(encoding='utf-8'))['version']
if not re.fullmatch(r'Beta [0-9]+(?:\.[0-9]+)*', version):
    raise SystemExit('Invalid version.json version')
sha = os.environ.get('GITHUB_SHA', 'local')[:12]
token = version.replace(' ', '-') + '-' + sha
pattern = re.compile(r'(?P<before>\b(?:src|href)\s*=\s*["\'])(?P<url>[^"\']+)(?P<after>["\'])', re.I)
count = 0
for html in root.rglob('*.html'):
    if '.git' in html.parts:
        continue
    def replace(match):
        global count
        url = match.group('url')
        if url.startswith(('http:', 'https:', '//', 'data:', '#', '/')):
            return match.group(0)
        parts = urlsplit(url)
        if not parts.path.lower().endswith(('.js', '.css')):
            return match.group(0)
        if not (html.parent / parts.path).is_file():
            return match.group(0)
        params = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k != 'v']
        params.append(('v', token))
        count += 1
        new_url = urlunsplit(('', '', parts.path, urlencode(params), parts.fragment))
        return match.group('before') + new_url + match.group('after')
    html.write_text(pattern.sub(replace, html.read_text(encoding='utf-8')), encoding='utf-8')
print(f'Updated {count} CSS/JS references for {token}')
