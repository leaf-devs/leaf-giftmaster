const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const path = require("path");
const config = require("../config.json");
const { getStockReport } = require("../utils/stock.js");
const { parseColor } = require("../utils/colors.js");

function formatReport(report) {
  if (report.length === 0) return "*(empty)*";
  return report
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => `**${s.name}:** \`${s.count}\``)
    .join("\n");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stock")
    .setDescription("Display the service stock.")
    .setDMPermission(false),

  async execute(interaction) {
    const free = await getStockReport(path.join(__dirname, "..", "free"));
    const premium = await getStockReport(path.join(__dirname, "..", "premium"));

    const embed = new EmbedBuilder()
      .setColor(parseColor(config.color.default))
      .setTitle(`${interaction.guild.name} Service Stock`)
      .setDescription(
        `👋 Hello and welcome to **${interaction.guild.name}**! 🌟`
      )
      .setFooter({ text: config.footer })
      .setImage(config.banner)
      .addFields({
        name: "Free Services",
        value: formatReport(free),
        inline: true,
      })
      .addFields({
        name: "Premium Services",
        value: formatReport(premium),
        inline: true,
      })
      .addFields({
        name: "Useful Links",
        value: `[**Website**](${config.website}) [**Discord**](https://dsc.gg/sciencegear)`,
      });

    await interaction.reply({ embeds: [embed] });
  },
};