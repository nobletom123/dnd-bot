"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const adminChannelName = process.env.ADMIN_CHANNEL_ID;
if (!adminChannelName) {
    throw new Error("ADMIN_CHANNEL_ID is not defined in environment variables.");
}
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMembers],
});
const invites = new Map();
client.once("ready", () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(`Logged in as ${(_a = client.user) === null || _a === void 0 ? void 0 : _a.tag}`);
    // Cache all invites for each guild
    client.guilds.cache.forEach((guild) => __awaiter(void 0, void 0, void 0, function* () {
        const firstInvites = yield guild.invites.fetch();
        invites.set(guild.id, firstInvites);
    }));
    console.log("Invites cache");
}));
client.on("guildMemberAdd", (member) => __awaiter(void 0, void 0, void 0, function* () {
    const cachedInvites = invites.get(member.guild.id);
    const newInvites = yield member.guild.invites.fetch();
    // Find which invite increased in use
    const usedInvite = newInvites.find((i) => cachedInvites.get(i.code).uses < (i.uses || 0));
    invites.set(member.guild.id, newInvites); // Update cache
    if (usedInvite) {
        console.log(`${member.user.tag} joined using invite code: ${usedInvite.code}`);
        // Optionally, send to a channel
        const channel = member.guild.channels.cache.get(adminChannelName);
        if (channel && channel.isTextBased()) {
            channel.send(`${member.user.tag} joined using invite: ${usedInvite.url}`);
        }
    }
    else {
        console.log(`${member.user.tag} joined, but invite tracking failed.`);
    }
}));
client.login(process.env.BOT_TOKEN);
