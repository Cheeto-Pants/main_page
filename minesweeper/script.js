const gridElement = document.getElementById('grid');
const gameContainer = document.getElementById('game-container'); // We need this for scaling
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

// --- SCALING LOGIC ---
function resizeGame() {
    if (!gameContainer) return;

    // Reset scale to 1 to get accurate natural dimensions
    gameContainer.style.transform = 'scale(1)';

    const padding = 40; // Safety buffer
    const availableWidth = window.innerWidth - padding;
    const availableHeight = window.innerHeight - padding;
    
    const contentWidth = gameContainer.offsetWidth;
    const contentHeight = gameContainer.offsetHeight;

    // Calculate the scale to fit whichever dimension is tighter
    const scale = Math.min(
        availableWidth / contentWidth,
        availableHeight / contentHeight
    );

    // Apply scale (clamp it so it doesn't get too tiny on mobile)
    gameContainer.style.transform = `scale(${Math.max(scale, 0.5)})`;
}

// Listen for window resizing
window.addEventListener('resize', resizeGame);

// --- DIRT PARTICLE ANIMATION ---
function createDirtParticles(x, y) {
    const particleCount = 8; // Number of dirt specks
    const colors = ['#8b5a2b', '#6d4c41', '#a1887f']; // Various dirt shades

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        document.body.appendChild(particle);

        // Random starting offset
        const offsetX = (Math.random() - 0.5) * 10;
        const offsetY = (Math.random() - 0.5) * 10;

        particle.style.left = `${x + offsetX}px`;
        particle.style.top = `${y + offsetY}px`;
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        // Random velocity
        const velocityX = (Math.random() - 0.5) * 80;
        const velocityY = (Math.random() - 1) * 80; // Bias upwards slightly

        // Animate using Web Animations API
        const animation = particle.animate([
            { transform: `translate(0, 0) scale(1)`, opacity: 1 },
            { transform: `translate(${velocityX}px, ${velocityY}px) scale(0)`, opacity: 0 }
        ], {
            duration: 400 + Math.random() * 200,
            easing: 'cubic-bezier(0, .9, .57, 1)', // "Pop" easing
        });

        // Cleanup after animation
        animation.onfinish = () => particle.remove();
    }
}

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
    
    // Recalculate size immediately after creating board
    setTimeout(resizeGame, 0); 
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

        // Pass the event 'e' so we can get coordinates for particles
        cell.addEventListener('click', (e) => handleClick(e, cell));
        cell.addEventListener('contextmenu', (e) => handleRightClick(e, cell));

        gridElement.appendChild(cell);
        
        grid.push({ 
            element: cell, 
            index: i,
            isMine: false, 
            isRevealed: false, 
            isFlagged: false, 
            nearbyMines: 0 
        });
    }
}

// Logic Helpers & Solvability
function getNeighbors(index) {
    const neighbors = [];
    const isLeftEdge = (index % width === 0);
    const isRightEdge = (index % width === width - 1);

    if (!isLeftEdge) neighbors.push(index - 1);
    if (!isRightEdge) neighbors.push(index + 1);
    if (index >= width) neighbors.push(index - width);
    if (index < width * (height - 1)) neighbors.push(index + width);
    
    if (!isLeftEdge && index >= width) neighbors.push(index - width - 1);
    if (!isRightEdge && index >= width) neighbors.push(index - width + 1);
    if (!isLeftEdge && index < width * (height - 1)) neighbors.push(index + width - 1);
    if (!isRightEdge && index < width * (height - 1)) neighbors.push(index + width + 1);

    return neighbors;
}

function handleFirstClick(startIndex) {
    let attempts = 0;
    const maxAttempts = 500;
    let success = false;
    const startNeighbors = getNeighbors(startIndex);
    const safeZone = new Set([startIndex, ...startNeighbors]);

    while (!success && attempts < maxAttempts) {
        attempts++;
        resetGridLogic();
        placeMinesRandomly(safeZone);
        calculateNumbers();
        if (isBoardSolvable(startIndex)) {
            success = true;
        }
    }
    
    startTimer();
    revealCell(startIndex);
    isFirstClick = false;
}

