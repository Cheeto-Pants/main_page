const gridElement = document.getElementById('grid');
const gameContainer = document.getElementById('game-container');
const timerElement = document.getElementById('timer');
const difficultySelect = document.getElementById('difficulty');
const messageElement = document.getElementById('message');
const numpadElement = document.getElementById('numpad');
const pauseOverlay = document.getElementById('pause-overlay');
const noteBtn = document.getElementById('note-btn');

let size;
let solutionGrid = []; // The correct numbers
let cageGrid = [];     // Maps cell index to cage ID
let cages = {};        // Cage data: { target, op, cells[] }
let userGrid = [];     // User's main answers
let notesGrid = [];    // Array of Sets for notes
let selectedCellIndex = null;
let timer;
let timeElapsed = 0;
let isPaused = false;
let isNoteMode = false;

// --- SCALING ---
function resizeGame() {
    if (!gameContainer) return;
    gameContainer.style.transform = 'scale(1)';
    const padding = 20;
    const availableWidth = window.innerWidth - padding;
    const availableHeight = window.innerHeight - padding;
    const contentWidth = gameContainer.offsetWidth;
    const contentHeight = gameContainer.offsetHeight;
    const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);
    gameContainer.style.transform = `scale(${Math.max(scale, 0.5)})`;
}
window.addEventListener('resize', resizeGame);

// --- GAME STATE ---

function startGame() {
    size = parseInt(difficultySelect.value);
    userGrid = Array(size * size).fill(null);
    notesGrid = Array(size * size).fill().map(() => new Set());
    
    selectedCellIndex = null;
    timeElapsed = 0;
    isPaused = false;
    messageElement.innerText = "";
    pauseOverlay.classList.add('hidden');
    
    clearInterval(timer);
    timerElement.innerText = 0;
    startTimer();

    generateLevel(size);
    renderBoard();
    createNumpad();
    
    // Slight delay to allow DOM to settle before calculating scale
    setTimeout(resizeGame, 10);
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        if (!isPaused) {
            timeElapsed++;
            timerElement.innerText = timeElapsed;
        }
    }, 1000);
}

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseOverlay.classList.remove('hidden');
    } else {
        pauseOverlay.classList.add('hidden');
    }
}

function toggleNoteMode() {
    isNoteMode = !isNoteMode;
    if (isNoteMode) {
        noteBtn.classList.add('active');
    } else {
        noteBtn.classList.remove('active');
    }
}

// --- GENERATION LOGIC ---

function generateLevel(n) {
    // 1. Generate valid Latin Square
    solutionGrid = Array(n).fill().map(() => Array(n).fill(0));
    // Fill diagonal to seed randomness
    for(let i=0; i<n; i++) solutionGrid[i][i] = (i + 1);
    solveLatinSquare(0, 0, n);
    
    // 2. Generate Cages
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

    let nums = [];
    for(let i=1; i<=n; i++) nums.push(i);
    // Shuffle
    for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
    }

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

function generateCages(n) {
    cageGrid = Array(n * n).fill(-1);
    cages = {};
    let cageIdCounter = 0;

    for (let i = 0; i < n * n; i++) {
        if (cageGrid[i] !== -1) continue;

        let currentCage = [i];
        cageGrid[i] = cageIdCounter;

        let attempts = 0;
        // Larger boards allow slightly larger cages
        const maxCageSize = n > 5 ? 4 : 3;
        
        while (currentCage.length < maxCageSize && attempts < 10) {
            attempts++;
            let c = currentCage[Math.floor(Math.random() * currentCage.length)];
            let neighbors = getNeighbors(c, n);
            let neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            if (cageGrid[neighbor] === -1) {
                cageGrid[neighbor] = cageIdCounter;
                currentCage.push(neighbor);
            }
        }

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
    if (r > 0) neighbors.push(index - n);
    if (r < n - 1) neighbors.push(index + n);
    if (c > 0) neighbors.push(index - 1);
    if (c < n - 1) neighbors.push(index + 1);
    return neighbors;
}

function pickOperation(values) {
    if (values.length === 1) return "";
    if (values.length === 2) {
        let a = values[0], b = values[1];
        if (a % b === 0 || b % a === 0) return "÷";
        if (Math.random() > 0.4) return "-";
    }
    return Math.random() > 0.5 ? "+" : "×";
}

function calculateTarget(values, op) {
    if (op === "") return values[0];
    if (op === "+") return values.reduce((a, b) => a + b, 0);
    if (op === "×") return values.reduce((a, b) => a * b, 1);
    if (op === "-") return Math.abs(values[0] - values[1]);
    if (op === "÷") return Math.max(values[0], values[1]) / Math.min(values[0], values[1]);
    return 0;
}

// --- RENDERING ---

function renderBoard() {
    gridElement.style.gridTemplateColumns = `repeat(${size}, 60px)`;
    gridElement.innerHTML = '';

    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.id = `cell-${i}`;
        
        // Borders logic
        const cageId = cageGrid[i];
        const r = Math.floor(i / size);
        const c = i % size;

        if (r === 0 || cageGrid[i - size] !== cageId) cell.classList.add('border-top-thick');
        if (r === size - 1 || cageGrid[i + size] !== cageId) cell.classList.add('border-bottom-thick');
        if (c === 0 || cageGrid[i - 1] !== cageId) cell.classList.add('border-left-thick');
        if (c === size - 1 || cageGrid[i + 1] !== cageId) cell.classList.add('border-right-thick');

        // Inner HTML Structure
        const cage = cages[cageId];
        const minIndex = Math.min(...cage.cells);
        
        let labelHtml = '';
        if (i === minIndex) {
            labelHtml = `<div class="cage-label">${cage.target}${cage.op}</div>`;
        }

        cell.innerHTML = `
            ${labelHtml}
            <div class="value-layer" id="val-${i}"></div>
            <div class="notes-layer" id="notes-${i}"></div>
        `;

        cell.addEventListener('mousedown', () => selectCell(i));
        gridElement.appendChild(cell);
    }
}

