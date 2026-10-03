const {
  SlashCommandBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const config = require("../config.json");
const { ensureDir, countLines } = require("../utils/stock.js");
const { withLock } = require("../utils/fileLock.js");
const { parseColor } = require("../utils/colors.js");
const { container, reply } = require("../utils/v2.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add an account to a service.")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((o) =>
      o
        .setName("type")
        .setDescription("free or premium")
        .setRequired(true)
        .addChoices(
          { name: "Free", value: "free" },
          { name: "Premium", value: "premium" }
        )
    )
    .addStringOption((o) =>
      o.setName("service").setDescription("Service name").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("account")
        .setDescription("Account line to append")
        .setRequired(true)
    ),

  async execute(interaction) {
    const type = interaction.options.getString("type");
    const service = interaction.options
      .getString("service")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    const account = interaction.options
      .getString("account")
      .replace(/\r?\n/g, " ")
      .trim();

    if (!account) {
      return interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.red),
            blocks: [
              {
                type: "text",
                content: `## Invalid input\nAccount line is empty.`,
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
      await withLock(filePath, async () => {
        let existing = "";
        try {
          existing = await fs.readFile(filePath, "utf-8");
        } catch (err) {
          if (err.code !== "ENOENT") throw err;
          await fs.writeFile(filePath, "");
        }

        const needsNewline = existing.length > 0 && !existing.endsWith("\n");
        const toWrite = (needsNewline ? "\n" : "") + account + "\n";

        await fs.appendFile(filePath, toWrite);
      });
    } catch (err) {
      console.error(err);
      return interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.red),
            blocks: [
              {
                type: "text",
                content: `## Error\nFailed to add account.`,
              },
            ],
          })
        )
      );
    }

    const total = await countLines(filePath);

    await interaction.reply(
      reply(
        container({
          accentColor: parseColor(config.color.green),
          blocks: [
            { type: "text", content: `# Account added` },
            { type: "separator" },
            { type: "text", content: `**Type**\n\`${type}\`` },
            { type: "separator" },
            { type: "text", content: `**Service**\n\`${service}\`` },
            { type: "separator" },
            { type: "text", content: `**Stock now**\n\`${total}\`` },
          ],
        })
      )
    );
  },
};