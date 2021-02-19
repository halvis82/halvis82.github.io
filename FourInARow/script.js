//Halvor, Started: 17.02.2021, Last edited: 18.02.2021, Four in a row

/*
CHANGES:
- add fall down animation (behind black borders)
- add right click to revert previous (or click a piece to remove it) (https://stackoverflow.com/a/44620991/15165756)
- add ability to change amount of rows and columns
- add gravity on/off toggle
*/

//Elements
let c = document.getElementById("c");

//Canvas setup
c.width = 500;
c.height = 429;
let ctx = c.getContext("2d");
ctx.lineWidth = 10;
ctx.textAlign = "center";

//variables
let color1 = "Red";
let color2 = "Yellow";
let rows = 6;
let columns = 7;
let game = [];
for (let i = 0; i < rows; i++) {
    game.push([]);
    for (let j = 0; j < columns; j++) {
        game[i].push(0);
    }
}
let squareSize = 60;
let borderWidth = (c.width - (squareSize * columns)) / columns;
let circleRadius = 25;
let turn = 1;
let requiredInRow = 4;

//Event listeners
c.addEventListener("click", canvasClicked);
document.body.addEventListener("keydown", docKeyDown);

//Game
drawBackground();

//Functions
function drawBackground() {
    ctx.clearRect(0, 0, c.width, c.height);

    //Draw all black
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fill();
    ctx.closePath();

    //Remove squares for pieces
    for (let y = borderWidth / 2; y < c.height; y += squareSize + borderWidth) {
        for (let x = borderWidth / 2; x < c.width; x += squareSize + borderWidth) {
            ctx.clearRect(x, y, squareSize, squareSize);
        }
    }

    //Draw numbers
    ctx.font = "20px Arial";
    ctx.fillstyle = "#1E1E1E";
    let y = (borderWidth / 2) + (squareSize / 2);
    for (let i = 1; i < columns + 1; i++) {
        ctx.beginPath();
        ctx.fillText(i, ((i * 2) - 1) * ((borderWidth / 2) + (squareSize / 2)), y);
        ctx.closePath();
    }
}

function canvasClicked(e) {
    //Calculate x
    let rect = e.target.getBoundingClientRect();
    let x = e.clientX - rect.left; //x position within the element
    for (let i = 1; i < columns + 1; i++) {
        if (x < (squareSize + borderWidth) * i) {
            x = i;
            break;
        }
    }

    placePiece(x);
}

function placePiece(x) {
    //Calculate y
    let y = -1;
    for (let i = 0; i < rows; i++) {
        if (game[i][x-1] == 0) {
            y = i + 1;
            game[i][x-1] = turn;
            break;
        }
    }
    if (y == -1) {
        console.log("Column full");
        return;
    }

    //Draw results
    let color = (turn == 1) ? color1 : color2;
    drawPiece(x, y, color);

    //Check for win
    if (checkWin(game, x, y)) {
        gameOver(turn);
        return;
    }

    //Check for nobody win
    let allFilled = true;
    columnloop:
    for (i = 0; i < rows; i++) {
        for (let j = 0; j < columns; j++) {
            if (game[i][j] == 0) {
                allFilled = false;
                break columnloop;
            }
        }
    }
    if (allFilled) {
        gameOver(0);
        return;
    }

    //Update turn
    turn = (turn == 1) ? 2 : 1;

    //Update border to display turn
    c.style.border = `3px solid ${(turn == 1) ? color1 : color2}`;
}

function drawPiece(x, y, color) {
    //Calculate
    ctx.fillStyle = color;
    x = ((x*2)-1) * ((borderWidth/2) + (squareSize/2));
    y = c.height - ((y*2)-1) * ((borderWidth/2) + (squareSize/2));

    //Draw
    ctx.beginPath();
    ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
}

