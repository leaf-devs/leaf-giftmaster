require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("Missing TOKEN, CLIENT_ID, or GUILD_ID in environment.");
  process.exit(1);
}

const commands = [];
const commandsDir = path.join(__dirname, "commands");
const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"));

console.log("Loading commands...");

for (const file of files) {
  const command = require(path.join(commandsDir, file));
  if (!command?.data?.toJSON) {
    console.warn(`Skipping ${file}: no valid 'data' export.`);
    continue;
  }
  commands.push(command.data.toJSON());
  console.log(`Loaded: ${command.data.name}`);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`\nRegistered ${commands.length} guild command(s).`);
  } catch (err) {
    console.error("Failed to register commands:", err);
    process.exit(1);
  }
})();