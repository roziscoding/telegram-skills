#!/usr/bin/env bun

import { parseArgs } from "util";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { randomBytes } from "crypto";
import { Bot, InlineKeyboard } from "grammy";

const CREDENTIALS_PATH = join(homedir(), ".config", "telegram-skills", "credentials.json");

type Credentials = { bot_token: string; default_contact?: string; default_chat_id?: string; contacts?: Record<string, string> };

function readCredentials(): Credentials {
  try {
    return JSON.parse(readFileSync(CREDENTIALS_PATH, "utf-8"));
  } catch {
    return { bot_token: "", contacts: {} };
  }
}

function writeCredentials(creds: Credentials) {
  mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true });
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(creds, null, 2) + "\n");
}

const { values, positionals } = parseArgs({
  options: {
    c: { type: "string", multiple: true },
    to: { type: "string", multiple: true },
    choice: { type: "string", multiple: true },
    "contact-add": { type: "boolean" },
    "list-contacts": { type: "boolean" },
    "delete-contact": { type: "boolean" },
    setup: { type: "boolean" },
    name: { type: "string" },
  },
  allowPositionals: true,
  strict: false,
});

// --- Contact management modes ---

if (values["list-contacts"]) {
  const creds = readCredentials();
  const contacts = creds.contacts ?? {};
  if (!Object.keys(contacts).length) {
    console.log("No contacts configured.");
  } else {
    for (const [name, id] of Object.entries(contacts)) {
      console.log(`${name}\t${id}`);
    }
  }
  process.exit(0);
}

if (values["contact-add"]) {
  const [name, id] = positionals;
  if (!name || !id) {
    console.error("Usage: telegram --contact-add <name> <chat_id>");
    process.exit(1);
  }
  const creds = readCredentials();
  creds.contacts = creds.contacts ?? {};
  creds.contacts[name.toLowerCase()] = id;
  writeCredentials(creds);
  console.log(`Contact "${name.toLowerCase()}" set to ${id}`);
  process.exit(0);
}

if (values["delete-contact"]) {
  const [name] = positionals;
  if (!name) {
    console.error("Usage: telegram --delete-contact <name>");
    process.exit(1);
  }
  const creds = readCredentials();
  const key = name.toLowerCase();
  if (!creds.contacts?.[key]) {
    console.error(`Contact "${key}" not found.`);
    process.exit(1);
  }
  delete creds.contacts[key];
  writeCredentials(creds);
  console.log(`Contact "${key}" deleted`);
  process.exit(0);
}

// --- Interactive setup mode ---

if (values.setup) {
  // Unambiguous alphanumeric code (no 0/O/1/I), kept only in memory.
  const generateCode = (len = 8) => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = randomBytes(len);
    let out = "";
    for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
    return out;
  };

  const creds = readCredentials();
  // Token comes from the first positional (`telegram --setup <token>`) or,
  // failing that, an already-configured bot_token.
  const token = positionals[0] ?? creds.bot_token;
  if (!token) {
    console.error(`No bot token. Run 'telegram --setup <token>' or add "bot_token" to ${CREDENTIALS_PATH}`);
    process.exit(1);
  }
  // Persist the token up front so a later timeout doesn't lose it.
  creds.bot_token = token;
  writeCredentials(creds);

  const nameOverride = (values.name as string | undefined)?.toLowerCase().trim();
  const code = generateCode();
  const bot = new Bot(token);

  let username: string;
  try {
    username = (await bot.api.getMe()).username;
  } catch (err) {
    console.error(`Could not reach Telegram with that token: ${(err as Error).message}`);
    process.exit(1);
  }

  const url = `https://t.me/${username}?start=${code}`;

  // Emit the link block on stderr so it reaches the agent immediately
  // (unbuffered), before we block on long polling.
  console.error(`SETUP_URL=${url}`);
  console.error(`SETUP_CODE=${code}`);
  console.error(`SETUP_BOT=@${username}`);
  console.error(`Tell the user: open ${url} and press Start, or open @${username} in Telegram and send: /start ${code}`);
  console.error("Waiting for the user to start the bot...");

  const timer = setTimeout(() => {
    console.error("Timed out after 5 minutes waiting for the user to start the bot.");
    process.exit(1);
  }, 5 * 60 * 1000);

  // A deeplink click and a manual "/start <code>" arrive identically.
  bot.command("start", async (ctx) => {
    if ((ctx.match ?? "").trim() !== code) return; // ignore unrelated /start
    clearTimeout(timer);

    const chatId = ctx.chat.id;
    const fromName = ctx.from?.first_name?.toLowerCase().trim();
    const contact = nameOverride || fromName || "me";

    creds.contacts = creds.contacts ?? {};
    creds.contacts[contact] = String(chatId);
    creds.default_contact = contact;
    writeCredentials(creds);

    await ctx.reply("✅ All set — this chat is now connected.");
    console.log(`SETUP_OK chat_id=${chatId} contact=${contact}`);
    console.log('Setup complete. Now use the telegram-notify skill to send the user a "hello" message.');

    await bot.stop();
    process.exit(0);
  });

  await bot.start({ drop_pending_updates: true });
  // bot.start resolves only after bot.stop(); the handler exits the process.
}

