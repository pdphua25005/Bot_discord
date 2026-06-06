const {
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');

const {
    createTicketRecord,
    getOpenTicketByUser,
    getTicketByChannel,
    closeTicketRecord
} = require('./ticketStore');

const ticketTypes = {
    logo: {
        label: 'Logo',
        emoji: '🎨'
    },
    video: {
        label: 'Video',
        emoji: '🎬'
    },
    banner: {
        label: 'Banner',
        emoji: '🖼️'
    },
    quote: {
        label: 'Báo Giá',
        emoji: '💰'
    }
};

function safeChannelName(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 30);
}

async function getOrCreateTicketCategory(guild) {
    let category = guild.channels.cache.find(
        channel => channel.name === 'TICKETS' && channel.type === ChannelType.GuildCategory
    );

    if (!category) {
        category = await guild.channels.create({
            name: 'TICKETS',
            type: ChannelType.GuildCategory
        });
    }

    return category;
}

async function createTranscript(channel) {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sortedMessages = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const content = sortedMessages.map(message => {
        const time = new Date(message.createdTimestamp).toLocaleString('vi-VN');
        const attachments = message.attachments.map(file => file.url).join(' ');
        return `[${time}] ${message.author.tag}: ${message.content || ''} ${attachments}`.trim();
    }).join('\n');

    const buffer = Buffer.from(content || 'Ticket không có tin nhắn.', 'utf8');
    return new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });
}

async function openTicket(interaction) {
    const type = interaction.customId.replace('ticket_open_', '');
    const ticketType = ticketTypes[type];

    if (!ticketType) return;

    const existedTicket = getOpenTicketByUser(interaction.user.id);

    if (existedTicket) {
        const existedChannel = interaction.guild.channels.cache.get(existedTicket.channelId);

        if (existedChannel) {
            await interaction.reply({
                content: `⚠️ Bạn đang có ticket mở tại ${existedChannel}. Vui lòng đóng ticket cũ trước khi tạo ticket mới.`,
                ephemeral: true
            });
            return;
        }
    }

    const category = await getOrCreateTicketCategory(interaction.guild);
    const staffRoleId = process.env.TICKET_STAFF_ROLE_ID;

    const permissionOverwrites = [
        {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
        },
        {
            id: interaction.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles
            ]
        },
        {
            id: interaction.client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels
            ]
        }
    ];

    if (staffRoleId) {
        permissionOverwrites.push({
            id: staffRoleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages
            ]
        });
    }

    const channel = await interaction.guild.channels.create({
        name: `ticket-${safeChannelName(interaction.user.username)}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites
    });

    const ticket = createTicketRecord({
        channelId: channel.id,
        userId: interaction.user.id,
        username: interaction.user.tag,
        type: ticketType.label
    });

    await channel.setName(`ticket-${ticket.id}-${safeChannelName(interaction.user.username)}`);

    const embed = new EmbedBuilder()
        .setColor('#ff7b00')
        .setTitle(`${ticketType.emoji} Ticket #${ticket.id} - ${ticketType.label}`)
        .setDescription(
            `
Xin chào ${interaction.user}, ticket của bạn đã được tạo thành công.

Vui lòng gửi thông tin theo mẫu:

**1. Dịch vụ cần làm:**
**2. Mô tả yêu cầu:**
**3. Thời gian mong muốn:**
**4. Ngân sách nếu có:**
**5. File / hình ảnh tham khảo:**

Đội ngũ hỗ trợ sẽ phản hồi sớm nhất.
`
        )
        .addFields(
            { name: 'Người tạo', value: `${interaction.user}`, inline: true },
            { name: 'Loại ticket', value: ticketType.label, inline: true },
            { name: 'Trạng thái', value: '🟢 Đang mở', inline: true }
        )
        .setTimestamp();

    const closeRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Đóng ticket')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger)
        );

    await channel.send({
        content: staffRoleId ? `<@&${staffRoleId}> ${interaction.user}` : `${interaction.user}`,
        embeds: [embed],
        components: [closeRow]
    });

    await interaction.reply({
        content: `✅ Ticket của bạn đã được tạo: ${channel}`,
        ephemeral: true
    });
}

async function askCloseTicket(interaction) {
    const ticket = getTicketByChannel(interaction.channel.id);

    if (!ticket || ticket.status !== 'open') {
        await interaction.reply({
            content: '❌ Kênh này không phải ticket đang mở.',
            ephemeral: true
        });
        return;
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close_confirm')
                .setLabel('Xác nhận đóng')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId('ticket_close_cancel')
                .setLabel('Hủy')
                .setEmoji('↩️')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        content: 'Bạn có chắc chắn muốn đóng ticket này không?',
        components: [row],
        ephemeral: true
    });
}

async function confirmCloseTicket(interaction) {
    const ticket = closeTicketRecord(interaction.channel.id, interaction.user.tag);

    if (!ticket) {
        await interaction.reply({
            content: '❌ Không tìm thấy dữ liệu ticket.',
            ephemeral: true
        });
        return;
    }

    const transcript = await createTranscript(interaction.channel);
    const logChannelId = process.env.TICKET_LOG_CHANNEL_ID;
    const logChannel = logChannelId ? interaction.guild.channels.cache.get(logChannelId) : null;

    const logEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle(`🔒 Ticket #${ticket.id} đã đóng`)
        .addFields(
            { name: 'Người tạo', value: `<@${ticket.userId}>`, inline: true },
            { name: 'Loại', value: ticket.type, inline: true },
            { name: 'Đóng bởi', value: interaction.user.tag, inline: true },
            { name: 'Tạo lúc', value: `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:f>`, inline: true },
            { name: 'Đóng lúc', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
        )
        .setTimestamp();

    if (logChannel) {
        await logChannel.send({
            embeds: [logEmbed],
            files: [transcript]
        });
    }

    await interaction.reply({
        content: '🔒 Ticket sẽ được đóng sau vài giây...',
        ephemeral: true
    });

    await interaction.channel.send('🔒 Ticket đã được đóng. Cảm ơn bạn đã liên hệ PK Design.');

    setTimeout(async () => {
        await interaction.channel.delete().catch(() => null);
    }, 5000);
}

async function handleTicket(interaction) {
    if (interaction.customId.startsWith('ticket_open_')) {
        await openTicket(interaction);
        return;
    }

    if (interaction.customId === 'ticket_close') {
        await askCloseTicket(interaction);
        return;
    }

    if (interaction.customId === 'ticket_close_confirm') {
        await confirmCloseTicket(interaction);
        return;
    }

    if (interaction.customId === 'ticket_close_cancel') {
        await interaction.reply({
            content: '↩️ Đã hủy thao tác đóng ticket.',
            ephemeral: true
        });
    }
}

module.exports = {
    handleTicket
};
