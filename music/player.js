const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');

let player;

async function initPlayer(client) {
    player = new Player(client, {
        ytdlOptions: {
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        }
    });

    await player.extractors.register(YoutubeiExtractor, {});

    player.events.on('playerStart', (queue, track) => {
        console.log(`🎵 Đang phát: ${track.title}`);
    });

    player.events.on('audioTrackAdd', (queue, track) => {
        console.log(`➕ Đã thêm vào hàng chờ: ${track.title}`);
    });

    player.events.on('playerError', (queue, error) => {
        console.error('PLAYER ERROR:', error);
    });

    player.events.on('error', (queue, error) => {
        console.error('QUEUE ERROR:', error);
    });

    player.events.on('debug', (queue, message) => {
        console.log('DEBUG:', message);
    });

    console.log('🎵 Music Player Ready');
}

function getPlayer() {
    return player;
}

module.exports = {
    initPlayer,
    getPlayer
};