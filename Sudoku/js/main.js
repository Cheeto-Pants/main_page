import { SudokuGame } from './SudokuGame.js';

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new SudokuGame();
});