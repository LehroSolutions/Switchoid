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

## Public source launch preparation — 2026-10-07

This records the initial preparation pass. The launch-blocker resolution below supersedes its dependency and media-distribution findings.

- Retained the existing MIT license (2026 Lehro Solutions) and matching package metadata. Added public contribution/security guidance, issue/PR templates, and a maintainer launch checklist. GitHub actions now use verified commit pins and retain read-only workflow permissions.
- Expanded ignore rules for generated output, Electron profiles, test evidence, signing material, and private marketing assets. Checked 18 ignored paths and 11 intended public source/example paths. No remaining tracked files match the ignore rules.
- `Switchoid.png` is ignored and removed from the Git index; the local reference file is preserved. The earlier commit still contains it. Git history was not rewritten.
- Scanned the one reachable commit's 65 text files for common private-key and token patterns; no matches were found. This is a limited pattern check, not a complete secret/security audit. Existing untracked marketing source was not added or modified.
- Pinned Electron 44.6.0 and replaced the old media ZIP extractor with `@electron-internal/extract-zip` 1.0.5. Added explicit Electron preparation to `postinstall`, required by Electron 44. Frozen installation passed with Node.js 24.11.1 and Bun 1.3.14.
- The maintained extractor unpacked the pinned FFmpeg archive into an isolated cache directory; FFmpeg, FFprobe, license, and build notice hashes match the previous extraction.
- Production build/typechecks, all 35 native conversion assertions, and all 26 development Electron assertions passed after the runtime update. The dashboard screenshot was inspected and preserves the existing layout. Documentation generation, YAML parsing, Markdown links, and whitespace checks passed.
- The packaged ASAR excludes the audited development-tool packages. MIT license text, FFmpeg license/build notices, upstream FFmpeg source archive, and media executables are present in the unpacked package.
- `bun run dist` built the unsigned `release/Switchoid-Setup-0.1.0-x64.exe` (200,562,555 bytes), and a matching `.sha256` file was generated. SHA-256: `ce2f64a4a5a062e5eb641e5c8224cf8c2cf1b30dfb5a6ffc651568a328bc58a7`.
- The rebuilt unpacked executable passed all 28 Electron assertions with PATH restricted to Windows system directories, including bundled FFmpeg/FFprobe discovery and actual media conversion. No uncaught renderer errors were observed.
- The initial dependency audit reported a moderate `sprintf-js` advisory through packaging tooling. This was resolved in the follow-up below.
- The initial FFmpeg package supplied upstream FFmpeg source without complete external-library sources/build tooling. This distribution was replaced in the follow-up below.

Repository visibility, hosted GitHub Actions, branch protection, private vulnerability reporting, release publication, and signing credentials were not changed. These require maintainer actions. Installation/uninstallation of the rebuilt installer has not been repeated in this preparation pass.

## Launch-blocker resolution — 2026-10-07

- Removed the vulnerable packaging dependency chain by pinning `@electron/get` 5.1.0 through an override. A forced frozen installation passed, and the actual `app-builder-lib` resolver loads that version. A real Electron checksum download and cache reuse passed. `bun run audit` reports no advisories; its gate also rejects advisory responses and registry failures. Packaging uses trusted system certificates and completed with the updated downloader.
- Built FFmpeg/FFprobe 8.1.3 for Windows x64 from nine SHA-256-pinned source archives using the digest-pinned Debian image and dated toolchain snapshot. External-library autodetection and networking are disabled; only Windows system DLLs are imported. All configured dependency licenses, MinGW/GCC runtime notices, compiler/configuration evidence, the MIT build-recipe license, and complete source archives are included.
- `bun run media:verify` passed for the engines and their corresponding-source distribution. All seven recipe files and nine original source archives match the checkout/pins. Negative integrity tests reject a changed recipe, altered executable, missing license, and substituted FFmpeg source, including a substitution accompanied by refreshed provenance.
- Production build/typechecks passed. All 41 native conversion assertions passed, including MOV/MKV/AVI stream checks and every advertised audio export format. Fixed Opus export to use its supported 48 kHz sample rate instead of the unsupported 44.1 kHz default; the encoded output is checked with FFprobe.
- Development Electron passed 26 UI assertions. The unpacked executable and the installed copy each passed 28 assertions with PATH restricted to Windows system directories. Real image/video conversion, bundled engine discovery, cancellation, themes, and layout passed without uncaught renderer errors. The packaged ASAR excludes the development download/audit tooling.
- `bun run dist` produced the unsigned `release/Switchoid-Setup-0.1.0-x64.exe` (184,221,963 bytes). SHA-256: `f00895597e5765c070920b367825d0da974fd68052250b3caa2e78ef8015a680`.
- The release also includes `Switchoid-Media-Source-0.1.0.tar.gz` (35,477,345 bytes), provenance JSON, third-party notices, and individual SHA-256 checksums. Source-archive SHA-256: `3dead7c5f911c3050875e2b0b6b2d31f4d8a9a66fb30badb6172bf9bfe647b02`. The packaged resources were verified before these files were emitted.
- `bun run test:installer -AllowExistingInstall` passed installation, executable equality with the unpacked package, installed-app UI/conversions, desktop/Start menu shortcuts, uninstallation, registry cleanup, and preservation of settings/history/presets. Missing profile files receive temporary nonempty fixtures for the preservation check; those fixtures are removed afterward. The current installer was reinstalled, preserving the pre-test installation's presence. Evidence is in ignored `artifacts/installer-verification.json`.
- CI now builds the engines/source distribution on Linux, verifies their integrity and real conversion capabilities on Windows, fails on dependency advisories, tests the unpacked and installed application plus uninstallation, and uploads the installer together with sources/notices/provenance/checksums. It does not publish a release.

The two recorded launch blockers are resolved. The application source and build recipe retain the MIT license; the separate FFmpeg/FFprobe executables retain GPL-3.0-or-later terms. The installer remains unsigned. Hosted GitHub Actions and maintainer-owned repository settings have not been exercised or changed locally. Testing covers this Windows PC and the recorded fixtures; it does not establish behavior for every input codec or Windows installation.
