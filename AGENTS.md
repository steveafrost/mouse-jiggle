# AGENTS.md — Mouse Jiggle

## App Overview

**Mouse Jiggle** is a [Raycast](https://www.raycast.com/) extension for macOS that moves the mouse cursor in small random bursts. Its primary use cases are preventing Mac sleep while away and keeping status indicators (e.g. Microsoft Teams "active" green dot) from timing out.

| Field | Value |
|-------|-------|
| Author | [steveafrost](https://www.raycast.com/steveafrost) |
| License | MIT |
| Category | System |
| Platforms | macOS (only) |
| Raycast API | `^1.91.0` |
| TypeScript | `^5.8.2` |
| Published | Yes (Raycast Store-compatible) |

---

## Architecture

### Extension layout

```
mouse-jiggle/
├── commands/
│   ├── index.ts          # Command manifest (redundant — see "What needs work")
│   ├── jiggle.ts         # Single command implementation
│   └── tsconfig.json     # Extends root tsconfig
├── node_modules/         # Dependencies
├── icon.png              # 512×512 store icon
├── CHANGELOG.md          # Release notes (placeholder not filled)
├── package.json          # Extension manifest + metadata
├── package-lock.json     # Lockfile
├── tsconfig.json         # Root TypeScript config
└── AGENTS.md             # This file
```

### Data flow

```
User invokes "Jiggle Mouse" in Raycast
  └─> JiggleMouse(args: { intensity? })       — commands/jiggle.ts
       ├─> Parse & clamp intensity (5-20, default 10)
       ├─> Generate 4 random [dx, dy] offsets
       ├─> checkCliclick()                     — which cliclick
       │    ├─ true  → exec `cliclick m:dx:dy` x4 (50ms delay between)
       │    └─ false → exec `/usr/bin/python3` with inline Quartz script
       └─> showToast(Success | Failure)
```

### Movement backends

**1. cliclick (preferred)** — A macOS CLI tool for mouse/keyboard automation. When installed, the extension calls `cliclick m:dx:dy` for each offset vector with a 50 ms inter-step pause. The `m` modifier is relative movement.

**2. Python + Quartz (fallback)** — When cliclick is absent, the extension generates an inline Python script that uses macOS's native Core Graphics (`Quartz.CGEventCreateMouseEvent`) and AppKit (`NSScreen`) frameworks to move the cursor. The script:
- Gets the current cursor location via `CGEventGetCurrentEvent`
- Translates screen coordinates (AppKit uses top-left origin; Core Graphics uses bottom-left)
- Applies each random offset
- Posts `kCGEventMouseMoved` events to the HID event tap

All Python code is constructed as a string literal and passed via `python3 -c`.

### Package configuration

- **`mode: "silent"`** — The command runs without showing a Raycast window. A toast notification appears on success/failure.
- **Arguments** — Accepts a single optional `intensity` argument (string, parsed as int, clamped to 5–20).
- **npm scripts**:
  - `build` → `ray build -e dist`
  - `dev` → `ray develop`
  - `lint` → `ray lint`
  - `fix-lint` → `ray lint --fix`

---

## Current State

### What works

- ✅ Single `jiggle` command works out of the box
- ✅ Two backends (cliclick + Python/Quartz) for broad compatibility
- ✅ Argument-based intensity control (5–20 pixel range)
- ✅ Random 4-step movement pattern for natural appearance
- ✅ Toast feedback on success/failure
- ✅ Published and compatible with Raycast Store
- ✅ TypeScript conversion complete
- ✅ Modern toolchain (ESLint 9, TypeScript 5.8, @raycast/api 1.91)

### Build / dependency status

The `node_modules/` and `package-lock.json` are present and appear consistent with `package.json`. Dependencies are minimal:
- `@raycast/api` (runtime)
- `@raycast/eslint-config`, `@types/node`, `eslint`, `typescript` (dev)

### Git history (7 commits, all by steveafrost, 2026-05-07)

The history shows a rapid evolution from a shell-based script to a proper Raycast API extension:
1. `Ready for Raycast Store` — initial manifest + icon
2. `Fix: Remove scripts array, use @raycast directives instead`
3. `Fix: Add commands array with script path`
4. `Convert to API extension with TypeScript`
5. `Add commands index and main jiggle command`
6. `Fix TypeScript`
7. `Add commands array to package.json` — final publishable state

---

## What Needs Work

### 🔴 Issues (should fix)

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | **README references old shell script path** | High | LaunchAgent example shows `src/index.sh` — no longer exists. Should reference the Raycast command or provide an alternative automation approach. |
| 2 | **`commands/index.ts` is likely dead code** | Medium | Raycast reads the `commands` array from `package.json`, not from an index file export. This file appears to be a remnant from an earlier pattern. Not harmful but confusing. Verify by checking if Raycast actually references it; if not, remove. |
| 3 | **CHANGELOG placeholder not filled** | Low | `{PR_MERGE_DATE}` is a placeholder — never replaced with actual release date. |
| 4 | **No `.gitignore`** | Medium | `node_modules/` and build artifacts (`dist/`) should be gitignored. Currently `node_modules/` is tracked in the working tree (though not committed in git history based on `ls-files` check). |
| 5 | **No LICENSE file** | Low | `package.json` and `README.md` say MIT, but no `LICENSE` file in the repo root. |
| 6 | **Inline Python via shell has escaping risks** | Medium | The Python script is built as a template literal and passed to `python3 -c '...'`. If offsets or other dynamic content contained shell-sensitive characters, this could break. Low practical risk given the data is numeric, but it's a code smell. Consider writing to a temp file. |

### 🟡 Improvements (nice to have)

| # | Improvement | Effort | Details |
|---|-------------|--------|---------|
| 1 | **Cache cliclick detection** | Low | `checkCliclick()` runs `which cliclick` every invocation. A module-level cached boolean avoids repeated `exec` calls. |
| 2 | **Add Raycast preferences** | Medium | Expose intensity, interval between steps, and number of steps as Raycast preferences (accessible via `getPreferenceValues`), not just deeplink arguments. |
| 3 | **Continuous/daemon mode toggle** | Medium | A preference to run the jiggle on a loop with a configurable interval (like 5 minutes) instead of a one-shot. Could use Raycast's background refresh or a simple recursive `setTimeout`. |
| 4 | **Add tests** | High | Zero tests currently. Add unit tests for offset generation, intensity clamping, and Python script generation. Use Vitest or Jest — works well with Raycast. |
| 5 | **Add CI (GitHub Actions)** | Medium | Run `ray lint` and `tsc --noEmit` on PRs/commits. Add `release` workflow for Raycast Store publishing. |
| 6 | **Python script improvements** | Low | Move `AppKit` import to top level. Use `CGEventCreateMouseEvent` directly via `Quartz` instead of also importing `AppKit` for screen height. Or better, use `Quartz.CGDisplayBounds(Quartz.CGMainDisplayID())` to get screen height. |
| 7 | **Toggle between backends** | Low | Add a preference to force cliclick or force Python, instead of auto-detecting. Useful for troubleshooting. |
| 8 | **`.editorconfig`** | Low | Standardize editor settings for the repo. |

### 🟢 Automation / tooling gaps

| # | Gap | Recommendation |
|---|-----|----------------|
| 1 | **No pre-commit hooks** | Add `husky` + `lint-staged` for running `ray lint` and `tsc --noEmit` before commits. |
| 2 | **No `.github/workflows/`** | Add CI for lint + type-check + build. Add release workflow. |
| 3 | **No `.gitignore`** | Add one covering `node_modules/`, `dist/`, `.raycast/`, `.env`. |
| 4 | **No `tsconfig` optimization** | Consider `skipLibCheck: true` for faster builds. |
| 5 | **`package.json` scripts** | Consider adding `check-types: tsc --noEmit` and `test` scripts (when tests exist). |

---

## Security & Sandboxing

- The extension runs shell commands via `child_process.exec` — this requires Raycast's full disk/automation access.
- The Python fallback requires Accessibility permissions in macOS System Settings.
- No network calls.
- No file system writes beyond Raycast's own storage.

---

## How to Contribute

1. Fork the repo.
2. Run `npm install`.
3. Run `npm run dev` to start Raycast development mode.
4. Make changes in `commands/`.
5. Run `npm run lint` and address any issues.
6. Run `npm run build` to verify the extension builds.
7. Open a PR with a clear description of changes.

---

## References

- [Raycast Extension Docs](https://developers.raycast.com/)
- [cliclick](https://www.bluem.net/jump/) — macOS mouse/keyboard automation CLI
- [Quartz Event Services](https://developer.apple.com/documentation/coregraphics/quartz_event_services) — macOS CGEvent API
