# Planlet branding

Planlet uses a minimal, Mondrian-inspired mark: a rounded square with sparse red, blue, and yellow blocks and a small checklist motif. The look is calm, adult, and readable at small sizes.

## Logo files

| File | Use |
|------|-----|
| `public/logo.svg` | Source artwork for regeneration |
| `public/icon-192.png` | PWA icon (192×192) |
| `public/icon-512.png` | PWA icon (512×512) |
| `public/icon-512-maskable.png` | PWA maskable icon (safe padding) |
| `public/apple-touch-icon.png` | iOS home screen (180×180) |
| `public/favicon.ico` | Browser favicon |
| `public/oauth-logo.png` | **Google OAuth consent screen upload** (512×512) |

Regenerate raster icons after editing the SVG:

```bash
node scripts/generate-icons.mjs
```

## Google OAuth logo

Upload **`public/oauth-logo.png`** in [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → OAuth consent screen → App logo.

Requirements met by this asset:

- Square (512×512)
- Solid warm off-white background (`#faf9f7`)
- No transparency
- No text
- Readable on a white review background

## Color palette

Day-mode brand colors (used in static icons and the in-app mark):

| Token | Hex | Role |
|-------|-----|------|
| Background | `#faf9f7` | Warm off-white app surface |
| Foreground | `#141210` | Near-black lines and strokes |
| Border | `#e8e4df` | Soft gray edge on icon |
| Accent red | `#d62828` | Mondrian block |
| Accent blue | `#1d4ed8` | Mondrian block |
| Accent yellow | `#e9c46a` | Mondrian block |

Night mode in the app softens accents via CSS variables in `app/globals.css`; static PWA and OAuth assets stay on the day palette for consistency on home screens and Google’s white UI.

## Usage guidelines

- Use the provided PNGs for PWA, favicon, and OAuth — do not stretch or add text inside the icon.
- Keep accent colors sparse; the mark should feel reductive, not playful or childish.
- The in-app React logo (`components/planlet-logo.tsx`) follows the same geometry and uses theme tokens for light/dark UI.
