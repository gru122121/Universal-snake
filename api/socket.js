import { Server } from 'socket.io';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const app = require('../server.js');
const server = createServer(app);
const io = new Server(server);

export default function SocketHandler(req, res) {
    if (res.socket.server.io) {
        res.end();
        return;
    }

    io.attach(res.socket.server);
    res.socket.server.io = io;
    res.end();
} 