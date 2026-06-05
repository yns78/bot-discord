require("dotenv").config();

// ======================
// ANTI CRASH
// ======================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ======================
// DEBUG START
// ======================
console.log("🔥 BOT START");

// ======================
// EXPRESS (Render)
// ======================
const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Bot Discord en ligne !");
});

app.get("/ping", (req, res) => {
    res.send("alive");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Serveur web actif");
});

// ======================
// DISCORD BOT
// ======================
const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ======================
// CONFIG
// ======================
const LOG_CHANNEL_ID = "1512236065644220621";
const MUTE_ROLE_NAME = "Muted";

// ======================
// LOG FUNCTION
// ======================
function sendLog(guild, msg) {
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) ch.send(msg).catch(() => {});
}

// ======================
// READY
// ======================
client.once("ready", () => {
    console.log(`✅ CONNECTÉ: ${client.user.tag}`);
});

// ======================
// DEBUG MESSAGES
// ======================
client.on("messageCreate", (message) => {
    console.log("📩 MSG:", message.content);
});

// ======================
// GET MEMBER SAFE
// ======================
async function getMember(guild, id) {
    try {
        return await guild.members.fetch(id);
    } catch {
        return null;
    }
}

// ======================
// WELCOME
// ======================
client.on("guildMemberAdd", async member => {

    const role = member.guild.roles.cache.get("1502820168596852736");
    if (role) member.roles.add(role).catch(() => {});

    const channel = member.guild.channels.cache.find(c => c.name === "bienvenue");
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("👑 BIENVENUE 👑")
        .setDescription(`Bienvenue ${member}`)
        .setImage("https://media.discordapp.net/attachments/1169683412387373098/1380701097072525454/ezgif.com-animated-gif-maker_6.gif")
        .setTimestamp();

    channel.send({
        content: `🎉 Bienvenue ${member}`,
        embeds: [embed]
    });
});

// ======================
// COMMANDES
// ======================
client.on("messageCreate", async (message) => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const args = message.content.trim().split(/ +/g);
    const cmd = args[0].toLowerCase();

    console.log("➡️ CMD:", message.content);

    // PING
    if (cmd === "!ping") {
        return message.reply("🏓 Pong !");
    }

    // BAN
    if (cmd === "!ban") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply("❌ Pas la permission.");

        const member = await getMember(message.guild, args[1]);
        if (!member) return message.reply("❌ ID invalide");

        await member.ban().catch(() => {
            return message.reply("❌ impossible ban");
        });

        message.channel.send(`🔨 BAN: ${member.user.tag}`);
        sendLog(message.guild, `🔨 BAN ${member.user.tag}`);
    }

    // KICK
    if (cmd === "!kick") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
            return message.reply("❌ Pas la permission.");

        const member = await getMember(message.guild, args[1]);
        if (!member) return message.reply("❌ ID invalide");

        await member.kick().catch(() => {
            return message.reply("❌ impossible kick");
        });

        message.channel.send(`👢 KICK: ${member.user.tag}`);
        sendLog(message.guild, `👢 KICK ${member.user.tag}`);
    }

    // CLEAR
    if (cmd === "!clear") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return message.reply("❌ Pas la permission.");

        const amount = parseInt(args[1]);
        if (!amount || amount < 1 || amount > 100)
            return message.reply("❌ 1 à 100 messages");

        await message.channel.bulkDelete(amount, true);

        message.channel.send(`🧹 ${amount} messages supprimés`)
            .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));

        sendLog(message.guild, `🧹 CLEAR ${amount}`);
    }

    // MUTE
    if (cmd === "!mute") {

        const id = args[1];
        const member = await getMember(message.guild, id);
        if (!member) return message.reply("❌ ID invalide");

        let role = message.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);

        if (!role) {
            role = await message.guild.roles.create({
                name: MUTE_ROLE_NAME,
                permissions: []
            });
        }

        await member.roles.add(role).catch(() => {
            return message.reply("❌ erreur rôle / permissions");
        });

        message.channel.send(`🔇 MUTE: ${member.user.tag}`);
        sendLog(message.guild, `🔇 MUTE ${member.user.tag}`);
    }

    // UNMUTE
    if (cmd === "!unmute") {

        const member = await getMember(message.guild, args[1]);
        if (!member) return message.reply("❌ ID invalide");

        const role = message.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);
        if (!role) return message.reply("❌ rôle introuvable");

        await member.roles.remove(role).catch(() => {});

        message.channel.send(`🔊 UNMUTE: ${member.user.tag}`);
        sendLog(message.guild, `🔊 UNMUTE ${member.user.tag}`);
    }
});

client.login(process.env.TOKEN);