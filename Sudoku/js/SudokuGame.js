import { PuzzleGenerator } from './PuzzleGenerator.js';
import { HintFinder } from './HintFinder.js';
import { Animations } from './Animations.js';
import { PracticeGenerator } from './PracticeGenerator.js';

export class SudokuGame {
    constructor() {
        this.board = [];
        this.solution = [];
        this.notes = [];
        this.given = [];
        this.selectedCell = null;
        this.notesMode = false;
        this.hintsRemaining = 3;
        this.mistakes = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.isPaused = false;
        this.history = [];
        this.difficulty = 'medium';
        this.hoveredNumber = null;
        this.currentHint = null;

        this.theoryMode = false;
        this.theorySavedState = null;

        this.autoCheck = true;
        this.revealedErrors = new Set();

        this.completedRows = new Set();
        this.completedCols = new Set();
        this.completedBoxes = new Set();
        this.completedNumbers = new Set();

        this.puzzleGenerator = new PuzzleGenerator();
        this.hintFinder = new HintFinder(this);
        this.animations = new Animations(this);

            // Practice mode
    this.practiceMode = false;
    this.practiceTechnique = null;
    this.practiceGenerator = new PracticeGenerator(this.puzzleGenerator);


        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startNewGame('medium');
    }

    startNewGame(difficulty) {
    if (this.theoryMode) {
        this.revertTheoryBoard();
    }
    
    // Exit practice mode when starting a regular game
    if (this.practiceMode) {
        this.practiceMode = false;
        this.practiceTechnique = null;
        this.updatePracticeModeUI();
    }

    this.difficulty = difficulty;
        this.showLoading(true);

        setTimeout(() => {
            const { puzzle, solution } = this.puzzleGenerator.generatePuzzle(difficulty);
            
            this.solution = solution;
            this.board = puzzle.map(row => [...row]);
            this.given = puzzle.map(row => row.map(cell => cell !== 0));
            this.notes = Array(9).fill(null).map(() => 
                Array(9).fill(null).map(() => new Set())
            );
            
            this.selectedCell = null;
            this.notesMode = false;
            this.hintsRemaining = 3;
            this.mistakes = 0;
            this.timer = 0;
            this.history = [];
            this.isPaused = false;
            this.currentHint = null;
            this.theoryMode = false;
            this.theorySavedState = null;
            this.revealedErrors = new Set();
            this.completedRows = new Set();
            this.completedCols = new Set();
            this.completedBoxes = new Set();
            this.completedNumbers = new Set();

            document.getElementById('mistakes').textContent = '0';
            document.getElementById('hintsRemaining').textContent = '3';
            document.getElementById('hintBtn').textContent = '💡 Hint (3)';
            document.getElementById('notesBtn').textContent = '✏️ Notes OFF';
            document.getElementById('notesBtn').classList.remove('notes-active');

            this.updateDifficultyButtons();
            this.updateTheoryModeUI();
            this.render();
            this.startTimer();
            this.showLoading(false);
        }, 50);
    }

    showLoading(show) {
        const board = document.getElementById('board');
        if (show) {
            board.innerHTML = '<div class="loading"><div class="spinner"></div><br>Generating puzzle...</div>';
            board.style.display = 'flex';
            board.style.alignItems = 'center';
            board.style.justifyContent = 'center';
            board.style.width = '468px';
            board.style.height = '468px';
        } else {
            board.style.display = 'grid';
            board.style.width = 'auto';
            board.style.height = 'auto';
        }
    }

    saveState() {
        this.history.push({
            board: this.board.map(row => [...row]),
            notes: this.notes.map(row => row.map(cell => new Set(cell)))
        });
    }

    undo() {
        if (this.history.length === 0 || this.isPaused) return;
        
        const state = this.history.pop();
        this.board = state.board;
        this.notes = state.notes;
        this.render();
    }

    isValidPlacement(board, row, col, num) {
        for (let x = 0; x < 9; x++) {
            if (board[row][x] === num) return false;
        }

        for (let x = 0; x < 9; x++) {
            if (board[x][col] === num) return false;
        }

        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }

