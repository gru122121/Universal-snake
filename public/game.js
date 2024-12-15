class UniversalSnake {
    constructor() {
        this.foodTypes = ['🍎', '🍐', '🍊', '🍋', '🍇', '🫐', '🍓'];
        this.currentFood = this.foodTypes[0];
        this.snake = [{x: 10, y: 10}];
        this.food = this.generateFood();
        this.direction = 'right';
        this.moveVotes = {
            up: 0,
            down: 0,
            left: 0,
            right: 1
        };
        this.voteTimeout = 1000;
        this.score = 0;
        this.highScore = 0;
    }

    generateFood() {
        this.currentFood = this.foodTypes[Math.floor(Math.random() * this.foodTypes.length)];
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * 20),
                y: Math.floor(Math.random() * 20)
            };
        } while (this.snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }

    addVote(direction) {
        this.moveVotes[direction]++;
    }

    removeVote(direction) {
        if (this.moveVotes[direction] > 0) {
            this.moveVotes[direction]--;
        }
    }

    getMostVotedDirection() {
        const votes = Object.entries(this.moveVotes);
        if (votes.every(([_, count]) => count === 0)) {
            this.moveVotes[this.direction] = 1;
            return this.direction;
        }
        return votes.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }

    resetVotes() {
        for (let direction in this.moveVotes) {
            this.moveVotes[direction] = 0;
        }
    }

    move() {
        const newDirection = this.getMostVotedDirection();
        
        // Prevent 180-degree turns
        if (!(this.direction === 'left' && newDirection === 'right') &&
            !(this.direction === 'right' && newDirection === 'left') &&
            !(this.direction === 'up' && newDirection === 'down') &&
            !(this.direction === 'down' && newDirection === 'up')) {
            this.direction = newDirection;
        }

        const head = {...this.snake[0]};
        switch(this.direction) {
            case 'up': head.y--; break;
            case 'down': head.y++; break;
            case 'left': head.x--; break;
            case 'right': head.x++; break;
        }

        // Wrap around walls
        if (head.x < 0) head.x = 19;
        if (head.x > 19) head.x = 0;
        if (head.y < 0) head.y = 19;
        if (head.y > 19) head.y = 0;

        // Check collision
        if (this.checkCollision(head)) {
            this.gameOver();
            return false;
        }

        this.snake.unshift(head);
        
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            if (this.score > this.highScore) {
                this.highScore = this.score;
            }
            this.food = this.generateFood();
        } else {
            this.snake.pop();
        }

        this.resetVotes();
        return true;
    }

    checkCollision(head) {
        return this.snake.slice(1).some(segment => 
            segment.x === head.x && segment.y === head.y
        );
    }

    gameOver() {
        this.snake = [{x: 10, y: 10}];
        this.direction = 'right';
        this.score = 0;
        this.food = this.generateFood();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UniversalSnake;
} else {
    window.UniversalSnake = UniversalSnake;
} 