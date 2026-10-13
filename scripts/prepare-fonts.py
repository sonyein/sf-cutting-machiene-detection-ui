"""Mirror the official Pretendard v1.3.9 dynamic subsets; font binaries remain unmodified."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re
import urllib.request
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
css = urllib.request.urlopen(BASE, timeout=30).read().decode("utf-8")
sources = list(dict.fromkeys(re.findall(r"url\(([^)]+)\)", css)))
assert 0 < len(sources) < 100
target = ROOT / "public/fonts/subset"
target.mkdir(parents=True, exist_ok=True)

def download(source):
    name = source.rsplit("/", 1)[-1]
    assert re.fullmatch(r"PretendardVariable\.subset\.\d+\.woff2", name)
    path = target / name
    if not path.exists():
        data = urllib.request.urlopen(urljoin(BASE, source), timeout=30).read()
        assert data[:4] == b"wOF2"
        path.write_bytes(data)
    assert path.read_bytes()[:4] == b"wOF2"
    return source, name, path.stat().st_size

with ThreadPoolExecutor(max_workers=6) as pool:
    results = list(pool.map(download, sources))
for source, name, _ in results:
    css = css.replace(f"url({source})", f"url('./subset/{name}')")
css = css.replace("'Pretendard Variable'", "'Pretendard'")
(ROOT / "public/fonts/pretendard.css").write_text(css, encoding="utf-8")
print(f"Prepared {len(results)} official font subsets; total {sum(size for _, _, size in results)} bytes")
