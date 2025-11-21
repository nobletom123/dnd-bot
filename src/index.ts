import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const adminChannelName = process.env.ADMIN_CHANNEL_ID;

if (!adminChannelName) {
  throw new Error("ADMIN_CHANNEL_ID is not defined in environment variables.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
  ],
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

  console.log("Invite cache initialized.");
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
    (i) => (cachedInvites[i.code]?.uses || 0) < (i.uses || 0)
  );

  console.log("cachedInvites", cachedInvites);
  console.log("newInivites raw", newInvites);
  console.log(
    "newInvites",
    newInvites.map((i) => ({ code: i.code, uses: i.uses }))
  );

  await syncInvites();

  if (!usedInvite) {
    console.log(
      `${member.user.tag} joined, but no invite use detected - assuming vanity url.`
    );

    // Optionally, send to a channel
    const channel = member.guild.channels.cache.get(adminChannelName);
    if (channel && channel.isTextBased()) {
      console.log("Sending message to admin channel about vanity URL join.");
      channel.send(
        `Potential campaign player ${member} has arrived! Time to greet them!`
      );
    } else {
      console.log(
        "Admin channel not found or is not text-based, cannot send message."
      );
    }
    return;
  }

  console.log(
    `${member.user.tag} joined using invite code: ${usedInvite.code}`
  );
});

client.login(process.env.BOT_TOKEN);
