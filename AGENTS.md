# Project instructions

Switchoid is a local-first Electron application for Windows x64. Use Bun 1.3.14 and Node.js 24. Install dependencies with `bun install --frozen-lockfile`.

- Renderer: React, TypeScript, Tailwind CSS 4, Zustand in `src/renderer/`.
- Main process: native Sharp image conversion and FFmpeg/FFprobe child processes in `src/main/`.
- Shared contracts and channel names: `src/shared/`; preload bridge: `src/preload/`.
- Keep filesystem and process execution in the main process. Keep context isolation enabled and Node integration disabled.
- Preserve the supplied reference layout and use real queue/history data. Respect light/dark themes and reduced motion.
- Preserve `build/brand-source.svg`; reproduce Windows icons with `bun run icons`.
- Prepare pinned bundled engines with `bun run media:prepare` before packaging. Keep binaries, caches, local data, secrets, and installers out of source control.
- Validate changes with `bun run build` and `bun run test`. For renderer or packaging changes, run `bun run test:ui` after the build has finished. Set `SWITCHOID_EXECUTABLE` to test a packaged executable.
- Build the Windows installer with `bun run dist`. Do not publish a release or change signing credentials unless requested.

Apply the installed agent-context-engineering protocol when available, loading only task-relevant references. User requests and higher-priority instructions remain authoritative. Report material unverified behavior.
