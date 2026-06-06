const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'tickets.json');

function ensureStore() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, JSON.stringify({
            lastId: 0,
            tickets: []
        }, null, 4));
    }
}

function readStore() {
    ensureStore();
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeStore(data) {
    ensureStore();
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 4));
}

function createTicketRecord({ channelId, userId, username, type }) {
    const data = readStore();
    data.lastId += 1;

    const ticket = {
        id: data.lastId,
        channelId,
        userId,
        username,
        type,
        status: 'open',
        createdAt: new Date().toISOString(),
        closedAt: null,
        closedBy: null
    };

    data.tickets.push(ticket);
    writeStore(data);
    return ticket;
}

function getOpenTicketByUser(userId) {
    const data = readStore();
    return data.tickets.find(ticket => ticket.userId === userId && ticket.status === 'open');
}

function getTicketByChannel(channelId) {
    const data = readStore();
    return data.tickets.find(ticket => ticket.channelId === channelId);
}

function closeTicketRecord(channelId, closedBy) {
    const data = readStore();
    const ticket = data.tickets.find(item => item.channelId === channelId);

    if (!ticket) return null;

    ticket.status = 'closed';
    ticket.closedAt = new Date().toISOString();
    ticket.closedBy = closedBy;

    writeStore(data);
    return ticket;
}

function getStats() {
    const data = readStore();
    const total = data.tickets.length;
    const open = data.tickets.filter(ticket => ticket.status === 'open').length;
    const closed = data.tickets.filter(ticket => ticket.status === 'closed').length;

    const byType = data.tickets.reduce((result, ticket) => {
        result[ticket.type] = (result[ticket.type] || 0) + 1;
        return result;
    }, {});

    return {
        total,
        open,
        closed,
        byType
    };
}

module.exports = {
    createTicketRecord,
    getOpenTicketByUser,
    getTicketByChannel,
    closeTicketRecord,
    getStats
};
