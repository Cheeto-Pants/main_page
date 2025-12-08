const gridElement = document.getElementById('grid');
const gameContainer = document.getElementById('game-container');
const timerElement = document.getElementById('timer');
const difficultySelect = document.getElementById('difficulty');
const messageElement = document.getElementById('message');
const numpadElement = document.getElementById('numpad');

let size;
let solutionGrid = []; // Stores the correct numbers
let cageGrid = [];     // Stores which cage ID each cell belongs to
let cages = {};        // Stores cage data: { target, op, cells[] }
let userGrid = [];     // Stores user input
let selectedCellIndex = null;
let timer;
let timeElapsed = 0;

// --- RESIZE LOGIC (Same as Minesweeper) ---
function resizeGame() {
    if (!gameContainer) return;
    gameContainer.style.transform = 'scale(1)';
    const padding = 40;
    const availableWidth = window.innerWidth - padding;
    const availableHeight = window.innerHeight - padding;
    const contentWidth = gameContainer.offsetWidth;
    const contentHeight = gameContainer.offsetHeight;
    const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
    gameContainer.style.transform = `scale(${Math.max(scale, 0.5)})`;
}
window.addEventListener('resize', resizeGame);

// --- GAME LOGIC ---

function startGame() {
    size = parseInt(difficultySelect.value);
    userGrid = Array(size * size).fill(null);
    selectedCellIndex = null;
    timeElapsed = 0;
    messageElement.innerText = "";
    clearInterval(timer);
    timerElement.innerText = 0;
    startTimer();

    generateLevel(size);
    renderBoard();
    createNumpad();
    
    setTimeout(resizeGame, 0);
}

function startTimer() {
    timer = setInterval(() => {
        timeElapsed++;
        timerElement.innerText = timeElapsed;
    }, 1000);
}

// 1. Generate a Latin Square (Valid Sudoku-like grid)
function generateLevel(n) {
    solutionGrid = Array(n).fill().map(() => Array(n).fill(0));
    
    // Fill diagonal to ensure randomness
    for(let i=0; i<n; i++) solutionGrid[i][i] = (i + 1);
    
    // Use backtracking to fill the rest
    solveLatinSquare(0, 0, n);
    
    // Create Cages
    generateCages(n);
}

function solveLatinSquare(row, col, n) {
    if (row === n) return true;
    
    let nextRow = row;
    let nextCol = col + 1;
    if (nextCol === n) {
        nextRow = row + 1;
        nextCol = 0;
    }

    if (solutionGrid[row][col] !== 0) {
        return solveLatinSquare(nextRow, nextCol, n);
    }

    // Shuffle numbers 1..n for randomness
    let nums = [];
    for(let i=1; i<=n; i++) nums.push(i);
    nums.sort(() => Math.random() - 0.5);

    for (let num of nums) {
        if (isValidPlacement(row, col, num, n)) {
            solutionGrid[row][col] = num;
            if (solveLatinSquare(nextRow, nextCol, n)) return true;
            solutionGrid[row][col] = 0;
        }
    }
    return false;
}

function isValidPlacement(row, col, num, n) {
    for (let i = 0; i < n; i++) {
        if (solutionGrid[row][i] === num) return false;
        if (solutionGrid[i][col] === num) return false;
    }
    return true;
}

// 2. Group cells into Cages
function generateCages(n) {
    cageGrid = Array(n * n).fill(-1);
    cages = {};
    let cageIdCounter = 0;

    for (let i = 0; i < n * n; i++) {
        if (cageGrid[i] !== -1) continue;

        // Start a new cage
        let currentCage = [i];
        cageGrid[i] = cageIdCounter;

        // Try to grow cage randomly (max size 4)
        let attempts = 0;
        while (currentCage.length < 4 && attempts < 10) {
            attempts++;
            // Pick a random cell in the cage
            let c = currentCage[Math.floor(Math.random() * currentCage.length)];
            let neighbors = getNeighbors(c, n);
            // Pick a random valid neighbor
            let neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            if (cageGrid[neighbor] === -1) {
                cageGrid[neighbor] = cageIdCounter;
                currentCage.push(neighbor);
            }
        }

        // Calculate Target & Operation based on solution numbers
        let values = currentCage.map(idx => {
            let r = Math.floor(idx / n);
            let c = idx % n;
            return solutionGrid[r][c];
        });

        let op = pickOperation(values);
        let target = calculateTarget(values, op);

        cages[cageIdCounter] = {
            id: cageIdCounter,
            cells: currentCage,
            op: op,
            target: target
        };

        cageIdCounter++;
    }
}

function getNeighbors(index, n) {
    let r = Math.floor(index / n);
    let c = index % n;
    let neighbors = [];
    if (r > 0) neighbors.push(index - n); // Top
    if (r < n - 1) neighbors.push(index + n); // Bottom
    if (c > 0) neighbors.push(index - 1); // Left
    if (c < n - 1) neighbors.push(index + 1); // Right
    return neighbors;
}

function pickOperation(values) {
    if (values.length === 1) return ""; // No op for single cells
    
    // Logic for deciding operation
    if (values.length === 2) {
        // Can be -, /, +, *
        let a = values[0], b = values[1];
        if (a % b === 0 || b % a === 0) return "/"; // Prioritize division if clean
        if (Math.random() > 0.5) return "-";
    }
    // For 3+ cells, mostly + or *
    return Math.random() > 0.5 ? "+" : "x"; // Using x for multiply
}

