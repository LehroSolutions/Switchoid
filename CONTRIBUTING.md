# Contributing

Open an issue describing the problem and expected behavior, or submit a focused pull request. Avoid including media containing private data, local filesystem paths, credentials, generated installers, or cache folders.

Use the development setup and verification commands in `README.md`. Keep main-process filesystem/process handling behind typed IPC contracts. Preserve context isolation, user data, originals, and output collision avoidance.

Contributions to application source are under the project's [MIT license](LICENSE). Preserve third-party license notices and document the origin/license of new assets or bundled dependencies. `private: true` in `package.json` prevents accidental npm publication; development and public source contributions are supported.

Report vulnerabilities through the channel in [SECURITY.md](SECURITY.md). Public issues should contain only sanitized logs and media that can be shared publicly.

For frontend changes, include a screenshot of the changed state and check both appearance modes and the minimum supported 1120×700 window. For packaging changes, test the unpacked executable with `SWITCHOID_EXECUTABLE` and verify bundled engines work without a system FFmpeg installation.

Do not hand-edit generated icon files. Update `build/brand-source.svg` intentionally and run `bun run icons`. Media-engine updates must update the source pins and recipe in `scripts/media/`, rebuild with `bun run media:prepare`, and pass `bun run media:verify` before packaging. Preserve complete corresponding source and dependency notices.
