require("dotenv").config();

const fs = require("fs");
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
// EXPRESS (Render)
// ======================
const app = express();
app.get("/", (req, res) => res.send("Bot OK"));
app.listen(process.env.PORT || 3000, () => console.log("🌐 Serveur OK"));

// ======================
// CLIENT DISCORD
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
// LOG SYSTEM
// ======================
function log(guild, msg) {
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (ch) ch.send(msg).catch(() => {});
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
        .setColor("#ff0000")
        .setTitle("👑 BIENVENUE 👑")
        .setDescription(`Bienvenue ${member}`)
        .setImage("https://media.discordapp.net/attachments/1169683412387373098/1380701097072525454/ezgif.com-animated-gif-maker_6.gif")
        .setTimestamp();

    channel.send({ content: `🎉 ${member}`, embeds: [embed] });
});

// ======================
// COMMANDES
// ======================
client.on("messageCreate", async message => {

    if (message.author.bot) return;
    if (!message.guild) return;

    const args = message.content.split(/ +/);
    const cmd = args[0].toLowerCase();

    // ======================
    // PING
    // ======================
    if (cmd === "!ping") {
        return message.reply("🏓 Pong !");
    }

    // ======================
    // BAN
    // ======================
    if (cmd === "!ban") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply("❌ Pas la permission");

        const member = await getMember(message.guild, args[1]);
        if (!member) return message.reply("❌ ID invalide");

        await member.ban().catch(() => {});

        message.channel.send(`🔨 BAN ${member.user.tag}`);

        log(message.guild,
            `🔨 BAN | ${member.user.tag} | par ${message.author.tag}`
        );
    }

    // ======================
    // UNBAN
    // ======================
    if (cmd === "!unban") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply("❌ Pas la permission");

        const id = args[1];
        if (!id) return message.reply("❌ ID requis");

        await message.guild.bans.remove(id).catch(() => {});

        message.channel.send(`🔓 UNBAN ${id}`);

        log(message.guild,
            `🔓 UNBAN | ${id} | par ${message.author.tag}`
        );
    }

    // ======================
    // KICK
    // ======================
    if (cmd === "!kick") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
            return message.reply("❌ Pas la permission");

        const member = await getMember(message.guild, args[1]);
        if (!member) return message.reply("❌ ID invalide");

        await member.kick().catch(() => {});

        message.channel.send(`👢 KICK ${member.user.tag}`);

        log(message.guild,
            `👢 KICK | ${member.user.tag} | par ${message.author.tag}`
        );
    }

    // ======================
    // CLEAR
    // ======================
    if (cmd === "!clear") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return message.reply("❌ Pas la permission");

        const amount = parseInt(args[1]);
        if (!amount || amount < 1 || amount > 100)
            return message.reply("❌ 1-100");

        await message.channel.bulkDelete(amount, true);

        message.channel.send(`🧹 ${amount} messages supprimés`);

        log(message.guild,
            `🧹 CLEAR ${amount} | par ${message.author.tag}`
        );
    }

    // ======================
    // MUTE MENU (BOUTONS PRO)
    // ======================
    if (cmd === "!mute") {

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles))
            return message.reply("❌ Pas la permission");

        const id = args[1];
        if (!id) return message.reply("❌ !mute ID");

        const member = await getMember(message.guild, id);
        if (!member) return message.reply("❌ ID invalide");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`mute_5_${id}`)
                .setLabel("5 min")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`mute_10_${id}`)
                .setLabel("10 min")
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`mute_15_${id}`)
                .setLabel("15 min")
                .setStyle(ButtonStyle.Danger)
        );

        return message.reply({
            content: `🔇 Choisis la durée pour ${member.user.tag}`,
            components: [row]
        });
    }

    // ======================
    // UNMUTE MANUEL
    // ======================
    if (cmd === "!unmute") {

        const member = await getMember(message.guild, args[1]);
        if (!member) return;

        const role = message.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);
        if (!role) return;

        await member.roles.remove(role).catch(() => {});

        log(message.guild,
            `🔊 UNMUTE MANUEL | ${member.user.tag} | par ${message.author.tag}`
        );
    }
});

// ======================
// BUTTON HANDLER (MUTE SYSTEM)
// ======================
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isButton()) return;

    const [action, time, id] = interaction.customId.split("_");

    if (action !== "mute") return;

    const member = await getMember(interaction.guild, id);
    if (!member) return interaction.reply({ content: "❌ user introuvable", ephemeral: true });

    let role = interaction.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);

    if (!role) {
        role = await interaction.guild.roles.create({
            name: MUTE_ROLE_NAME,
            permissions: []
        });
    }

    const ms = parseInt(time) * 60000;

    await member.roles.add(role);

    interaction.reply({
        content: `🔇 ${member.user.tag} mute ${time} minutes`,
        ephemeral: true
    });

    log(interaction.guild,
        `🔇 MUTE | ${member.user.tag} | ${time} min | par ${interaction.user.tag}`
    );

    setTimeout(async () => {
        try {
            await member.roles.remove(role);

            log(interaction.guild,
                `🔊 UNMUTE AUTO | ${member.user.tag}`
            );
        } catch {}
    }, ms);
});

// ======================
// LOGIN
// ======================
client.login(process.env.TOKEN);