function calculateTarget(values, op) {
    if (op === "") return values[0];
    if (op === "+") return values.reduce((a, b) => a + b, 0);
    if (op === "x") return values.reduce((a, b) => a * b, 1);
    if (op === "-") return Math.abs(values[0] - values[1]);
    if (op === "/") return Math.max(values[0], values[1]) / Math.min(values[0], values[1]);
    return 0;
}

// --- RENDER ---
function renderBoard() {
    gridElement.style.gridTemplateColumns = `repeat(${size}, 60px)`;
    gridElement.innerHTML = '';

    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        
        // Determine Cage Borders
        const cageId = cageGrid[i];
        const r = Math.floor(i / size);
        const c = i % size;

        // Check neighbors to apply thick borders
        if (r === 0 || cageGrid[i - size] !== cageId) cell.classList.add('border-top-thick');
        if (r === size - 1 || cageGrid[i + size] !== cageId) cell.classList.add('border-bottom-thick');
        if (c === 0 || cageGrid[i - 1] !== cageId) cell.classList.add('border-left-thick');
        if (c === size - 1 || cageGrid[i + 1] !== cageId) cell.classList.add('border-right-thick');

        // Add Label (Target + Op) if this is the top-left-most cell of the cage
        const cage = cages[cageId];
        // Find smallest index in this cage
        const minIndex = Math.min(...cage.cells);
        if (i === minIndex) {
            const label = document.createElement('div');
            label.classList.add('cage-label');
            label.innerText = `${cage.target}${cage.op}`;
            cell.appendChild(label);
        }

        cell.addEventListener('click', () => selectCell(i));
        gridElement.appendChild(cell);
    }
}

function createNumpad() {
    numpadElement.innerHTML = '';
    // Eraser
    const eraseBtn = document.createElement('button');
    eraseBtn.classList.add('num-btn');
    eraseBtn.innerText = '⌫';
    eraseBtn.onclick = () => fillCell(null);
    numpadElement.appendChild(eraseBtn);

    // Numbers 1 to Size
    for (let i = 1; i <= size; i++) {
        const btn = document.createElement('button');
        btn.classList.add('num-btn');
        btn.innerText = i;
        btn.onclick = () => fillCell(i);
        numpadElement.appendChild(btn);
    }
}

// --- INTERACTION ---

function selectCell(index) {
    if (selectedCellIndex !== null) {
        document.querySelector(`.cell[data-index='${selectedCellIndex}']`).classList.remove('selected');
    }
    selectedCellIndex = index;
    document.querySelector(`.cell[data-index='${selectedCellIndex}']`).classList.add('selected');
}

function fillCell(value) {
    if (selectedCellIndex === null) return;
    
    userGrid[selectedCellIndex] = value;
    const cell = document.querySelector(`.cell[data-index='${selectedCellIndex}']`);
    
    // Keep the label element, change the text node only
    // Actually simpler: rebuild text content but save label
    const label = cell.querySelector('.cage-label');
    cell.innerHTML = ''; // clear
    if (label) cell.appendChild(label);
    
    if (value) {
        const text = document.createTextNode(value);
        cell.appendChild(text);
    }
    
    checkWinCondition();
}

// Handle Keyboard Input
document.addEventListener('keydown', (e) => {
    if (selectedCellIndex === null) return;
    
    const key = e.key;
    if (key >= '1' && key <= size.toString()) {
        fillCell(parseInt(key));
    } else if (key === 'Backspace' || key === 'Delete') {
        fillCell(null);
    } else if (key.startsWith('Arrow')) {
        moveSelection(key);
    }
});

function moveSelection(key) {
    let r = Math.floor(selectedCellIndex / size);
    let c = selectedCellIndex % size;
    
    if (key === 'ArrowUp' && r > 0) r--;
    if (key === 'ArrowDown' && r < size - 1) r++;
    if (key === 'ArrowLeft' && c > 0) c--;
    if (key === 'ArrowRight' && c < size - 1) c++;
    
    selectCell(r * size + c);
}

function checkWinCondition() {
    let isFull = true;
    let isCorrect = true;

    // Check against generated solution
    for (let i = 0; i < size * size; i++) {
        if (!userGrid[i]) isFull = false;
        if (userGrid[i] !== solutionGrid[Math.floor(i/size)][i%size]) isCorrect = false;
    }

    // Visual feedback for conflicts (row/col uniqueness)
    // Clear previous errors
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('error'));

    // Check basic constraints to show errors
    for (let i = 0; i < size * size; i++) {
        if (!userGrid[i]) continue;
        let r = Math.floor(i / size);
        let c = i % size;
        
        // Check Row/Col duplicates
        let conflict = false;
        for (let k = 0; k < size; k++) {
            let rIdx = r * size + k;
            let cIdx = k * size + c;
            if (rIdx !== i && userGrid[rIdx] === userGrid[i]) conflict = true;
            if (cIdx !== i && userGrid[cIdx] === userGrid[i]) conflict = true;
        }
        
        if (conflict) {
            document.querySelector(`.cell[data-index='${i}']`).classList.add('error');
        }
    }

    if (isFull && isCorrect) {
        clearInterval(timer);
        messageElement.innerText = "Puzzle Solved!";
        document.querySelectorAll('.cell').forEach(c => c.classList.add('success'));
    }
}

// Init
startGame();