// --- Message sending mode ---

const credentials = readCredentials();

if (!credentials.bot_token) {
  console.error(`"bot_token" is missing in ${CREDENTIALS_PATH}`);
  process.exit(1);
}

const contacts = credentials.contacts ?? {};

// Resolve --to names to chat IDs
const toIds = (values.to ?? []).map((name) => {
  const id = contacts[name.toLowerCase()];
  if (!id) {
    console.error(`Unknown contact "${name}". Available: ${Object.keys(contacts).join(", ") || "(none)"}`);
    process.exit(1);
  }
  return id;
});

// Default recipient: prefer a named default_contact (resolved through
// contacts), then fall back to a raw default_chat_id.
function resolveDefaultIds(): string[] {
  if (credentials.default_contact) {
    const id = contacts[credentials.default_contact.toLowerCase()];
    if (!id) {
      console.error(`"default_contact" is "${credentials.default_contact}" but no such contact exists. Available: ${Object.keys(contacts).join(", ") || "(none)"}`);
      process.exit(1);
    }
    return [id];
  }
  if (credentials.default_chat_id) return [credentials.default_chat_id];
  return [];
}

const chatIds = values.c?.length || toIds.length
  ? [...(values.c ?? []), ...toIds]
  : resolveDefaultIds();

if (!chatIds.length) {
  console.error('No recipient: pass -c/--to, or set "default_contact" or "default_chat_id" in credentials');
  process.exit(1);
}

const choices = values.choice ?? [];
const text = (await Bun.stdin.text()).trimEnd();

if (!text) {
  console.error("No input provided");
  process.exit(1);
}

const bot = new Bot(credentials.bot_token);

const replyMarkup = choices.length
  ? new InlineKeyboard(
      choices.map((choice) => [
        InlineKeyboard.text(choice, `choice:${choice}`),
      ])
    )
  : undefined;

const results = await Promise.allSettled(
  chatIds.map((chatId) =>
    bot.api.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: replyMarkup,
    })
  )
);

const failures = results.filter((r) => r.status === "rejected");
if (failures.length) {
  for (const f of failures)
    console.error((f as PromiseRejectedResult).reason.message);
  process.exit(1);
}

if (choices.length) {
  // Track each sent question by chat so we can recognise both a button press
  // (callback_query) and a plain reply to that exact message.
  const sentMessages = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => {
      const msg = (r as PromiseFulfilledResult<any>).value;
      return { chatId: String(msg.chat.id), messageId: msg.message_id as number };
    });

  // Edit the original question to show the answer, removing the buttons.
  async function settle(chatId: string, messageId: number, footer: string) {
    await bot.api.editMessageText(chatId, messageId, `${text}\n\n${footer}`, {
      parse_mode: "Markdown",
    });
  }

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("choice:")) return;
    const messageId = ctx.callbackQuery.message?.message_id;
    if (!sentMessages.some((m) => m.messageId === messageId)) return;

    const chosen = data.slice("choice:".length);
    await ctx.answerCallbackQuery({ text: chosen });

    await ctx.editMessageText(`${text}\n\n✅ *${chosen}*`, {
      parse_mode: "Markdown",
    });

    console.log(chosen);
    await bot.stop();
  });

  // An explicit reply to the question counts as an answer too: edit the
  // original to mark it answered, then print the reply text to the agent.
  bot.on("message", async (ctx) => {
    const repliedTo = ctx.message.reply_to_message?.message_id;
    if (repliedTo == null) return;
    const target = sentMessages.find(
      (m) => m.messageId === repliedTo && m.chatId === String(ctx.chat.id)
    );
    if (!target) return;

    const answer = (ctx.message.text ?? ctx.message.caption ?? "").trim();
    if (!answer) return; // ignore non-text replies (stickers, photos, etc.)

    await settle(target.chatId, target.messageId, `💬 *${answer}*\n_— answered by reply_`);

    console.log(answer);
    await bot.stop();
  });

  await bot.start();
}
