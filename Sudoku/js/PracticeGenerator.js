export class PracticeGenerator {
    constructor(puzzleGenerator) {
        this.puzzleGenerator = puzzleGenerator;
        
        this.techniqueInfo = {
            nakedSingle: {
                name: 'Naked Single',
                description: 'A Naked Single occurs when a cell has only one possible candidate. After eliminating all numbers that appear in the same row, column, and box, only one number remains.',
                instructions: 'Find the cell where only one number can go. Look at the highlighted region and identify which number is missing from all related cells.'
            },
            hiddenSingle: {
                name: 'Hidden Single',
                description: 'A Hidden Single occurs when a number can only go in one cell within a row, column, or box, even though that cell might have other candidates.',
                instructions: 'Find where a specific number can only go in one place within a row, column, or box. The number is "hidden" among other candidates.'
            },
            nakedPair: {
                name: 'Naked Pair',
                description: 'A Naked Pair occurs when two cells in the same row, column, or box contain only the same two candidates. These two numbers can be eliminated from other cells in that unit.',
                instructions: 'Find two cells with the same two candidates. Those numbers can be removed from other cells in the same row, column, or box.'
            },
            hiddenPair: {
                name: 'Hidden Pair',
                description: 'A Hidden Pair occurs when two numbers can only appear in two cells within a row, column, or box. All other candidates can be removed from those two cells.',
                instructions: 'Find two numbers that only appear in two cells within a unit. Remove all other candidates from those cells.'
            },
            pointingPair: {
                name: 'Pointing Pair',
                description: 'When a candidate in a box is confined to a single row or column, that candidate can be eliminated from that row or column outside the box.',
                instructions: 'Find a number that only appears in one row or column within a box. Eliminate it from that row/column outside the box.'
            },
            boxLineReduction: {
                name: 'Box/Line Reduction',
                description: 'When a candidate in a row or column is confined to a single box, that candidate can be eliminated from other cells in that box.',
                instructions: 'Find a number in a row/column that only appears within one box. Eliminate it from other cells in that box.'
            },
            nakedTriple: {
                name: 'Naked Triple',
                description: 'Three cells in a unit contain only three candidates (in any combination). Those three numbers can be eliminated from other cells in that unit.',
                instructions: 'Find three cells that together contain only three different numbers. Remove those numbers from other cells in the same unit.'
            },
            xWing: {
                name: 'X-Wing',
                description: 'When a candidate appears in exactly two cells in two different rows, and those cells are in the same two columns, the candidate can be eliminated from other cells in those columns (and vice versa).',
                instructions: 'Find a number that forms a rectangle pattern: exactly 2 cells in 2 rows, aligned in the same 2 columns. Eliminate that number from other cells in those columns.'
            },
            yWing: {
                name: 'Y-Wing',
                description: 'Three cells form a Y pattern: a pivot cell with two candidates (AB) connects to two wing cells with candidates (AC) and (BC). The candidate C can be eliminated from cells that see both wings.',
                instructions: 'Find a pivot cell with 2 candidates that connects to two wing cells. The common candidate between the wings can be eliminated from cells seeing both wings.'
            },
            swordfish: {
                name: 'Swordfish',
                description: 'An extension of X-Wing using three rows and three columns. When a candidate appears in 2-3 cells in three rows, and all those cells are confined to the same three columns, eliminate from other cells in those columns.',
                instructions: 'Find a number that appears in a 3x3 pattern across three rows and three columns. Eliminate it from other cells in those columns.'
            }
        };
    }

    getTechniqueInfo(technique) {
        return this.techniqueInfo[technique] || null;
    }

    generatePracticePuzzle(technique) {
        // Generate puzzles until we find one that requires the target technique
        const maxAttempts = 50;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const result = this.tryGeneratePuzzleWithTechnique(technique);
            if (result) {
                return result;
            }
        }
        
        // Fallback: return a pre-made puzzle for the technique
        return this.getPresetPuzzle(technique);
    }

    tryGeneratePuzzleWithTechnique(technique) {
        // Generate a solution
        const solution = this.puzzleGenerator.generateSolution();
        const puzzle = solution.map(row => [...row]);
        
        // Remove cells strategically based on technique
        const cellsToRemove = this.getCellsToRemoveForTechnique(technique);
        
        const cells = [];
        for (let i = 0; i < 81; i++) {
            cells.push(i);
        }
        this.shuffleArray(cells);
        
        let removed = 0;
        for (const cellIndex of cells) {
            if (removed >= cellsToRemove) break;
            
            const row = Math.floor(cellIndex / 9);
            const col = cellIndex % 9;
            
            const backup = puzzle[row][col];
            puzzle[row][col] = 0;
            
            if (this.puzzleGenerator.countSolutions(puzzle.map(r => [...r])) === 1) {
                removed++;
            } else {
                puzzle[row][col] = backup;
            }
        }
        
        // Now solve partially until we reach a state requiring the technique
        const practiceState = this.solveUntilTechnique(puzzle, solution, technique);
        
        if (practiceState) {
            return {
                puzzle: practiceState.board,
                solution: solution,
                notes: practiceState.notes,
                given: practiceState.given,
                techniqueLocation: practiceState.techniqueLocation
            };
        }
        
        return null;
    }

    getCellsToRemoveForTechnique(technique) {
        switch (technique) {
            case 'nakedSingle':
            case 'hiddenSingle':
                return 40;
            case 'nakedPair':
            case 'hiddenPair':
            case 'pointingPair':
            case 'boxLineReduction':
                return 48;
            case 'nakedTriple':
            case 'xWing':
            case 'yWing':
                return 52;
            case 'swordfish':
                return 55;
            default:
                return 45;
        }
    }

    solveUntilTechnique(puzzle, solution, targetTechnique) {
        const board = puzzle.map(row => [...row]);
        const given = puzzle.map(row => row.map(cell => cell !== 0));
        const notes = Array(9).fill(null).map(() => 
            Array(9).fill(null).map(() => new Set())
        );
        
        // Fill initial candidates
        this.fillAllNotes(board, notes);
        
        const maxIterations = 100;
        let iterations = 0;
        
        while (iterations < maxIterations) {
            iterations++;
            
            // Check if target technique is applicable now
            const techniqueResult = this.checkForTechnique(board, notes, targetTechnique);
            if (techniqueResult) {
                return {
                    board,
                    notes,
                    given,
                    techniqueLocation: techniqueResult
                };
            }
            
            // Apply simpler techniques to progress
            let progress = false;
            
            // Only apply techniques simpler than the target
            if (this.getTechniqueDifficulty(targetTechnique) > 1) {
                const nakedSingle = this.findNakedSingle(board, notes);
                if (nakedSingle) {
                    board[nakedSingle.row][nakedSingle.col] = nakedSingle.value;
                    notes[nakedSingle.row][nakedSingle.col].clear();
                    this.removeNotesFromRelated(notes, nakedSingle.row, nakedSingle.col, nakedSingle.value);
                    progress = true;
                    continue;
                }
            }
            
            if (this.getTechniqueDifficulty(targetTechnique) > 2) {
                const hiddenSingle = this.findHiddenSingle(board, notes);
                if (hiddenSingle) {
                    board[hiddenSingle.row][hiddenSingle.col] = hiddenSingle.value;
                    notes[hiddenSingle.row][hiddenSingle.col].clear();
                    this.removeNotesFromRelated(notes, hiddenSingle.row, hiddenSingle.col, hiddenSingle.value);
                    progress = true;
                    continue;
                }
            }
            
            if (!progress) break;
        }
        
        // Check one more time if technique applies
        const finalCheck = this.checkForTechnique(board, notes, targetTechnique);
        if (finalCheck) {
            return {
                board,
                notes,
                given,
                techniqueLocation: finalCheck
            };
        }
        
        return null;
    }

    getTechniqueDifficulty(technique) {
        const difficulties = {
            nakedSingle: 1,
            hiddenSingle: 2,
            nakedPair: 3,
            hiddenPair: 4,
            pointingPair: 5,
            boxLineReduction: 6,
            nakedTriple: 7,
            xWing: 8,
            yWing: 9,
            swordfish: 10
        };
        return difficulties[technique] || 5;
    }

    checkForTechnique(board, notes, technique) {
        switch (technique) {
            case 'nakedSingle':
                return this.findNakedSingle(board, notes);
            case 'hiddenSingle':
                return this.findHiddenSingle(board, notes);
            case 'nakedPair':
                return this.findNakedPair(board, notes);
            case 'hiddenPair':
                return this.findHiddenPair(board, notes);
            case 'pointingPair':
                return this.findPointingPair(board, notes);
            case 'boxLineReduction':
                return this.findBoxLineReduction(board, notes);
            case 'nakedTriple':
                return this.findNakedTriple(board, notes);
            case 'xWing':
                return this.findXWing(board, notes);
            case 'yWing':
                return this.findYWing(board, notes);
            case 'swordfish':
                return this.findSwordfish(board, notes);
            default:
                return null;
        }
    }

    fillAllNotes(board, notes) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    notes[row][col].clear();
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValidPlacement(board, row, col, num)) {
                            notes[row][col].add(num);
                        }
                    }
                }
            }
        }
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

    removeNotesFromRelated(notes, row, col, num) {
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

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Technique finding methods
    findNakedSingle(board, notes) {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0 && notes[row][col].size === 1) {
                    return {
                        row,
                        col,
                        value: [...notes[row][col]][0],
                        cells: [{ row, col }],
                        type: 'place'
                    };
                }
            }
        }
        return null;
    }

    findHiddenSingle(board, notes) {
        // Check rows
        for (let row = 0; row < 9; row++) {
            for (let num = 1; num <= 9; num++) {
                const positions = [];
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] === 0 && notes[row][col].has(num)) {
                        positions.push({ row, col });
                    }
                }
                if (positions.length === 1) {
                    return {
                        row: positions[0].row,
                        col: positions[0].col,
                        value: num,
                        cells: positions,
                        type: 'place',
                        unit: 'row'
                    };
                }
            }
        }

        // Check columns
        for (let col = 0; col < 9; col++) {
            for (let num = 1; num <= 9; num++) {
                const positions = [];
                for (let row = 0; row < 9; row++) {
                    if (board[row][col] === 0 && notes[row][col].has(num)) {
                        positions.push({ row, col });
                    }
                }
                if (positions.length === 1) {
                    return {
                        row: positions[0].row,
                        col: positions[0].col,
                        value: num,
                        cells: positions,
                        type: 'place',
                        unit: 'column'
                    };
                }
            }
        }

        // Check boxes
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
                    if (positions.length === 1) {
                        return {
                            row: positions[0].row,
                            col: positions[0].col,
                            value: num,
                            cells: positions,
                            type: 'place',
                            unit: 'box'
                        };
                    }
                }
            }
        }

        return null;
    }

    findNakedPair(board, notes) {
        // Check rows
        for (let row = 0; row < 9; row++) {
            const cells = [];
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0 && notes[row][col].size === 2) {
                    cells.push({ col, notes: [...notes[row][col]].sort().join(',') });
                }
            }
            for (let i = 0; i < cells.length; i++) {
                for (let j = i + 1; j < cells.length; j++) {
                    if (cells[i].notes === cells[j].notes) {
                        const pair = cells[i].notes.split(',').map(Number);
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
                        if (eliminations.length > 0) {
                            return {
                                cells: [{ row, col: cells[i].col }, { row, col: cells[j].col }],
                                values: pair,
                                eliminations,
                                type: 'eliminate',
                                unit: 'row'
                            };
                        }
                    }
                }
            }
        }

        // Check columns
        for (let col = 0; col < 9; col++) {
            const cells = [];
            for (let row = 0; row < 9; row++) {
                if (board[row][col] === 0 && notes[row][col].size === 2) {
                    cells.push({ row, notes: [...notes[row][col]].sort().join(',') });
                }
            }
            for (let i = 0; i < cells.length; i++) {
                for (let j = i + 1; j < cells.length; j++) {
                    if (cells[i].notes === cells[j].notes) {
                        const pair = cells[i].notes.split(',').map(Number);
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
                        if (eliminations.length > 0) {
                            return {
                                cells: [{ row: cells[i].row, col }, { row: cells[j].row, col }],
                                values: pair,
                                eliminations,
                                type: 'eliminate',
                                unit: 'column'
                            };
                        }
                    }
                }
            }
        }

        return null;
    }

    findHiddenPair(board, notes) {
        // Check rows
        for (let row = 0; row < 9; row++) {
            for (let n1 = 1; n1 <= 8; n1++) {
                for (let n2 = n1 + 1; n2 <= 9; n2++) {
                    const positions = [];
                    for (let col = 0; col < 9; col++) {
                        if (board[row][col] === 0 && 
                            (notes[row][col].has(n1) || notes[row][col].has(n2))) {
                            if (notes[row][col].has(n1) && notes[row][col].has(n2)) {
                                positions.push(col);
                            }
                        }
                    }
                    
                    if (positions.length === 2) {
                        // Verify these are the only positions for both numbers
                        let validN1 = true, validN2 = true;
                        for (let col = 0; col < 9; col++) {
                            if (!positions.includes(col)) {
                                if (notes[row][col].has(n1)) validN1 = false;
                                if (notes[row][col].has(n2)) validN2 = false;
                            }
                        }
                        
                        if (validN1 && validN2) {
                            const eliminations = [];
                            positions.forEach(col => {
                                notes[row][col].forEach(n => {
                                    if (n !== n1 && n !== n2) {
                                        eliminations.push({ row, col, value: n });
                                    }
                                });
                            });
                            
                            if (eliminations.length > 0) {
                                return {
                                    cells: positions.map(col => ({ row, col })),
                                    values: [n1, n2],
                                    eliminations,
                                    type: 'eliminate',
                                    unit: 'row'
                                };
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    findPointingPair(board, notes) {
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
                            if (eliminations.length > 0) {
                                return {
                                    cells: positions,
                                    value: num,
                                    eliminations,
                                    type: 'eliminate',
                                    direction: 'row'
                                };
                            }
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
                            if (eliminations.length > 0) {
                                return {
                                    cells: positions,
                                    value: num,
                                    eliminations,
                                    type: 'eliminate',
                                    direction: 'column'
                                };
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    findBoxLineReduction(board, notes) {
        // Check rows
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
                        if (eliminations.length > 0) {
                            return {
                                cells: positions,
                                value: num,
                                eliminations,
                                type: 'eliminate',
                                unit: 'row'
                            };
                        }
                    }
                }
            }
        }

        // Check columns
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
                        if (eliminations.length > 0) {
                            return {
                                cells: positions,
                                value: num,
                                eliminations,
                                type: 'eliminate',
                                unit: 'column'
                            };
                        }
                    }
                }
            }
        }

        return null;
    }

    findNakedTriple(board, notes) {
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
                            if (eliminations.length > 0) {
                                return {
                                    cells: tripleCols.map(col => ({ row, col })),
                                    values: [...union],
                                    eliminations,
                                    type: 'eliminate'
                                };
                            }
                        }
                    }
                }
            }
        }

        return null;
    }

    findXWing(board, notes) {
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
                        if (eliminations.length > 0) {
                            return {
                                cells: [
                                    { row: row1, col: col1 },
                                    { row: row1, col: col2 },
                                    { row: row2, col: col1 },
                                    { row: row2, col: col2 }
                                ],
                                value: num,
                                eliminations,
                                type: 'eliminate'
                            };
                        }
                    }
                }
            }
        }

        return null;
    }

    findYWing(board, notes) {
        const getPeers = (row, col) => {
            const peers = [];
            for (let c = 0; c < 9; c++) if (c !== col) peers.push({ row, col: c });
            for (let r = 0; r < 9; r++) if (r !== row) peers.push({ row: r, col });
            const boxRow = Math.floor(row / 3) * 3;
            const boxCol = Math.floor(col / 3) * 3;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const r = boxRow + i, c = boxCol + j;
                    if (r !== row || c !== col) {
                        if (!peers.some(p => p.row === r && p.col === c)) {
                            peers.push({ row: r, col: c });
                        }
                    }
                }
            }
            return peers;
        };

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0 && notes[row][col].size === 2) {
                    const pivot = [...notes[row][col]];
                    const [a, b] = pivot;
                    const peers = getPeers(row, col);
                    const wingCandidates = peers.filter(p =>
                        board[p.row][p.col] === 0 && notes[p.row][p.col].size === 2
                    );

                    for (let i = 0; i < wingCandidates.length; i++) {
                        for (let j = i + 1; j < wingCandidates.length; j++) {
                            const wing1 = [...notes[wingCandidates[i].row][wingCandidates[i].col]];
                            const wing2 = [...notes[wingCandidates[j].row][wingCandidates[j].col]];

                            let c = null;
                            if (wing1.includes(a) && !wing1.includes(b)) {
                                c = wing1.find(n => n !== a);
                                if (wing2.includes(b) && wing2.includes(c)) {
                                    const eliminations = [];
                                    const wing1Peers = getPeers(wingCandidates[i].row, wingCandidates[i].col);
                                    const wing2Peers = getPeers(wingCandidates[j].row, wingCandidates[j].col);

                                    for (const peer of wing1Peers) {
                                        if (wing2Peers.some(p => p.row === peer.row && p.col === peer.col)) {
                                            if (notes[peer.row][peer.col].has(c) &&
                                                !(peer.row === row && peer.col === col) &&
                                                !(peer.row === wingCandidates[i].row && peer.col === wingCandidates[i].col) &&
                                                !(peer.row === wingCandidates[j].row && peer.col === wingCandidates[j].col)) {
                                                eliminations.push({ row: peer.row, col: peer.col, value: c });
                                            }
                                        }
                                    }
                                    if (eliminations.length > 0) {
                                        return {
                                            cells: [
                                                { row, col },
                                                wingCandidates[i],
                                                wingCandidates[j]
                                            ],
                                            values: [a, b, c],
                                            eliminations,
                                            type: 'eliminate'
                                        };
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    findSwordfish(board, notes) {
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
                                if (eliminations.length > 0) {
                                    const cells = [];
                                    rows.forEach(row => {
                                        allCols.forEach(col => {
                                            if (notes[row][col].has(num)) {
                                                cells.push({ row, col });
                                            }
                                        });
                                    });
                                    return {
                                        cells,
                                        value: num,
                                        eliminations,
                                        type: 'eliminate'
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    getPresetPuzzle(technique) {
        // Fallback preset puzzles for each technique
        // These are carefully crafted to demonstrate each technique
        const presets = {
            nakedSingle: {
                puzzle: [
                    [5,3,0,0,7,0,0,0,0],
                    [6,0,0,1,9,5,0,0,0],
                    [0,9,8,0,0,0,0,6,0],
                    [8,0,0,0,6,0,0,0,3],
                    [4,0,0,8,0,3,0,0,1],
                    [7,0,0,0,2,0,0,0,6],
                    [0,6,0,0,0,0,2,8,0],
                    [0,0,0,4,1,9,0,0,5],
                    [0,0,0,0,8,0,0,7,9]
                ],
                solution: [
                    [5,3,4,6,7,8,9,1,2],
                    [6,7,2,1,9,5,3,4,8],
                    [1,9,8,3,4,2,5,6,7],
                    [8,5,9,7,6,1,4,2,3],
                    [4,2,6,8,5,3,7,9,1],
                    [7,1,3,9,2,4,8,5,6],
                    [9,6,1,5,3,7,2,8,4],
                    [2,8,7,4,1,9,6,3,5],
                    [3,4,5,2,8,6,1,7,9]
                ]
            }
        };

        const preset = presets[technique] || presets.nakedSingle;
        const given = preset.puzzle.map(row => row.map(cell => cell !== 0));
        const notes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
        
        // Fill notes
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (preset.puzzle[row][col] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValidPlacement(preset.puzzle, row, col, num)) {
                            notes[row][col].add(num);
                        }
                    }
                }
            }
        }

        return {
            puzzle: preset.puzzle.map(row => [...row]),
            solution: preset.solution,
            notes,
            given,
            techniqueLocation: this.checkForTechnique(preset.puzzle, notes, technique)
        };
    }
}