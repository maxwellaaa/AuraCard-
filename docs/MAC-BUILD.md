# macOS build

Windows cannot run `npm run dist:mac` locally. Use **GitHub Actions** on `macos-latest`.

## CI workflow

- Workflow: [`.github/workflows/build-desktop-mac.yml`](../.github/workflows/build-desktop-mac.yml)
- Actions: https://github.com/maxwellaaa/AuraCard-/actions/workflows/build-desktop-mac.yml
- Manual run: Actions → **Build Desktop macOS** → **Run workflow**
- Or: `gh workflow run build-desktop-mac.yml --repo maxwellaaa/AuraCard-`

The job installs dependencies, runs the Vite/Vue build, packages with `electron-builder --mac` (dmg + zip, x64/arm64, unsigned), uploads artifacts, and attaches them to release tag `v1.0.0-2026-08-08` (or the pushed `v*` tag).

## Downloads

Release assets: https://github.com/maxwellaaa/AuraCard-/releases

Look for `*-mac-arm64.dmg` / `*-mac-x64.dmg` (and matching `.zip`).

## Local macOS (optional)

```bash
npm ci
npm run dist:mac
```

Output: `release/` (see `electron-builder.yml`).
