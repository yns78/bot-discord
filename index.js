require('dotenv').config();

const express = require("express");
const app = express();

// ======================
// WEB SERVER (Render)
// ======================

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
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

// ======================
// BIENVENUE + ROLE AUTO
// ======================

client.on('guildMemberAdd', async member => {

    const role = member.guild.roles.cache.get('1502820168596852736');

    if (role) {
        await member.roles.add(role).catch(console.error);
    }

    const channel = member.guild.channels.cache.find(
        c => c.name === 'bienvenue'
    );

    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('👑 BIENVENUE SUR LE SERVEUR 👑')
        .setDescription(`
# 🎉 BIENVENUE ${member}

🔥 Merci d'avoir rejoint la communauté !

📜 Lis le règlement
🎮 Prends tes rôles
💬 Présente-toi

⭐ Tu es le membre n°${member.guild.memberCount}
        `)
        .setImage('https://media.discordapp.net/attachments/1169683412387373098/1380701097072525454/ezgif.com-animated-gif-maker_6.gif')
        .setTimestamp();

    channel.send({
        content: `🎉 ${member}`,
        embeds: [embed]
    });
});

// ======================
// COMMANDES
// ======================

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    // ========= PING =========
    if (command === '!ping') {
        return message.reply('🏓 Pong !');
    }

    // ========= BAN =========
    if (command === '!ban') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
            return message.reply('❌ Permission refusée.');

        const userId =
            message.mentions.users.first()?.id ||
            args[1];

        if (!userId)
            return message.reply('❌ Utilise : !ban @user ou !ban ID');

        try {
            await message.guild.members.ban(userId);
            message.channel.send(`🔨 Utilisateur banni : ${userId}`);
        } catch {
            message.reply('❌ Impossible de bannir cet utilisateur.');
        }
    }

    // ========= KICK =========
    if (command === '!kick') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
            return message.reply('❌ Permission refusée.');

        const userId =
            message.mentions.users.first()?.id ||
            args[1];

        if (!userId)
            return message.reply('❌ Utilise : !kick @user ou !kick ID');

        try {
            const member = await message.guild.members.fetch(userId).catch(() => null);

            if (!member)
                return message.reply("❌ Utilisateur introuvable");

            await member.kick();

            message.channel.send(`👢 Utilisateur expulsé : ${userId}`);

        } catch {
            message.reply('❌ Impossible de kick cet utilisateur.');
        }
    }

    // ========= CLEAR =========
    if (command === '!clear') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
            return message.reply('❌ Permission refusée.');

        const amount = parseInt(args[1]);

        if (!amount || amount < 1 || amount > 100)
            return message.reply('❌ Nombre entre 1 et 100.');

        await message.channel.bulkDelete(amount, true);

        const msg = await message.channel.send(
            `🧹 ${amount} messages supprimés.`
        );

        setTimeout(() => {
            msg.delete().catch(() => {});
        }, 3000);
    }
});

// ======================
// LOGIN BOT
// ======================

client.login(process.env.TOKEN);