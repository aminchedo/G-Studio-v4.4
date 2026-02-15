# Application Icons

This directory contains the application icons for Gemini API Explorer.

## Generated Icons

- **icon.svg** - Source SVG file (high-quality vector)
- **icon.png** - 512x512 PNG (Linux/General use)
- **icon.ico** - Windows icon (multi-size: 16, 32, 48, 64, 128, 256)
- **icon.iconset/** - macOS icon set (ready for ICNS conversion)

## Icon Design

The icon features:
- Google Gemini-inspired design with gradient colors
- Star/sparkle pattern representing AI intelligence
- Modern, professional appearance
- High-quality vector graphics

## Creating macOS ICNS

To create the `.icns` file for macOS:

### Option 1: On macOS
```bash
iconutil -c icns assets/icon.iconset -o assets/icon.icns
```

### Option 2: Online Converter
1. Zip the `icon.iconset` folder
2. Upload to: https://cloudconvert.com/png-to-icns
3. Download the resulting `icon.icns` file
4. Place it in the `assets/` directory

### Option 3: Using electron-icon-maker
```bash
npm install -g electron-icon-maker
electron-icon-maker --input=./assets/icon.png --output=./assets
```

## Regenerating Icons

To regenerate all icons from the SVG source:

```bash
npm run create-icons
```

This will:
1. Generate PNG files in various sizes
2. Create Windows ICO file
3. Prepare macOS iconset directory

## Icon Usage

The icons are automatically used by:
- **Electron main process**: `electron/main.cjs` (references `assets/icon.png`)
- **Electron Builder**: `package.json` build config (references `assets/icon.ico`, `assets/icon.icns`, `assets/icon.png`)
