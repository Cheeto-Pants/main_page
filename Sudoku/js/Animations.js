export class Animations {
    constructor(game) {
        this.game = game;
        this.cellSize = 52;
    }

    animateRow(row) {
        const cells = document.querySelectorAll('.cell');
        for (let col = 0; col < 9; col++) {
            const index = row * 9 + col;
            setTimeout(() => {
                cells[index].classList.add('row-complete');
                setTimeout(() => cells[index].classList.remove('row-complete'), 600);
            }, col * 50);
        }
    }

    animateCol(col) {
        const cells = document.querySelectorAll('.cell');
        for (let row = 0; row < 9; row++) {
            const index = row * 9 + col;
            setTimeout(() => {
                cells[index].classList.add('col-complete');
                setTimeout(() => cells[index].classList.remove('col-complete'), 600);
            }, row * 50);
        }
    }

    animateBox(row, col) {
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        const cells = document.querySelectorAll('.cell');
        let delay = 0;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const index = (boxRow + i) * 9 + (boxCol + j);
                setTimeout(() => {
                    cells[index].classList.add('box-complete');
                    setTimeout(() => cells[index].classList.remove('box-complete'), 600);
                }, delay);
                delay += 50;
            }
        }
    }

    animateNumber(num, board) {
        const cells = document.querySelectorAll('.cell');
        let delay = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === num) {
                    const index = row * 9 + col;
                    setTimeout(() => {
                        cells[index].classList.add('number-complete');
                        setTimeout(() => cells[index].classList.remove('number-complete'), 500);
                    }, delay);
                    delay += 80;
                }
            }
        }
    }

    animateGameComplete(originRow, originCol) {
        const cells = document.querySelectorAll('.cell');

        // Animate from the origin cell outward
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const distance = Math.abs(row - originRow) + Math.abs(col - originCol);
                const index = row * 9 + col;
                setTimeout(() => {
                    cells[index].classList.add('game-complete');
                    setTimeout(() => cells[index].classList.remove('game-complete'), 800);
                }, distance * 80);
            }
        }

        // Add ripple effect from origin cell
        this.createRipple(originRow, originCol);
    }

    createRipple(row, col) {
        const overlay = document.getElementById('rippleOverlay');
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        
        const x = col * this.cellSize + this.cellSize / 2;
        const y = row * this.cellSize + this.cellSize / 2;
        
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.width = '100px';
        ripple.style.height = '100px';
        ripple.style.marginLeft = '-50px';
        ripple.style.marginTop = '-50px';
        
        overlay.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 1000);
    }
}