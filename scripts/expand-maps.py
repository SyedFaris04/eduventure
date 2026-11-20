"""
Grows every island map by 16 rows and 16 columns (Greenhaven 36 -> 52, the islands 44 -> 60): about twice the area.
Run once; the map files stay hand-editable afterwards.

The old map keeps its layout in the south-west (moved down 16 rows), so the jetty stays on the south shore. New land to
the north and east gets: a forest of harvestable trees (t), a rocky slope with rock nodes (o) and a few crystal rocks
(c), an herb meadow (v), new monster zones, and a camp clearing with a workbench (k) and camp build spots
(n bench, l lantern, a flag, z whiteboard). Paths are cut through the old border trees, and a reachability pass removes
any node that cannot be walked up to from the spawn.

    python scripts/expand-maps.py
"""
import random
import re
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAPS = ['greenhaven', 'science_island', 'mathematics_mountains', 'technology_city', 'language_kingdom']
GROW = 16
NAMES = {
    'greenhaven': 'Greenhaven', 'science_island': 'Sains', 'mathematics_mountains': 'Matematik',
    'technology_city': 'Teknologi', 'language_kingdom': 'Bahasa',
}
NEW_LEGEND = [
    ('t', "{ tile: '%s', prop: 'harvest_tree', blocks: true }", 'harvest tree (wood)'),
    ('o', "{ tile: '%s', prop: 'harvest_rock', blocks: true }", 'rock node (stone)'),
    ('c', "{ tile: '%s', prop: 'crystal', blocks: true }", 'crystal rock (needs a pickaxe)'),
    ('v', "{ tile: '%s', prop: 'herb', blocks: true }", 'herb bush'),
    ('k', "{ tile: '%s', prop: 'workbench', blocks: true }", 'camp workbench'),
    ('n', "{ tile: '%s', prop: 'camp_bench' }", 'camp build spot: bench (drawn once built)'),
    ('l', "{ tile: '%s', prop: 'camp_lantern' }", 'camp build spot: lantern'),
    ('a', "{ tile: '%s', prop: 'camp_flag' }", 'camp build spot: flag'),
    ('z', "{ tile: '%s', prop: 'whiteboard' }", 'camp build spot: whiteboard stand'),
]
NL = chr(10)


def parse(src):
    rows = re.findall(r"^\s*'([^']{30,})',?\s*$", src, re.M)
    legend = {}
    for m in re.finditer(r"^\s*(?:'(.)'|(\w)):\s*\{([^}]*)\}", src, re.M):
        legend[m.group(1) or m.group(2)] = m.group(3)
    return rows, legend


def tile_of(body):
    return re.search(r"tile: '(\w+)'", body).group(1)


