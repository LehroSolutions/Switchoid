# Third-party notices

Switchoid's application source is distributed under the MIT license in `LICENSE`. Dependencies retain their own licenses. The supplied Lehro logo is a Lehro Solutions brand asset; the application license does not grant trademark rights.

## FFmpeg and FFprobe

Windows packages include separate FFmpeg and FFprobe **8.1.3** Windows x64 executables compiled from the pinned sources and build recipe in `scripts/media/`. Switchoid invokes these programs as child processes; its application source retains the MIT license.

- Upstream FFmpeg source: https://ffmpeg.org/releases/ffmpeg-8.1.3.tar.xz
- Executable license: **GPL-3.0-or-later**. License text, build configuration, dependency notices, source lock, provenance, and the corresponding-source archive are installed under `resources/licenses/ffmpeg/`. A copy of the source archive and provenance is also emitted beside each installer.
- FFmpeg licensing information: https://www.ffmpeg.org/legal.html

`FFmpeg-corresponding-source.tar.gz` includes all nine source inputs and the complete build recipe/instructions, exact configure command, generated configuration, toolchain versions, and Windows DLL import lists. Source/resource verification fails if an archive is missing, differs from its pinned SHA-256, or does not match the current recipe. The recipe disables external-library autodetection and nonfree components.

| Component | Pinned version / revision | License |
| --- | --- | --- |
| FFmpeg / FFprobe | 8.1.3 | GPL-3.0-or-later in this build |
| x264 | 0480cb05fa188d37ae87e8f4fd8f1aea3711f7ee | GPL-2.0-or-later |
| zlib | 1.3.2 | Zlib |
| libogg | 1.3.6 | BSD-3-Clause |
| libvorbis | 1.3.7 | BSD-3-Clause |
| Opus | 1.6.1 | BSD-3-Clause |
| libvpx | 1.17.0 | BSD-3-Clause and its accompanying patent grant |
| LAME | 3.100 | LGPL-2.0-or-later |
| dav1d | 1.5.4 | BSD-2-Clause |

Exact source URLs and hashes are in `scripts/media/sources.lock.json`, also included in the installed notices and corresponding-source archive. Each library's original license/patent notices are retained. MinGW-w64 and GCC runtime notices are included for the toolchain/runtime components; imports are limited to Windows system DLLs. Rebuild instructions are in `SOURCE-README.md` inside the installed notice directory and `recipe/README.md` in the source archive.

## Application runtime and image processing

- Electron: MIT; Chromium and bundled components retain their notices in the installed Electron distribution's license files. https://github.com/electron/electron
- Sharp: Apache-2.0. Its libvips and codec dependencies retain their licenses included with the packaged `@img` dependencies. https://github.com/lovell/sharp
- React: MIT. https://github.com/facebook/react
- Zustand: MIT. https://github.com/pmndrs/zustand
- Lucide icons: ISC. https://github.com/lucide-icons/lucide

Electron runtime installation uses `@electron-internal/extract-zip` (BSD-2-Clause), maintained by the Electron project: https://github.com/electron/extract-zip. It is a development tool dependency, not an application runtime dependency. Packaging downloads use `@electron/get` (MIT): https://github.com/electron/get.

The generated landscape and media illustrations are recorded in `src/renderer/src/assets/README.md`. The original supplied SVG is retained unchanged as `build/brand-source.svg`.
