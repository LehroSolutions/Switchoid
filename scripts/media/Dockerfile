FROM debian:bookworm-slim@sha256:7c7b2c966bc9ee8cedfeef67e0e279108992c77681fa595db4a9d65c06ccc587 AS toolchain

RUN rm /etc/apt/sources.list.d/debian.sources && \
    printf '%s\n' \
      'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/20261006T000000Z bookworm main' \
      'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/20261006T000000Z bookworm-security main' \
      > /etc/apt/sources.list && \
    apt-get update && apt-get install -y --no-install-recommends \
      gcc gcc-mingw-w64-x86-64-posix g++-mingw-w64-x86-64-posix \
      make pkg-config nasm yasm xz-utils perl python3 meson ninja-build ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y --no-install-recommends libc6-dev && \
    rm -rf /var/lib/apt/lists/*

FROM toolchain AS dependencies
ARG BUILD_JOBS=4
COPY archives/ /sources/archives/
COPY recipe/sources.lock.json recipe/build-dependencies.sh /sources/recipe/
RUN BUILD_JOBS="$BUILD_JOBS" bash /sources/recipe/build-dependencies.sh

FROM dependencies AS compiled
COPY recipe/build-ffmpeg.sh /sources/recipe/
RUN BUILD_JOBS="$BUILD_JOBS" bash /sources/recipe/build-ffmpeg.sh

FROM compiled AS build
COPY recipe/ /sources/recipe/
RUN BUILD_JOBS="$BUILD_JOBS" bash /sources/recipe/build.sh

FROM scratch AS export
COPY --from=build /export/ /
