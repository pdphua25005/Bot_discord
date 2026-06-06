const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { QueueRepeatMode } = require('discord-player');
const { getPlayer } = require('./player');

const MUSIC_COMMANDS = [
    'play',
    'skip',
    'pause',
    'resume',
    'stop',
    'queue',
    'nowplaying',
    'volume',
    'loop',
    'shuffle'
];

function isMusicCommand(command) {
    return MUSIC_COMMANDS.includes(command);
}

function formatDuration(track) {
    return track?.duration || 'Không rõ';
}

function createMusicButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_pause_resume')
            .setLabel('Pause/Resume')
            .setEmoji('⏯️')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('music_skip')
            .setLabel('Skip')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId('music_loop')
            .setLabel('Loop')
            .setEmoji('🔁')
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId('music_stop')
            .setLabel('Stop')
            .setEmoji('⏹️')
            .setStyle(ButtonStyle.Danger)
    );
}

function createNowPlayingEmbed(track, queue) {
    const volume = queue?.node?.volume ?? 100;
    const repeatMode = queue?.repeatMode ?? QueueRepeatMode.OFF;

    const repeatText = {
        [QueueRepeatMode.OFF]: 'Tắt',
        [QueueRepeatMode.TRACK]: 'Lặp bài hiện tại',
        [QueueRepeatMode.QUEUE]: 'Lặp hàng chờ',
        [QueueRepeatMode.AUTOPLAY]: 'Autoplay'
    }[repeatMode] || 'Tắt';

    const embed = new EmbedBuilder()
        .setColor('#ff6600')
        .setTitle('🎵 Đang phát nhạc')
        .setDescription(`**${track.title}**`)
        .addFields(
            {
                name: '⏱️ Thời lượng',
                value: formatDuration(track),
                inline: true
            },
            {
                name: '🔊 Âm lượng',
                value: `${volume}%`,
                inline: true
            },
            {
                name: '🔁 Loop',
                value: repeatText,
                inline: true
            },
            {
                name: '👤 Yêu cầu bởi',
                value: `${track.requestedBy || 'Không rõ'}`,
                inline: true
            }
        )
        .setTimestamp();

    if (track.thumbnail) {
        embed.setThumbnail(track.thumbnail);
    }

    if (track.url) {
        embed.setURL(track.url);
    }

    return embed;
}

async function getQueue(interaction) {
    const player = getPlayer();

    if (!player) return null;

    return player.nodes.get(interaction.guildId);
}

