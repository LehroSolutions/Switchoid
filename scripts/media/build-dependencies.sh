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
mkdir -p /build /export/bin /export/notices/licenses /sources/evidence

python3 - <<'PY'
import hashlib, json, pathlib, tarfile
for source in json.loads(pathlib.Path('/sources/recipe/sources.lock.json').read_text())['sources']:
    archive = pathlib.Path('/sources/archives') / source['file']
    if hashlib.file_digest(archive.open('rb'), 'sha256').hexdigest() != source['sha256']:
        raise SystemExit('Source checksum mismatch: ' + source['name'])
    target = pathlib.Path('/build') / source['name']
    target.mkdir()
    with tarfile.open(archive) as tar:
        members = tar.getmembers()
        root = pathlib.PurePosixPath(members[0].name).parts[0]
        for member in members:
            parts = pathlib.PurePosixPath(member.name).parts
            if parts[0] != root or '..' in parts or member.issym() or member.islnk():
                raise SystemExit('Unsupported source archive entry: ' + member.name)
            if len(parts) > 1:
                member.name = '/'.join(parts[1:])
                tar.extract(member, target)
PY

build_autoconf() {
  local name="$1"; shift
  pushd "/build/$name"
  ./configure --host=x86_64-w64-mingw32 --prefix="$prefix" --disable-shared --enable-static "$@"
  make -j"$jobs"
  make install
  popd
}

pushd /build/zlib
CHOST=x86_64-w64-mingw32 ./configure --prefix="$prefix" --static
make -j"$jobs"
make install
popd

build_autoconf ogg
build_autoconf vorbis --disable-oggtest
build_autoconf opus --disable-extra-programs --disable-doc --disable-deep-plc --disable-dred --disable-osce
build_autoconf lame --disable-frontend --disable-decoder --disable-cpml

pushd /build/x264
./configure --host=x86_64-w64-mingw32 --cross-prefix=x86_64-w64-mingw32- \
  --prefix="$prefix" --enable-static --bit-depth=8 --disable-cli --disable-opencl --disable-lavf --disable-swscale
make -j"$jobs"
make install
cp x264_config.h /sources/evidence/x264_config.h
popd

pushd /build/vpx
CROSS=x86_64-w64-mingw32- ./configure --target=x86_64-win64-gcc --prefix="$prefix" \
  --enable-static --disable-shared --disable-examples --disable-tools --disable-docs \
  --disable-unit-tests --enable-vp9-highbitdepth
make -j"$jobs"
make install
popd

cat > /sources/evidence/mingw-cross.ini <<'EOF'
[binaries]
c = 'x86_64-w64-mingw32-gcc'
cpp = 'x86_64-w64-mingw32-g++'
ar = 'x86_64-w64-mingw32-ar'
strip = 'x86_64-w64-mingw32-strip'
windres = 'x86_64-w64-mingw32-windres'
pkgconfig = 'pkg-config'
[host_machine]
system = 'windows'
cpu_family = 'x86_64'
cpu = 'x86_64'
endian = 'little'
EOF
meson setup /build/dav1d/build /build/dav1d --cross-file /sources/evidence/mingw-cross.ini \
  --prefix="$prefix" --libdir=lib --buildtype=release --default-library=static \
  -Denable_tools=false -Denable_tests=false
ninja -C /build/dav1d/build -j"$jobs"
ninja -C /build/dav1d/build install