function checkWin(grid, x, y) {
    let currentValue = grid[y-1][x-1];

    //Variables (stupid many, cba to change)
    let horCount = 0;
    let verCount = 0;
    let diaDownLeftUpRightCount = 0;
    let diaDownRightUpLeftCount = 0;
    let horRightCounting = true;
    let horLeftCounting = true;
    let verDownCounting = true;
    let diaUpLeftCounting = true;
    let diaUpRightCounting = true;
    let diaDownLeftCounting = true;
    let diaDownRightCounting = true;

    for (let i = 1; i < 4; i++) {
        //Horizontal right
        if (horRightCounting && currentValue == grid[y-1][x-1 + i]) {
            horCount++;
        } else {
            horRightCounting = false;
        }

        //Horizontal left
        if (horLeftCounting && currentValue == grid[y-1][x-1 - i]) {
            horCount++;
        } else {
            horLeftCounting = false;
        }

        // Vertical down
        try {
            if (verDownCounting && currentValue == grid[y-1 - i][x-1]) {
                verCount++;
            } else {
                verDownCounting = false;
            }
        } catch {}

        //Diagonal up left
        try {
            if (diaUpLeftCounting && currentValue == grid[y-1 + i][x-1 - i]) {
                diaDownRightUpLeftCount++;
            } else {
                diaUpLeftCounting = false;
            }
        } catch {}

        //Diagonal up Right
        try {
            if (diaUpRightCounting && currentValue == grid[y-1 + i][x-1 + i]) {
                diaDownLeftUpRightCount++;
            } else {
                diaUpRightCounting = false;
            }
        } catch {}

        //Diagonal down left
        try {
            if (diaDownLeftCounting && currentValue == grid[y-1 - i][x-1 - i]) {
                diaDownLeftUpRightCount++;
            } else {
                diaDownLeftCounting = false;
            }
        } catch {}
        
        //Diagonal down Right
        try {
            if (diaDownRightCounting && currentValue == grid[y-1 - i][x-1 + i]) {
                diaDownRightUpLeftCount++;
            } else {
                diaDownRightCounting = false;
            }
        } catch {}
    }

    //true if any is long enough
    return (
        horCount >= requiredInRow - 1 ||
        verCount >= requiredInRow - 1 ||
        diaDownLeftUpRightCount >= requiredInRow - 1 ||
        diaDownRightUpLeftCount >= requiredInRow - 1
    );
}

function gameOver(winner) {
    //Update event listeners
    c.removeEventListener("click", canvasClicked);
    document.body.removeEventListener("keydown", docKeyDown);
    c.addEventListener("click", restartGame);

    //Background
    ctx.beginPath();
    ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
    ctx.fillRect(c.width/8, c.height/8, c.width*(3/4), c.height*(3/4));
    ctx.fill();
    ctx.closePath();

    //Title
    ctx.beginPath();
    ctx.fillStyle = "#5A2D72";
    ctx.font = "65px Arial";
    if (winner == 1) {
        ctx.fillText(`${color1} won!`, c.width/2, c.height/2 - 10);
    } else if (winner == 2) {
        ctx.fillText(`${color2} won!`, c.width/2, c.height/2 - 10);
    } else {
        ctx.fillText(`Nobody won`, c.width/2, c.height/2 - 10);
    }
    ctx.fill();
    ctx.closePath();

    //Play again text
    ctx.beginPath();
    ctx.font = "20px Arial";
    ctx.fillText("(Click here to play again)", c.width/2, c.height/2 + 90);
    ctx.fill();
    ctx.closePath();
}

function restartGame() {
    //Reset variables
    drawBackground();
    turn = 1;
    game = [];
    for (let i = 0; i < rows; i++) {
        game.push([]);
        for (let j = 0; j < columns; j++) {
            game[i].push(0);
        }
    }
    c.style.border = `3px solid ${color1}`;

    //Change event listeners
    c.removeEventListener("click", restartGame);
    c.addEventListener("click", canvasClicked);
    document.body.addEventListener("keydown", docKeyDown);
}

function docKeyDown(e) {
    for (let i = 1; i < columns + 1; i++) {
        if (e.code == `Digit${i}`) {
            placePiece(i);
            break;
        }
    }
}