async function handleMusic(interaction) {
    const command = interaction.commandName;
    const player = getPlayer();

    if (!player) {
        return interaction.reply({
            content: '❌ Music player chưa được khởi tạo.',
            ephemeral: true
        });
    }

    if (command === 'play') {
        const query = interaction.options.getString('song');
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                content: '❌ Bạn phải vào voice channel trước.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const searchResult = await player.search(query, {
                requestedBy: interaction.user
            });

            if (!searchResult || !searchResult.tracks.length) {
                return interaction.editReply('❌ Không tìm thấy bài hát.');
            }

            const queue = player.nodes.create(interaction.guild, {
                metadata: {
                    channel: interaction.channel,
                    requestedBy: interaction.user
                },
                selfDeaf: true,
                volume: 80,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 30000,
                leaveOnEnd: true,
                leaveOnEndCooldown: 30000
            });

            if (!queue.connection) {
                await queue.connect(voiceChannel);
            }

            const track = searchResult.tracks[0];
            queue.addTrack(track);

            if (!queue.isPlaying()) {
                await queue.node.play();
            }

            const embed = createNowPlayingEmbed(track, queue)
                .setTitle('🎵 Đã thêm/phát nhạc');

            return interaction.editReply({
                embeds: [embed],
                components: [createMusicButtons()]
            });
        } catch (error) {
            console.error('❌ Lỗi play:', error);
            return interaction.editReply(`❌ Lỗi phát nhạc: ${error.message}`);
        }
    }

    const queue = await getQueue(interaction);

    if (command === 'skip') {
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                content: '❌ Hiện không có bài nào đang phát.',
                ephemeral: true
            });
        }

        queue.node.skip();
        return interaction.reply('⏭️ Đã chuyển sang bài tiếp theo.');
    }

    if (command === 'pause') {
        if (!queue || !queue.isPlaying()) {
            return interaction.reply({
                content: '❌ Hiện không có bài nào đang phát.',
                ephemeral: true
            });
        }

        queue.node.pause();
        return interaction.reply('⏸️ Đã tạm dừng nhạc.');
    }

    if (command === 'resume') {
        if (!queue) {
            return interaction.reply({
                content: '❌ Không có hàng chờ nhạc.',
                ephemeral: true
            });
        }

        queue.node.resume();
        return interaction.reply('▶️ Đã tiếp tục phát nhạc.');
    }

    if (command === 'stop') {
        if (!queue) {
            return interaction.reply({
                content: '❌ Không có nhạc để dừng.',
                ephemeral: true
            });
        }

        queue.delete();
        return interaction.reply('⏹️ Đã dừng nhạc và rời voice.');
    }

    if (command === 'nowplaying') {
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: '❌ Hiện không có bài nào đang phát.',
                ephemeral: true
            });
        }

        return interaction.reply({
            embeds: [createNowPlayingEmbed(queue.currentTrack, queue)],
            components: [createMusicButtons()]
        });
    }

    if (command === 'queue') {
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                content: '❌ Hàng chờ đang trống.',
                ephemeral: true
            });
        }

        const tracks = queue.tracks
            .toArray()
            .slice(0, 10)
            .map((track, index) => `${index + 1}. ${track.title} - ${formatDuration(track)}`)
            .join('\n') || 'Không có bài tiếp theo.';

        const embed = new EmbedBuilder()
            .setColor('#ff6600')
            .setTitle('📜 Hàng chờ nhạc')
            .setDescription(
                `🎶 **Đang phát:** ${queue.currentTrack.title}\n\n` +
                `**Bài tiếp theo:**\n${tracks}`
            )
            .setFooter({
                text: `Tổng bài trong hàng chờ: ${queue.tracks.size}`
            })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    if (command === 'volume') {
        if (!queue) {
            return interaction.reply({
                content: '❌ Không có nhạc đang phát.',
                ephemeral: true
            });
        }

        const percent = interaction.options.getInteger('percent');

        queue.node.setVolume(percent);
        return interaction.reply(`🔊 Đã chỉnh âm lượng thành **${percent}%**.`);
    }

    if (command === 'loop') {
        if (!queue) {
            return interaction.reply({
                content: '❌ Không có nhạc đang phát.',
                ephemeral: true
            });
        }

        const mode = interaction.options.getString('mode');

        const modeMap = {
            off: QueueRepeatMode.OFF,
            track: QueueRepeatMode.TRACK,
            queue: QueueRepeatMode.QUEUE,
            autoplay: QueueRepeatMode.AUTOPLAY
        };

        queue.setRepeatMode(modeMap[mode]);

        const labelMap = {
            off: 'Tắt loop',
            track: 'Lặp bài hiện tại',
            queue: 'Lặp hàng chờ',
            autoplay: 'Autoplay'
        };

        return interaction.reply(`🔁 Đã bật chế độ: **${labelMap[mode]}**.`);
    }

    if (command === 'shuffle') {
        if (!queue || queue.tracks.size < 2) {
            return interaction.reply({
                content: '❌ Cần ít nhất 2 bài trong hàng chờ để trộn.',
                ephemeral: true
            });
        }

        queue.tracks.shuffle();
        return interaction.reply('🔀 Đã trộn hàng chờ nhạc.');
    }
}

async function handleMusicButton(interaction) {
    const queue = await getQueue(interaction);

    if (!queue) {
        return interaction.reply({
            content: '❌ Không có nhạc đang phát.',
            ephemeral: true
        });
    }

    if (interaction.customId === 'music_pause_resume') {
        if (queue.node.isPaused()) {
            queue.node.resume();
            return interaction.reply({ content: '▶️ Đã tiếp tục phát.', ephemeral: true });
        }

        queue.node.pause();
        return interaction.reply({ content: '⏸️ Đã tạm dừng.', ephemeral: true });
    }

    if (interaction.customId === 'music_skip') {
        if (!queue.isPlaying()) {
            return interaction.reply({ content: '❌ Không có bài đang phát.', ephemeral: true });
        }

        queue.node.skip();
        return interaction.reply({ content: '⏭️ Đã chuyển bài.', ephemeral: true });
    }

    if (interaction.customId === 'music_loop') {
        const nextMode = queue.repeatMode === QueueRepeatMode.OFF
            ? QueueRepeatMode.TRACK
            : queue.repeatMode === QueueRepeatMode.TRACK
                ? QueueRepeatMode.QUEUE
                : QueueRepeatMode.OFF;

        queue.setRepeatMode(nextMode);

        const label = nextMode === QueueRepeatMode.OFF
            ? 'Tắt'
            : nextMode === QueueRepeatMode.TRACK
                ? 'Lặp bài hiện tại'
                : 'Lặp hàng chờ';

        return interaction.reply({ content: `🔁 Loop: **${label}**`, ephemeral: true });
    }

    if (interaction.customId === 'music_stop') {
        queue.delete();
        return interaction.reply({ content: '⏹️ Đã dừng nhạc.', ephemeral: true });
    }
}

module.exports = {
    handleMusic,
    handleMusicButton,
    isMusicCommand
};

