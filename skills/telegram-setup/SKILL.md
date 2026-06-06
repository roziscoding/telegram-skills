---
name: telegram-setup
description: First-time setup for the Telegram skills — connect a bot and capture the user's chat ID. Use when the user wants to set up, connect, configure, or get started with Telegram notifications, or when another telegram skill fails because no bot token / chat is configured.
metadata:
  author: roziscoding
  version: "1.0.0"
---

# Telegram Setup

Interactive, one-time setup. Walks the user through connecting their Telegram
bot and captures their chat ID into a named contact, set as the default
recipient. After this, `telegram-notify` / `telegram-ask` work with no flags.

The binary is at `<skill-dir>/../telegram-skills-bin/bin/telegram`.

> **Requires the `telegram-skills-bin` skill.** The binary lives in that sibling skill. If `<skill-dir>/../telegram-skills-bin/bin/telegram` does not exist, tell the user to install it (`bunx skills add roziscoding/telegram-skills`) instead of failing with a raw error.

## Step 1 — get the bot token

Ask the user for their bot token from [@BotFather](https://t.me/BotFather).

If they'd rather not paste it into the chat, tell them to put it in
`~/.config/telegram-skills/credentials.json` as `{ "bot_token": "..." }` and
say when they're done — then run setup with no token argument.

## Step 2 — run setup in the BACKGROUND

This is critical: the command prints the connect link and then **blocks**
waiting for the user. Run it in the background so you can read the link and
relay it *before* the user acts. Do not run it in the foreground.

```bash
# token provided by the user (it gets persisted):
<skill-dir>/../telegram-skills-bin/bin/telegram --setup "<TOKEN>"

# token already in credentials.json:
<skill-dir>/../telegram-skills-bin/bin/telegram --setup

# optional: name the contact (default is the user's Telegram first name):
<skill-dir>/../telegram-skills-bin/bin/telegram --setup "<TOKEN>" --name work
```

## Step 3 — relay the connect link

Read the background process output. It emits, immediately:

```
SETUP_URL=https://t.me/<bot>?start=<code>
SETUP_CODE=<code>
SETUP_BOT=@<bot>
```

Tell the user to **either** open `SETUP_URL` and press Start, **or** open the
bot (`SETUP_BOT`) in Telegram and send `/start <code>`. Both do the same thing.

## Step 4 — wait for completion

Keep waiting for the background process to exit. On success it prints:

```
SETUP_OK chat_id=<id> contact=<name>
```

and exits 0. The chat ID is now stored under that contact and set as
`default_contact`. If it instead times out (5 min) or exits non-zero, tell the
user what happened and offer to retry from Step 2.

## Step 5 — confirm with a hello

Once setup succeeds, use the **telegram-notify** skill to send a short "hello"
message (no `--to` needed — it goes to the new default contact). Confirm to the
user that the message arrived.

## Notes

- The connect code is random, single-use, and kept only in memory for the
  duration of the command.
- A deeplink click and a manual `/start <code>` are identical to the bot, so
  there's one path for both.
