require("dotenv").config();

// ======================
// ANTI-CRASH
// ======================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ======================
// DEBUG START (IMPORTANT)
// ======================
console.log("🔥 INDEX JS LANCÉ");

// ======================
// EXPRESS (Render)
// ======================
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot Discord en ligne !"));
app.get("/ping", (req, res) => res.send("alive"));

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
// MESSAGE DEBUG (OBLIGATOIRE)
// ======================
client.on("messageCreate", (message) => {
    console.log("📩 RECU:", message.content);
});

// ======================
// GET MEMBER BY ID
// ======================
async function getMember(guild, id) {
    try {
        return await guild.members.fetch(id);
    } catch {
        return null;
    }
});

// ======================
// WELCOME + GIF
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

    channel.send({ content: `🎉 Bienvenue ${member}`, embeds: [embed] });
});

// ======================
// COMMANDES
// ======================
client.on("messageCreate", async message => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const args = message.content.trim().split(/ +/g);
    const cmd = args[0].toLowerCase();

    console.log("➡️ CMD:", message.content);

    // ======================
    // PING
    // ======================
    if (cmd === "!ping") {
        return message.reply("🏓 Pong !");
    }

    // ======================
    // MUTE (ID ONLY)
    // ======================
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

        try {
            await member.roles.add(role);
            message.channel.send(`🔇 MUTE OK: ${member.user.tag}`);
            sendLog(message.guild, `🔇 MUTE ${member.user.tag}`);
        } catch (err) {
            console.log(err);
            message.reply("❌ erreur permissions");
        }
    }

    // ======================
    // UNMUTE (ID ONLY)
    // ======================
    if (cmd === "!unmute") {

        const member = await getMember(message.guild, args[1]);
        if (!member) return message.reply("❌ ID invalide");

        const role = message.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);
        if (!role) return message.reply("❌ rôle introuvable");

        await member.roles.remove(role).catch(() => {});

        message.channel.send(`🔊 UNMUTE OK: ${member.user.tag}`);
        sendLog(message.guild, `🔊 UNMUTE ${member.user.tag}`);
    }
});

client.login(process.env.TOKEN);