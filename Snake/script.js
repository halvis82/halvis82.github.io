//Halvor, created: 19.01.2021, Last edited: 26.01.2021, Snake


//Elements
let c = document.getElementById("c");
let useImagesCheckbox = document.getElementById("useImagesCheckbox");


//Variables
let canvasSize = 522;
let squareSize = 40;
let updateSpeed = 170; //(ms)
let snakeColor = "#00FF00";
let fruitColor = "#FF0000";
let snakeDirection = [];
let previousDirection;
let useImages = false;


//Classes
class SnakePart {
    constructor(x, y, color = snakeColor) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.previousDirection = previousDirection;
    }
}


//Event listeners
document.addEventListener("keydown", (e) => {
    if (e.code == "KeyW" || e.code == "ArrowUp") {
        if (snakeDirection.length == 1) {
            if (snakeDirection[0] == previousDirection && previousDirection != 's') {
                snakeDirection[0] = 'w';
            }
            else if (snakeDirection[0] != 'w' && snakeDirection[0] != 's') {
                snakeDirection.push('w');
            }
        }
    }

    else if (e.code == "KeyA" || e.code == "ArrowLeft") {
        if (snakeDirection.length == 1) {
            if (snakeDirection[0] == previousDirection && previousDirection != 'd') {
                snakeDirection[0] = 'a';
            }
            else if (snakeDirection[0] != 'a' && snakeDirection[0] != 'd') {
                snakeDirection.push('a');
            }
        }
    }

    else if (e.code == "KeyS" || e.code == "ArrowDown") {
        if (snakeDirection.length == 1) {
            if (snakeDirection[0] == previousDirection && previousDirection != 'w') {
                snakeDirection[0] = 's';
            }
            else if (snakeDirection[0] != 's' && snakeDirection[0] != 'w') {
                snakeDirection.push('s');
            }
        }
    }

    else if (e.code == "KeyD" || e.code == "ArrowRight") {
        if (snakeDirection.length == 1) {
            if (snakeDirection[0] == previousDirection && previousDirection != 'a') {
                snakeDirection[0] = 'd';
            }
            else if (snakeDirection[0] != 'd' && snakeDirection[0] != 'a') {
                snakeDirection.push('d');
            }
        }
    }

});
useImagesCheckbox.addEventListener("change", () => {
    if (useImagesCheckbox.checked) {
        useImages = true;
    } else {
        useImages = false;
    }
});


//Setup
c.width = canvasSize;
c.height = canvasSize;
let ctx = c.getContext("2d");
startGame();


