# telegram

A [skill](https://skills.sh) that lets AI agents interact with users via Telegram.

## Install

```bash
bunx skills add roziscoding/telegram-skills
```

## Setup

The easiest way is the **`telegram-setup`** skill: ask your agent to "set up
Telegram", hand it your bot token from [@BotFather](https://t.me/BotFather), and
click the link it gives you. It captures your chat ID and configures the default
recipient for you.

To configure manually instead, create `~/.config/telegram-skills/credentials.json`:

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

The default recipient (when no `-c`/`--to` is passed) is resolved in order:
`default_contact` (a name looked up in `contacts`), then `default_chat_id` (a raw
ID). Use `default_contact` if you'd rather keep your own ID in one place under
`contacts`.

The first time a skill runs, the shared `telegram` wrapper downloads the prebuilt
binary for your platform (and the version it pins) from GitHub Releases — needs
`curl` or `wget` — and caches it next to itself. No Bun or other dependencies
required.

## Skills

| Skill | Description |
|-------|-------------|
| `telegram-setup` | First-time setup: connect a bot and capture your chat ID |
| `telegram-notify` | Send messages (fire-and-forget) |
| `telegram-ask` | Ask questions with inline buttons, answered by a button press or a text reply (blocks until answered) |
| `telegram-manage-contacts` | Add, remove, and list named contacts |
| `telegram-skills-bin` | Shared CLI binary the others depend on (not invoked directly) |

> **Dependency:** the three user-facing skills call the binary shipped by
> `telegram-skills-bin`. `bunx skills add roziscoding/telegram-skills` installs the
> whole bundle, so it's pulled in automatically. If you cherry-pick an individual
> skill, install `telegram-skills-bin` alongside it.

## License

MIT
