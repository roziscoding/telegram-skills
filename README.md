# telegram

A [skill](https://skills.sh) that lets AI agents interact with users via Telegram.

## Install

```bash
bunx skills add roziscoding/telegram-skills
```

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

No other dependencies required — the binary is self-contained.

## Skills

| Skill | Description |
|-------|-------------|
| `telegram-notify` | Send messages (fire-and-forget) |
| `telegram-ask` | Ask questions with inline buttons (blocks until answered) |
| `telegram-manage-contacts` | Add, remove, and list named contacts |

## License

MIT
