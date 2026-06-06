---
name: telegram-ask
description: Ask a question via Telegram with inline buttons and wait for the user's response. Use when you need user confirmation, input, or a decision before proceeding (e.g. "deploy to prod?", "which option?").
metadata:
  author: roziscoding
  version: "1.0.0"
---

# Telegram Ask

Ask questions via Telegram with inline keyboard buttons. The script blocks until a button is pressed and prints the chosen option to stdout.

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

The binary is at `<skill-dir>/../telegram-skills-bin/bin/telegram`. It reads the question from stdin. Use `--choice` to define the buttons.

> **Requires the `telegram-skills-bin` skill.** The binary lives in that sibling skill. If `<skill-dir>/../telegram-skills-bin/bin/telegram` does not exist, tell the user to install it (`bunx skills add roziscoding/telegram-skills`) instead of failing with a raw error.

```bash
# Yes/No question
ANSWER=$(echo "Deploy to production?" | <skill-dir>/../telegram-skills-bin/bin/telegram --choice "Yes" --choice "No")
echo "User chose: $ANSWER"

# Multiple options
ANSWER=$(echo "Which environment?" | <skill-dir>/../telegram-skills-bin/bin/telegram --choice "staging" --choice "production" --choice "cancel")

# Ask a specific person by chat ID
ANSWER=$(echo "Approve release?" | <skill-dir>/../telegram-skills-bin/bin/telegram -c 123456 --choice "Approve" --choice "Reject")

# Ask a named contact
ANSWER=$(echo "Approve release?" | <skill-dir>/../telegram-skills-bin/bin/telegram --to alice --choice "Approve" --choice "Reject")
```

Usage: `<bin> [-c chat_id ...] [--to name ...] --choice "Option" [--choice "Option" ...]` — reads question from stdin. The script blocks until a button is pressed, then prints the chosen text to stdout. The original message is edited to show the selection.

## Notes

- Always provide at least two `--choice` options
- The script blocks — use it when you need the answer before continuing
- The message is updated after selection to show what was chosen
- Supports Markdown formatting in the question text
