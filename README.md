# Switchoid

**Convert anything. Anywhere.** A local-first Windows Electron app for images, videos, audio, and GIFs by [Lehro Solutions](https://github.com/LehroSolutions).

![Switchoid dashboard](docs/images/dashboard.png)

## Install on Windows

Windows 10/11, x64. Run `Switchoid-Setup-0.1.0-x64.exe` and follow the setup wizard. The per-user installer creates desktop and Start menu shortcuts and includes FFmpeg, FFprobe, and Sharp; no Node.js, Bun, or separate codecs are needed to use the installed app.

Installers built by GitHub Actions are available as **Switchoid-Windows-x64** artifacts on successful runs of the [Windows build workflow](https://github.com/LehroSolutions/Switchoid/actions/workflows/windows.yml). Artifact downloads require repository access. This initial build is unsigned, so Windows may show an unknown-publisher prompt.

To uninstall, use Windows **Settings → Apps → Installed apps → Switchoid**. Existing settings and conversion history are preserved. Original media files are never removed by the installer or uninstaller.

## Features

- Image conversion: JPG, PNG, WebP, BMP, TIFF, and AVIF, with resize, quality, crop, rotation, and metadata controls.
- Video conversion: MP4, MOV, MKV, AVI, WebM, and GIF, with resolution, frame rate, trimming, and audio options.
- Audio conversion: MP3, WAV, FLAC, AAC, OGG, Opus, and M4A, with bitrate, normalization, fades, and trimming.
- Drag-and-drop/file picker, parallel conversions, queued/running cancellation, presets, and conversion history.
- Dark/light/system appearance, reduced motion, and a dashboard inspired by the supplied design reference.
- Processing stays on your device. The app does not upload your media.

The exact set of readable inputs depends on the included decoder libraries. HEIC export and video-to-image-sequence export are not implemented. See [verification notes](VERIFICATION.md) for tested behavior and current limits.

## Develop

Prerequisites: Windows x64, [Node.js 24](https://nodejs.org/), [Bun 1.3.14](https://bun.sh/).

```powershell
git clone https://github.com/LehroSolutions/Switchoid.git
cd Switchoid
bun install --frozen-lockfile
bun run media:prepare
bun run dev
```

`media:prepare` downloads the pinned FFmpeg 8.1.1 essentials distribution, verifies its SHA-256, and prepares the executables, license/build notices, and matching FFmpeg source archive. Build-time downloads are cached in `.cache/`; installed conversion works offline.

```powershell
bun run build       # Regenerate icons, typecheck, and build Electron
bun start           # Run the production build
bun run test        # Native Sharp/FFmpeg conversion tests
bun run test:ui     # Playwright against real Electron
bun run docs:build  # Generate the local documentation site
bun run package    # Build an unpacked Windows app
bun run dist       # Build the Windows NSIS installer
```

Finish the production build before running UI tests; rebuilding during a test can remove its loaded assets. Tests use isolated temporary user-data/output folders.

To test a packaged or installed executable:

```powershell
$env:SWITCHOID_EXECUTABLE = (Resolve-Path 'release\win-unpacked\Switchoid.exe').Path
bun run test:ui
Remove-Item Env:\SWITCHOID_EXECUTABLE
```

## Project layout

| Path | Responsibility |
| --- | --- |
| `src/main/` | Local engines, queue, persistence, Electron window and IPC |
| `src/preload/` | Typed bridge with context isolation |
| `src/renderer/` | React dashboard, views, styling, artwork, favicons |
| `src/shared/` | Types, media defaults, and IPC channel names |
| `build/brand-source.svg` | Original supplied Lehro logo |
| `scripts/prepare-icons.mjs` | Reproduce Windows ICO/PNG and SVG favicon |
| `scripts/prepare-media.mjs` | Prepare pinned bundled media engines |
| `.github/workflows/windows.yml` | Build, native/UI tests, Windows installer artifact |

Source, artwork, and icon assets are versioned. `node_modules/`, build output, installers, native media binaries, local test results, and caches are ignored. Runtime settings, presets, and history are stored under Electron's per-user data directory; outputs default to `Downloads/Switchoid` unless another folder is chosen.

## License

Switchoid's source uses the [MIT license](LICENSE). Bundled dependencies retain their own licenses, including GPLv3 for the separate FFmpeg/FFprobe executables. See [third-party notices](THIRD_PARTY_NOTICES.md). Lehro Solutions branding retains its trademark identity.
