# Third-party notices

Switchoid's application source is distributed under the MIT license in `LICENSE`. Dependencies retain their own licenses. The supplied Lehro logo is a Lehro Solutions brand asset; the application license does not grant trademark rights.

## FFmpeg and FFprobe

Windows packages include unmodified, separate FFmpeg and FFprobe executables from Gyan Doshi's FFmpeg **8.1.1 essentials** Windows x64 build. Switchoid invokes these programs as child processes.

- Provider: https://www.gyan.dev/ffmpeg/builds/
- Pinned binary distribution: https://github.com/GyanD/codexffmpeg/releases/tag/8.1.1
- Upstream source: https://github.com/FFmpeg/FFmpeg/commit/239f2c733de417201d7ad3b3b8b0d9b63285b2b1
- Provider's license: **GPL version 3**. The provider's complete license text and build configuration are installed under `resources/licenses/ffmpeg/` together with the matching FFmpeg source archive and a provenance manifest. External codec libraries included by that build retain their respective licenses; see its build configuration and the provider's library list.
- FFmpeg licensing information: https://www.ffmpeg.org/legal.html

## Application runtime and image processing

- Electron: MIT; Chromium and bundled components retain their notices in the installed Electron distribution's license files. https://github.com/electron/electron
- Sharp: Apache-2.0. Its libvips and codec dependencies retain their licenses included with the packaged `@img` dependencies. https://github.com/lovell/sharp
- React: MIT. https://github.com/facebook/react
- Zustand: MIT. https://github.com/pmndrs/zustand
- Lucide icons: ISC. https://github.com/lucide-icons/lucide

The generated landscape and media illustrations are recorded in `src/renderer/src/assets/README.md`. The original supplied SVG is retained unchanged as `build/brand-source.svg`.
