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

/**
 * Build a Container from text blocks + optional accent color.
 * blocks: array of { type: "text" | "separator", content?, options? }
 */
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
 * Wrap a reply payload for a V2 message.
 */
function reply(container) {
  return {
    components: [container],
    flags: V2_FLAG,
  };
}

module.exports = { container, text, separator, reply, V2_FLAG };