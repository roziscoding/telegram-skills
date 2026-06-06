# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A bundle of [agent skills](https://skills.sh) that let AI agents interact with users via Telegram. It is installed by end users with `bunx skills add roziscoding/telegram-skills`. The three user-facing skills (`telegram-notify`, `telegram-ask`, `telegram-manage-contacts`) are thin SKILL.md wrappers; all real logic lives in a single CLI. A fourth skill, `telegram-skills-bin`, is infrastructure: it ships the shared CLI wrapper that the other three depend on.

**Why a separate bin skill:** the `skills` CLI installs each skill by copying only its `skills/<name>/` folder. Anything outside that folder (a repo-root `bin/`, reached via `../../`) is never installed. So the wrapper must live *inside* a skill folder. To avoid duplicating it across all three, it lives once in `telegram-skills-bin/bin/telegram`, and the dependent skills reach it via the sibling path `<skill-dir>/../telegram-skills-bin/bin/telegram` (installed skills are siblings under the same skills dir). This makes `telegram-skills-bin` a hard dependency of the other three.

## Architecture

Everything routes through one source file. The compiled binary is **not** committed — it is published to GitHub Releases by CI and lazy-downloaded on first use by a committed bash wrapper:

- `lib/telegram.ts` — the entire CLI. A single grammY-based script that dispatches on flags: `--list-contacts` / `--contact-add` / `--delete-contact` (contact management, exit early), otherwise message-sending mode. Reads the message/question from **stdin**, resolves recipients, sends via `bot.api.sendMessage` with Markdown parse mode.
- `skills/telegram-skills-bin/bin/telegram` — a committed **bash wrapper** (not a binary), shipped by the `telegram-skills-bin` skill. On first invocation it detects OS/arch (`uname`), downloads the matching `telegram-<os>-<arch>` asset for its pinned `$VERSION` from the GitHub Release into `skills/telegram-skills-bin/bin/.telegram-bin-<version>` (gitignored), then `exec`s it forwarding all args and stdin. The version-stamped filename means a version bump → new filename → automatic re-download; old binaries just linger.
- `.github/workflows/release.yml` — on a `v*` tag push, a 4-way matrix cross-compiles with `bun build --compile --target=bun-{linux,darwin}-{x64,arm64}` and uploads each `telegram-<os>-<arch>` asset to the release.
- `skills/{telegram-notify,telegram-ask,telegram-manage-contacts}/SKILL.md` — the three user-facing manifests. They contain no logic; they document how to call `../telegram-skills-bin/bin/telegram` for each use case, and note the dependency on `telegram-skills-bin`.
- `skills/telegram-skills-bin/SKILL.md` — the infrastructure manifest. Its `description` marks it as an internal dependency that is not invoked directly, so agents don't trigger it on its own.

**Critical:** the released binary is built from `lib/telegram.ts`. To ship a change you must (1) edit the source, (2) bump `VERSION` in `skills/telegram-skills-bin/bin/telegram` **and** the version in `package.json`, (3) push a matching `v*` tag so CI rebuilds and publishes the assets. The pinned `$VERSION` in the wrapper and the release tag must stay in sync — they are kept aligned by hand (the `mise run release` task does this).

### Two interaction modes

- **Fire-and-forget** (`telegram-notify`): send and exit.
- **Blocking** (`telegram-ask`): when `--choice` flags are present, the script attaches an inline keyboard, then calls `bot.start()` and waits for a `callback_query`. On a button press it edits the original message to show the selection, prints the chosen text to stdout, and `bot.stop()`s. This is why ask blocks until the user answers.

### Recipient resolution

Recipients come from `-c <chat_id>` (raw, repeatable) and/or `--to <name>` (named contact, repeatable). `--to` names are looked up in `contacts` from credentials (case-insensitive). If neither flag is given, falls back to `default_chat_id`. Messages fan out to all resolved chat IDs via `Promise.allSettled`.

### Credentials

All state lives in `~/.config/telegram-skills/credentials.json` (`bot_token`, optional `default_chat_id`, optional `contacts` map). Contact-management commands read/write this file directly; names are stored lowercased.

## Commands

```bash
bun install              # install grammY (only dependency)
mise run build           # locally compile lib/telegram.ts (for testing the source)
```

The `mise run build` task is for local testing of the source; shipping happens via CI. To release: bump `VERSION` in `skills/telegram-skills-bin/bin/telegram` and the version in `package.json`, then push the matching `v*` tag — the matrix in `.github/workflows/release.yml` builds and publishes the per-platform assets.

There is no test suite or linter configured.
