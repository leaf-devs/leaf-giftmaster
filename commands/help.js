const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");
const config = require("../config.json");
const { parseColor } = require("../utils/colors.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Display the command list.")
    .setDMPermission(false),

  async execute(interaction) {
    const p = config.prefix || "!";

    const embed = new EmbedBuilder()
      .setColor(parseColor(config.color.default))
      .setTitle("Help Panel")
      .setDescription(
        `👋 Hello and welcome to **${interaction.guild.name}**! 🌟 We are here to provide you with the best services. 🚀`
      )
      .setImage(config.banner)
      .setThumbnail(
        interaction.client.user.displayAvatarURL({ dynamic: true, size: 64 })
      )
      .addFields({
        name: "Commands",
        value: [
          `**Slash**                     **Prefix**`,
          `\`/help\` — help panel           \`${p}help\``,
          `\`/stock\` — live stock            \`${p}stock\``,
          `\`/free <service>\` — free gen     \`${p}free <service>\``,
          `\`/premium <service>\` — prem gen  \`${p}premium <service>\``,
          `\`/create <service> <type>\`      \`${p}create <service> <type>\``,
          `\`/add <type> <service> <acct>\`  \`${p}add <type> <service> <acct>\``,
        ].join("\n"),
      })
      .addFields({
        name: "Useful Links",
        value: `[**Website**](${config.website}) [**Discord**](https://dsc.gg/sciencegear)`,
      })
      .setFooter({
        text: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 64 }),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};