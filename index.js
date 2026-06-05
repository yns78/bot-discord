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
// SYSTEMS
// ======================
const muteTimers = new Map();
const muteOwners = new Map();
const warns = new Map();

// ======================
// LOG SYSTEM
// ======================
function log(guild, title, desc, color = 0x2b2d31) {
    const ch = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!ch) return;

    const embed = new EmbedBuilder()
        .setTitle(`🤖 ${title}`)
        .setDescription(desc)
        .setColor(color)
        .setFooter({ text: "Moderation System • FULL BOT" })
        .setTimestamp();

    ch.send({ embeds: [embed] }).catch(() => {});
}

// ======================
// SAFE FETCH
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
// ANTI RAID BASIC
// ======================
const joinCooldown = new Map();

// ======================
// WELCOME
// ======================
client.on("guildMemberAdd", async member => {

    const last = joinCooldown.get(member.guild.id) || 0;
    const now = Date.now();

    if (now - last < 1500) {
        log(member.guild, "⚠️ ANTI RAID", `${member.user.tag}`, 0xff0000);
    }

    joinCooldown.set(member.guild.id, now);

    const channel = member.guild.channels.cache.find(c => c.name === "bienvenue");
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle("👑 BIENVENUE SUR LE SERVEUR 👑")
        .setDescription(
`🎉 BIENVENUE ${member}

🔥 Merci d'avoir rejoint la communauté !

📜 Lis le règlement  
🎮 Prends tes rôles  
💬 Présente-toi  

⭐ Tu es le membre n°${member.guild.memberCount}`
        )
        .setColor(0xff0000)
        .setImage("https://media.discordapp.net/attachments/1169683412387373098/1380701097072525454/ezgif.com-animated-gif-maker_6.gif")
        .setTimestamp();

    channel.send({ content: `🎉 ${member}`, embeds: [embed] });
});

// ======================
// COMMANDES
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
            return;

        const m = await getMember(message.guild, args[1]);
        if (!m) return;

        await m.ban().catch(() => {});

        log(message.guild, "BAN",
            `${m.user.tag} (${m.id})\npar ${message.author.tag}`,
            0xff0000
        );
    }

    // UNBAN
    if (cmd === "!unban") {
        const id = args[1];
        await message.guild.bans.remove(id).catch(() => {});

        log(message.guild, "UNBAN",
            `${id}\npar ${message.author.tag}`,
            0x00ff00
        );
    }

    // KICK
    if (cmd === "!kick") {
        const m = await getMember(message.guild, args[1]);
        if (!m) return;

        await m.kick().catch(() => {});

        log(message.guild, "KICK",
            `${m.user.tag}\npar ${message.author.tag}`,
            0xff9900
        );
    }

    // CLEAR
    if (cmd === "!clear") {
        const amount = parseInt(args[1]);
        if (!amount) return;

        await message.channel.bulkDelete(amount, true);

        log(message.guild, "CLEAR",
            `${amount} messages\npar ${message.author.tag}`,
            0x5865f2
        );
    }

    // WARN SYSTEM
    if (cmd === "!warn") {
        const id = args[1];
        const reason = args.slice(2).join(" ") || "No reason";

        if (!warns.has(id)) warns.set(id, []);
        warns.get(id).push(reason);

        log(message.guild, "WARN",
            `${id}\nraison: ${reason}\npar ${message.author.tag}`,
            0xffff00
        );
    }

    // MUTE MENU
    if (cmd === "!mute") {

        const id = args[1];
        const m = await getMember(message.guild, id);
        if (!m) return;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`mute_5_${id}`).setLabel("5 min").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`mute_10_${id}`).setLabel("10 min").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`mute_15_${id}`).setLabel("15 min").setStyle(ButtonStyle.Danger)
        );

        const msg = await message.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("🔇 MUTE SYSTEM")
                    .setDescription(`Choisis durée pour **${m.user.tag}**`)
                    .setColor(0xffa500)
            ],
            components: [row]
        });

        muteOwners.set(msg.id, message.author.id);
    }

    // UNMUTE MANUEL
    if (cmd === "!unmute") {
        const m = await getMember(message.guild, args[1]);
        if (!m) return;

        const role = message.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);
        if (!role) return;

        await m.roles.remove(role).catch(() => {});

        if (muteTimers.has(m.id)) {
            clearTimeout(muteTimers.get(m.id));
            muteTimers.delete(m.id);
        }

        log(message.guild, "UNMUTE MANUEL",
            `${m.user.tag} (${m.id})\npar ${message.author.tag}`,
            0x00ff00
        );
    }
});

// ======================
// BUTTON SYSTEM LOCK
// ======================
client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isButton()) return;

    const [a, time, id] = interaction.customId.split("_");
    if (a !== "mute") return;

    const owner = muteOwners.get(interaction.message.id);

    if (owner && interaction.user.id !== owner) {
        return interaction.reply({
            content: "❌ interdit",
            ephemeral: true
        });
    }

    const m = await getMember(interaction.guild, id);
    if (!m) return;

    let role = interaction.guild.roles.cache.find(r => r.name === MUTE_ROLE_NAME);
    if (!role) {
        role = await interaction.guild.roles.create({ name: MUTE_ROLE_NAME, permissions: [] });
    }

    await m.roles.add(role);

    interaction.reply({ content: `🔇 mute ${m.user.tag}`, ephemeral: true });

    log(interaction.guild, "MUTE",
        `${m.user.tag} (${m.id})\n${time} min\npar ${interaction.user.tag}`,
        0xffaa00
    );

    const timer = setTimeout(async () => {
        await m.roles.remove(role).catch(() => {});

        log(interaction.guild, "UNMUTE AUTO",
            `${m.user.tag} (${m.id})`,
            0x00ff00
        );

        muteTimers.delete(m.id);
    }, parseInt(time) * 60000);

    muteTimers.set(m.id, timer);
});

// ======================
// LOGIN
// ======================
client.login(process.env.TOKEN);