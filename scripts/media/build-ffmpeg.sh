#!/usr/bin/env bash
set -euo pipefail

export SOURCE_DATE_EPOCH=1791244800
export TZ=UTC LC_ALL=C
export CC=x86_64-w64-mingw32-gcc CXX=x86_64-w64-mingw32-g++
export AR=x86_64-w64-mingw32-ar RANLIB=x86_64-w64-mingw32-ranlib
export STRIP=x86_64-w64-mingw32-strip
export CFLAGS='-O2 -fno-ident' CXXFLAGS='-O2 -fno-ident'
export CPPFLAGS='-I/opt/switchoid/include' LDFLAGS='-L/opt/switchoid/lib -static'
export PKG_CONFIG_LIBDIR=/opt/switchoid/lib/pkgconfig
export PKG_CONFIG_PATH=
jobs="${BUILD_JOBS:-4}"
prefix=/opt/switchoid
pushd /build/ffmpeg
configuration=(
  --prefix="$prefix" --target-os=mingw32 --arch=x86_64 --enable-cross-compile
  --cross-prefix=x86_64-w64-mingw32- --pkg-config=pkg-config --pkg-config-flags=--static
  --enable-static --disable-shared --disable-autodetect --disable-debug --disable-doc
  --disable-ffplay --disable-network --enable-gpl --enable-version3
  --enable-zlib --enable-libx264 --enable-libvpx --enable-libmp3lame
  --enable-libvorbis --enable-libopus --enable-libdav1d
  --extra-libs=-lssp
  --extra-cflags=-I/opt/switchoid/include '--extra-ldflags=-L/opt/switchoid/lib -static'
)
printf '%q ' ./configure "${configuration[@]}" > /sources/evidence/configure-command.txt
printf '\n' >> /sources/evidence/configure-command.txt
if ! ./configure "${configuration[@]}"; then
  tail -n 120 ffbuild/config.log >&2
  exit 1
fi
make -j"$jobs"
cp ffmpeg.exe ffprobe.exe /export/bin/
cp COPYING.GPLv3 /export/notices/FFmpeg-LICENSE.txt
cp ffbuild/config.log ffbuild/config.mak /sources/evidence/
popd

