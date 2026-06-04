---
name: telegram-notify
description: Send a Telegram message to configured contacts. Use when the user asks to send a message, notify, ping, or alert via Telegram. Also use when you need to proactively notify the user about something (e.g. a long task completing).
metadata:
  author: roziscoding
  version: "1.0.0"
---

# Telegram Notify

Send messages via a Telegram bot. This skill is fire-and-forget — it sends and moves on.

## Setup

Create `~/.config/telegram-skills/credentials.json`:

```json
{
  "bot_token": "your-bot-token-from-botfather",
  "default_chat_id": "your-chat-id",
  "contacts": {
    "alice": "123456",
    "bob": "789012"
  }
}
```

## Usage

The binary is at `<skill-dir>/../../bin/telegram`. It reads message text from stdin.

```bash
# Send to default recipient
echo "Deploy complete" | <skill-dir>/../../bin/telegram

# Send to a specific chat ID
echo "Hello" | <skill-dir>/../../bin/telegram -c 123456

# Send to multiple recipients
echo "Hello" | <skill-dir>/../../bin/telegram -c 111 -c 222

# Send to a named contact
echo "Hello" | <skill-dir>/../../bin/telegram --to alice

# Send to multiple named contacts
echo "Hello" | <skill-dir>/../../bin/telegram --to alice --to bob

# Multiline with heredoc
<skill-dir>/../../bin/telegram <<'EOF'
*Build complete*
- 42 tests passed
- Deployed to staging
EOF
```

Usage: `<bin> [-c chat_id ...] [--to name ...]` — reads message from stdin. Use `-c` for raw chat IDs or `--to` for named contacts from credentials. Both are repeatable. Defaults to `default_chat_id` from credentials if neither is given.

## Formatting

- Messages support Markdown parse mode
- Keep messages concise and useful
- When notifying about task completion, include a brief summary of what was done
- Use backticks for code snippets