function resetGridLogic() {
    for (let i = 0; i < grid.length; i++) {
        grid[i].isMine = false;
        grid[i].nearbyMines = 0;
        grid[i].element.classList.remove('revealed', 'flagged', 'exploded');
        grid[i].element.innerText = '';
        grid[i].element.removeAttribute('data-num');
    }
}

function placeMinesRandomly(safeZone) {
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
        const randomIndex = Math.floor(Math.random() * (width * height));
        if (!grid[randomIndex].isMine && !safeZone.has(randomIndex)) {
            grid[randomIndex].isMine = true;
            minesPlaced++;
        }
    }
}

function calculateNumbers() {
    for (let i = 0; i < grid.length; i++) {
        if (grid[i].isMine) continue;
        const neighbors = getNeighbors(i);
        let count = 0;
        neighbors.forEach(n => {
            if (grid[n].isMine) count++;
        });
        grid[i].nearbyMines = count;
    }
}

function isBoardSolvable(startIndex) {
    let simGrid = grid.map(cell => ({
        isMine: cell.isMine,
        nearbyMines: cell.nearbyMines,
        isRevealed: false,
        isFlagged: false
    }));
    
    let revealedCount = 0;
    let changed = true;
    
    const revealSim = (idx) => {
        if (simGrid[idx].isRevealed) return;
        simGrid[idx].isRevealed = true;
        revealedCount++;
        if (simGrid[idx].nearbyMines === 0) {
            getNeighbors(idx).forEach(n => revealSim(n));
        }
    };
    revealSim(startIndex);

    while (changed) {
        changed = false;
        for (let i = 0; i < simGrid.length; i++) {
            if (!simGrid[i].isRevealed || simGrid[i].nearbyMines === 0) continue;
            const neighbors = getNeighbors(i);
            const hidden = neighbors.filter(n => !simGrid[n].isRevealed);
            const flagged = neighbors.filter(n => simGrid[n].isFlagged);
            const hiddenUnflagged = hidden.filter(n => !simGrid[n].isFlagged);

            if (hiddenUnflagged.length > 0 && 
                hiddenUnflagged.length === simGrid[i].nearbyMines - flagged.length) {
                hiddenUnflagged.forEach(n => simGrid[n].isFlagged = true);
                changed = true;
            }

            if (hiddenUnflagged.length > 0 && 
                flagged.length === simGrid[i].nearbyMines) {
                hiddenUnflagged.forEach(n => revealSim(n));
                changed = true;
            }
        }
    }

    const totalSafe = width * height - mineCount;
    return revealedCount === totalSafe;
}

function startTimer() {
    timer = setInterval(() => {
        timeElapsed++;
        timerElement.innerText = timeElapsed;
    }, 1000);
}

// Updated handleClick to accept Event (e)
function handleClick(e, cell) {
    const index = parseInt(cell.id);
    
    if (isGameOver || grid[index].isFlagged || grid[index].isRevealed) return;

    // Trigger dirt animation at click coordinates
    createDirtParticles(e.clientX, e.clientY);

    if (isFirstClick) {
        handleFirstClick(index);
        return; 
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
    if (isFirstClick) return; 
    
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

    let stack = [index];
    while(stack.length > 0) {
        let currentIdx = stack.pop();
        if(grid[currentIdx].isRevealed || grid[currentIdx].isFlagged) continue;

        grid[currentIdx].isRevealed = true;
        const cell = grid[currentIdx].element;
        cell.classList.add('revealed');

        if (grid[currentIdx].nearbyMines > 0) {
            cell.innerText = grid[currentIdx].nearbyMines;
            cell.setAttribute('data-num', grid[currentIdx].nearbyMines);
        } else {
            const neighbors = getNeighbors(currentIdx);
            neighbors.forEach(n => {
                if(!grid[n].isRevealed && !grid[n].isFlagged) {
                    stack.push(n);
                }
            });
        }
    }
}

function gameOver(index) {
    isGameOver = true;
    clearInterval(timer);
    messageElement.innerText = "Game Over!";
    grid.forEach(spot => {
        if (spot.isMine) {
            spot.element.innerText = '💣';
            spot.element.classList.add('revealed');
        } else if (spot.isFlagged) {
            spot.element.innerText = '❌'; 
        }
    });
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
difficultySelect.addEventListener('change', startGame);