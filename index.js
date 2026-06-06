require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    PermissionFlagsBits,
    SlashCommandBuilder,
    REST,
    Routes,
    EmbedBuilder
} = require('discord.js');

const { createWelcome } = require('./welcomeCard');
const { sendTicketPanel } = require('./ticket/ticketPanel');
const { handleTicket } = require('./ticket/ticketHandler');
const { getStats } = require('./ticket/ticketStore');
const { initPlayer } = require('./music/player');
const {
    handleMusic,
    handleMusicButton,
    isMusicCommand
} = require('./music/musicHandler');

const STAFF_ROLE_ID = process.env.TICKET_STAFF_ROLE_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

function isBotStaff(interaction) {
    if (!STAFF_ROLE_ID) return false;
    return interaction.member.roles.cache.has(STAFF_ROLE_ID);
}

const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Phát nhạc trong voice channel')
        .addStringOption(option =>
            option
                .setName('song')
                .setDescription('Tên bài hát hoặc link Youtube/SoundCloud/Spotify')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Bỏ qua bài hiện tại'),

    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Tạm dừng nhạc'),

    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Tiếp tục phát nhạc'),

    new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Dừng nhạc và rời voice'),

    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Xem hàng chờ nhạc'),

    new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Xem bài đang phát'),

    new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Chỉnh âm lượng nhạc')
        .addIntegerOption(option =>
            option
                .setName('percent')
                .setDescription('Âm lượng từ 1 đến 100')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Chỉnh chế độ lặp nhạc')
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Chọn chế độ loop')
                .setRequired(true)
                .addChoices(
                    { name: 'Tắt', value: 'off' },
                    { name: 'Lặp bài hiện tại', value: 'track' },
                    { name: 'Lặp hàng chờ', value: 'queue' },
                    { name: 'Autoplay', value: 'autoplay' }
                )
        ),

    new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Trộn hàng chờ nhạc'),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Xoá tin nhắn trong kênh')
        .addStringOption(option =>
            option
                .setName('amount')
                .setDescription('Nhập số lượng hoặc all')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Cảnh cáo thành viên')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Người bị cảnh cáo')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Lý do cảnh cáo')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick thành viên khỏi server')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Người bị kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Lý do kick')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban thành viên khỏi server')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Người bị ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Lý do ban')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Khoá kênh hiện tại'),

    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Mở khoá kênh hiện tại'),

    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Gửi thông báo bằng bot')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Nội dung thông báo')
                .setRequired(true)
        )
].map(command => command.toJSON());

client.once('clientReady', async () => {
    console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);

    try {
        await initPlayer(client);
    } catch (error) {
        console.error('❌ Lỗi khởi tạo Music Player:', error);
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log('✅ Đã đăng ký slash commands');
    } catch (error) {
        console.error('❌ Lỗi đăng ký slash commands:', error);
    }
});