function createNumpad() {
    numpadElement.innerHTML = '';
    // Use flex wrap logic in CSS to handle rows
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
    if (isPaused) return;
    
    // Remove previous selection
    if (selectedCellIndex !== null) {
        document.getElementById(`cell-${selectedCellIndex}`).classList.remove('selected', 'selected-error');
    }
    selectedCellIndex = index;
    const cell = document.getElementById(`cell-${index}`);
    cell.classList.add('selected');
    
    // If cell has error, keep red tint
    if (cell.classList.contains('error')) {
        cell.classList.add('selected-error');
    }
}

function fillCell(value) {
    if (isPaused || selectedCellIndex === null) return;
    
    const idx = selectedCellIndex;
    const valEl = document.getElementById(`val-${idx}`);
    const notesEl = document.getElementById(`notes-${idx}`);

    if (value === null) {
        // Clear everything
        userGrid[idx] = null;
        notesGrid[idx].clear();
        valEl.innerText = '';
        notesEl.innerHTML = '';
        checkWinCondition(); // Re-check to clear errors
        return;
    }

    if (isNoteMode) {
        // Toggle Note
        if (notesGrid[idx].has(value)) {
            notesGrid[idx].delete(value);
        } else {
            notesGrid[idx].add(value);
            // If we add a note, we usually clear the main value to avoid confusion
            userGrid[idx] = null;
            valEl.innerText = '';
        }
    } else {
        // Set Value
        userGrid[idx] = value;
        // Clear notes for this cell
        notesGrid[idx].clear();
        valEl.innerText = value;
    }

    updateCellVisuals(idx);
    checkWinCondition();
}

function updateCellVisuals(idx) {
    const notesEl = document.getElementById(`notes-${idx}`);
    notesEl.innerHTML = '';

    // Render notes if any
    if (notesGrid[idx].size > 0 && !userGrid[idx]) {
        // Create 9 placeholders for 3x3 grid alignment
        // (Assuming max number is 9, notes usually go in specific positions 1-9)
        for (let n = 1; n <= 9; n++) {
            const span = document.createElement('span');
            span.classList.add('note-item');
            if (notesGrid[idx].has(n)) {
                span.innerText = n;
            }
            notesEl.appendChild(span);
        }
    }
}

// --- INPUT HANDLERS ---

document.addEventListener('keydown', (e) => {
    if (isPaused && e.key !== 'Escape') return;

    const key = e.key.toLowerCase();

    // Numbers
    if (!isNaN(key) && parseInt(key) >= 1 && parseInt(key) <= size) {
        fillCell(parseInt(key));
    }
    // Delete/Backspace
    else if (key === 'backspace' || key === 'delete') {
        fillCell(null);
    }
    // Shortcuts
    else if (key === 'n') {
        toggleNoteMode();
    }
    else if (key === 'escape') {
        togglePause();
    }
    // Arrow Navigation
    else if (key.startsWith('arrow')) {
        e.preventDefault(); // Prevent scrolling
        moveSelection(key);
    }
});

function moveSelection(key) {
    if (selectedCellIndex === null) {
        selectCell(0);
        return;
    }

    let r = Math.floor(selectedCellIndex / size);
    let c = selectedCellIndex % size;

    if (key === 'arrowup' && r > 0) r--;
    if (key === 'arrowdown' && r < size - 1) r++;
    if (key === 'arrowleft' && c > 0) c--;
    if (key === 'arrowright' && c < size - 1) c++;

    selectCell(r * size + c);
}

// --- WIN CHECK ---

function checkWinCondition() {
    let isFull = true;
    let isCorrect = true;

    // Reset styles
    for (let i = 0; i < size * size; i++) {
        document.getElementById(`cell-${i}`).classList.remove('error');
    }

    // 1. Check Duplicates (Row/Col)
    let duplicates = new Set();
    for (let i = 0; i < size * size; i++) {
        if (!userGrid[i]) {
            isFull = false;
            continue;
        }
        
        let r = Math.floor(i / size);
        let c = i % size;
        
        // Check Row
        for (let k = 0; k < size; k++) {
            let other = r * size + k;
            if (other !== i && userGrid[other] === userGrid[i]) {
                duplicates.add(i);
                duplicates.add(other);
            }
        }
        // Check Col
        for (let k = 0; k < size; k++) {
            let other = k * size + c;
            if (other !== i && userGrid[other] === userGrid[i]) {
                duplicates.add(i);
                duplicates.add(other);
            }
        }
        
        // Check Solution Match (Final verification)
        if (userGrid[i] !== solutionGrid[r][c]) {
            isCorrect = false;
        }
    }

    // Mark errors visually
    duplicates.forEach(idx => {
        document.getElementById(`cell-${idx}`).classList.add('error');
    });

    // 2. Cage Math Check (Optional: Could highlight bad cages)
    // For now, we rely on final solution match for "Win"
    
    if (isFull && isCorrect && duplicates.size === 0) {
        clearInterval(timer);
        messageElement.innerText = "Puzzle Solved!";
        document.querySelectorAll('.cell').forEach(c => c.classList.add('success'));
    }
}

// Init
// Wait for DOM
document.addEventListener('DOMContentLoaded', startGame);