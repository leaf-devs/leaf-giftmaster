const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const config = require("../config.json");
const { withLock } = require("../utils/fileLock.js");
const { hit } = require("../utils/cooldown.js");
const { parseColor } = require("../utils/colors.js");
const { container, reply, V2_FLAG } = require("../utils/v2.js");

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
      return interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.red),
            blocks: [
              { type: "text", content: `## Wrong channel\nUse <#${config.premiumChannel}> for premium generations.` },
            ],
          }),
          { ephemeral: true }
        )
      );
    }

    const remaining = hit(
      `premium:${interaction.user.id}`,
      config.premiumCooldown
    );
    if (remaining > 0) {
      return interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.red),
            blocks: [
              { type: "text", content: `## Cooldown\nWait **${remaining}s** before generating again.` },
            ],
          }),
          { ephemeral: true }
        )
      );
    }

    const filePath = path.join(SERVICES_DIR, `${service}.txt`);
    const result = await popAccount(filePath);

    if (result.error === "not_found") {
      return interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.red),
            blocks: [
              { type: "text", content: `## Generator error\nService \`${service}\` does not exist.` },
            ],
          }),
          { ephemeral: true }
        )
      );
    }

    if (result.error === "empty") {
      return interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.red),
            blocks: [
              { type: "text", content: `## Out of stock\n\`${service}\` has no accounts left.` },
            ],
          }),
          { ephemeral: true }
        )
      );
    }

    const success = container({
      accentColor: parseColor(config.color.green),
      blocks: [
        { type: "text", content: `# Generated Premium Account` },
        { type: "text", content: `🙏 Thank you for being a premium member!\n🌟 Your support means the world to us! 💖` },
        { type: "separator" },
        { type: "text", content: `**Service**\n\`\`\`${service[0].toUpperCase()}${service.slice(1)}\`\`\`` },
        { type: "separator" },
        { type: "text", content: `**Account**\n\`\`\`${result.account}\`\`\`` },
      ],
    });

    let dmOk = true;
    try {
      await interaction.user.send({ components: [success], flags: V2_FLAG });
    } catch {
      dmOk = false;
    }

    if (dmOk) {
      await interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.green),
            blocks: [
              { type: "text", content: `## Sent\nCheck your DMs, ${interaction.user}.` },
            ],
          })
        )
      );
    } else {
      await interaction.reply(
        reply(
          container({
            accentColor: parseColor(config.color.yellow),
            blocks: [
              { type: "text", content: `## Couldn't DM you\nSending here instead — open your DMs for next time.` },
              { type: "separator" },
              { type: "text", content: `**Service**\n\`\`\`${service[0].toUpperCase()}${service.slice(1)}\`\`\`` },
              { type: "separator" },
              { type: "text", content: `**Account**\n\`\`\`${result.account}\`\`\`` },
            ],
          }),
          { ephemeral: true }
        )
      );
    }
  },
};