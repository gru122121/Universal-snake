const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    path: '/socket.io/'
});

const UniversalSnake = require('./public/game.js');
const PORT = process.env.PORT || 3000;
const UPDATE_INTERVAL = 50;
const MOVE_INTERVAL = 1000;

class GameServer {
    constructor() {
        this.game = new UniversalSnake();
        this.onlineUsers = 0;
        this.userVotes = new Map();
        this.moveInterval = null;
        this.setupServer();
    }

    updateVoteCounts() {
        // Reset and recalculate votes
        Object.keys(this.game.moveVotes).forEach(direction => {
            this.game.moveVotes[direction] = 0;
        });
        
        this.userVotes.forEach(vote => {
            this.game.moveVotes[vote]++;
        });
    }

    broadcastGameState() {
        io.emit('gameState', {
            snake: this.game.snake,
            food: this.game.food,
            currentFood: this.game.currentFood,
            score: this.game.score,
            highScore: this.game.highScore
        });
    }

    broadcastVotes() {
        io.emit('voteUpdate', {
            votes: this.game.moveVotes,
            totalUsers: this.onlineUsers,
            totalVotes: this.userVotes.size
        });
    }

    handleVote(socket, direction) {
        if (!['up', 'down', 'left', 'right'].includes(direction)) return;
        
        this.userVotes.set(socket.id, direction);
        this.updateVoteCounts();
        this.broadcastVotes();
        socket.emit('yourVote', direction);
    }

    handleDisconnect(socket) {
        this.onlineUsers = Math.max(0, this.onlineUsers - 1);
        
        if (this.userVotes.has(socket.id)) {
            this.userVotes.delete(socket.id);
            this.updateVoteCounts();
        }

        io.emit('userCount', this.onlineUsers);
        this.broadcastVotes();
    }

    startGameLoop() {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
        }

        this.moveInterval = setInterval(() => {
            let timeLeft = this.game.voteTimeout;
            
            const countDown = setInterval(() => {
                timeLeft -= UPDATE_INTERVAL;
                io.emit('timer', timeLeft);
                
                if (timeLeft <= 0) {
                    clearInterval(countDown);
                    
                    // Move snake and reset state
                    this.game.move();
                    this.userVotes.clear();
                    this.updateVoteCounts();
                    
                    // Broadcast updates
                    this.broadcastGameState();
                    this.broadcastVotes();
                }
            }, UPDATE_INTERVAL);
        }, MOVE_INTERVAL);
    }

    setupServer() {
        // Rate limiting for votes
        const voteCooldowns = new Map();
        const VOTE_COOLDOWN = 100; // ms

        io.on('connection', (socket) => {
            this.onlineUsers++;
            io.emit('userCount', this.onlineUsers);
            
            // Send initial state
            socket.emit('gameState', {
                snake: this.game.snake,
                food: this.game.food,
                currentFood: this.game.currentFood,
                score: this.game.score,
                highScore: this.game.highScore
            });
            
            socket.emit('voteUpdate', {
                votes: this.game.moveVotes,
                totalUsers: this.onlineUsers
            });

            // Handle votes with rate limiting
            socket.on('vote', (direction) => {
                const now = Date.now();
                const lastVote = voteCooldowns.get(socket.id) || 0;
                
                if (now - lastVote >= VOTE_COOLDOWN) {
                    voteCooldowns.set(socket.id, now);
                    this.handleVote(socket, direction);
                }
            });

            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

// Start server
const gameServer = new GameServer();

app.use(express.static('public'));
app.use(express.json({ limit: '10kb' })); // Limit payload size

// For Vercel, we need to handle both the WebSocket and HTTP
if (process.env.VERCEL) {
    module.exports = app;
} else {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        gameServer.startGameLoop();
    });
} 