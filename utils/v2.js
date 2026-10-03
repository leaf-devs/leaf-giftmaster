const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

const V2_FLAG = MessageFlags.IsComponentsV2;

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function separator({ divider = true, spacing = "small" } = {}) {
  return new SeparatorBuilder()
    .setDivider(divider)
    .setSpacing(
      spacing === "large"
        ? SeparatorSpacingSize.Large
        : SeparatorSpacingSize.Small
    );
}

function container({ accentColor, blocks = [] }) {
  const c = new ContainerBuilder();
  if (accentColor !== undefined) c.setAccentColor(accentColor);

  for (const block of blocks) {
    if (block.type === "separator") {
      c.addSeparatorComponents(separator(block.options));
    } else {
      c.addTextDisplayComponents(text(block.content));
    }
  }
  return c;
}

/**
 * Build a reply payload for a V2 message.
 * reply(c)                 → public
 * reply(c, { ephemeral })  → ephemeral
 */
function reply(c, { ephemeral = false } = {}) {
  const flags = ephemeral ? V2_FLAG | MessageFlags.Ephemeral : V2_FLAG;
  return { components: [c], flags };
}

module.exports = { container, text, separator, reply, V2_FLAG };