        return true;
    }

    // Theory Mode
    enterTheoryMode() {
        if (this.theoryMode || this.isPaused) return;

        this.theorySavedState = {
            board: this.board.map(row => [...row]),
            notes: this.notes.map(row => row.map(cell => new Set(cell))),
            mistakes: this.mistakes,
            history: this.history.map(h => ({
                board: h.board.map(row => [...row]),
                notes: h.notes.map(row => row.map(cell => new Set(cell)))
            }))
        };

        this.theoryMode = true;
        this.history = [];

        this.updateTheoryModeUI();
        this.render();
    }

    exitTheoryMode(apply) {
        if (!this.theoryMode) return;

        if (apply) {
            this.showApplyConfirmation();
        } else {
            this.revertTheoryBoard();
        }
    }

    showApplyConfirmation() {
        const changes = this.getTheoryChanges();
        const summaryEl = document.getElementById('changesSummary');
        
        if (changes.numbersPlaced === 0 && changes.notesChanged === 0) {
            summaryEl.innerHTML = '<p>No changes were made in Theory Mode.</p>';
        } else {
            let html = '<ul>';
            if (changes.numbersPlaced > 0) {
                html += `<li><strong>${changes.numbersPlaced}</strong> number(s) placed</li>`;
            }
            if (changes.notesChanged > 0) {
                html += `<li><strong>${changes.notesChanged}</strong> cell(s) with note changes</li>`;
            }
            html += '</ul>';
            summaryEl.innerHTML = html;
        }

        document.getElementById('confirmApplyModal').style.display = 'flex';
    }

    getTheoryChanges() {
        const changes = {
            numbersPlaced: 0,
            notesChanged: 0,
            placedCells: []
        };

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.given[row][col]) continue;

                const savedValue = this.theorySavedState.board[row][col];
                const currentValue = this.board[row][col];

                if (currentValue !== 0 && currentValue !== savedValue) {
                    changes.numbersPlaced++;
                    changes.placedCells.push({ row, col, value: currentValue });
                }

                const savedNotes = this.theorySavedState.notes[row][col];
                const currentNotes = this.notes[row][col];
                if (savedNotes.size !== currentNotes.size || 
                    ![...savedNotes].every(n => currentNotes.has(n))) {
                    changes.notesChanged++;
                }
            }
        }

        return changes;
    }

    confirmApplyTheoryBoard() {
        const changes = this.getTheoryChanges();
        
        let newMistakes = 0;
        for (const cell of changes.placedCells) {
            if (cell.value !== this.solution[cell.row][cell.col]) {
                newMistakes++;
            }
        }
        
        this.mistakes = this.theorySavedState.mistakes + newMistakes;
        document.getElementById('mistakes').textContent = this.mistakes;

        this.theoryMode = false;
        this.theorySavedState = null;
        this.history = [];

        document.getElementById('confirmApplyModal').style.display = 'none';
        this.updateTheoryModeUI();
        this.render();

        if (this.checkWin()) {
            this.showWinModal();
        }
    }

    revertTheoryBoard() {
        if (!this.theorySavedState) return;

        this.board = this.theorySavedState.board;
        this.notes = this.theorySavedState.notes;
        this.mistakes = this.theorySavedState.mistakes;
        this.history = this.theorySavedState.history || [];

        this.theoryMode = false;
        this.theorySavedState = null;

        document.getElementById('mistakes').textContent = this.mistakes;
        this.updateTheoryModeUI();
        this.render();
    }

    updateTheoryModeUI() {
        const banner = document.getElementById('theoryBanner');
        const enterBtn = document.getElementById('enterTheoryBtn');
        const applyBtn = document.getElementById('applyTheoryBtn');
        const revertBtn = document.getElementById('revertTheoryBtn');

        if (this.theoryMode) {
            document.body.classList.add('theory-mode');
            banner.classList.add('active');
            enterBtn.disabled = true;
            enterBtn.textContent = '🧪 In Theory Mode';
            applyBtn.disabled = false;
            revertBtn.disabled = false;
        } else {
            document.body.classList.remove('theory-mode');
            banner.classList.remove('active');
            enterBtn.disabled = false;
            enterBtn.textContent = '🧪 Enter Theory Mode';
            applyBtn.disabled = true;
            revertBtn.disabled = true;
        }
    }

    // Timer
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timerInterval = setInterval(() => {
            if (!this.isPaused) {
                this.timer++;
                this.updateTimerDisplay();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const mins = Math.floor(this.timer / 60).toString().padStart(2, '0');
        const secs = (this.timer % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${mins}:${secs}`;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? '▶️' : '⏸️';
        document.getElementById('pauseOverlay').style.display = this.isPaused ? 'flex' : 'none';
    }

    // Number tracking
    isNumberCompleted(num) {
        let count = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === num && this.board[row][col] === this.solution[row][col]) {
                    count++;
                }
            }
        }
        return count >= 9;
    }

    getCorrectNumberCount(num) {
        let count = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === num && this.board[row][col] === this.solution[row][col]) {
                    count++;
                }
            }
        }
        return count;
    }

    // Cell selection and input
    selectCell(row, col) {
        if (this.isPaused) return;
        this.selectedCell = { row, col };
        this.render();
    }

    inputNumber(num) {
        if (!this.selectedCell || this.isPaused) return;
        
        const { row, col } = this.selectedCell;
        if (this.given[row][col]) return;

        const currentValue = this.board[row][col];

        if (currentValue === num && currentValue !== this.solution[row][col]) {
            this.saveState();
            this.board[row][col] = 0;
            this.render();
            return;
        }

        if (currentValue !== 0 && currentValue === this.solution[row][col]) {
            return;
        }

        if (this.isNumberCompleted(num)) {
            return;
        }

        this.saveState();

        if (this.notesMode) {
            if (this.board[row][col] === 0) {
                if (this.notes[row][col].has(num)) {
                    this.notes[row][col].delete(num);
                } else {
                    this.notes[row][col].add(num);
                }
            }
        } else {
            if (this.autoCheck && !this.theoryMode) {
                if (num !== this.solution[row][col]) {
                    this.mistakes++;
                    document.getElementById('mistakes').textContent = this.mistakes;
                }
            }
            
            this.board[row][col] = num;
            this.notes[row][col].clear();
            this.removeNotesFromRelated(row, col, num);
            
            this.checkAndAnimateCompletions(row, col, num);
            
            if (!this.theoryMode && this.checkWin()) {
                this.animations.animateGameComplete(row, col);
                setTimeout(() => this.showWinModal(), 1500);
                return;
            }
        }

        this.render();
    }

    eraseCell() {
        if (!this.selectedCell || this.isPaused) return;
        
        const { row, col } = this.selectedCell;
        if (this.given[row][col]) return;

        const currentValue = this.board[row][col];

        if (currentValue !== 0 && currentValue === this.solution[row][col]) {
            return;
        }

        this.saveState();
        this.board[row][col] = 0;
        this.notes[row][col].clear();
        this.render();
    }

    removeNotesFromRelated(row, col, num) {
        for (let x = 0; x < 9; x++) {
            this.notes[row][x].delete(num);
        }

        for (let x = 0; x < 9; x++) {
            this.notes[x][col].delete(num);
        }

        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                this.notes[boxRow + i][boxCol + j].delete(num);
            }
        }
    }

    toggleNotes() {
        this.notesMode = !this.notesMode;
        document.getElementById('notesBtn').textContent = `✏️ Notes ${this.notesMode ? 'ON' : 'OFF'}`;
        document.getElementById('notesBtn').classList.toggle('notes-active', this.notesMode);
    }

    // Auto notes - fills based on CURRENT board state, not solution
    autoFillNotes() {
        this.saveState();
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === 0) {
                    this.notes[row][col].clear();
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValidPlacement(this.board, row, col, num)) {
                            this.notes[row][col].add(num);
                        }
                    }
                }
            }
        }
        this.render();
    }

    // Completion checking and animations
    checkAndAnimateCompletions(row, col, num) {
        if (!this.completedRows.has(row) && this.isRowComplete(row)) {
            this.completedRows.add(row);
            setTimeout(() => this.animations.animateRow(row), 100);
        }

        if (!this.completedCols.has(col) && this.isColComplete(col)) {
            this.completedCols.add(col);
            setTimeout(() => this.animations.animateCol(col), 200);
        }

        const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        if (!this.completedBoxes.has(boxIndex) && this.isBoxComplete(row, col)) {
            this.completedBoxes.add(boxIndex);
            setTimeout(() => this.animations.animateBox(row, col), 300);
        }

        if (!this.completedNumbers.has(num) && this.isNumberCompleted(num)) {
            this.completedNumbers.add(num);
            setTimeout(() => this.animations.animateNumber(num, this.board), 400);
        }
    }

    isRowComplete(row) {
        for (let col = 0; col < 9; col++) {
            if (this.board[row][col] !== this.solution[row][col]) {
                return false;
            }
        }
        return true;
    }

    isColComplete(col) {
        for (let row = 0; row < 9; row++) {
            if (this.board[row][col] !== this.solution[row][col]) {
                return false;
            }
        }
        return true;
    }

    isBoxComplete(row, col) {
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (this.board[boxRow + i][boxCol + j] !== this.solution[boxRow + i][boxCol + j]) {
                    return false;
                }
            }
        }
        return true;
    }

    // Error checking
    toggleAutoCheck() {
        this.autoCheck = !this.autoCheck;
        document.getElementById('autoCheckToggle').checked = this.autoCheck;
        document.getElementById('checkAnswersBtn').style.display = this.autoCheck ? 'none' : 'inline-block';
        this.revealedErrors.clear();
        this.render();
    }

    checkAnswers() {
        let errorCount = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] !== 0 && !this.given[row][col]) {
                    if (this.board[row][col] !== this.solution[row][col]) {
                        errorCount++;
                    }
                }
            }
        }

        const resultEl = document.getElementById('checkResult');
        const revealBtn = document.getElementById('revealErrorsBtn');

        if (errorCount === 0) {
            resultEl.textContent = '✓ All filled cells are correct!';
            resultEl.className = 'result perfect';
            revealBtn.style.display = 'none';
        } else {
            resultEl.textContent = `✗ You have ${errorCount} incorrect cell${errorCount > 1 ? 's' : ''}.`;
            resultEl.className = 'result has-errors';
            revealBtn.style.display = 'inline-block';
        }

        document.getElementById('checkModal').style.display = 'flex';
    }

    revealErrors() {
        this.revealedErrors.clear();
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] !== 0 && !this.given[row][col]) {
                    if (this.board[row][col] !== this.solution[row][col]) {
                        this.revealedErrors.add(`${row},${col}`);
                    }
                }
            }
        }
        document.getElementById('checkModal').style.display = 'none';
        this.render();
    }

    isError(row, col) {
        if (this.given[row][col]) return false;
        if (this.board[row][col] === 0) return false;
        
        if (this.autoCheck && !this.theoryMode) {
            return this.board[row][col] !== this.solution[row][col];
        }

        if (this.revealedErrors.has(`${row},${col}`)) {
            return true;
        }

        return false;
    }

    // Hints
    getHint() {
        if (this.hintsRemaining <= 0 || this.isPaused) return;

        const allHints = this.hintFinder.findAllHints(this.board, this.notes);

        if (allHints.length > 0) {
            const randomIndex = Math.floor(Math.random() * allHints.length);
            const selected = allHints[randomIndex];
            this.currentHint = selected.hint;
            this.showHintModal(selected.technique, selected.hint, true);
        } else {
            this.showHintModal('No Technique Found', null, false);
        }
    }

    fillAllNotes() {
        this.autoFillNotes();
        document.getElementById('hintModal').style.display = 'none';
        setTimeout(() => this.getHint(), 100);
    }

    showHintModal(technique, hint, found) {
        document.getElementById('hintTechnique').textContent = technique;
        
        if (found && hint) {
            document.getElementById('hintExplanation').textContent = hint.explanation;
            document.getElementById('hintExplanation').style.display = 'block';
            document.getElementById('hintHighlight').textContent = hint.highlight;
            document.getElementById('hintHighlight').style.display = 'block';
            document.getElementById('noHintWarning').style.display = 'none';
            document.getElementById('applyHintBtn').style.display = hint.type === 'place' ? 'inline-block' : 'none';
            document.getElementById('fillNotesBtn').style.display = 'none';

            if (hint.row !== undefined && hint.col !== undefined) {
                this.selectedCell = { row: hint.row, col: hint.col };
                this.render();
            }
        } else {
            document.getElementById('hintExplanation').style.display = 'none';
            document.getElementById('hintHighlight').style.display = 'none';
            document.getElementById('noHintWarning').style.display = 'block';
            document.getElementById('applyHintBtn').style.display = 'none';
            document.getElementById('fillNotesBtn').style.display = 'inline-block';
        }

        document.getElementById('hintModal').style.display = 'flex';
    }

    applyHint() {
        if (!this.currentHint || this.currentHint.type !== 'place') return;
        
        this.hintsRemaining--;
        document.getElementById('hintsRemaining').textContent = this.hintsRemaining;
        document.getElementById('hintBtn').textContent = `💡 Hint (${this.hintsRemaining})`;
        
        this.saveState();
        const { row, col, value } = this.currentHint;
        this.board[row][col] = value;
        this.notes[row][col].clear();
        this.removeNotesFromRelated(row, col, value);
        
        this.checkAndAnimateCompletions(row, col, value);
        
        if (this.checkWin()) {
            this.animations.animateGameComplete(row, col);
            setTimeout(() => this.showWinModal(), 1500);
        }

        this.currentHint = null;
        document.getElementById('hintModal').style.display = 'none';
        this.render();
    }

    // Win condition
    checkWin() {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] !== this.solution[row][col]) {
                    return false;
                }
            }
        }
        return true;
    }

    showWinModal() {
        clearInterval(this.timerInterval);
        document.getElementById('winDifficulty').textContent = this.difficulty;
        document.getElementById('winTime').textContent = document.getElementById('timer').textContent;
        document.getElementById('winMistakes').textContent = this.mistakes;
        document.getElementById('winModal').style.display = 'flex';
    }

    // Rendering
    render() {
        this.renderBoard();
        this.renderNumberPad();
    }

renderBoard() {
    const boardEl = document.getElementById('board');
    
    // Remove old event listener by cloning
    const newBoardEl = boardEl.cloneNode(false);
    boardEl.parentNode.replaceChild(newBoardEl, boardEl);

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            if ((col + 1) % 3 === 0 && col !== 8) cell.classList.add('border-right');
            if ((row + 1) % 3 === 0 && row !== 8) cell.classList.add('border-bottom');
            
            if (this.selectedCell) {
                const { row: selRow, col: selCol } = this.selectedCell;
                
                if (row === selRow || col === selCol) {
                    cell.classList.add('highlighted-row-col');
                }
                
                const selBoxRow = Math.floor(selRow / 3);
                const selBoxCol = Math.floor(selCol / 3);
                if (Math.floor(row / 3) === selBoxRow && Math.floor(col / 3) === selBoxCol) {
                    cell.classList.add('highlighted-box');
                }
                
                if (this.board[row][col] !== 0 && 
                    this.board[row][col] === this.board[selRow][selCol]) {
                    cell.classList.add('same-number');
                }
                
                if (row === selRow && col === selCol) {
                    cell.classList.add('selected');
                }
            }

            if (this.hoveredNumber && this.board[row][col] === this.hoveredNumber) {
                cell.classList.add('hover-highlight');
            }

            if (this.given[row][col]) {
                cell.classList.add('given');
            }

            if (!this.given[row][col] && this.board[row][col] !== 0 && 
                this.board[row][col] === this.solution[row][col]) {
                cell.classList.add('correct');
            }

            if (this.isError(row, col)) {
                cell.classList.add('error');
            }

            if (this.revealedErrors.has(`${row},${col}`)) {
                cell.classList.add('revealed-error');
            }

            if (this.theoryMode && this.theorySavedState) {
                const savedValue = this.theorySavedState.board[row][col];
                const currentValue = this.board[row][col];
                if (currentValue !== 0 && currentValue !== savedValue && !this.given[row][col]) {
                    cell.classList.add('theory-placed');
                }
            }

            let highlightNoteNumber = this.hoveredNumber;
            if (!highlightNoteNumber && this.selectedCell) {
                const selVal = this.board[this.selectedCell.row][this.selectedCell.col];
                if (selVal !== 0) {
                    highlightNoteNumber = selVal;
                }
            }

            if (this.board[row][col] !== 0) {
                cell.textContent = this.board[row][col];
            } else if (this.notes[row][col].size > 0) {
                const notesGrid = document.createElement('div');
                notesGrid.className = 'notes-grid';
                for (let n = 1; n <= 9; n++) {
                    const noteSpan = document.createElement('span');
                    noteSpan.className = 'note';
                    if (this.notes[row][col].has(n)) {
                        noteSpan.textContent = n;
                        if (highlightNoteNumber === n) {
                            noteSpan.classList.add('highlighted-note');
                        }
                    }
                    notesGrid.appendChild(noteSpan);
                }
                cell.appendChild(notesGrid);
            }

            const r = row;
            const c = col;
            
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectCell(r, c);
            });
            
cell.addEventListener('mouseenter', () => {
    const num = this.board[r][c];
    if (num !== 0) {
        if (this.hoveredNumber !== num) {
            this.hoveredNumber = num;
            this.renderBoard();
        }
    } else {
        // Clear hover when entering an empty cell
        if (this.hoveredNumber !== null) {
            this.hoveredNumber = null;
            this.renderBoard();
        }
    }
});
            newBoardEl.appendChild(cell);
        }
    }

    // Clear hover when leaving board
    newBoardEl.addEventListener('mouseleave', () => {
        if (this.hoveredNumber !== null) {
            this.hoveredNumber = null;
            this.renderBoard();
        }
    });
}

renderNumberPad() {
    const padEl = document.getElementById('numberPad');
    padEl.innerHTML = '';

    for (let num = 1; num <= 9; num++) {
        const btn = document.createElement('button');
        btn.className = 'number-btn';
        
        const count = this.getCorrectNumberCount(num);
        const isCompleted = count >= 9;
        if (isCompleted) btn.classList.add('completed');

        btn.innerHTML = `${num}<span class="count">${count}/9</span>`;
        
        const n = num; // Capture in closure
        
        btn.addEventListener('mousedown', (e) => {
            // Prevent focus change that might deselect
            e.preventDefault();
        });
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!isCompleted && this.selectedCell) {
                this.inputNumber(n);
            }
        });
        
        btn.addEventListener('mouseenter', () => {
            this.hoveredNumber = n;
            this.renderBoard();
        });
        
        btn.addEventListener('mouseleave', () => {
            this.hoveredNumber = null;
            this.renderBoard();
        });

        padEl.appendChild(btn);
    }
}

updateDifficultyButtons() {
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.toggle('active', 
            !this.practiceMode && btn.dataset.difficulty === this.difficulty
        );
    });
}

// Practice Mode Methods
startPractice(technique) {
    if (this.theoryMode) {
        this.revertTheoryBoard();
    }

    this.practiceTechnique = technique;
    this.practiceMode = true;
    this.showLoading(true);

    setTimeout(() => {
        const result = this.practiceGenerator.generatePracticePuzzle(technique);
        
        if (result) {
            this.solution = result.solution;
            this.board = result.puzzle.map(row => [...row]);
            this.given = result.given;
            this.notes = result.notes.map(row => row.map(cell => new Set(cell)));
            
            this.selectedCell = null;
            this.notesMode = false;
            this.hintsRemaining = 3;
            this.mistakes = 0;
            this.timer = 0;
            this.history = [];
            this.isPaused = false;
            this.currentHint = null;
            this.theoryMode = false;
            this.theorySavedState = null;
            this.revealedErrors = new Set();
            this.completedRows = new Set();
            this.completedCols = new Set();
            this.completedBoxes = new Set();
            this.completedNumbers = new Set();

            document.getElementById('mistakes').textContent = '0';
            document.getElementById('hintsRemaining').textContent = '3';
            document.getElementById('hintBtn').textContent = '💡 Hint (3)';
            document.getElementById('notesBtn').textContent = '✏️ Notes OFF';
            document.getElementById('notesBtn').classList.remove('notes-active');

            this.updateDifficultyButtons();
            this.updatePracticeModeUI();
            this.render();
            this.startTimer();
            
            // Show technique info on start
            this.showTechniqueInfo();
        } else {
            alert('Could not generate a puzzle for this technique. Please try again.');
            this.exitPracticeMode();
        }
        
        this.showLoading(false);
    }, 50);
}

exitPracticeMode() {
    this.practiceMode = false;
    this.practiceTechnique = null;
    this.updatePracticeModeUI();
    this.closePracticeDropdown();
    this.startNewGame(this.difficulty);
}

updatePracticeModeUI() {
    const banner = document.getElementById('practiceBanner');
    const practiceBtn = document.getElementById('practiceBtn');
    
    if (this.practiceMode && this.practiceTechnique) {
        document.body.classList.add('practice-mode');
        banner.classList.add('active');
        practiceBtn.classList.add('active');
        
        const techniqueInfo = this.practiceGenerator.getTechniqueInfo(this.practiceTechnique);
        document.getElementById('practiceTechniqueName').textContent = 
            techniqueInfo ? techniqueInfo.name : this.practiceTechnique;
        
        // Clear difficulty active states
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mark practice option as active
        document.querySelectorAll('.practice-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.technique === this.practiceTechnique);
        });
    } else {
        document.body.classList.remove('practice-mode');
        banner.classList.remove('active');
        practiceBtn.classList.remove('active');
        
        document.querySelectorAll('.practice-option').forEach(btn => {
            btn.classList.remove('active');
        });
    }
}

showTechniqueInfo() {
    const techniqueInfo = this.practiceGenerator.getTechniqueInfo(this.practiceTechnique);
    
    if (techniqueInfo) {
        document.getElementById('techniqueModalTitle').textContent = `🎯 ${techniqueInfo.name}`;
        document.getElementById('techniqueDescription').textContent = techniqueInfo.description;
        document.getElementById('techniqueInstructions').textContent = techniqueInfo.instructions;
        document.getElementById('techniqueModal').style.display = 'flex';
    }
}

togglePracticeDropdown() {
    const dropdown = document.querySelector('.practice-dropdown');
    dropdown.classList.toggle('open');
}

closePracticeDropdown() {
    const dropdown = document.querySelector('.practice-dropdown');
    dropdown.classList.remove('open');
}

    setupEventListeners() {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.startNewGame(btn.dataset.difficulty);
            });
        });

        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());

        document.getElementById('notesBtn').addEventListener('click', () => this.toggleNotes());
        document.getElementById('autoNotesBtn').addEventListener('click', () => this.autoFillNotes());
        document.getElementById('hintBtn').addEventListener('click', () => this.getHint());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('eraseBtn').addEventListener('click', () => this.eraseCell());
        document.getElementById('newGameBtn').addEventListener('click', () => this.startNewGame(this.difficulty));

        document.getElementById('autoCheckToggle').addEventListener('change', (e) => {
            this.autoCheck = e.target.checked;
            document.getElementById('checkAnswersBtn').style.display = this.autoCheck ? 'none' : 'inline-block';
            this.revealedErrors.clear();
            this.render();
        });

        document.getElementById('checkAnswersBtn').addEventListener('click', () => this.checkAnswers());
        document.getElementById('closeCheckBtn').addEventListener('click', () => {
            document.getElementById('checkModal').style.display = 'none';
        });
        document.getElementById('revealErrorsBtn').addEventListener('click', () => this.revealErrors());

        document.getElementById('enterTheoryBtn').addEventListener('click', () => this.enterTheoryMode());
        document.getElementById('applyTheoryBtn').addEventListener('click', () => this.exitTheoryMode(true));
        document.getElementById('revertTheoryBtn').addEventListener('click', () => this.exitTheoryMode(false));

        document.getElementById('cancelApplyBtn').addEventListener('click', () => {
            document.getElementById('confirmApplyModal').style.display = 'none';
        });
        document.getElementById('confirmApplyBtn').addEventListener('click', () => this.confirmApplyTheoryBoard());

        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.getElementById('winModal').style.display = 'none';
            this.startNewGame(this.difficulty);
        });

        document.getElementById('closeHintBtn').addEventListener('click', () => {
            document.getElementById('hintModal').style.display = 'none';
            this.currentHint = null;
        });
        document.getElementById('applyHintBtn').addEventListener('click', () => this.applyHint());
        document.getElementById('fillNotesBtn').addEventListener('click', () => this.fillAllNotes());

document.addEventListener('keydown', (e) => {
    // ESC key toggles pause
    if (e.key === 'Escape') {
        this.togglePause();
        return;
    }

    if (this.isPaused) return;

    const hintModalOpen = document.getElementById('hintModal').style.display === 'flex';
    const confirmModalOpen = document.getElementById('confirmApplyModal').style.display === 'flex';
    const winModalOpen = document.getElementById('winModal').style.display === 'flex';
    const checkModalOpen = document.getElementById('checkModal').style.display === 'flex';
    const techniqueModalOpen = document.getElementById('techniqueModal')?.style.display === 'flex';
    
    if (hintModalOpen || confirmModalOpen || winModalOpen || checkModalOpen || techniqueModalOpen) return;

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
        this.inputNumber(num);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        this.eraseCell();
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.undo();
    } else if (e.key === 'n' || e.key === 'N') {
        this.toggleNotes();
    } else if (e.key === 't' || e.key === 'T') {
        if (this.theoryMode) {
            this.exitTheoryMode(false);
        } else {
            this.enterTheoryMode();
        }
    } else if (this.selectedCell) {
        let { row, col } = this.selectedCell;
        if (e.key === 'ArrowUp') row = Math.max(0, row - 1);
        if (e.key === 'ArrowDown') row = Math.min(8, row + 1);
        if (e.key === 'ArrowLeft') col = Math.max(0, col - 1);
        if (e.key === 'ArrowRight') col = Math.min(8, col + 1);
        
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            this.selectCell(row, col);
        }
    }
});

            // Practice mode dropdown
    document.getElementById('practiceBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePracticeDropdown();
    });

    document.querySelectorAll('.practice-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const technique = btn.dataset.technique;
            this.closePracticeDropdown();
            this.startPractice(technique);
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.practice-dropdown');
        if (!dropdown.contains(e.target)) {
            this.closePracticeDropdown();
        }
    });

    // Practice mode banner buttons
    document.getElementById('practiceInfoBtn').addEventListener('click', () => {
        this.showTechniqueInfo();
    });

    document.getElementById('practiceExitBtn').addEventListener('click', () => {
        this.exitPracticeMode();
    });

    document.getElementById('closeTechniqueBtn').addEventListener('click', () => {
        document.getElementById('techniqueModal').style.display = 'none';
    });


        document.addEventListener('click', (e) => {
            const board = document.getElementById('board');
            const controls = document.querySelector('.controls');
            
            if (!board.contains(e.target) && !controls.contains(e.target)) {
                this.selectedCell = null;
                this.render();
            }
        });
    }
}