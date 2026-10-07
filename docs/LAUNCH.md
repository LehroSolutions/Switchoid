# Public launch checklist

Switchoid's application source is MIT licensed, with Lehro Solutions' copyright recorded in the root `LICENSE`. `package.json` uses the same license. `private: true` prevents accidental npm publication; it does not restrict making the Git repository public.

## Before changing visibility

- Review `git status --short`, the files being committed, and all branches/tags that will be public. Ignore rules do not remove files from Git history. Rotate any credential ever committed before exposing that history.
- Keep media engines, their downloaded source archives, installers, caches, test output, Electron profiles, signing keys, and private marketing media out of Git. Keep `bun.lock`, the source SVG, generated application icons, and public documentation screenshots versioned.
- Review marketing source/docs separately; generated assets include privately supplied music and are ignored. Permission to use music in a film does not by itself establish permission to publish the music as MIT-licensed source.
- Confirm permission to distribute the supplied reference artwork and brand assets. MIT licensing does not grant trademark rights; provenance is recorded in `src/renderer/src/assets/README.md` and `THIRD_PARTY_NOTICES.md`.
- Run the commands below and review the results for the exact commit being launched.

```powershell
bun install --frozen-lockfile
bun run media:prepare
bun run media:verify
bun run test:media
bun run audit
bun run build
bun run test
bun run test:ui
bun run dist
$env:SWITCHOID_EXECUTABLE = (Resolve-Path 'release\win-unpacked\Switchoid.exe').Path
bun run test:ui
Remove-Item Env:\SWITCHOID_EXECUTABLE
bun run test:installer
Get-FileHash -LiteralPath 'release\Switchoid-Setup-0.1.0-x64.exe' -Algorithm SHA256
```

Finish each build before starting UI tests. Review `VERIFICATION.md` for limitations. The GitHub workflow builds and tests an unsigned installer and uploads it with a checksum; it does not publish a release.

## Dependency audit — 2026-10-07

Electron is pinned to 44.6.0. The packaging downloader is pinned through the `@electron/get` 5.1.0 override, which removes the old `global-agent` → `roarr` → `sprintf-js` dependency chain. The replacement's download and cache APIs are exercised by packaging verification.

`bun run audit` checks the locked dependency graph and fails on any returned advisory or network/registry error. It does not suppress or ignore advisories. The release build and Windows CI invoke this gate before packaging. Recheck it for each release.

Run audits with normal TLS verification. On systems where Bun cannot use the enterprise CA store, configure a trusted CA bundle through `NODE_EXTRA_CA_CERTS`; do not disable certificate verification to get a passing audit.

## GitHub settings owned by the maintainer

- Change repository visibility when ready.
- Enable [private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository) so the link in `SECURITY.md` works, and enable available secret scanning, push protection, and dependency alerts.
- Protect `main` with pull-request review and the `windows` verification check once the workflow has run. Keep workflow token permissions read-only and review changes to CI scripts before running them with secrets.
- Confirm the first hosted Windows workflow succeeds. Local verification does not confirm GitHub runner behavior or repository settings.

## Before distributing an installer

The MIT application license does not replace bundled dependency licenses. Switchoid builds its own separate GPL-3.0-or-later FFmpeg 8.1.3 / FFprobe executables from the recipe in `scripts/media/`, with all source inputs pinned by SHA-256. See [FFmpeg's licensing guidance](https://www.ffmpeg.org/legal.html) and `THIRD_PARTY_NOTICES.md`.

`media:prepare` builds Windows x64 binaries using a digest-pinned Linux Docker image and a dated Debian toolchain snapshot. The installed package's `resources/licenses/ffmpeg/` includes notices and `FFmpeg-corresponding-source.tar.gz`: complete FFmpeg and configured codec/dependency source archives, the build recipe, exact configure command, generated configuration, compiler/package versions, and Windows DLL import evidence. Autodetection is disabled so unrelated host libraries cannot enter the build. The distribution supplies FFmpeg, x264, zlib, Ogg, Vorbis, Opus, libvpx, LAME, and dav1d sources; only Windows system DLLs are imported.

`media:verify` checks every resource hash, the source archive contents against all nine pinned source hashes, the included recipe against the checkout, dependency notices, and conversion encoders/filters. A missing source or changed resource/recipe fails verification. `dist` verifies the packaged resources and emits a standalone `Switchoid-Media-Source-0.1.0.tar.gz`, provenance JSON, third-party notices, and individual SHA-256 checksums alongside the installer. Upload these together; the GitHub installer artifact includes all of them. Recipients can obtain and rebuild sources without installing the application.

For a maintainer-published release, attach the generated installer, source archive, provenance, third-party notices, and checksums. Describe the unsigned publisher prompt and supported Windows x64 versions. `test:installer` checks the installed executable with an isolated profile, shortcuts, uninstallation, registry cleanup, and preservation of user settings/history/presets. Use `-AllowExistingInstall` when verifying an existing installation; the current installer is restored afterward. Signing and release publication are maintainer decisions.
