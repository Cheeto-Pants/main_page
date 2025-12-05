export class HintFinder {
    constructor(game) {
        this.game = game;
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

    rowHas(board, row, num) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === num) return true;
        }
        return false;
    }

    colHas(board, col, num) {
        for (let row = 0; row < 9; row++) {
            if (board[row][col] === num) return true;
        }
        return false;
    }

    boxHas(board, boxRow, boxCol, num) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow * 3 + i][boxCol * 3 + j] === num) return true;
            }
        }
        return false;
    }

    findAllHints(board, notes) {
        const allHints = [];

        const nakedSingles = this.findAllNakedSingles(board);
        nakedSingles.forEach(h => allHints.push({ technique: 'Naked Single', hint: h }));

        const hiddenSingles = this.findAllHiddenSingles(board);
        hiddenSingles.forEach(h => allHints.push({ technique: 'Hidden Single', hint: h }));

        const pointingPairs = this.findAllPointingPairs(board, notes);
        pointingPairs.forEach(h => allHints.push({ technique: 'Pointing Pair', hint: h }));

        const boxLineReductions = this.findAllBoxLineReductions(board, notes);
        boxLineReductions.forEach(h => allHints.push({ technique: 'Box/Line Reduction', hint: h }));

        const nakedPairs = this.findAllNakedPairs(board, notes);
        nakedPairs.forEach(h => allHints.push({ technique: 'Naked Pair', hint: h }));

        return allHints;
    }

    findAllNakedSingles(board) {
        const hints = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    const candidates = [];
                    for (let num = 1; num <= 9; num++) {
                        if (this.isValidPlacement(board, row, col, num)) {
                            candidates.push(num);
                        }
                    }
                    if (candidates.length === 1) {
                        hints.push({
                            type: 'place',
                            row,
                            col,
                            value: candidates[0],
                            explanation: `Look at the cell in row ${row + 1}, column ${col + 1}. After checking all the numbers that appear in its row, column, and 3x3 box, there's only ONE number that can go here: ${candidates[0]}.`,
                            highlight: `The cell at R${row + 1}C${col + 1} can only be ${candidates[0]}.`
                        });
                    }
                }
            }
        }
        return hints;
    }

    findAllHiddenSingles(board) {
        const hints = [];

        for (let row = 0; row < 9; row++) {
            for (let num = 1; num <= 9; num++) {
                if (this.rowHas(board, row, num)) continue;
                
                const positions = [];
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] === 0 && this.isValidPlacement(board, row, col, num)) {
                        positions.push(col);
                    }
                }
                
                if (positions.length === 1) {
                    const col = positions[0];
                    hints.push({
                        type: 'place',
                        row,
                        col,
                        value: num,
                        explanation: `In row ${row + 1}, the number ${num} can only go in one position.`,
                        highlight: `${num} must go in R${row + 1}C${col + 1} - it's the only place in row ${row + 1} where it fits!`
                    });
                }
            }
        }

        for (let col = 0; col < 9; col++) {
            for (let num = 1; num <= 9; num++) {
                if (this.colHas(board, col, num)) continue;
                
                const positions = [];
                for (let row = 0; row < 9; row++) {
                    if (board[row][col] === 0 && this.isValidPlacement(board, row, col, num)) {
                        positions.push(row);
                    }
                }
                
                if (positions.length === 1) {
                    const row = positions[0];
                    hints.push({
                        type: 'place',
                        row,
                        col,
                        value: num,
                        explanation: `In column ${col + 1}, the number ${num} can only go in one position.`,
                        highlight: `${num} must go in R${row + 1}C${col + 1} - it's the only place in column ${col + 1} where it fits!`
                    });
                }
            }
        }

        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                for (let num = 1; num <= 9; num++) {
                    if (this.boxHas(board, boxRow, boxCol, num)) continue;
                    
                    const positions = [];
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 3; j++) {
                            const row = boxRow * 3 + i;
                            const col = boxCol * 3 + j;
                            if (board[row][col] === 0 && this.isValidPlacement(board, row, col, num)) {
                                positions.push({ row, col });
                            }
                        }
                    }
                    
                    if (positions.length === 1) {
                        const { row, col } = positions[0];
                        const boxNum = boxRow * 3 + boxCol + 1;
                        hints.push({
                            type: 'place',
                            row,
                            col,
                            value: num,
                            explanation: `In box ${boxNum}, the number ${num} can only go in one position.`,
                            highlight: `${num} must go in R${row + 1}C${col + 1} - it's the only place in box ${boxNum} where it fits!`
                        });
                    }
                }
            }
        }

        return hints;
    }

    findAllPointingPairs(board, notes) {
        const hints = [];

        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                for (let num = 1; num <= 9; num++) {
                    if (this.boxHas(board, boxRow, boxCol, num)) continue;

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

                    if (positions.length >= 2) {
                        const rows = [...new Set(positions.map(p => p.row))];
                        if (rows.length === 1) {
                            const row = rows[0];
                            let canEliminate = false;
                            for (let col = 0; col < 9; col++) {
                                const inBox = col >= boxCol * 3 && col < boxCol * 3 + 3;
                                if (!inBox && notes[row][col].has(num)) {
                                    canEliminate = true;
                                }
                            }
                            if (canEliminate) {
                                const boxNum = boxRow * 3 + boxCol + 1;
                                hints.push({
                                    type: 'eliminate',
                                    explanation: `In box ${boxNum}, the number ${num} can only appear in row ${row + 1}.`,
                                    highlight: `Pointing Pair: ${num} in box ${boxNum} points along row ${row + 1}.`
                                });
                            }
                        }

                        const cols = [...new Set(positions.map(p => p.col))];
                        if (cols.length === 1) {
                            const col = cols[0];
                            let canEliminate = false;
                            for (let row = 0; row < 9; row++) {
                                const inBox = row >= boxRow * 3 && row < boxRow * 3 + 3;
                                if (!inBox && notes[row][col].has(num)) {
                                    canEliminate = true;
                                }
                            }
                            if (canEliminate) {
                                const boxNum = boxRow * 3 + boxCol + 1;
                                hints.push({
                                    type: 'eliminate',
                                    explanation: `In box ${boxNum}, the number ${num} can only appear in column ${col + 1}.`,
                                    highlight: `Pointing Pair: ${num} in box ${boxNum} points along column ${col + 1}.`
                                });
                            }
                        }
                    }
                }
            }
        }

        return hints;
    }

    findAllBoxLineReductions(board, notes) {
        const hints = [];

        for (let row = 0; row < 9; row++) {
            for (let num = 1; num <= 9; num++) {
                if (this.rowHas(board, row, num)) continue;

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
                        
                        let canEliminate = false;
                        for (let i = 0; i < 3; i++) {
                            for (let j = 0; j < 3; j++) {
                                const r = boxRow * 3 + i;
                                const c = boxCol * 3 + j;
                                if (r !== row && notes[r][c].has(num)) {
                                    canEliminate = true;
                                }
                            }
                        }

                        if (canEliminate) {
                            const boxNum = boxRow * 3 + boxCol + 1;
                            hints.push({
                                type: 'eliminate',
                                explanation: `In row ${row + 1}, the number ${num} can only appear within box ${boxNum}.`,
                                highlight: `Box/Line Reduction: ${num} in row ${row + 1} is confined to box ${boxNum}.`
                            });
                        }
                    }
                }
            }
        }

        for (let col = 0; col < 9; col++) {
            for (let num = 1; num <= 9; num++) {
                if (this.colHas(board, col, num)) continue;

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
                        
                        let canEliminate = false;
                        for (let i = 0; i < 3; i++) {
                            for (let j = 0; j < 3; j++) {
                                const r = boxRow * 3 + i;
                                const c = boxCol * 3 + j;
                                if (c !== col && notes[r][c].has(num)) {
                                    canEliminate = true;
                                }
                            }
                        }

                        if (canEliminate) {
                            const boxNum = boxRow * 3 + boxCol + 1;
                            hints.push({
                                type: 'eliminate',
                                explanation: `In column ${col + 1}, the number ${num} can only appear within box ${boxNum}.`,
                                highlight: `Box/Line Reduction: ${num} in column ${col + 1} is confined to box ${boxNum}.`
                            });
                        }
                    }
                }
            }
        }

        return hints;
    }

    findAllNakedPairs(board, notes) {
        const hints = [];

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
                        let canEliminate = false;
                        
                        for (let col = 0; col < 9; col++) {
                            if (col !== cells[i].col && col !== cells[j].col) {
                                if (notes[row][col].has(pair[0]) || notes[row][col].has(pair[1])) {
                                    canEliminate = true;
                                }
                            }
                        }

                        if (canEliminate) {
                            hints.push({
                                type: 'eliminate',
                                explanation: `Cells at columns ${cells[i].col + 1} and ${cells[j].col + 1} in row ${row + 1} both can only contain ${pair[0]} or ${pair[1]}.`,
                                highlight: `Naked Pair: ${pair[0]} and ${pair[1]} are locked in two cells of row ${row + 1}.`
                            });
                        }
                    }
                }
            }
        }

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
                        let canEliminate = false;
                        
                        for (let row = 0; row < 9; row++) {
                            if (row !== cells[i].row && row !== cells[j].row) {
                                if (notes[row][col].has(pair[0]) || notes[row][col].has(pair[1])) {
                                    canEliminate = true;
                                }
                            }
                        }

                        if (canEliminate) {
                            hints.push({
                                type: 'eliminate',
                                explanation: `Cells at rows ${cells[i].row + 1} and ${cells[j].row + 1} in column ${col + 1} both can only contain ${pair[0]} or ${pair[1]}.`,
                                highlight: `Naked Pair: ${pair[0]} and ${pair[1]} are locked in two cells of column ${col + 1}.`
                            });
                        }
                    }
                }
            }
        }

        return hints;
    }
}