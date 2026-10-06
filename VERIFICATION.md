# Switchoid frontend and optimization

The dashboard follows `Switchoid.png`: mountain/lake scene, dark navigation rail, illustrated media tiles, glass conversion cards, luminous upload ring, right-side queue/presets, and gradient conversion action. The background and illustrations were reconstructed with image generation; they are not pixel-identical to the original. Queue entries and recent conversions use real application data, with empty states on a fresh install. The existing supported AVIF format occupies the reference's HEIC slot. The fourth featured preset is a working video export preset rather than the reference's unimplemented image-sequence feature.

## Run

```powershell
bun run build
bun start
```

## Changes

- Narrow Zustand subscriptions isolate the dashboard from queue progress updates. Completed queue rows are memoized.
- Secondary views load on demand. Explicit production minification reduces the main renderer JavaScript from 748.44 KB to 284.33 KB (62%). This measures bundle size, not encoding speed.
- The two runtime WebP assets total 597,898 bytes. Original PNGs and generation prompts are retained in `src/renderer/src/assets/`.
- Replaced perpetual background/ring animations with static artwork and CSS borders. Only active conversion indicators animate; reduced-motion preferences are honored.
- Telemetry updates once per 2.5 seconds, never during render, without overlapping requests, and pauses while the document is hidden.
- File metadata/probe work uses four workers, deduplicates input paths, uses asynchronous filesystem stats, and times out probing after 15 seconds.
- Preview decoding is limited to 320 pixels. Main-process caching coalesces duplicate reads and invalidates by file size/modification time. Both preview caches are limited to 104 entries.
- Encoding progress notifications are throttled; FFmpeg stderr retains only the last 64 KB.
- Queued jobs can be canceled before encoding starts. Pre-aborted FFmpeg requests do not spawn a process.
- Advanced controls use the current per-tool settings. Changing a format activates the relevant tool, and settings-originated theme changes apply immediately.
- Repaired the existing BMP export option with a 24-bit BMP writer; Sharp does not expose a BMP encoder.

## Verification

- `bun run build`: TypeScript checks and production Electron build pass.
- `bun run test`: real Sharp/FFmpeg tests cover images, video, audio, GIF, cancellation, metadata, output collision avoidance, BMP decoding, preview invalidation, and worker bounds. Fixtures are generated locally if absent.
- `bun run test:ui`: 24 Playwright/Electron assertions passed with an isolated temporary user-data directory. Covers 1536×1024 layout without vertical scrolling; 1280×800 and 1120×700 layouts without horizontal overflow; dark/light modes; preset application; advanced option synchronization; picker deduplication; real JPEG export to a chosen output folder; actual history thumbnails; clear queue; all secondary views; reduced motion; and queued cancellation. No renderer exceptions were observed.
- Idle telemetry after the test run: 1% CPU, 497 MB across four Electron processes. This is a single-machine observation, not a before/after benchmark or a guaranteed resource budget.

The UI test uses the pinned Playwright development dependency, or an optional module path supplied in `PLAYWRIGHT_PATH`. Run the production build before the UI test, and do not rebuild while the test is running because it loads code-split assets from `out/`.

Screenshots and structured UI results are in `artifacts/`. Native OS drag-and-drop gestures and every possible input codec were not tested. Large batches can still consume substantial native encoder memory; the changes do not claim faster codec execution or GPU acceleration.

## Windows branding and packaging — 2026-10-06

- The supplied Lehro SVG is retained byte-for-byte in `build/brand-source.svg` and the renderer favicon. SHA-256: `3f6049a909fbb1146525790ab3aa7eeac1a464e20c49dc84aaa0d07b180ba645`.
- `bun run icons` produces a seven-size Windows ICO, 512px window icon, and PNG fallback favicon. The icon extracted from the packaged executable was visually checked against the source.
- Locked dependency installation, production build/typechecks, and all 35 native media assertions passed.
- Development Electron passed 26 UI assertions, including the SVG favicon and native icon asset.
- The unpacked Windows executable passed 28 assertions with PATH restricted to Windows system directories. Bundled FFmpeg/FFprobe discovery, real JPEG conversion, video encoding, cancellation, and the renderer views all passed. No uncaught renderer errors were observed.
- `bun run dist` produced `release/Switchoid-Setup-0.1.0-x64.exe` (182,195,989 bytes). SHA-256: `5946cce80d0d4f7768fbe5d6c15a41db3df97db087097f2af87980152fc67a2e`.
- The per-user installer completed with exit code 0 on this Windows PC. The installed executable, desktop shortcut, Start menu shortcut, and Windows uninstall entry were verified.
- The installed copy also passed all 28 Electron assertions with system FFmpeg removed from PATH. Tests used an isolated temporary profile and did not populate the user's conversion history.
- The installer is unsigned. A signing certificate was not provided; Windows publisher verification is therefore not available.

The GitHub Windows workflow repeats dependency/build/native/UI checks, tests the packaged executable without system FFmpeg, and uploads the installer with a SHA-256 checksum. Installer hashes can differ between builds; each workflow creates its own checksum. Source and generated assets are committed; installers, native media binaries, caches, and local test outputs remain ignored.
