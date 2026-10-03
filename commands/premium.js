const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const config = require("../config.json");
const { withLock } = require("../utils/fileLock.js");
const { hit } = require("../utils/cooldown.js");
const { parseColor } = require("../utils/colors.js");

const SERVICES_DIR = path.join(__dirname, "..", "premium");

async function popAccount(filePath) {
  return withLock(filePath, async () => {
    let data;
    try {
      data = await fs.readFile(filePath, "utf-8");
    } catch (err) {
      if (err.code === "ENOENT") return { error: "not_found" };
      throw err;
    }

    const lines = data.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { error: "empty" };

    const [account, ...rest] = lines;
    const out = rest.length > 0 ? rest.join("\n") + "\n" : "";
    await fs.writeFile(filePath, out);
    return { account };
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("premium")
    .setDescription("Generate a premium account from a stocked service.")
    .setDMPermission(false)
    .addStringOption((o) =>
      o
        .setName("service")
        .setDescription("The service to generate from")
        .setRequired(true)
    ),

  async execute(interaction) {
    const service = interaction.options
      .getString("service")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");

    if (interaction.channelId !== config.premiumChannel) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(parseColor(config.color.red))
            .setTitle("Wrong channel")
            .setDescription(
              `Use <#${config.premiumChannel}> for premium generations.`
            )
            .setTimestamp(),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const remaining = hit(
      `premium:${interaction.user.id}`,
      config.premiumCooldown
    );
    if (remaining > 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(parseColor(config.color.red))
            .setTitle("Cooldown")
            .setDescription(`Wait **${remaining}s** before generating again.`)
            .setTimestamp(),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const filePath = path.join(SERVICES_DIR, `${service}.txt`);
    const result = await popAccount(filePath);

    if (result.error === "not_found") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(parseColor(config.color.red))
            .setTitle("Generator error")
            .setDescription(`Service \`${service}\` does not exist.`)
            .setTimestamp(),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (result.error === "empty") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(parseColor(config.color.red))
            .setTitle("Out of stock")
            .setDescription(`\`${service}\` has no accounts left.`)
            .setTimestamp(),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(parseColor(config.color.green))
      .setTitle("Generated Premium Account")
      .setDescription(
        "🙏 Thank you so much for being a premium member!\n🌟 Your support means the world to us! 💖"
      )
      .addFields(
        {
          name: "Service",
          value: `\`\`\`${service[0].toUpperCase()}${service.slice(1)}\`\`\``,
          inline: true,
        },
        {
          name: "Account",
          value: `\`\`\`${result.account}\`\`\``,
          inline: true,
        }
      )
      .setImage(config.banner)
      .setTimestamp();

    let dmOk = true;
    try {
      await interaction.user.send({ embeds: [embed] });
    } catch {
      dmOk = false;
    }

    if (dmOk) {
      await interaction.reply({
        content: `Check your DMs, ${interaction.user}. If you didn't get it, open your privacy settings.`,
      });
    } else {
      await interaction.reply({
        content:
          "Couldn't DM you — sending here instead. Open your DMs for next time.",
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};