"""Draws the Android app icon (the cat from the loading artwork) and the splash screen (the logo on the sky colour)
into android/app/src/main/res, at the sizes of the files the Capacitor template made. Run after `npx cap add android`
or when the artwork changes: python scripts/gen-app-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

ART = Image.open('public/assets/loading/eduventure-loading.png').convert('RGBA')
RES = Path('android/app/src/main/res')
SKY = (142, 209, 255, 255)  # #8ed1ff, also the splash background in capacitor.config.json

CAT_WIDE = ART.crop((270, 440, 510, 680))  # the cat with some meadow around: adaptive icons show only the middle
CAT = ART.crop((305, 465, 475, 635))       # the cat's face, for the classic square and round icons
LOGO = ART.crop((520, 0, 1190, 290))


def mask(size, round_):
    m = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(m)
    if round_:
        d.ellipse((0, 0, size - 1, size - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=size // 5, fill=255)
    return m


def icons():
    for folder in sorted(RES.glob('mipmap-*dpi')):
        size = Image.open(folder / 'ic_launcher.png').size[0]
        for name, round_ in (('ic_launcher.png', False), ('ic_launcher_round.png', True)):
            out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            out.paste(CAT.resize((size, size), Image.LANCZOS), (0, 0), mask(size, round_))
            out.save(folder / name)
        fg = Image.open(folder / 'ic_launcher_foreground.png').size[0]
        CAT_WIDE.resize((fg, fg), Image.LANCZOS).save(folder / 'ic_launcher_foreground.png')
    (RES / 'values' / 'ic_launcher_background.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#8ED1FF</color>\n</resources>\n')


def splashes():
    for file in sorted(RES.glob('drawable*/splash.png')):
        w, h = Image.open(file).size
        out = Image.new('RGBA', (w, h), SKY)
        lw = int(min(w, h * 1.6) * 0.7)
        lh = int(lw * LOGO.height / LOGO.width)
        out.alpha_composite(LOGO.resize((lw, lh), Image.LANCZOS), ((w - lw) // 2, (h - lh) // 2))
        out.convert('RGB').save(file)


if __name__ == '__main__':
    icons()
    splashes()
    print('icons and splash screens written')
