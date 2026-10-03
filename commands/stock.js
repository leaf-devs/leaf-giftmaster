const { SlashCommandBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder } = require("discord.js");
const path = require("path");
const config = require("../config.json");
const { getStockReport } = require("../utils/stock.js");
const { container, text, separator, reply } = require("../utils/v2.js");
const { parseColor } = require("../utils/colors.js");

function formatReport(report) {
  if (report.length === 0) return "*empty*";
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

    const total =
      free.reduce((n, s) => n + s.count, 0) +
      premium.reduce((n, s) => n + s.count, 0);

    const c = container({
      accentColor: parseColor(config.color.default),
      blocks: [
        {
          type: "text",
          content: `# ${interaction.guild.name} Stock\n**Total:** \`${total}\``,
        },
        { type: "separator" },
        {
          type: "text",
          content: `### Free\n${formatReport(free)}`,
        },
        { type: "separator" },
        {
          type: "text",
          content: `### Premium\n${formatReport(premium)}`,
        },
        { type: "separator" },
        {
          type: "text",
          content: `[**Website**](${config.website}) · [**Discord**](https://dsc.gg/sciencegear)`,
        },
      ],
    });

    await interaction.reply(reply(c));
  },
};