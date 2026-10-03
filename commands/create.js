const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const config = require("../config.json");
const { ensureDir } = require("../utils/stock.js");
const { parseColor } = require("../utils/colors.js");

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
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(parseColor(config.color.red))
            .setTitle("Invalid service name")
            .setDescription("Only letters, numbers, dashes, underscores.")
            .setTimestamp(),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const dir = path.join(__dirname, "..", type);
    const filePath = path.join(dir, `${service}.txt`);

    await ensureDir(dir);

    try {
      await fs.writeFile(filePath, "", { flag: "wx" });
    } catch (err) {
      if (err.code === "EEXIST") {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(parseColor(config.color.yellow))
              .setTitle("Already exists")
              .setDescription(
                `Service **${type}** \`${service}\` already exists.`
              )
              .setTimestamp(),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
      console.error(err);
      return interaction.reply({
        content: "Failed to create service.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(parseColor(config.color.green))
          .setTitle("Service created!")
          .setDescription(`New **${type}** service \`${service}\` created.`)
          .setFooter({
            text: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL({
              dynamic: true,
              size: 64,
            }),
          })
          .setTimestamp(),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};