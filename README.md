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

The first time a skill runs, `bin/telegram` downloads the prebuilt binary for
your platform (and the version it pins) from GitHub Releases — needs `curl` or
`wget` — and caches it next to itself. No Bun or other dependencies required.

## Skills

| Skill | Description |
|-------|-------------|
| `telegram-notify` | Send messages (fire-and-forget) |
| `telegram-ask` | Ask questions with inline buttons (blocks until answered) |
| `telegram-manage-contacts` | Add, remove, and list named contacts |

## License

MIT
