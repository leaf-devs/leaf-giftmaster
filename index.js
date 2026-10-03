require("dotenv").config();
const path = require("path");
const fs = require("fs");
const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
  MessageFlags,
} = require("discord.js");

const config = require("./config.json");
const { ensureDir } = require("./utils/stock.js");
const { buildInteraction, parsePrefixMessage } = require("./utils/prefixAdapter.js");

// Boot the dashboard.
require("./server.js");

const token = process.env.TOKEN;
if (!token) {
  console.error("Missing TOKEN in environment (.env).");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

const commandsDir = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsDir, file));
  if (command?.data && typeof command.execute === "function") {
    client.commands.set(command.data.name, command);
  }
}

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  client.user.setActivity(config.status, { type: ActivityType.Watching });

  await ensureDir(path.join(__dirname, "free"));
  await ensureDir(path.join(__dirname, "premium"));
});

// ----------------------------------------------------------------
// Slash commands
// ----------------------------------------------------------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    if (config.command.notfound_message && interaction.isRepliable()) {
      await interaction
        .reply({ content: "Unknown command.", flags: MessageFlags.Ephemeral })
        .catch(() => {});
    }
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    if (!interaction.isRepliable()) return;
    const payload = config.command.error_message
      ? { content: "Something went wrong running that command.", flags: MessageFlags.Ephemeral }
      : { content: "Error.", flags: MessageFlags.Ephemeral };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

// ----------------------------------------------------------------
// Prefix commands
// ----------------------------------------------------------------
const prefix = config.prefix || "!";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const parsed = parsePrefixMessage(message, prefix);
  if (!parsed) return;

  const { commandName, args } = parsed;
  const command = client.commands.get(commandName);

  if (!command) {
    if (config.command.notfound_message) {
      await message.reply(`Unknown command. Try \`${prefix}help\`.`).catch(() => {});
    }
    return;
  }

  // Some commands (help) work anywhere; others check channel themselves.
  // Commands that require permissions check `interaction.member.permissions`.
  // Prefix messages pass `message.member` through the adapter — same shape.

  try {
    const fakeInteraction = buildInteraction(message, command, args);
    await command.execute(fakeInteraction, client);
  } catch (err) {
    console.error(`Error in ${prefix}${commandName}:`, err);
    if (config.command.error_message) {
      await message.reply("Something went wrong running that command.").catch(() => {});
    }
  }
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

client.login(token);