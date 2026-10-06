# Contributing

Open an issue describing the problem and expected behavior, or submit a focused pull request. Avoid including media containing private data, local filesystem paths, credentials, generated installers, or cache folders.

Use the development setup and verification commands in `README.md`. Keep main-process filesystem/process handling behind typed IPC contracts. Preserve context isolation, user data, originals, and output collision avoidance.

For frontend changes, include a screenshot of the changed state and check both appearance modes and the minimum supported 1120×700 window. For packaging changes, test the unpacked executable with `SWITCHOID_EXECUTABLE` and verify bundled engines work without a system FFmpeg installation.

Do not hand-edit generated icon files. Update `build/brand-source.svg` intentionally and run `bun run icons`. Media-binary updates must also update the pinned URL/checksum and license/source provenance.