def expand(name):
    path = ROOT / 'src' / 'game' / 'maps' / f'{name}.ts'
    src = path.read_text(encoding='utf8')
    rows, legend = parse(src)
    old = len(rows)
    W = old + GROW
    assert all(len(r) == old for r in rows), f'{name}: rows must be {old} wide'
    cx = W // 2
    fx = int(W * 0.33)  # forest east edge
    rx = int(W * 0.66)  # rocky slope west edge
    rng = random.Random(name)
    walkable = {ch for ch, body in legend.items() if 'blocks: true' not in body and 'water' not in body}
    plain = [ch for ch, body in legend.items() if ch in walkable and re.fullmatch(r"\s*tile: '\w+'\s*", body)]
    base = max(plain, key=lambda ch: sum(r.count(ch) for r in rows))
    path_ch = next((ch for ch in plain if tile_of(legend[ch]) == 'path'), base)
    flower = ',' if ',' in plain else base
    zones = sorted(ch for ch, body in legend.items() if 'zone:' in body)
    base_tile = tile_of(legend[base])
    border = max(set(rows[0]), key=rows[0].count)  # each map's own border scenery (T is a teacher on some maps)

    g = [[base] * W for _ in range(W)]
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            g[y + GROW][x] = ch
    # Borders of the new land; the south-east keeps the sea so the coast stays continuous.
    for x in range(W):
        g[0][x] = border
    for y in range(W - 5):
        g[y][W - 1] = border
    for y in range(GROW):
        g[y][0] = border
    for y in range(W - 5, W):
        for x in range(old, W):
            g[y][x] = '~'
    for x in range(old, W):
        g[W - 6][x] = border

    def fill(x0, y0, x1, y1, ch, p):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if g[y][x] == base and rng.random() < p:
                    g[y][x] = ch

    fill(1, 1, W - 2, 15, flower, 0.04)
    fill(old, GROW, W - 2, W - 7, flower, 0.04)
    fill(2, 2, fx, 13, 't', 0.3)  # forest
    fill(rx, 2, W - 3, 13, 'o', 0.16)  # rocky slope
    for _ in range(4):  # a few crystal rocks among the stones
        g[rng.randint(3, 12)][rng.randint(rx + 1, W - 4)] = 'c'
    fill(old + 2, GROW + 2, W - 3, GROW + 14, 'v', 0.13)  # herb meadow
    # New monster zones: the forest's east edge and the east meadow's south.
    for (x0, y0, x1, y1), zone in zip([(fx - 6, 9, fx, 13), (old + 2, W - 17, W - 3, W - 8)], (zones + [None, None])[:2]):
        if zone:
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1):
                    g[y][x] = zone
    # The camp: a clearing with the workbench and four build spots.
    for y in range(3, 12):
        for x in range(cx - 6, cx + 6):
            g[y][x] = base
    for x in range(cx - 6, cx + 6):
        g[11][x] = path_ch
    for ch, (x, y) in {'k': (cx - 1, 6), 'n': (cx - 4, 8), 'l': (cx + 3, 8), 'a': (cx - 1, 4), 'z': (cx, 9)}.items():
        g[y][x] = ch

    # Paths: from the camp down into the old map, and from the old map east into the new land.
    def free_column(xs):
        return min(xs, key=lambda x: (0 if all(rows[r][x] in walkable for r in (1, 2)) else 1, abs(x - cx)))

    xn = free_column(range(4, old - 4))
    for x in range(min(xn, cx), max(xn, cx) + 1):
        g[12][x] = path_ch
    y = 12
    while y < W and not (y > GROW and g[y][xn] in walkable):
        g[y][xn] = path_ch
        y += 1
    ye = min(range(6, old - 8), key=lambda r: (0 if rows[r][old - 2] in walkable else 1, abs(r - old // 2)))
    for x in range(old - 2, old + 6):
        if g[ye + GROW][x] not in walkable or x >= old - 1:
            g[ye + GROW][x] = path_ch

    # Reachability: drop any node that cannot be walked up to from the spawn.
    spawn = next((x, y) for y in range(W) for x in range(W) if 'spawn' in legend.get(g[y][x], ''))

    def walk(ch):
        return ch in walkable or ch in 'nlaz'

    seen = {spawn}
    q = deque([spawn])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < W and (nx, ny) not in seen and walk(g[ny][nx]):
                seen.add((nx, ny))
                q.append((nx, ny))
    for y in range(W):
        for x in range(W):
            if g[y][x] in 'tocv' and not any((x + dx, y + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                g[y][x] = base
    assert any((cx - 1 + dx, 6 + dy) in seen for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))), f'{name}: workbench unreachable'

    new_rows = [''.join(r) for r in g]

    # Rewrite the file: legend additions, rows, areas moved down, more monsters, new areas, size in the header.
    legend_add = ''.join(f"    {ch}: {body % base_tile}, // {note}{NL}" for ch, body, note in NEW_LEGEND)
    src = src.replace('  legend: {' + NL, '  legend: {' + NL + legend_add, 1)
    src = re.sub(r"rows: \[\n(?:\s*'[^']*',?\n)+\s*\]", lambda m: 'rows: [' + NL + ''.join(f"    '{r}',{NL}" for r in new_rows) + '  ]', src, count=1)
    src = re.sub(r"y0: (\d+), x1: (\d+), y1: (\d+)", lambda m: f"y0: {int(m.group(1)) + GROW}, x1: {m.group(2)}, y1: {int(m.group(3)) + GROW}", src)
    label = NAMES[name]
    new_areas = (
        f"    {{ name: 'Kem {label}', x0: {cx - 6}, y0: 3, x1: {cx + 5}, y1: 11 }},{NL}"
        f"    {{ name: 'Hutan {label}', x0: 1, y0: 1, x1: {fx + 1}, y1: 15 }},{NL}"
        f"    {{ name: 'Lereng Batu', x0: {rx - 1}, y0: 1, x1: {W - 2}, y1: 15 }},{NL}"
        f"    {{ name: 'Padang Herba', x0: {old + 1}, y0: {GROW}, x1: {W - 2}, y1: {W - 7} }},{NL}"
    )
    src = src.replace('  areas: [' + NL, '  areas: [' + NL + new_areas, 1)
    src = re.sub(r"monsters: \{([^}]*)\}", lambda m: 'monsters: {' + re.sub(r"(\w+): (\d+)", lambda n: f"{n.group(1)}: {-(-int(n.group(2)) * 3 // 2)}", m.group(1)) + '}', src, count=1)
    src = src.replace(f'{old} × {old}', f'{W} × {W}')
    path.write_text(src, encoding='utf8', newline=NL)
    counts = {ch: sum(r.count(ch) for r in new_rows) for ch in 'tocvk'}
    print(name, f'{old}->{W}', 'base', repr(base), 'path', repr(path_ch), counts)


for m in MAPS:
    expand(m)
