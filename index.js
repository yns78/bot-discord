require("dotenv").config();

const express = require("express");
const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require("discord.js");

// ======================
// ANTI CRASH
// ======================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ======================
// EXPRESS
// ======================
const app = express();
app.get("/", (req, res) => res.send("Bot OK"));
app.listen(process.env.PORT || 3000, () => console.log("🌐 Serveur OK"));

// ======================
// BOT
// ======================
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
// IMPORTANT FIX: TIMER STORAGE
// ======================
const muteTimers = new Map();

// ======================
// LOG EMBED SYSTEM
// ======================
function log(guild, title, desc, color = 0x2b2d31) {
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!ch) return;

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: "Moderation System PRO" });

    ch.send({ embeds: [embed] }).catch(() => {});
}

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
// READY
// ======================
client.once("ready", () => {
    console.log(`✅ CONNECTÉ ${client.user.tag}`);
});

// ======================
// WELCOME
// ======================
client.on("guildMemberAdd", async member => {

    const role = member.guild.roles.cache.get("1502820168596852736");
    if (role) member.roles.add(role).catch(() => {});

    const channel = member.guild.channels.cache.find(c => c.name === "bienvenue");
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle("👑 BIENVENUE")
        .setDescription(`Bienvenue ${member}`)
        .setImage("https://media.discordapp.net/attachments/1169683412387373098/1380701097072525454/ezgif.com-animated-gif-maker_6.gif")
        .setColor(0xff0000)
        .setTimestamp()
        .setFooter({ text: "Have fun ❤️" });

    channel.send({ content: `🎉 ${member}`, embeds: [embed] });
});

// ======================
// MESSAGE COMMANDS
// ======================
client.on("messageCreate", async message => {

    if (message.author.bot) return;

    const args = message.content.split(/ +/);
    const cmd = args[0].toLowerCase();

    // PING
    if (cmd === "!ping") return message.reply("🏓 Pong !");

    // BAN
    if (cmd === "!ban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply("❌ no perm");

        const member = await getMember(message.guild, args[1]);
        if (!member) return message.reply("❌ ID invalide");

        await member.ban().catch(() => {});

        log(message.guild,
            "🔨 BAN",
            `👤 ${member.user.tag} (${member.id})\n🛠️ par <@${message.author.id}> (${message.author.id})`,
            0xff0000
        );
    }

    // UNBAN
    if (cmd === "!unban") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply("❌ no perm");

        const id = args[1];
        if (!id) return message.reply("❌ ID");

        await message.guild.bans.remove(id).catch(() => {});

        log(message.guild,
            "🔓 UNBAN",
            `👤 ${id}\n🛠️ par <@${message.author.id}> (${message.author.id})`,
            0x00ff00
        );
    }

    // KICK
    if (cmd === "!kick") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
            return message.reply("❌ no perm");

        const member = await getMember(message.guild, args[1]);
        if (!member) return message.reply("❌ ID invalide");

        await member.kick().catch(() => {});

        log(message.guild,
            "👢 KICK",
            `👤 ${member.user.tag} (${member.id})\n🛠️ par <@${message.author.id}> (${message.author.id})`,
            0xff9900
        );
    }

    // CLEAR
    if (cmd === "!clear") {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return message.reply("❌ no perm");

        const amount = parseInt(args[1]);
        if (!amount || amount < 1 || amount > 100)
            return message.reply("❌ 1-100");

        await message.channel.bulkDelete(amount, true);

        log(message.guild,
            "🧹 CLEAR",
            `🗑️ ${amount} messages\n🛠️ par <@${message.author.id}> (${message.author.id})`,
            0x5865f2
        );
    }

    // MUTE MENU
    if (cmd === "!mute") {

        const id = args[1];
        const member = await getMember(message.guild, id);
        if (!member) return message.reply("❌ ID invalide");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`mute_5_${id}`).setLabel("5 min").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`mute_10_${id}`).setLabel("10 min").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`mute_15_${id}`).setLabel("15 min").setStyle(ButtonStyle.Danger)
        );

        message.reply({ content: `🔇 mute ${member.user.tag}`, components: [row] });
    }

    // UNMUTE MANUEL (IMPORTANT FIX TIMER CANCEL)
    if (cmd === "!unmute") {

        const member = await getMember(message.guild, args[1]);
        if (!member) return;

        const role = message.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);
        if (!role) return;

        await member.roles.remove(role).catch(() => {});

        // ❌ STOP AUTO TIMER
        if (muteTimers.has(member.id)) {
            clearTimeout(muteTimers.get(member.id));
            muteTimers.delete(member.id);
        }

        log(message.guild,
            "🔊 UNMUTE MANUEL",
            `👤 ${member.user.tag} (${member.id})\n🛠️ par <@${message.author.id}> (${message.author.id})`,
            0x00ff00
        );
    }
});

// ======================
// BUTTON SYSTEM (AUTO MUTE FIXED)
// ======================
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isButton()) return;

    const [a, time, id] = interaction.customId.split("_");
    if (a !== "mute") return;

    const member = await getMember(interaction.guild, id);
    if (!member) return;

    let role = interaction.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);

    if (!role) {
        role = await interaction.guild.roles.create({
            name: MUTE_ROLE_NAME,
            permissions: []
        });
    }

    await member.roles.add(role);

    interaction.reply({
        content: `🔇 muted ${member.user.tag}`,
        ephemeral: true
    });

    log(interaction.guild,
        "🔇 MUTE",
        `👤 ${member.user.tag} (${member.id})\n⏱️ ${time} min\n🛠️ par <@${interaction.user.id}> (${interaction.user.id})`,
        0xffaa00
    );

    // ======================
    // TIMER WITH FIX
    // ======================
    const timer = setTimeout(async () => {
        try {
            await member.roles.remove(role);

            log(interaction.guild,
                "🔊 UNMUTE AUTO",
                `👤 ${member.user.tag} (${member.id})`,
                0x00ff00
            );

            muteTimers.delete(member.id);

        } catch {}
    }, parseInt(time) * 60000);

    muteTimers.set(member.id, timer);
});

// ======================
// LOGIN
// ======================
client.login(process.env.TOKEN);