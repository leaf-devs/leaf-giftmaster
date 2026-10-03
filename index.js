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

// Boot the dashboard. server.js listens on its own port.
require("./server.js");

const token = process.env.TOKEN;
if (!token) {
  console.error("Missing TOKEN in environment (.env).");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
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

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    if (config.command.notfound_message && interaction.isRepliable()) {
      await interaction
        .reply({
          content: "Unknown command.",
          flags: MessageFlags.Ephemeral,
        })
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
      ? {
          content: "Something went wrong running that command.",
          flags: MessageFlags.Ephemeral,
        }
      : { content: "Error.", flags: MessageFlags.Ephemeral };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
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