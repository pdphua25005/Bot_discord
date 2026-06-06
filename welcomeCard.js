const Canvas = require('canvas');
const { AttachmentBuilder } = require('discord.js');

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

async function createWelcome(member) {
    const canvas = Canvas.createCanvas(1920, 720);
    const ctx = canvas.getContext('2d');

    const background = await Canvas.loadImage('./assets/welcome-bg.png');
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    const cardX = 1080;
    const cardY = 95;
    const cardW = 800;
    const cardH = 530;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 12, 20, 0.75)';
    roundRect(ctx, cardX, cardY, cardW, cardH, 32);
    ctx.fill();

    // ctx.strokeStyle = '#ff7b00';
    // ctx.lineWidth = 2.5;
    // ctx.shadowColor = '#ff7b00';
    // ctx.shadowBlur = 26;
    // ctx.stroke();
    ctx.restore();

    const avatarSize = 220;
    const avatarX = cardX + 45;
    const avatarY = cardY + 75;

    const avatar = await Canvas.loadImage(
        member.user.displayAvatarURL({
            extension: 'png',
            size: 1024
        })
    );

    ctx.save();
    ctx.beginPath();
    ctx.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
    );
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    const ringGradient = ctx.createLinearGradient(
        avatarX,
        avatarY,
        avatarX + avatarSize,
        avatarY + avatarSize
    );
    ringGradient.addColorStop(0, '#a855f7');
    ringGradient.addColorStop(1, '#ff7b00');

    ctx.strokeStyle = ringGradient;
    ctx.lineWidth = 9;
    ctx.shadowColor = '#ff7b00';
    ctx.shadowBlur = 35;
    ctx.beginPath();
    ctx.arc(
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
    );
    ctx.stroke();
    ctx.shadowBlur = 0;

    const contentX = avatarX + avatarSize + 50;
    const contentY = avatarY + 10;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Arial';
    ctx.fillText('WELCOME TO', contentX, contentY);

    const titleGradient = ctx.createLinearGradient(contentX, 0, contentX + 400, 0);
    titleGradient.addColorStop(0, '#a855f7');
    titleGradient.addColorStop(1, '#ff7b00');
    ctx.fillStyle = titleGradient;
    ctx.font = 'bold 58px Arial';
    ctx.fillText('PK DESIGN', contentX, contentY + 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Arial';
    ctx.fillText(member.user.username, contentX, contentY + 125);

    // ctx.strokeStyle = '#ff7b00';
    // ctx.lineWidth = 3;
    // ctx.beginPath();
    // ctx.moveTo(contentX, contentY + 140);
    // ctx.lineTo(contentX + 300, contentY + 140);
    // ctx.stroke();

    ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
    roundRect(ctx, contentX, contentY + 155, 160, 38, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px Arial';
    ctx.fillText('NEW MEMBER', contentX + 18, contentY + 183);

    const infoStartY = contentY + 220;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px Arial';

    ctx.fillText(`Member #${member.guild.memberCount}`, contentX, infoStartY);
    ctx.fillText(`Joined: ${new Date().toLocaleDateString('vi-VN')}`, contentX, infoStartY + 32);
    ctx.fillText('Status: ACTIVE', contentX, infoStartY + 64);

    const boxY = cardY + cardH - 95;
    const boxW = 165;
    const boxH = 68;
    const gap = 12;

    const box1X = cardX + 45;
    const box2X = box1X + boxW + gap;
    const box3X = box2X + boxW + gap;

    const boxes = [
        { x: box1X, label: 'TOTAL MEMBERS', value: member.guild.memberCount.toString(), fill: 'rgba(168, 85, 247, 0.18)', color: '#a855f7' },
        { x: box2X, label: 'JOIN DATE', value: new Date().toLocaleDateString('vi-VN'), fill: 'rgba(255, 123, 0, 0.18)', color: '#ff7b00' },
        { x: box3X, label: 'STATUS', value: 'ACTIVE', fill: 'rgba(168, 85, 247, 0.18)', color: '#8b5cf6' }
    ];

    boxes.forEach(box => {
        ctx.fillStyle = box.fill;
        roundRect(ctx, box.x, boxY, boxW, boxH, 12);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText(box.label, box.x + 15, boxY + 24);

        ctx.fillStyle = box.color;
        ctx.font = 'bold 26px Arial';
        ctx.fillText(box.value, box.x + 15, boxY + 52);
    });

    return new AttachmentBuilder(canvas.toBuffer('image/png'), {
        name: 'welcome.png'
    });
}

module.exports = {
    createWelcome
};
