# Switchoid media engine source distribution

This directory contains Switchoid's MIT-licensed build recipe. Source archives under `archives/` retain the licenses recorded in `sources.lock.json`; the resulting FFmpeg/FFprobe executables are GPL-3.0-or-later. The application invokes these separate programs as child processes.

The corresponding-source archive contains every configured third-party library's complete source archive, this recipe, the exact configure command, generated configuration evidence, compiler/package versions, and Windows DLL import lists. No binary codec dependencies are fetched during compilation. The build disables autodetection, non-configured external codecs, and networking; H.264, VP8/VP9, AV1 decoding, MP3, Vorbis, Opus, and built-in FFmpeg codecs/filters remain available for local conversion.

## Rebuild the Windows x64 executables

Install Docker with Linux-container support (Docker Desktop on Windows), Node.js 24, and Bun 1.3.14. From the Switchoid source checkout:

```powershell
bun install --frozen-lockfile
bun run media:prepare
```

The preparation script verifies every archive against the pinned SHA-256 before running the recipe in a digest-pinned Debian image. Debian toolchain packages come from the dated snapshot recorded in the Dockerfile. The first build needs network access for those packages and source archives. Subsequent builds reuse Docker layers and locally verified engine artifacts. Installed conversion needs neither Docker nor network access.

To rebuild from this source distribution without the application checkout, extract `FFmpeg-corresponding-source.tar.gz` into a directory and run:

```sh
docker build --file recipe/Dockerfile --target export --output type=local,dest=./output .
```

The export contains `bin/ffmpeg.exe`, `bin/ffprobe.exe`, license notices, build evidence, and this source distribution. Build concurrency defaults to four; set the Docker build argument `BUILD_JOBS` to change it. FFmpeg source and codec archive hashes must match the lock file; failures stop the build.

The executables import only Windows system DLLs. Compiler runtime code is linked statically where needed; MinGW-w64 and GCC runtime notices and the toolchain versions are included. No separate codec DLL is required. The compiler itself is not distributed.
