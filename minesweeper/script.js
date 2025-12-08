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
        
        // Initialize logic state
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

// --- Logic Helpers ---

// Get all valid neighbor indices for a specific index
function getNeighbors(index) {
    const neighbors = [];
    const isLeftEdge = (index % width === 0);
    const isRightEdge = (index % width === width - 1);

    if (!isLeftEdge) neighbors.push(index - 1); // Left
    if (!isRightEdge) neighbors.push(index + 1); // Right
    if (index >= width) neighbors.push(index - width); // Top
    if (index < width * (height - 1)) neighbors.push(index + width); // Bottom
    
    if (!isLeftEdge && index >= width) neighbors.push(index - width - 1); // Top-Left
    if (!isRightEdge && index >= width) neighbors.push(index - width + 1); // Top-Right
    if (!isLeftEdge && index < width * (height - 1)) neighbors.push(index + width - 1); // Bottom-Left
    if (!isRightEdge && index < width * (height - 1)) neighbors.push(index + width + 1); // Bottom-Right

    return neighbors;
}

// --- Board Generation (No Guess Logic) ---

function handleFirstClick(startIndex) {
    let attempts = 0;
    const maxAttempts = 500; // Prevent infinite loops on Hard mode
    let bestGrid = null;
    let success = false;

    // We define a "Safe Zone" around the start click. 
    // This guarantees an opening of 0, creating a large open area.
    const startNeighbors = getNeighbors(startIndex);
    const safeZone = new Set([startIndex, ...startNeighbors]);

    while (!success && attempts < maxAttempts) {
        attempts++;
        resetGridLogic(); // Clear previous attempt
        placeMinesRandomly(safeZone);
        calculateNumbers();

        // Check if this board is solvable without guessing
        if (isBoardSolvable(startIndex)) {
            success = true;
        }
    }

    // If we couldn't find a perfect no-guess board in time, 
    // we use the last generated board (which is still valid, just might need a guess later).
    // The "Safe Zone" logic ensures the start is still good.
    console.log(`Board generated in ${attempts} attempts. Solvable: ${success}`);

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

// --- Solvability Solver ---
// Simulates playing the game to see if it requires guessing
function isBoardSolvable(startIndex) {
    // Clone grid state for simulation (don't touch DOM)
    let simGrid = grid.map(cell => ({
        isMine: cell.isMine,
        nearbyMines: cell.nearbyMines,
        isRevealed: false,
        isFlagged: false
    }));
    
    let revealedCount = 0;
    let changed = true;
    
    // Reveal start (Simulation)
    const revealSim = (idx) => {
        if (simGrid[idx].isRevealed) return;
        simGrid[idx].isRevealed = true;
        revealedCount++;
        if (simGrid[idx].nearbyMines === 0) {
            getNeighbors(idx).forEach(n => revealSim(n));
        }
    };
    revealSim(startIndex);

    // Iteratively apply logic rules
    while (changed) {
        changed = false;
        
        for (let i = 0; i < simGrid.length; i++) {
            if (!simGrid[i].isRevealed || simGrid[i].nearbyMines === 0) continue;

            const neighbors = getNeighbors(i);
            const hidden = neighbors.filter(n => !simGrid[n].isRevealed);
            const flagged = neighbors.filter(n => simGrid[n].isFlagged);
            const hiddenUnflagged = hidden.filter(n => !simGrid[n].isFlagged);

            // Rule 1: If hidden cells equals number remaining -> All are mines
            // (nearby - flagged) == hidden unflagged count
            if (hiddenUnflagged.length > 0 && 
                hiddenUnflagged.length === simGrid[i].nearbyMines - flagged.length) {
                hiddenUnflagged.forEach(n => {
                    simGrid[n].isFlagged = true;
                });
                changed = true;
            }

            // Rule 2: If flagged cells equals number -> All others are safe
            if (hiddenUnflagged.length > 0 && 
                flagged.length === simGrid[i].nearbyMines) {
                hiddenUnflagged.forEach(n => {
                    revealSim(n);
                });
                changed = true;
            }
        }
    }

    // Solvable if all non-mines are revealed
    const totalSafe = width * height - mineCount;
    return revealedCount === totalSafe;
}

// --- Game Interactions ---

function startTimer() {
    timer = setInterval(() => {
        timeElapsed++;
        timerElement.innerText = timeElapsed;
    }, 1000);
}

function handleClick(cell) {
    const index = parseInt(cell.id);
    
    // If first click, generate the board now
    if (isFirstClick) {
        handleFirstClick(index);
        return; 
    }

    if (isGameOver || grid[index].isFlagged || grid[index].isRevealed) return;

    if (grid[index].isMine) {
        gameOver(index);
    } else {
        revealCell(index);
        checkWin();
    }
}

function handleRightClick(e, cell) {
    e.preventDefault();
    if (isFirstClick) return; // Don't flag before game starts
    
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

    // Iterative flood fill to prevent stack overflow on large boards
    // and to remove setTimeout delay
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
            // Color coding classes could go here based on number
        } else {
            // If it's 0, add all neighbors to stack
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
    
    // Reveal all mines
    grid.forEach(spot => {
        if (spot.isMine) {
            spot.element.innerText = '💣';
            spot.element.classList.add('revealed');
        } else if (spot.isFlagged) {
            // Wrong flag
            spot.element.innerText = '❌'; 
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
// Add listener to dropdown to restart game on change
difficultySelect.addEventListener('change', startGame);