client.on('guildMemberAdd', async member => {
    const channel = member.guild.channels.cache.get(
        process.env.WELCOME_CHANNEL_ID
    );

    if (!channel) return;

    try {
        const image = await createWelcome(member);

        const embed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle('🎨 Chào mừng đến với PK Design & Editor')
            .setDescription(
                `Xin chào ${member} 👋\n\n` +
                `✨ **DESIGN • EDIT • DEVELOP • ELEVATE**\n\n` +
                `🖌️ **DỊCH VỤ THIẾT KẾ**\n` +
                `• Logo Discord, Team, GTA5\n` +
                `• Banner\n` +
                `• Poster\n` +
                `• Thumbnail\n` +
                `• Avatar & Cover\n` +
                `• Chỉnh sửa hình ảnh chuyên nghiệp\n\n` +

                `🎬 **DỊCH VỤ EDIT VIDEO**\n` +
                `• Video quảng bá máy chủ GTA5\n` +
                `• Xây dựng kênh TikTok\n` +
                `• Edit Highlight Gaming\n` +
                `• Edit video theo yêu cầu\n` +
                `• Nhận edit dài hạn số lượng lớn\n\n` +

                `💎 **CAM KẾT**\n` +
                `✅ Chất lượng\n` +
                `✅ Uy tín\n` +
                `✅ Hỗ trợ tận tâm\n` +
                `✅ Bảo hành sau bàn giao\n\n` +

                `📩 Hãy tạo Ticket nếu bạn cần hỗ trợ hoặc sử dụng dịch vụ.`
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setFooter({
                text: `Hiện tại server có ${member.guild.memberCount} thành viên`
            })
            .setTimestamp();

        await channel.send({
            embeds: [embed],
            files: [image]
        });
    } catch (err) {
        console.error('Lỗi Welcome:', err);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === '!testwelcome') {
        const image = await createWelcome(message.member);

        await message.channel.send({
            content: '🧪 Test Welcome Card',
            files: [image]
        });

        return;
    }

    if (message.content.toLowerCase() === '!panel') {
        await sendTicketPanel(message.channel);
        return;
    }

    if (message.content.toLowerCase() === '!ticketstats') {
        const stats = getStats();

        const byTypeText =
            Object.entries(stats.byType)
                .map(([type, count]) => `• ${type}: ${count}`)
                .join('\n') || 'Chưa có dữ liệu';

        await message.channel.send({
            content:
                `📊 **THỐNG KÊ TICKET**\n\n` +
                `🎫 Tổng ticket: **${stats.total}**\n` +
                `🟢 Đang mở: **${stats.open}**\n` +
                `🔒 Đã đóng: **${stats.closed}**\n\n` +
                `**Theo loại:**\n${byTypeText}`
        });
    }
            if (message.content.toLowerCase() === '!about') {

            const embed = new EmbedBuilder()
                .setColor('#8A2BE2')
                .setTitle('🎨 PK DESIGN & EDITOR')
                .setDescription(
                    '✨ DESIGN • EDIT • DEVELOP • ELEVATE\n\n' +
                    'Chào mừng bạn đến với **PK Design & Editor** – đơn vị chuyên cung cấp các giải pháp thiết kế sáng tạo, chỉnh sửa nội dung chuyên nghiệp và phát triển hệ thống kỹ thuật số theo yêu cầu.'
                )
                .addFields(
                    {
                        name: '🖌️ DỊCH VỤ THIẾT KẾ',
                        value:
                            '• Logo Discord, Team, Máy chủ GTA5 trọn bộ\n' +
                            '• Banner\n' +
                            '• Poster\n' +
                            '• Thumbnail\n' +
                            '• Avatar & Cover\n' +
                            '• Chỉnh sửa cắt / ghép hình ảnh chuyên nghiệp'
                    },
                    {
                        name: '🎬 DỊCH VỤ EDIT VIDEO',
                        value:
                            '• Video quảng bá máy chủ GTA5\n' +
                            '• Xây kênh Tiktok cho máy chủ GTA5\n' +
                            '• Dịch vụ edit highlight game\n' +
                            '• Dịch vụ edit video theo yêu cầu\n' +
                            '• Dịch vụ edit video dài hạn số lượng lớn'
                    },
                    {
                        name: '💎 CAM KẾT',
                        value:
                            '✅ Chất lượng\n' +
                            '✅ Uy tín\n' +
                            '✅ Hỗ trợ tận tâm\n' +
                            '✅ Bảo hành sau bàn giao'
                    }
                )
                .setFooter({
                    text: 'PK Design & Editor'
                })
                .setTimestamp();

            await message.channel.send({
                embeds: [embed]
            });

            return;
        }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('music_')) {
                return handleMusicButton(interaction);
            }

            await handleTicket(interaction);
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = interaction.commandName;

        if (isMusicCommand(command)) {
            return handleMusic(interaction);
        }

        if (!isBotStaff(interaction)) {
            return interaction.reply({
                content: '❌ Bạn không có quyền sử dụng lệnh quản trị bot.',
                ephemeral: true
            });
        }

        if (command === 'clear') {
            const amountInput = interaction.options.getString('amount');

            await interaction.deferReply({ ephemeral: true });

            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.editReply('❌ Bot chưa có quyền Manage Messages.');
            }

            if (amountInput.toLowerCase() === 'all') {
                let totalDeleted = 0;

                while (true) {
                    const messages = await interaction.channel.messages.fetch({
                        limit: 100
                    });

                    if (messages.size === 0) break;

                    const deleted = await interaction.channel.bulkDelete(
                        messages,
                        true
                    );

                    totalDeleted += deleted.size;

                    if (deleted.size < 2) break;
                }

                return interaction.editReply(
                    `✅ Đã xoá **${totalDeleted}** tin nhắn gần đây.`
                );
            }

            const amount = parseInt(amountInput);

            if (isNaN(amount) || amount < 1 || amount > 100) {
                return interaction.editReply(
                    '❌ Chỉ nhập số từ 1 đến 100 hoặc `all`.'
                );
            }

            const messages = await interaction.channel.messages.fetch({
                limit: amount
            });

            const deleted = await interaction.channel.bulkDelete(
                messages,
                true
            );

            return interaction.editReply(
                `✅ Đã xoá **${deleted.size}** tin nhắn.`
            );
        }

        if (command === 'warn') {
            const user = interaction.options.getUser('user');
            const reason =
                interaction.options.getString('reason') ||
                'Không có lý do';

            const embed = new EmbedBuilder()
                .setColor('#ffcc00')
                .setTitle('⚠️ CẢNH CÁO')
                .setDescription(`${user} đã bị cảnh cáo.`)
                .addFields(
                    {
                        name: 'Lý do',
                        value: reason
                    },
                    {
                        name: 'Người thực hiện',
                        value: `${interaction.user}`
                    }
                )
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (command === 'kick') {
            const user = interaction.options.getUser('user');
            const reason =
                interaction.options.getString('reason') ||
                'Không có lý do';

            const member = await interaction.guild.members.fetch(user.id);

            if (!member.kickable) {
                return interaction.reply({
                    content: '❌ Bot không thể kick người này. Hãy kiểm tra role của bot.',
                    ephemeral: true
                });
            }

            await member.kick(reason);

            return interaction.reply(
                `✅ Đã kick **${user.tag}**.\nLý do: ${reason}`
            );
        }

        if (command === 'ban') {
            const user = interaction.options.getUser('user');
            const reason =
                interaction.options.getString('reason') ||
                'Không có lý do';

            const member = await interaction.guild.members.fetch(user.id);

            if (!member.bannable) {
                return interaction.reply({
                    content: '❌ Bot không thể ban người này. Hãy kiểm tra role của bot.',
                    ephemeral: true
                });
            }

            await member.ban({ reason });

            return interaction.reply(
                `✅ Đã ban **${user.tag}**.\nLý do: ${reason}`
            );
        }

        if (command === 'lock') {
            await interaction.channel.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                {
                    SendMessages: false
                }
            );

            return interaction.reply('🔒 Kênh này đã được khoá.');
        }

        if (command === 'unlock') {
            await interaction.channel.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                {
                    SendMessages: true
                }
            );

            return interaction.reply('🔓 Kênh này đã được mở khoá.');
        }

        if (command === 'announce') {
            const message = interaction.options.getString('message');

            const embed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('📢 THÔNG BÁO')
                .setDescription(message)
                .setFooter({
                    text: `Thông báo bởi ${interaction.user.tag}`
                })
                .setTimestamp();

            await interaction.channel.send({
                embeds: [embed]
            });

            return interaction.reply({
                content: '✅ Đã gửi thông báo.',
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('❌ Lỗi interaction:', error);

        if (interaction.deferred || interaction.replied) {
            return interaction.editReply(`❌ Có lỗi xảy ra: ${error.message}`);
        }

        return interaction.reply({
            content: `❌ Có lỗi xảy ra: ${error.message}`,
            ephemeral: true
        });
    }
});

client.login(process.env.TOKEN);
// Pikay dev