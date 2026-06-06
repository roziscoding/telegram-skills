#!/usr/bin/env bun

import { parseArgs } from "util";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
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
  const sentMessages = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<any>).value.message_id);

  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("choice:")) return;
    if (!sentMessages.includes(ctx.callbackQuery.message?.message_id!)) return;

    const chosen = data.slice("choice:".length);
    await ctx.answerCallbackQuery({ text: chosen });

    await ctx.editMessageText(`${text}\n\n✅ *${chosen}*`, {
      parse_mode: "Markdown",
    });

    console.log(chosen);
    await bot.stop();
  });

  await bot.start();
}
