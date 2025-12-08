const gridElement = document.getElementById('grid');
const flagsLeftElement = document.getElementById('flags-left');
const timerElement = document.getElementById('timer');
const difficultySelect = document.getElementById('difficulty');
const messageElement = document.getElementById('message');

let width, height, mineCount;
let grid = [];
let flags = 0;
let isGameOver = false;
let isFirstClick = true;
let timer;
let timeElapsed = 0;

const difficulties = {
    easy: { width: 10, height: 8, mines: 10 },
    medium: { width: 18, height: 14, mines: 40 },
    hard: { width: 24, height: 20, mines: 99 }
};

// Start Game
function startGame() {
    const level = difficulties[difficultySelect.value];
    width = level.width;
    height = level.height;
    mineCount = level.mines;
    
    grid = [];
    flags = 0;
    isGameOver = false;
    isFirstClick = true;
    timeElapsed = 0;
    messageElement.innerText = "";
    
    clearInterval(timer);
    timerElement.innerText = 0;
    flagsLeftElement.innerText = mineCount;

    // Set Grid CSS
    gridElement.style.gridTemplateColumns = `repeat(${width}, 30px)`;
    gridElement.innerHTML = '';

    createBoard();
}

function createBoard() {
    for (let i = 0; i < width * height; i++) {
        const cell = document.createElement('div');
        cell.id = i;
        cell.classList.add('cell');
        
        // Checkerboard pattern
        const row = Math.floor(i / width);
        const col = i % width;
        if ((row + col) % 2 === 0) cell.classList.add('even');
        else cell.classList.add('odd');

        cell.addEventListener('click', () => handleClick(cell));
        cell.addEventListener('contextmenu', (e) => handleRightClick(e, cell));
        
        gridElement.appendChild(cell);
        grid.push({ element: cell, isMine: false, isRevealed: false, isFlagged: false, nearbyMines: 0 });
    }
}

// Generate mines excluding the first clicked index to ensure safety
function placeMines(excludeIndex) {
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
        const randomIndex = Math.floor(Math.random() * (width * height));
        if (!grid[randomIndex].isMine && randomIndex !== excludeIndex) {
            grid[randomIndex].isMine = true;
            minesPlaced++;
        }
    }
    calculateNumbers();
}

function calculateNumbers() {
    for (let i = 0; i < grid.length; i++) {
        if (grid[i].isMine) continue;
        let total = 0;
        const isLeftEdge = (i % width === 0);
        const isRightEdge = (i % width === width - 1);

        // Check 8 neighbors
        if (!isLeftEdge && grid[i - 1]?.isMine) total++; // Left
        if (!isRightEdge && grid[i + 1]?.isMine) total++; // Right
        if (i >= width && grid[i - width]?.isMine) total++; // Top
        if (i < width * (height - 1) && grid[i + width]?.isMine) total++; // Bottom
        if (!isLeftEdge && i >= width && grid[i - width - 1]?.isMine) total++; // Top-Left
        if (!isRightEdge && i >= width && grid[i - width + 1]?.isMine) total++; // Top-Right
        if (!isLeftEdge && i < width * (height - 1) && grid[i + width - 1]?.isMine) total++; // Bottom-Left
        if (!isRightEdge && i < width * (height - 1) && grid[i + width + 1]?.isMine) total++; // Bottom-Right

        grid[i].nearbyMines = total;
    }
}

function startTimer() {
    timer = setInterval(() => {
        timeElapsed++;
        timerElement.innerText = timeElapsed;
    }, 1000);
}

function handleClick(cell) {
    const index = parseInt(cell.id);
    if (isGameOver || grid[index].isFlagged || grid[index].isRevealed) return;

    if (isFirstClick) {
        placeMines(index);
        startTimer();
        isFirstClick = false;
    }

    if (grid[index].isMine) {
        gameOver(index);
    } else {
        revealCell(index);
        checkWin();
    }
}

function handleRightClick(e, cell) {
    e.preventDefault();
    const index = parseInt(cell.id);
    if (isGameOver || grid[index].isRevealed) return;

    if (!grid[index].isFlagged) {
        grid[index].isFlagged = true;
        cell.classList.add('flagged');
        cell.innerText = '🚩';
        flags++;
    } else {
        grid[index].isFlagged = false;
        cell.classList.remove('flagged');
        cell.innerText = '';
        flags--;
    }
    flagsLeftElement.innerText = mineCount - flags;
}

function revealCell(index) {
    if (index < 0 || index >= width * height || grid[index].isRevealed || grid[index].isFlagged) return;

    grid[index].isRevealed = true;
    const cell = grid[index].element;
    cell.classList.add('revealed');

    if (grid[index].nearbyMines > 0) {
        cell.innerText = grid[index].nearbyMines;
        cell.setAttribute('data-num', grid[index].nearbyMines);
    } else {
        // Flood fill empty spaces
        const isLeftEdge = (index % width === 0);
        const isRightEdge = (index % width === width - 1);
        
        setTimeout(() => {
            if (!isLeftEdge) revealCell(index - 1);
            if (!isRightEdge) revealCell(index + 1);
            revealCell(index - width);
            revealCell(index + width);
            if (!isLeftEdge) revealCell(index - width - 1);
            if (!isRightEdge) revealCell(index - width + 1);
            if (!isLeftEdge) revealCell(index + width - 1);
            if (!isRightEdge) revealCell(index + width + 1);
        }, 10);
    }
}

function gameOver(index) {
    isGameOver = true;
    clearInterval(timer);
    messageElement.innerText = "Game Over!";
    
    // Reveal all mines
    grid.forEach(spot => {
        if (spot.isMine) {
            spot.element.innerText = '💣';
            spot.element.classList.add('revealed');
        }
    });
    
    // Highlight the one you clicked
    grid[index].element.classList.add('exploded');
}

function checkWin() {
    const matches = grid.filter(spot => spot.isRevealed).length;
    if (matches === (width * height - mineCount)) {
        isGameOver = true;
        clearInterval(timer);
        messageElement.innerText = "You Win!";
        grid.forEach(spot => {
            if(spot.isMine && !spot.isFlagged) {
                spot.element.innerText = '🚩';
                spot.element.classList.add('flagged');
            }
        });
    }
}

// Init
startGame();