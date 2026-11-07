# Slant

**Time cut through louvers.**

An architectural watchface for Pebble Time 2 (Emery) and Pebble Round 2 (Gabbro). Horizontal slats cover the face; the time is punched through as cut light. Glow sits behind the material.

## Features

- Minute-tick display (negligible battery impact by design)
- Presets: Gallery Aluminum, Mid-century Oak, Night Blackout, Paper White, plus custom colors
- Slat density: fine / medium / bold
- Layouts: stacked HH/MM, side-by-side, corner editorial
- Accent strip: date / weekday / battery / steps
- Optional day-cycle glow
- Wrist flick briefly opens the louvers
- Low-power mode at ≤15% (bolder slats, stacked time only)

## Store assets

- Screenshots (exact display sizes, unframed): [`screenshots/emery/`](screenshots/emery/) (200×228) and [`screenshots/gabbro/`](screenshots/gabbro/) (260×260)
- Listing copy: [`store/description.txt`](store/description.txt) · [`store/short-description.txt`](store/short-description.txt)
- Regenerate: `python scripts/generate_store_screenshots.py`

## CloudPebble

Import zip: upload [`dist/slant-cloudpebble.zip`](dist/slant-cloudpebble.zip) via **Import → Upload Zip** on [CloudPebble](https://cloudpebble.repebble.com/).

Or import from GitHub:
`https://cloudpebble.repebble.com/ide/import/github/TechJeeper/slant`

App Kind should be Watchface (JavaScript SDK / Alloy).

## Build

Requires the Pebble SDK with Alloy support.

```bash
npm install
pebble build
pebble install --emulator emery
pebble emu-app-config
```

Round 2:

```bash
pebble install --emulator gabbro
```

## Battery notes

- Default tick is `minutechange` only
- No continuous animation; flick open lasts ~2s then settles
- Steps read only when the accent strip shows steps
- Partial-friendly full redraw once per minute

## License

MIT
