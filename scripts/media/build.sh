#!/usr/bin/env bash
set -euo pipefail
export SOURCE_DATE_EPOCH=1791244800
export TZ=UTC LC_ALL=C

python3 - <<'PY'
import pathlib, shutil
for name in ['ogg', 'vorbis', 'opus', 'vpx', 'dav1d', 'x264', 'lame']:
    target = pathlib.Path('/export/notices/licenses') / name
    target.mkdir()
    for source in pathlib.Path('/build', name).iterdir():
        if source.is_file() and any(word in source.name.lower() for word in ['copying', 'license', 'patents']):
            shutil.copyfile(source, target / source.name)
shutil.copyfile('/build/zlib/LICENSE', '/export/notices/licenses/zlib-LICENSE')
PY
cp /usr/share/doc/mingw-w64-common/copyright /export/notices/licenses/MinGW-w64-copyright
cp /usr/share/doc/gcc-mingw-w64-base/copyright /export/notices/licenses/GCC-runtime-copyright
dpkg-query -W > /sources/evidence/toolchain-packages.txt
x86_64-w64-mingw32-gcc --version > /sources/evidence/compiler.txt
for name in ffmpeg ffprobe; do
  x86_64-w64-mingw32-objdump -p "/export/bin/$name.exe" | sed -n 's/.*DLL Name: //p' \
    > "/sources/evidence/$name-imports.txt"
done
cat /sources/evidence/configure-command.txt /sources/evidence/compiler.txt \
  > /export/notices/FFmpeg-BUILD.txt
cp -r /sources/evidence /export/notices/build-evidence
cp /sources/recipe/sources.lock.json /export/notices/sources.lock.json
cp /sources/recipe/README.md /export/notices/SOURCE-README.md
tar --sort=name --mtime="@$SOURCE_DATE_EPOCH" --owner=0 --group=0 --numeric-owner \
  -czf /export/notices/FFmpeg-corresponding-source.tar.gz -C /sources archives recipe evidence

python3 - <<'PY'
import pathlib
allowed = {'kernel32.dll', 'msvcrt.dll', 'user32.dll', 'advapi32.dll', 'shell32.dll',
           'ole32.dll', 'ws2_32.dll', 'bcrypt.dll', 'secur32.dll', 'gdi32.dll',
           'psapi.dll', 'avicap32.dll', 'winmm.dll', 'vfw32.dll', 'oleaut32.dll',
           'mfplat.dll', 'mfreadwrite.dll', 'mfuuid.dll', 'd3d11.dll', 'dxgi.dll',
           'dxva2.dll', 'comdlg32.dll', 'shlwapi.dll'}
for name in ['ffmpeg', 'ffprobe']:
    dlls = pathlib.Path('/sources/evidence', name + '-imports.txt').read_text().splitlines()
    unexpected = [dll for dll in dlls if dll.lower() not in allowed and not dll.lower().startswith('api-ms-win-')]
    if unexpected:
        raise SystemExit('Unexpected runtime DLLs: ' + repr(unexpected))
print('Built Windows x64 engines and corresponding source; only Windows system DLLs imported.')
PY
