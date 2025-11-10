import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const adminChannelName = process.env.ADMIN_CHANNEL_ID;

if (!adminChannelName) {
  throw new Error("ADMIN_CHANNEL_ID is not defined in environment variables.");
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const invites: {
  [guildId: string]: {
    [inviteCode: string]: { uses: number; code: string; url: string };
  };
} = {};

const syncInvites = async () => {
  client.guilds.cache.forEach(async (guild) => {
    const guildInvites = await guild.invites.fetch();
    invites[guild.id] = {};
    guildInvites.forEach((invite) => {
      invites[guild.id][invite.code] = {
        uses: invite.uses || 0,
        code: invite.code,
        url: invite.url,
      };
    });
  });
};

client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  await syncInvites();

  console.log("Invite cache initialized.", client.guilds.cache.size);
});

client.on("inviteCreate", async () => {
  console.log("Invite created, syncing invites...");
  await syncInvites();
});

client.on("inviteDelete", async () => {
  console.log("Invite deleted, syncing invites...");
  await syncInvites();
});

client.on("guildMemberAdd", async (member) => {
  const cachedInvites = invites[member.guild.id];
  const newInvites = await member.guild.invites.fetch();

  // Find which invite increased in use
  const usedInvite = newInvites.find(
    (i) => cachedInvites[i.code].uses < (i.uses || 0)
  );

  await syncInvites();

  if (usedInvite) {
    console.log(
      `${member.user.tag} joined using invite code: ${usedInvite.code}`
    );
    // Optionally, send to a channel
    const channel = member.guild.channels.cache.get(adminChannelName);
    if (channel && channel.isTextBased()) {
      channel.send(`${member} joined using invite: ${usedInvite.url}`);
    }
  } else {
    console.log(`${member.user.tag} joined, but invite tracking failed.`);
  }
});

client.login(process.env.BOT_TOKEN);
