---
name: telegram-skills-bin
description: "Internal dependency, not a user action. Provides the shared `telegram` binary used by the telegram-notify, telegram-ask, and telegram-manage-contacts skills. Do not invoke this skill directly; install it because the others depend on it."
metadata:
  author: roziscoding
  version: "1.0.0"
---

# Telegram Skills Bin

Shared runtime for the Telegram skills. This skill contains no user-facing
behavior — it only ships `bin/telegram`, the bash wrapper that the
`telegram-notify`, `telegram-ask`, and `telegram-manage-contacts` skills call.

**You do not run this skill directly.** It exists so the other three skills have
a single, shared copy of the CLI instead of duplicating it.

## What it provides

`<skill-dir>/bin/telegram` — a bash wrapper that, on first use, downloads the
prebuilt binary for your platform and pinned version from GitHub Releases (needs
`curl` or `wget`), caches it next to itself, and `exec`s it. No Bun or other
runtime dependencies.

## Installation

The dependent skills resolve the binary at `../telegram-skills-bin/bin/telegram`
(a sibling skill folder), so this skill **must be installed** for them to work.
Installing the whole bundle pulls it in automatically:

```bash
bunx skills add roziscoding/telegram-skills
```

If you cherry-pick an individual skill (e.g. just `telegram-notify`), install
this one alongside it.
