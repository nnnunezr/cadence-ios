#!/usr/bin/env python3
"""Generate Cadence app/favicon assets from one design — the Cadence mark
(a diamond outline holding three ascending rhythm bars) in brand green on
near-black. Pure stdlib (no Pillow): supersampled render + box downsample with
straight-alpha recovery so edges don't fringe.
"""
import os, struct, zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GREEN = (0x10, 0xB9, 0x81)
BG = (0x0A, 0x0A, 0x0A)
# Mark geometry in a 48-unit space, centred on (24,24)
R_OUT, R_IN = 17.0, 14.0
BARS = [(16, 25, 4, 9), (22, 20, 4, 14), (28, 15, 4, 19)]


def write_png(path, size, rgba):
    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data
                + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)
        raw += rgba[y * stride:(y + 1) * stride]
    idat = zlib.compress(bytes(raw), 9)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
                + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


def render(size, *, with_bg, round_mask=False, frac=0.66, ss=4):
    S = size * ss
    buf = bytearray(S * S * 4)  # transparent
    cx = cy = S / 2.0
    rad = S / 2.0

    if with_bg:
        if round_mask:
            for y in range(S):
                dy = y + 0.5 - cy
                h = rad * rad - dy * dy
                if h <= 0:
                    continue
                w = h ** 0.5
                x0 = max(0, int(cx - w)); x1 = min(S, int(cx + w))
                o = (y * S + x0) * 4
                for _ in range(x1 - x0):
                    buf[o] = BG[0]; buf[o + 1] = BG[1]; buf[o + 2] = BG[2]; buf[o + 3] = 255
                    o += 4
        else:
            buf = bytearray(bytes((BG[0], BG[1], BG[2], 255)) * (S * S))

    # draw the mark (diamond ring + ascending bars) in green
    unit = frac * S / (R_OUT * 2)
    for y in range(S):
        v = (y + 0.5 - cy) / unit + 24.0
        if v < 5 or v > 43:
            continue
        base = y * S * 4
        for x in range(S):
            u = (x + 0.5 - cx) / unit + 24.0
            if u < 5 or u > 43:
                continue
            hit = R_IN <= (abs(u - 24.0) + abs(v - 24.0)) <= R_OUT
            if not hit:
                for bx, by, bw, bh in BARS:
                    if bx <= u <= bx + bw and by <= v <= by + bh:
                        hit = True
                        break
            if hit:
                o = base + x * 4
                buf[o] = GREEN[0]; buf[o + 1] = GREEN[1]; buf[o + 2] = GREEN[2]; buf[o + 3] = 255

    # box-downsample with straight-alpha recovery
    out = bytearray(size * size * 4)
    area = ss * ss
    for oy in range(size):
        for ox in range(size):
            rs = gs = bs = as_ = 0
            for yy in range(ss):
                p = ((oy * ss + yy) * S + ox * ss) * 4
                for xx in range(ss):
                    o = p + xx * 4
                    rs += buf[o]; gs += buf[o + 1]; bs += buf[o + 2]; as_ += buf[o + 3]
            t = (oy * size + ox) * 4
            if as_:
                out[t] = rs * 255 // as_
                out[t + 1] = gs * 255 // as_
                out[t + 2] = bs * 255 // as_
            out[t + 3] = as_ // area
    return out


# ── Android legacy mipmaps ────────────────────────────────────────────────
RES = os.path.join(ROOT, "android/app/src/main/res")
LAUNCHER = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

for dens, sz in LAUNCHER.items():
    ss = 4 if sz <= 96 else 2
    write_png(f"{RES}/mipmap-{dens}/ic_launcher.png", sz, render(sz, with_bg=True, ss=ss))
    write_png(f"{RES}/mipmap-{dens}/ic_launcher_round.png", sz,
              render(sz, with_bg=True, round_mask=True, ss=ss))
for dens, sz in FOREGROUND.items():
    write_png(f"{RES}/mipmap-{dens}/ic_launcher_foreground.png", sz,
              render(sz, with_bg=False, frac=0.42, ss=2))

# ── Web favicons ──────────────────────────────────────────────────────────
PUB = os.path.join(ROOT, "public")
for name, sz in {
    "favicon-16.png": 16, "favicon-32.png": 32, "favicon-48.png": 48,
    "apple-touch-icon.png": 180, "icon-192.png": 192, "icon-512.png": 512,
}.items():
    ss = 4 if sz <= 64 else 2
    write_png(f"{PUB}/{name}", sz, render(sz, with_bg=True, frac=0.7 if sz <= 48 else 0.66, ss=ss))


def png_bytes(size):
    buf = render(size, with_bg=True, frac=0.72, ss=4)
    def chunk(typ, d):
        return (struct.pack(">I", len(d)) + typ + d
                + struct.pack(">I", zlib.crc32(typ + d) & 0xFFFFFFFF))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0); raw += buf[y * stride:(y + 1) * stride]
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


imgs = [(s, png_bytes(s)) for s in (16, 32, 48)]
header = struct.pack("<HHH", 0, 1, len(imgs))
entries = b""
offset = 6 + 16 * len(imgs)
for s, data in imgs:
    w = h = (0 if s >= 256 else s)
    entries += struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(data), offset)
    offset += len(data)
with open(f"{PUB}/favicon.ico", "wb") as f:
    f.write(header + entries + b"".join(d for _, d in imgs))

print("icons generated")
