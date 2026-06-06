const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

async function sendTicketPanel(channel) {

    const embed = new EmbedBuilder()
        .setColor('#ff7b00')
        .setTitle('🎫 PK DESIGN SERVICE | HỆ THỐNG TICKET')
        .setDescription(
            `
Chào mừng đến với **PK Design**.

Vui lòng chọn đúng loại ticket để đội ngũ hỗ trợ xử lý nhanh hơn.

🎨 **Logo** - Tư vấn / đặt thiết kế logo
🎬 **Video** - Chỉnh sửa video, intro, reels
🖼️ **Banner** - Banner, thumbnail, poster
💰 **Báo Giá** - Tư vấn giá dịch vụ

> Nhấn nút bên dưới để tạo ticket riêng tư.
`
        )
        .setImage('https://cdn.discordapp.com/attachments/1508360107778637825/1512511000560271410/314167bc-6ae3-49a2-b61b-05521f964465.png?ex=6a245b23&is=6a2309a3&hm=851d25ddd904871a1399586d124c94037b2c0eff873592561ed42448a4656d35&')
        .setFooter({ text: 'PK Design Service • Ticket System' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_open_logo')
                .setLabel('Logo')
                .setEmoji('🎨')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('ticket_open_video')
                .setLabel('Video')
                .setEmoji('🎬')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('ticket_open_banner')
                .setLabel('Banner')
                .setEmoji('🖼️')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('ticket_open_quote')
                .setLabel('Báo Giá')
                .setEmoji('💰')
                .setStyle(ButtonStyle.Danger)
        );

    await channel.send({
        embeds: [embed],
        components: [row]
    });
}

module.exports = {
    sendTicketPanel
};
