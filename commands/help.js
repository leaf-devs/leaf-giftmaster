const { SlashCommandBuilder } = require("discord.js");
const config = require("../config.json");
const { container, reply } = require("../utils/v2.js");
const { parseColor } = require("../utils/colors.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Display the command list.")
    .setDMPermission(false),

  async execute(interaction) {
    const p = config.prefix || "!";
    const client = interaction.client;

    const header = container({
      accentColor: parseColor(config.color.default),
      blocks: [
        { type: "text", content: `# ${client.user.username}\n👋 Welcome to **${interaction.guild.name}**` },
        { type: "separator" },
        {
          type: "text",
          content: [
            "## Slash",
            "`/help` — this panel",
            "`/stock` — live stock",
            "`/free <service>` — free gen",
            "`/premium <service>` — premium gen",
            "`/create <service> <type>` — new service",
            "`/add <type> <service> <account>` — add stock",
          ].join("\n"),
        },
        { type: "separator" },
        {
          type: "text",
          content: [
            "## Prefix",
            `\`${p}help\``,
            `\`${p}stock\``,
            `\`${p}free <service>\``,
            `\`${p}premium <service>\``,
            `\`${p}create <service> <type>\``,
            `\`${p}add <type> <service> <account>\``,
          ].join("\n"),
        },
        { type: "separator" },
        {
          type: "text",
          content: `[**Website**](${config.website}) · [**Discord**](https://dsc.gg/sciencegear)`,
        },
      ],
    });

    await interaction.reply(reply(header));
  },
};