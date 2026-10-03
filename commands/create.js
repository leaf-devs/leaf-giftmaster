const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const config = require("../config.json");
const { ensureDir } = require("../utils/stock.js");
const { parseColor } = require("../utils/colors.js");
const { container, reply } = require("../utils/v2.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Create a new service.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((o) =>
      o.setName("service").setDescription("Service name").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("free or premium")
        .setRequired(true)
        .addChoices(
          { name: "Free", value: "free" },
          { name: "Premium", value: "premium" }
        )
    ),

  async execute(interaction) {
    const service = interaction.options
      .getString("service")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    const type = interaction.options.getString("type");

    if (!service) {
      return interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.red),
            blocks: [
              {
                type: "text",
                content: `## Invalid service name\nOnly letters, numbers, dashes, underscores.`,
              },
            ],
          })
        )
      );
    }

    const dir = path.join(__dirname, "..", type);
    const filePath = path.join(dir, `${service}.txt`);

    await ensureDir(dir);

    try {
      await fs.writeFile(filePath, "", { flag: "wx" });
    } catch (err) {
      if (err.code === "EEXIST") {
        return interaction.reply(
          reply(
            container({
              accentColor: parseColor(config.color.yellow),
              blocks: [
                {
                  type: "text",
                  content: `## Already exists\nService **${type}** \`${service}\` already exists.`,
                },
              ],
            })
          )
        );
      }
      console.error(err);
      return interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.red),
            blocks: [
              {
                type: "text",
                content: `## Error\nFailed to create service.`,
              },
            ],
          })
        )
      );
    }

    await interaction.reply(
      reply(
        container({
          accentColor: parseColor(config.color.green),
          blocks: [
            { type: "text", content: `# Service created` },
            { type: "separator" },
            { type: "text", content: `**Type**\n\`${type}\`` },
            { type: "separator" },
            { type: "text", content: `**Service**\n\`${service}\`` },
          ],
        })
      )
    );
  },
};