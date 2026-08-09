# macOS desktop build

## Why not Windows

electron-builder cannot produce macOS DMG/ZIP on Windows. Local `npm run dist:mac` must run on macOS.

## GitHub Actions (recommended)

Workflow: [`.github/workflows/build-mac.yml`](../.github/workflows/build-mac.yml)

- Runner: `macos-latest`
- CI uses `--publish never` so electron-builder does not require GH_TOKEN; Release upload is handled by softprops/action-gh-release.
- Steps: `npm ci` then `npm run dist:mac` (unsigned; `CSC_IDENTITY_AUTO_DISCOVERY=false`)
- Artifacts: `release/*.dmg` and `release/*.zip` (x64 + arm64 per electron-builder.yml)
- Triggers: workflow_dispatch (optional release_tag, default v1.0.2-2026-08-09), push to master/main, tags v*
- On dispatch/tag: attaches assets to the matching GitHub Release when that tag exists

Actions: https://github.com/maxwellaaa/AuraCard-/actions/workflows/build-mac.yml

## Local macOS

```bash
npm ci
npm run dist:mac
```

Output: `release/` (`directories.output` in electron-builder.yml).

## Signing / notarization

CI builds are unsigned (`identity: null`, no Apple Developer cert). Users may need right-click Open. Notarization is not configured.

## Windows packages

Use `npm run dist:win` on Windows; output goes to `E:/cursor-agent/deliverables/AuraCard-desktop-1.0.2/`.
