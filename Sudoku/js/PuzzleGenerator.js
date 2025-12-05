export class PuzzleGenerator {
    constructor() {
        this.techniqueDifficulty = {
            nakedSingle: 1,
            hiddenSingle: 2,
            nakedPair: 3,
            hiddenPair: 4,
            pointingPair: 5,
            boxLineReduction: 6,
            nakedTriple: 7,
            hiddenTriple: 8,
            xWing: 9,
            swordfish: 10,
            yWing: 11,
            xyzWing: 12
        };
    }

    generatePuzzle(difficulty) {
        const range = this.getDifficultyRange(difficulty);
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            attempts++;
            const solution = this.generateSolution();
            const puzzle = solution.map(row => [...row]);
            
            const cellsToRemove = {
                easy: 38,
                medium: 46,
                hard: 50,
                expert: 54,
                master: 56,
                extreme: 58
            };

            const cells = [];
            for (let i = 0; i < 81; i++) {
                cells.push(i);
            }
            this.shuffle(cells);

            let removed = 0;
            for (const cellIndex of cells) {
                if (removed >= cellsToRemove[difficulty]) break;
                
                const row = Math.floor(cellIndex / 9);
                const col = cellIndex % 9;
                
                const backup = puzzle[row][col];
                puzzle[row][col] = 0;
                
                if (this.countSolutions(puzzle.map(r => [...r])) === 1) {
                    removed++;
                } else {
                    puzzle[row][col] = backup;
                }
            }

            const grade = this.gradePuzzle(puzzle);
            
            if (grade >= range.min && grade <= range.max) {
                return { puzzle, solution };
            }
        }

        // Fallback
        const solution = this.generateSolution();
        const puzzle = solution.map(row => [...row]);
        const cells = [];
        for (let i = 0; i < 81; i++) cells.push(i);
        this.shuffle(cells);
        
        let removed = 0;
        const target = { easy: 38, medium: 46, hard: 50, expert: 54, master: 56, extreme: 58 }[difficulty];
        
        for (const cellIndex of cells) {
            if (removed >= target) break;
            const row = Math.floor(cellIndex / 9);
            const col = cellIndex % 9;
            const backup = puzzle[row][col];
            puzzle[row][col] = 0;
            if (this.countSolutions(puzzle.map(r => [...r])) === 1) {
                removed++;
            } else {
                puzzle[row][col] = backup;
            }
        }
        
        return { puzzle, solution };
    }

    getDifficultyRange(difficulty) {
        switch (difficulty) {
            case 'easy': return { min: 0, max: 2 };
            case 'medium': return { min: 3, max: 6 };
            case 'hard': return { min: 7, max: 8 };
            case 'expert': return { min: 9, max: 9 };
            case 'master': return { min: 10, max: 11 };
            case 'extreme': return { min: 12, max: 13 };
            default: return { min: 3, max: 6 };
        }
    }

    generateSolution() {
        const board = Array(9).fill(null).map(() => Array(9).fill(0));
        this.solveSudoku(board, true);
        return board;
    }

    solveSudoku(board, randomize = false) {
        const empty = this.findEmpty(board);
        if (!empty) return true;

        const [row, col] = empty;
        let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        
        if (randomize) {
            this.shuffle(nums);
        }

        for (const num of nums) {
            if (this.isValidPlacement(board, row, col, num)) {
                board[row][col] = num;
                if (this.solveSudoku(board, randomize)) {
                    return true;
                }
                board[row][col] = 0;
            }
        }

        return false;
    }

    countSolutions(board, limit = 2) {
        const empty = this.findEmpty(board);
        if (!empty) return 1;

        const [row, col] = empty;
        let count = 0;

        for (let num = 1; num <= 9; num++) {
            if (this.isValidPlacement(board, row, col, num)) {
                board[row][col] = num;
                count += this.countSolutions(board, limit);
                board[row][col] = 0;
                if (count >= limit) return count;
            }
        }

        return count;
    }

    findEmpty(board) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    return [row, col];
                }
            }
        }
        return null;
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

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    gradePuzzle(puzzle) {
        const testBoard = puzzle.map(row => [...row]);
        const testNotes = Array(9).fill(null).map(() => 
            Array(9).fill(null).map(() => new Set())
        );

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (testBoard[row][col] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValidPlacement(testBoard, row, col, num)) {
                            testNotes[row][col].add(num);
                        }
                    }
                }
            }
        }

        let maxDifficulty = 0;
        let iterations = 0;
        const maxIterations = 200;

        while (iterations < maxIterations) {
            iterations++;
            let progress = false;

            const nakedSingle = this.findNakedSingleForGrading(testBoard, testNotes);
            if (nakedSingle) {
                testBoard[nakedSingle.row][nakedSingle.col] = nakedSingle.value;
                testNotes[nakedSingle.row][nakedSingle.col].clear();
                this.removeNotesFromRelatedForGrading(testNotes, nakedSingle.row, nakedSingle.col, nakedSingle.value);
                maxDifficulty = Math.max(maxDifficulty, this.techniqueDifficulty.nakedSingle);
                progress = true;
                continue;
            }

            const hiddenSingle = this.findHiddenSingleForGrading(testBoard, testNotes);
            if (hiddenSingle) {
                testBoard[hiddenSingle.row][hiddenSingle.col] = hiddenSingle.value;
                testNotes[hiddenSingle.row][hiddenSingle.col].clear();
                this.removeNotesFromRelatedForGrading(testNotes, hiddenSingle.row, hiddenSingle.col, hiddenSingle.value);
                maxDifficulty = Math.max(maxDifficulty, this.techniqueDifficulty.hiddenSingle);
                progress = true;
                continue;
            }

            const nakedPair = this.findNakedPairForGrading(testNotes);
            if (nakedPair) {
                nakedPair.eliminations.forEach(e => testNotes[e.row][e.col].delete(e.value));
                maxDifficulty = Math.max(maxDifficulty, this.techniqueDifficulty.nakedPair);
                progress = true;
                continue;
            }

            const pointingPair = this.findPointingPairForGrading(testBoard, testNotes);
            if (pointingPair) {
                pointingPair.eliminations.forEach(e => testNotes[e.row][e.col].delete(e.value));
                maxDifficulty = Math.max(maxDifficulty, this.techniqueDifficulty.pointingPair);
                progress = true;
                continue;
            }

            const boxLine = this.findBoxLineReductionForGrading(testBoard, testNotes);
            if (boxLine) {
                boxLine.eliminations.forEach(e => testNotes[e.row][e.col].delete(e.value));
                maxDifficulty = Math.max(maxDifficulty, this.techniqueDifficulty.boxLineReduction);
                progress = true;
                continue;
            }

            const nakedTriple = this.findNakedTripleForGrading(testBoard, testNotes);
            if (nakedTriple) {
                nakedTriple.eliminations.forEach(e => testNotes[e.row][e.col].delete(e.value));
                maxDifficulty = Math.max(maxDifficulty, this.techniqueDifficulty.nakedTriple);
                progress = true;
                continue;
            }

            const xWing = this.findXWingForGrading(testBoard, testNotes);
            if (xWing) {
                xWing.eliminations.forEach(e => testNotes[e.row][e.col].delete(e.value));
                maxDifficulty = Math.max(maxDifficulty, this.techniqueDifficulty.xWing);
                progress = true;
                continue;
            }

            const yWing = this.findYWingForGrading(testBoard, testNotes);
            if (yWing) {
                yWing.eliminations.forEach(e => testNotes[e.row][e.col].delete(e.value));
                maxDifficulty = Math.max(maxDifficulty, this.techniqueDifficulty.yWing);
                progress = true;
                continue;
            }

            const swordfish = this.findSwordfishForGrading(testBoard, testNotes);
            if (swordfish) {
                swordfish.eliminations.forEach(e => testNotes[e.row][e.col].delete(e.value));
                maxDifficulty = Math.max(maxDifficulty, this.techniqueDifficulty.swordfish);
                progress = true;
                continue;
            }

            if (!progress) break;
        }

        let solved = true;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (testBoard[row][col] === 0) {
                    solved = false;
                    break;
                }
            }
            if (!solved) break;
        }

        if (!solved) {
            maxDifficulty = 13;
        }

        return maxDifficulty;
    }

    removeNotesFromRelatedForGrading(notes, row, col, num) {
        for (let x = 0; x < 9; x++) {
            notes[row][x].delete(num);
            notes[x][col].delete(num);
        }
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                notes[boxRow + i][boxCol + j].delete(num);
            }
        }
    }

    findNakedSingleForGrading(board, notes) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0 && notes[row][col].size === 1) {
                    return { row, col, value: [...notes[row][col]][0] };
                }
            }
        }
        return null;
    }

    findHiddenSingleForGrading(board, notes) {
        for (let row = 0; row < 9; row++) {
            for (let num = 1; num <= 9; num++) {
                let positions = [];
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] === 0 && notes[row][col].has(num)) {
                        positions.push(col);
                    }
                }
                if (positions.length === 1) {
                    return { row, col: positions[0], value: num };
                }
            }
        }

        for (let col = 0; col < 9; col++) {
            for (let num = 1; num <= 9; num++) {
                let positions = [];
                for (let row = 0; row < 9; row++) {
                    if (board[row][col] === 0 && notes[row][col].has(num)) {
                        positions.push(row);
                    }
                }
                if (positions.length === 1) {
                    return { row: positions[0], col, value: num };
                }
            }
        }

        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                for (let num = 1; num <= 9; num++) {
                    let positions = [];
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            const row = boxRow * 3 + i;
                            const col = boxCol * 3 + j;
                            if (board[row][col] === 0 && notes[row][col].has(num)) {
                                positions.push({ row, col });
                            }
                        }
                    }
                    if (positions.length === 1) {
                        return { row: positions[0].row, col: positions[0].col, value: num };
                    }
                }
            }
        }

        return null;
    }

    findNakedPairForGrading(notes) {
        for (let row = 0; row < 9; row++) {
            const cells = [];
            for (let col = 0; col < 9; col++) {
                if (notes[row][col].size === 2) {
                    cells.push({ col, noteStr: [...notes[row][col]].sort().join(',') });
                }
            }
            for (let i = 0; i < cells.length; i++) {
                for (let j = i + 1; j < cells.length; j++) {
                    if (cells[i].noteStr === cells[j].noteStr) {
                        const pair = cells[i].noteStr.split(',').map(Number);
                        const eliminations = [];
                        for (let col = 0; col < 9; col++) {
                            if (col !== cells[i].col && col !== cells[j].col) {
                                pair.forEach(n => {
                                    if (notes[row][col].has(n)) {
                                        eliminations.push({ row, col, value: n });
                                    }
                                });
                            }
                        }
                        if (eliminations.length > 0) return { eliminations };
                    }
                }
            }
        }

        for (let col = 0; col < 9; col++) {
            const cells = [];
            for (let row = 0; row < 9; row++) {
                if (notes[row][col].size === 2) {
                    cells.push({ row, noteStr: [...notes[row][col]].sort().join(',') });
                }
            }
            for (let i = 0; i < cells.length; i++) {
                for (let j = i + 1; j < cells.length; j++) {
                    if (cells[i].noteStr === cells[j].noteStr) {
                        const pair = cells[i].noteStr.split(',').map(Number);
                        const eliminations = [];
                        for (let row = 0; row < 9; row++) {
                            if (row !== cells[i].row && row !== cells[j].row) {
                                pair.forEach(n => {
                                    if (notes[row][col].has(n)) {
                                        eliminations.push({ row, col, value: n });
                                    }
                                });
                            }
                        }
                        if (eliminations.length > 0) return { eliminations };
                    }
                }
            }
        }

        return null;
    }

    findPointingPairForGrading(board, notes) {
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                for (let num = 1; num <= 9; num++) {
                    const positions = [];
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            const row = boxRow * 3 + i;
                            const col = boxCol * 3 + j;
                            if (board[row][col] === 0 && notes[row][col].has(num)) {
                                positions.push({ row, col });
                            }
                        }
                    }

                    if (positions.length >= 2 && positions.length <= 3) {
                        const rows = [...new Set(positions.map(p => p.row))];
                        if (rows.length === 1) {
                            const row = rows[0];
                            const eliminations = [];
                            for (let col = 0; col < 9; col++) {
                                const inBox = col >= boxCol * 3 && col < boxCol * 3 + 3;
                                if (!inBox && notes[row][col].has(num)) {
                                    eliminations.push({ row, col, value: num });
                                }
                            }
                            if (eliminations.length > 0) return { eliminations };
                        }

                        const cols = [...new Set(positions.map(p => p.col))];
                        if (cols.length === 1) {
                            const col = cols[0];
                            const eliminations = [];
                            for (let row = 0; row < 9; row++) {
                                const inBox = row >= boxRow * 3 && row < boxRow * 3 + 3;
                                if (!inBox && notes[row][col].has(num)) {
                                    eliminations.push({ row, col, value: num });
                                }
                            }
                            if (eliminations.length > 0) return { eliminations };
                        }
                    }
                }
            }
        }
        return null;
    }

    findBoxLineReductionForGrading(board, notes) {
        for (let row = 0; row < 9; row++) {
            for (let num = 1; num <= 9; num++) {
                const positions = [];
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] === 0 && notes[row][col].has(num)) {
                        positions.push({ row, col });
                    }
                }
                if (positions.length >= 2 && positions.length <= 3) {
                    const boxes = [...new Set(positions.map(p => Math.floor(p.col / 3)))];
                    if (boxes.length === 1) {
                        const boxCol = boxes[0];
                        const boxRow = Math.floor(row / 3);
                        const eliminations = [];
                        for (let i = 0; i < 3; i++) {
                            for (let j = 0; j < 3; j++) {
                                const r = boxRow * 3 + i;
                                const c = boxCol * 3 + j;
                                if (r !== row && notes[r][c].has(num)) {
                                    eliminations.push({ row: r, col: c, value: num });
                                }
                            }
                        }
                        if (eliminations.length > 0) return { eliminations };
                    }
                }
            }
        }

        for (let col = 0; col < 9; col++) {
            for (let num = 1; num <= 9; num++) {
                const positions = [];
                for (let row = 0; row < 9; row++) {
                    if (board[row][col] === 0 && notes[row][col].has(num)) {
                        positions.push({ row, col });
                    }
                }
                if (positions.length >= 2 && positions.length <= 3) {
                    const boxes = [...new Set(positions.map(p => Math.floor(p.row / 3)))];
                    if (boxes.length === 1) {
                        const boxRow = boxes[0];
                        const boxCol = Math.floor(col / 3);
                        const eliminations = [];
                        for (let i = 0; i < 3; i++) {
                            for (let j = 0; j < 3; j++) {
                                const r = boxRow * 3 + i;
                                const c = boxCol * 3 + j;
                                if (c !== col && notes[r][c].has(num)) {
                                    eliminations.push({ row: r, col: c, value: num });
                                }
                            }
                        }
                        if (eliminations.length > 0) return { eliminations };
                    }
                }
            }
        }

        return null;
    }

    findNakedTripleForGrading(board, notes) {
        for (let row = 0; row < 9; row++) {
            const cells = [];
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0 && notes[row][col].size >= 2 && notes[row][col].size <= 3) {
                    cells.push({ col, notes: notes[row][col] });
                }
            }
            
            for (let i = 0; i < cells.length - 2; i++) {
                for (let j = i + 1; j < cells.length - 1; j++) {
                    for (let k = j + 1; k < cells.length; k++) {
                        const union = new Set([...cells[i].notes, ...cells[j].notes, ...cells[k].notes]);
                        if (union.size === 3) {
                            const eliminations = [];
                            const tripleCols = [cells[i].col, cells[j].col, cells[k].col];
                            for (let col = 0; col < 9; col++) {
                                if (!tripleCols.includes(col)) {
                                    union.forEach(n => {
                                        if (notes[row][col].has(n)) {
                                            eliminations.push({ row, col, value: n });
                                        }
                                    });
                                }
                            }
                            if (eliminations.length > 0) return { eliminations };
                        }
                    }
                }
            }
        }

        return null;
    }

    findXWingForGrading(board, notes) {
        for (let num = 1; num <= 9; num++) {
            const rowPositions = [];
            for (let row = 0; row < 9; row++) {
                const cols = [];
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] === 0 && notes[row][col].has(num)) {
                        cols.push(col);
                    }
                }
                if (cols.length === 2) {
                    rowPositions.push({ row, cols });
                }
            }

            for (let i = 0; i < rowPositions.length - 1; i++) {
                for (let j = i + 1; j < rowPositions.length; j++) {
                    if (rowPositions[i].cols[0] === rowPositions[j].cols[0] &&
                        rowPositions[i].cols[1] === rowPositions[j].cols[1]) {
                        const eliminations = [];
                        const col1 = rowPositions[i].cols[0];
                        const col2 = rowPositions[i].cols[1];
                        const row1 = rowPositions[i].row;
                        const row2 = rowPositions[j].row;

                        for (let row = 0; row < 9; row++) {
                            if (row !== row1 && row !== row2) {
                                if (notes[row][col1].has(num)) {
                                    eliminations.push({ row, col: col1, value: num });
                                }
                                if (notes[row][col2].has(num)) {
                                    eliminations.push({ row, col: col2, value: num });
                                }
                            }
                        }
                        if (eliminations.length > 0) return { eliminations };
                    }
                }
            }
        }

        return null;
    }

    findYWingForGrading(board, notes) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0 && notes[row][col].size === 2) {
                    const pivot = [...notes[row][col]];
                    const [a, b] = pivot;

                    const peers = this.getPeers(row, col);
                    const wingCandidates = peers.filter(p => 
                        board[p.row][p.col] === 0 && 
                        notes[p.row][p.col].size === 2
                    );

                    for (let i = 0; i < wingCandidates.length - 1; i++) {
                        for (let j = i + 1; j < wingCandidates.length; j++) {
                            const wing1 = [...notes[wingCandidates[i].row][wingCandidates[i].col]];
                            const wing2 = [...notes[wingCandidates[j].row][wingCandidates[j].col]];

                            let c = null;
                            if (wing1.includes(a) && !wing1.includes(b)) {
                                c = wing1.find(n => n !== a);
                                if (wing2.includes(b) && wing2.includes(c)) {
                                    const eliminations = this.getYWingEliminations(
                                        row, col, wingCandidates[i], wingCandidates[j], c, notes
                                    );
                                    if (eliminations.length > 0) return { eliminations };
                                }
                            }
                            if (wing1.includes(b) && !wing1.includes(a)) {
                                c = wing1.find(n => n !== b);
                                if (wing2.includes(a) && wing2.includes(c)) {
                                    const eliminations = this.getYWingEliminations(
                                        row, col, wingCandidates[i], wingCandidates[j], c, notes
                                    );
                                    if (eliminations.length > 0) return { eliminations };
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    getYWingEliminations(pivotRow, pivotCol, wing1, wing2, c, notes) {
        const eliminations = [];
        const wing1Peers = this.getPeers(wing1.row, wing1.col);
        const wing2Peers = this.getPeers(wing2.row, wing2.col);
        
        for (const peer of wing1Peers) {
            if (wing2Peers.some(p => p.row === peer.row && p.col === peer.col)) {
                if (notes[peer.row][peer.col].has(c) &&
                    !(peer.row === pivotRow && peer.col === pivotCol) &&
                    !(peer.row === wing1.row && peer.col === wing1.col) &&
                    !(peer.row === wing2.row && peer.col === wing2.col)) {
                    eliminations.push({ row: peer.row, col: peer.col, value: c });
                }
            }
        }
        return eliminations;
    }

    findSwordfishForGrading(board, notes) {
        for (let num = 1; num <= 9; num++) {
            const rowPositions = [];
            for (let row = 0; row < 9; row++) {
                const cols = [];
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] === 0 && notes[row][col].has(num)) {
                        cols.push(col);
                    }
                }
                if (cols.length >= 2 && cols.length <= 3) {
                    rowPositions.push({ row, cols });
                }
            }

            if (rowPositions.length >= 3) {
                for (let i = 0; i < rowPositions.length - 2; i++) {
                    for (let j = i + 1; j < rowPositions.length - 1; j++) {
                        for (let k = j + 1; k < rowPositions.length; k++) {
                            const allCols = new Set([
                                ...rowPositions[i].cols,
                                ...rowPositions[j].cols,
                                ...rowPositions[k].cols
                            ]);
                            if (allCols.size === 3) {
                                const eliminations = [];
                                const rows = [rowPositions[i].row, rowPositions[j].row, rowPositions[k].row];
                                
                                allCols.forEach(col => {
                                    for (let row = 0; row < 9; row++) {
                                        if (!rows.includes(row) && notes[row][col].has(num)) {
                                            eliminations.push({ row, col, value: num });
                                        }
                                    }
                                });
                                if (eliminations.length > 0) return { eliminations };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    getPeers(row, col) {
        const peers = [];
        const seen = new Set();
        
        for (let c = 0; c < 9; c++) {
            if (c !== col) {
                const key = `${row},${c}`;
                if (!seen.has(key)) {
                    peers.push({ row, col: c });
                    seen.add(key);
                }
            }
        }
        
        for (let r = 0; r < 9; r++) {
            if (r !== row) {
                const key = `${r},${col}`;
                if (!seen.has(key)) {
                    peers.push({ row: r, col });
                    seen.add(key);
                }
            }
        }
        
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const r = boxRow + i;
                const c = boxCol + j;
                if (r !== row || c !== col) {
                    const key = `${r},${c}`;
                    if (!seen.has(key)) {
                        peers.push({ row: r, col: c });
                        seen.add(key);
                    }
                }
            }
        }
        
        return peers;
    }
}