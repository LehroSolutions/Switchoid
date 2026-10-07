# Security policy

Security fixes target the latest Switchoid version. Older versions have no separate maintenance commitment. During the initial 0.1.0 release, include the exact version or source commit in reports.

## Report a vulnerability

Use GitHub's [private vulnerability reporting form](https://github.com/LehroSolutions/Switchoid/security/advisories/new) when enabled. The repository owner must enable private vulnerability reporting in GitHub settings; adding this policy does not enable it. If the form is unavailable, open an issue asking for a private reporting channel without including vulnerability details, exploits, private media, or credentials.

Include the affected version, Windows version, reproduction steps using synthetic media, impact, and any suggested fix. Redact usernames, absolute local paths, tokens, and private filenames from logs or screenshots. Keep exploit details private while maintainers investigate. Response times depend on maintainer availability.

## Application boundaries

Media conversion runs locally. Filesystem access and FFmpeg/FFprobe execution belong in Electron's main process behind the typed preload bridge. Context isolation is enabled and renderer Node integration is disabled. Treat media, filenames, metadata, and IPC input as untrusted.

The initial Windows installer is unsigned. Download only from this repository's build artifacts or maintainer-published releases, and compare the supplied SHA-256 checksum. A matching checksum verifies file integrity; it does not provide publisher authentication.
