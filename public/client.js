console.log('Client.js loaded');

// Get the server URL dynamically
const serverUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : window.location.origin;

const socket = io(serverUrl, {
    transports: ['websocket', 'polling']
});
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Make canvas size responsive
const GRID_SIZE = 20;
let cellSize;

function resizeCanvas() {
    const container = canvas.parentElement;
    const maxSize = Math.min(container.clientWidth, window.innerHeight * 0.7);
    
    canvas.width = maxSize;
    canvas.height = maxSize;
    cellSize = maxSize / GRID_SIZE;
    
    // Redraw if we have a game state
    if (lastGameState) {
        drawGame(lastGameState);
    }
}

// Store last game state for resize redraw
let lastGameState = null;

// Update socket.on('gameState')
socket.on('gameState', (gameState) => {
    lastGameState = gameState;
    drawGame(gameState);
    document.getElementById('currentScore').textContent = gameState.score;
    document.getElementById('highScore').textContent = gameState.highScore;
});

// Add resize observer for container resizing
const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
});
resizeObserver.observe(canvas.parentElement);

// Add this to your existing window resize listener
window.addEventListener('resize', () => {
    resizeCanvas();
});

// Call resize initially
resizeCanvas();

let myCurrentVote = null;

function drawGame(gameState) {
    if (!gameState?.snake) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#2F3136';
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            ctx.strokeRect(i * cellSize, j * cellSize, cellSize, cellSize);
        }
    }
    
    // Draw snake
    gameState.snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#5865F2' : '#4752C4';
        ctx.fillRect(
            segment.x * cellSize + 1,
            segment.y * cellSize + 1,
            cellSize - 2,
            cellSize - 2
        );
    });
    
    // Draw food
    if (gameState.food && gameState.currentFood) {
        ctx.font = `${cellSize-4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            gameState.currentFood,
            gameState.food.x * cellSize + cellSize/2,
            gameState.food.y * cellSize + cellSize/2
        );
    }
}

// Simplified vote display
function updateVoteDisplay(data) {
    const directions = {
        up: { emoji: '⬆️', color: '#5865F2' },
        down: { emoji: '⬇️', color: '#EB459E' },
        left: { emoji: '⬅️', color: '#FEE75C' },
        right: { emoji: '➡️', color: '#5865F2' }
    };
    
    const voteHTML = Object.entries(data.votes)
        .map(([dir, count]) => {
            const { emoji, color } = directions[dir];
            const isMyVote = myCurrentVote === dir;
            const width = Math.max((count / data.totalUsers) * 100, 2);
            
            return `
                <div class="vote-option vote-${dir} ${isMyVote ? 'my-vote' : ''}">
                    <div class="vote-header">
                        <span class="vote-emoji">${emoji}</span>
                        <span class="vote-count">${count}</span>
                    </div>
                    <div class="vote-bar-bg">
                        <div class="vote-bar" style="width: ${width}%"></div>
                    </div>
                </div>
            `;
        })
        .join('');

    document.getElementById('currentVotes').innerHTML = `
        <div class="votes-container">${voteHTML}</div>
    `;
}

// Event handlers
function vote(direction) {
    socket.emit('vote', direction);
}

document.addEventListener('keydown', (event) => {
    const keys = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    };
    if (keys[event.key]) {
        vote(keys[event.key]);
        event.preventDefault();
    }
});

// Socket events
socket.on('connect', () => document.body.style.opacity = '1');
socket.on('disconnect', () => document.body.style.opacity = '0.5');

socket.on('yourVote', direction => {
    myCurrentVote = direction;
});

socket.on('voteUpdate', updateVoteDisplay);

socket.on('timer', (timeLeft) => {
    const seconds = (timeLeft/1000).toFixed(1);
    document.getElementById('timer').innerHTML = `${seconds}s`;
});

socket.on('userCount', count => {
    document.getElementById('onlineUsers').textContent = count;
});
  