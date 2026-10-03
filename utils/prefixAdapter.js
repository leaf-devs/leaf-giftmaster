const { MessageFlags } = require("discord.js");

function buildInteraction(message, command, args) {
  const optionDefs = (command.data.options || []).map((o) =>
    o.toJSON ? o.toJSON() : o
  );

  const resolved = {};
  let i = 0;
  for (const opt of optionDefs) {
    if (opt.type === 1 || opt.type === 2) continue;
    const raw = args[i];
    i++;

    if (raw === undefined) {
      resolved[opt.name] = null;
      continue;
    }

    if (Array.isArray(opt.choices) && opt.choices.length > 0) {
      const match = opt.choices.find(
        (c) => c.value.toLowerCase() === String(raw).toLowerCase()
      );
      resolved[opt.name] = match ? match.value : raw;
      continue;
    }

    resolved[opt.name] = raw;
  }

  const state = { replied: false, deferred: false };

  const send = async (payload) => {
    const incomingFlags = payload?.flags ?? 0;
    const isEphemeral =
      payload?.ephemeral === true ||
      (incomingFlags & MessageFlags.Ephemeral) !== 0;

    // Strip only the ephemeral bit. Preserve IsComponentsV2 and others.
    const outFlags = incomingFlags & ~MessageFlags.Ephemeral;

    const clean = { ...payload };
    delete clean.ephemeral;
    if (outFlags === 0) {
      delete clean.flags;
    } else {
      clean.flags = outFlags;
    }

    if (isEphemeral) {
      return message.author.send(clean);
    }
    return message.channel.send(clean);
  };

  const api = {
    isChatInputCommand: () => true,
    isRepliable: () => true,
    commandName: command.data.name,

    user: message.author,
    member: message.member,
    guild: message.guild,
    channel: message.channel,
    channelId: message.channel.id,
    client: message.client,

    get replied() { return state.replied; },
    get deferred() { return state.deferred; },

    options: {
      getString: (name) => {
        const v = resolved[name];
        return v === null || v === undefined ? null : String(v);
      },
      getInteger: (name) => {
        const v = resolved[name];
        if (v === null || v === undefined) return null;
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : null;
      },
      getBoolean: (name) => {
        const v = resolved[name];
        if (v === null || v === undefined) return null;
        return String(v).toLowerCase() === "true";
      },
      getUser: (name) => {
        const v = resolved[name];
        if (!v) return null;
        const id = String(v).replace(/[<@!>]/g, "");
        return message.client.users.cache.get(id) || null;
      },
      getChannel: (name) => {
        const v = resolved[name];
        if (!v) return null;
        const id = String(v).replace(/[<#>]/g, "");
        return message.client.channels.cache.get(id) || null;
      },
      getRole: (name) => {
        const v = resolved[name];
        if (!v) return null;
        const id = String(v).replace(/[<@&>]/g, "");
        return message.guild?.roles.cache.get(id) || null;
      },
      getNumber: (name) => {
        const v = resolved[name];
        if (v === null || v === undefined) return null;
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : null;
      },
    },

    reply: async (payload) => {
      state.replied = true;
      return send(payload);
    },

    followUp: async (payload) => send(payload),

    deferReply: async () => {
      state.deferred = true;
      if (message.channel.sendTyping) await message.channel.sendTyping();
      return;
    },
  };

  return api;
}

function parsePrefixMessage(message, prefix) {
  const content = message.content || "";
  if (!content.startsWith(prefix)) return null;

  const withoutPrefix = content.slice(prefix.length).trim();
  if (!withoutPrefix) return null;

  const parts = withoutPrefix.split(/\s+/);
  const commandName = parts.shift().toLowerCase();
  return { commandName, args: parts };
}

module.exports = { buildInteraction, parsePrefixMessage };