//Functions
function startGame() {
    //Remove event listeners
    document.removeEventListener("click", startGame);
    document.removeEventListener("keypress", restartGameWithSpace);

    //Set up new game
    drawBackground();
    let gameOver = false;
    let snakeParts = [];
    let startY = 6;
    let startX = 6;
    snakeDirection = ['d'];
    previousDirection = 'd';

    //Set up new snake
    snakeParts.push(
        new SnakePart(startX, startY, "#00FFFF"),
        new SnakePart(startX - 1, startY),
        new SnakePart(startX - 2, startY),
        new SnakePart(startX - 3, startY)
    );
    for (let i = 0; i < snakeParts.length; i++) {
        ctx.beginPath();
        if (useImages) {
            let snakeImg = new Image();
            if (i == 0) {
                snakeImg.src = "./images/snake_head.png";
            } else {
            snakeImg.src = "./images/snake_body.png";
            }
            snakeImg.onload= function() {
                ctx.drawImage(snakeImg, snakeParts[i].x * squareSize + 1, snakeParts[i].y * squareSize + 1);
            }
        } else {
            ctx.fillStyle = snakeParts[i].color;
            ctx.fillRect(snakeParts[i].x * squareSize + 2, snakeParts[i].y * squareSize + 2, squareSize - 2, squareSize - 2);
        }
        ctx.closePath();
    }

    //New fruit
    let fruitX = Math.floor(Math.random() * 13);
    let fruitY = Math.floor(Math.random() * 13);
    while ((fruitY == startY)) {
        fruitY = Math.floor(Math.random() * 13);
    }
    ctx.beginPath();
    if (useImages) {
        let fruitImg = new Image();
        fruitImg.src = "./images/apple.png";
        fruitImg.onload= function() {
            ctx.drawImage(fruitImg, fruitX * squareSize + 1, fruitY * squareSize + 1);
        }
    } else {
        ctx.fillStyle = fruitColor;
        ctx.fillRect(fruitX * squareSize + 2, fruitY * squareSize + 2, squareSize - 2, squareSize - 2);
    }
    ctx.closePath();
    
    //Start main interval (loop)
    let gameID = setInterval(() => {
        //Move
        let previousX = snakeParts[0].x;
        let previousY = snakeParts[0].y;
        switch (snakeDirection[0]) {
            case 'w':
                snakeParts[0].y--;
                previousDirection = 'w';
                break;
            case 'a':
                snakeParts[0].x--;
                previousDirection = 'a';
                break;
            case 's':
                snakeParts[0].y++;
                previousDirection = 's';
                break;
            case 'd':
                snakeParts[0].x++;
                previousDirection = 'd';
                break;
            default:
                return;
        }
        if (snakeDirection.length > 1 && snakeDirection[0] == previousDirection) {
            snakeDirection.shift();
        }

        //Update previous direction
        for (let i = snakeParts.length - 1; i > 1; i--) {
            snakeParts[i].x = snakeParts[i - 1].x;
            snakeParts[i].y = snakeParts[i - 1].y;
        }
        snakeParts[1].x = previousX;
        snakeParts[1].y = previousY;

        //Check if snake hit border
        if (snakeParts[0].x < 0 || snakeParts[0].x > 12 || snakeParts[0].y < 0 || snakeParts[0].y > 12) {
            gameOver = true;
        }

        //Check if snake hit itself
        for (let i = 1; i < snakeParts.length; i++) {
            if (snakeParts[0].x == snakeParts[i].x && snakeParts[0].y == snakeParts[i].y) {
                gameOver = true;
            }
        }

        //Check if won
        if (snakeParts.length >= 169) {
            //You win text
            ctx.beginPath();
            ctx.fillStyle = "#FF00FF";
            ctx.textAlign = "center";
            ctx.font = "70px Arial"
            ctx.fillText("YOU WON!", canvasSize/2, canvasSize/2, canvasSize);
            ctx.fill();
            ctx.closePath();
            
            //Play again text
            ctx.beginPath();
            ctx.fillStyle = "#FF00FF";
            ctx.textAlign = "center";
            ctx.font = "20px Arial"
            ctx.fillText("Press to play again", canvasSize/2, (canvasSize/3)*2, canvasSize);
            ctx.fill();
            ctx.closePath();

            clearInterval(gameID);
            document.addEventListener("click", startGame);
            document.addEventListener("keypress", restartGameWithSpace);
            return;
        }

        //Check game over
        if (gameOver) {
            //Game over text
            ctx.beginPath();
            ctx.fillStyle = "#FF0000";
            ctx.textAlign = "center";
            ctx.font = "70px Arial"
            ctx.fillText("GAME OVER", canvasSize/2, canvasSize/2, canvasSize);
            ctx.fill();
            ctx.closePath();
            
            //Play again text
            ctx.beginPath();
            ctx.fillStyle = "#FF0000";
            ctx.textAlign = "center";
            ctx.font = "20px Arial"
            ctx.fillText("Press to play again", canvasSize/2, (canvasSize/3)*2, canvasSize);
            ctx.fill();
            ctx.closePath();

            clearInterval(gameID);
            document.addEventListener("click", startGame);
            document.addEventListener("keypress", restartGameWithSpace);
            return;
        }

        //Check if snake hit fruit
        if (snakeParts[0].x == fruitX && snakeParts[0].y == fruitY) {
            snakeParts.push(new SnakePart(snakeParts[snakeParts.length - 1].x, snakeParts[snakeParts.length - 1].y));
            let isSnakePosUnique = false
            snakePosUniqueLoop:
            while (!isSnakePosUnique) {
                fruitX = Math.floor(Math.random() * 13);
                fruitY = Math.floor(Math.random() * 13);
                for (let i of snakeParts) {
                    if (i.x == fruitX && i.y == fruitY) {
                        continue snakePosUniqueLoop;
                    }
                }
                isSnakePosUnique = true;
            }
        }

        //Draw snake
        drawBackground();
        for (let i = 0; i < snakeParts.length; i++) {
            ctx.beginPath();
            if (useImages) {
                let snakeImg = new Image();
                if (i == 0) {
                    snakeImg.src = "./images/snake_head.png";
                } else {
                snakeImg.src = "./images/snake_body.png";
                }
                snakeImg.onload= function() {
                    ctx.drawImage(snakeImg, snakeParts[i].x * squareSize + 1, snakeParts[i].y * squareSize + 1);
                }
            } else {
                ctx.fillStyle = snakeParts[i].color;
                ctx.fillRect(snakeParts[i].x * squareSize + 2, snakeParts[i].y * squareSize + 2, squareSize - 2, squareSize - 2);
            }
            ctx.closePath();
        }

        //Draw fruit
        ctx.beginPath();
        if (useImages) {
            let fruitImg = new Image();
            fruitImg.src = "./images/apple.png";
            fruitImg.onload= function() {
                ctx.drawImage(fruitImg, fruitX * squareSize + 1, fruitY * squareSize + 1);
            }
        } else {
            ctx.fillStyle = fruitColor;
            ctx.fillRect(fruitX * squareSize + 2, fruitY * squareSize + 2, squareSize - 2, squareSize - 2);
        }
        ctx.closePath();

    }, updateSpeed);
}


function restartGameWithSpace(e) {
    if (e.code == "Space") {
        startGame();
    }
}


function drawBackground() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    //Horizontal lines
    for (let i = 1; i < canvasSize; i += squareSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvasSize, i);
        ctx.stroke();
        ctx.closePath();
    }

    //Vertical lines
    for (let i = 1; i < canvasSize; i += squareSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvasSize);
        ctx.stroke();
        ctx.closePath();
    }
}