// Canvas setup
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

// Grid dimensions
const ROWS = 20;
const COLUMNS = 10;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 25;

// Colors for tetrominoes
const COLORS = [
    null,
    '#FF0D72', // Z - red
    '#0DC2FF', // J - blue
    '#0DFF72', // S - green
    '#F538FF', // T - purple
    '#FF8E0D', // L - orange
    '#FFE138', // O - yellow
    '#3877FF'  // I - light blue
];

// Tetromino shapes defined in matrix format
const SHAPES = [
    null,
    // Z
    [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ],
    // J
    [
        [0, 2, 0],
        [0, 2, 0],
        [2, 2, 0]
    ],
    // S
    [
        [0, 3, 3],
        [3, 3, 0],
        [0, 0, 0]
    ],
    // T
    [
        [0, 4, 0],
        [4, 4, 4],
        [0, 0, 0]
    ],
    // L
    [
        [0, 5, 0],
        [0, 5, 0],
        [0, 5, 5]
    ],
    // O
    [
        [6, 6],
        [6, 6]
    ],
    // I
    [
        [0, 0, 0, 0],
        [7, 7, 7, 7],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]
];

// Game state
let gameOver = false;
let paused = false;
let score = 0;
let level = 1;
let dropInterval = 1000; // Initial drop speed in ms
let lastTime = 0;
let dropCounter = 0;

// Game board
const board = createBoard(ROWS, COLUMNS);

// Player object
const player = {
    position: {x: 0, y: 0},
    matrix: null,
    score: 0,
    next: null
};

// DOM elements
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');

// Initialize game
function init() {
    context.scale(BLOCK_SIZE, BLOCK_SIZE);
    nextContext.scale(NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
    
    player.next = createPiece(Math.floor(Math.random() * 7) + 1);
    resetPlayer();
    updateScore();
    draw();
}

// Create empty game board
function createBoard(rows, cols) {
    return Array.from({length: rows}, () => Array(cols).fill(0));
}

// Create a random tetromino piece
function createPiece(type) {
    if (type === undefined) {
        type = Math.floor(Math.random() * 7) + 1;
    }
    return SHAPES[type];
}

// Reset player position and get new piece
function resetPlayer() {
    player.matrix = player.next;
    player.next = createPiece();
    player.position.y = 0;
    player.position.x = Math.floor(COLUMNS / 2) - Math.floor(player.matrix[0].length / 2);
    
    // Check for game over
    if (collide(board, player)) {
        gameOver = true;
        alert('游戏结束! 得分: ' + player.score);
    }
}

// Draw everything
function draw() {
    // Clear canvas
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw board
    drawMatrix(board, {x: 0, y: 0}, context);
    
    // Draw current piece
    drawMatrix(player.matrix, player.position, context);
    
    // Draw next piece preview
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const nextPosition = {
        x: player.next[0].length === 4 ? 0 : 0.5,
        y: player.next.length === 4 ? 0 : 0.5
    };
    
    drawMatrix(player.next, nextPosition, nextContext);
}

// Draw a matrix (board or tetromino)
function drawMatrix(matrix, offset, ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // Draw block border
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 0.05;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// Collision detection
function collide(board, player) {
    const [m, o] = [player.matrix, player.position];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] === undefined ||
                 board[y + o.y][x + o.x] === undefined ||
                 board[y + o.y][x + o.x] !== 0)) {
                return true;
            }
        }
    }
    return false;
}

// Merge tetromino with the board
function merge(board, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.position.y][x + player.position.x] = value;
            }
        });
    });
}

// Rotate tetromino
function rotate(matrix, dir) {
    // Transpose matrix
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    
    // Reverse each row for clockwise, columns for counterclockwise
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

// Player drop
function playerDrop() {
    player.position.y++;
    
    if (collide(board, player)) {
        player.position.y--;
        merge(board, player);
        resetPlayer();
        clearLines();
        updateScore();
    }
    
    dropCounter = 0;
}

// Player move
function playerMove(dir) {
    player.position.x += dir;
    
    if (collide(board, player)) {
        player.position.x -= dir;
    }
}

// Player rotate
function playerRotate(dir) {
    const pos = player.position.x;
    let offset = 1;
    
    rotate(player.matrix, dir);
    
    // Handle collision during rotation
    while (collide(board, player)) {
        player.position.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        
        // If offset gets too large, rotation isn't possible
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.position.x = pos;
            return;
        }
    }
}

// Clear completed lines
function clearLines() {
    let linesCleared = 0;
    
    outer: for (let y = board.length - 1; y >= 0; y--) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        
        // Remove the line and add an empty one at the top
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        y++;
        linesCleared++;
    }
    
    if (linesCleared > 0) {
        // Update score
        player.score += linesCleared * 100 * linesCleared; // More points for multiple lines at once
        
        // Update level and drop speed
        if (player.score >= level * 1000) {
            level++;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
            levelElement.textContent = level;
        }
    }
}

// Update score display
function updateScore() {
    scoreElement.textContent = player.score;
}

// Game loop
function update(time = 0) {
    if (gameOver || paused) return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    requestAnimationFrame(update);
}

// Hard drop (instant placement)
function hardDrop() {
    while (!collide(board, player)) {
        player.position.y++;
    }
    
    player.position.y--;
    merge(board, player);
    resetPlayer();
    clearLines();
    updateScore();
}

// Event listeners
document.addEventListener('keydown', event => {
    if (gameOver || paused) return;
    
    switch (event.keyCode) {
        case 37: // Left arrow
            playerMove(-1);
            break;
        case 39: // Right arrow
            playerMove(1);
            break;
        case 40: // Down arrow
            playerDrop();
            break;
        case 38: // Up arrow
            playerRotate(1);
            break;
        case 32: // Space
            hardDrop();
            break;
    }
});

startButton.addEventListener('click', () => {
    if (gameOver) {
        gameOver = false;
        board.forEach(row => row.fill(0));
        player.score = 0;
        level = 1;
        dropInterval = 1000;
        updateScore();
        levelElement.textContent = level;
    }
    
    paused = false;
    lastTime = 0;
    update();
});

pauseButton.addEventListener('click', () => {
    paused = !paused;
    if (!paused) {
        lastTime = 0;
        update();
    }
    pauseButton.textContent = paused ? '继续' : '暂停';
});

// Initialize game on load
init(); 