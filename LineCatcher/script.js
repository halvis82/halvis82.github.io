//By: Halvor, Created: 14.01.2021, Last edited: 17.01.2021, Line Catcher

/*
GAME:
    Move the mouse around the center circle and catch lines before they hit the border.
    One point per line caught - One life lost per line missed.
    Variables you can change: 'Game variables', 'Sizes', 'Colors'.
*/
console.log("How to play: Catch lines...");


//Game variables
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
const startLives = 3;
const updateSpeed = 20; //Main loop update speed (ms)
const minimumDelayNewLine = 8; //This times updateSpeed in ms
const distanceIncrease = 4; //Pixels per updateSpeed (ms)
const chanceOfNewLine = 15;
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//Sizes
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
const playerLength = 20;
const playerWidth = Math.PI/8; //(Radians)
const circleRadius = 300; //min. innerCircleRadius - (Should be true: 'circleRadius % distanceIncrease == 0' && 'circleBorderWidth % distanceIncrease == 0')
const circleBorderWidth = 12;
const innerCircleRadius = 20;
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//Colors (hex)
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
const backgroundColor = "#333333";
const fontColor = "#FFFFFF";
const fontColorFlash = "#FF0000";
const circleColor = "#FFFF00";
const circleBorderColor = "#000000";
const playerColor = "#FF00FF";
const lineColor = "#0000FF";
const lineDeadColor = "#FF0000";
const gameOverBackgroundColor = "#FF0000";
const gameOverFontColor = "#000000";
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//HTML elements
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
let c = document.getElementById("canvas");
let c2 = document.getElementById("canvas2");
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//Classes
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
class Line {
    constructor() {
        this.angle = Math.random() * 2*Math.PI;
        this.distance = 0;
        this.color = lineColor;
        this.inPlay = true;
    }
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//Get stored values (locally)
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
var highScore = 0;
if (localStorage.getItem("highScoreDataKey") !== null) {
    highScore = localStorage.getItem("highScoreDataKey");
} else {
    localStorage.setItem("highScoreDataKey", highScore);
    highScore = localStorage.getItem("highScoreDataKey");
}
var totalPoints = 0;
if (localStorage.getItem("totalPointsDataKey") !== null) {
    totalPoints = localStorage.getItem("totalPointsDataKey");
} else {
    localStorage.setItem("totalPointsDataKey", totalPoints);
    totalPoints = localStorage.getItem("totalPointsDataKey");
}
var gamesPlayed = 0;
if (localStorage.getItem("gamesPlayedDataKey") !== null) {
    gamesPlayed = localStorage.getItem("gamesPlayedDataKey");
} else {
    localStorage.setItem("gamesPlayedDataKey", gamesPlayed);
    gamesPlayed = localStorage.getItem("gamesPlayedDataKey");
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//Screen setup
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
var canvasSize = 4000; //Decrease for performance (but also in css)
c.width = canvasSize;
c.height = canvasSize;
c2.width = canvasSize;
c2.height = canvasSize;
c.style.backgroundColor = backgroundColor;
document.body.style.backgroundColor = backgroundColor;
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//Game setup
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
var lives;
var points;
var playerAngleRadians;
var mouseMoved = false;
var gameID;
ctx = c.getContext("2d");
ctx2 = c2.getContext("2d");
ctx2.lineWidth = 5;
if (circleRadius <= 100) {
    ctxFontSize = 10;
    ctxTitleFontSize = 20;
} else if (circleRadius >= 500) {
    ctxFontSize = 30;
    ctxTitleFontSize = 40;
} else {
    ctxFontSize = 20;
    ctxTitleFontSize = 30;
}

startGame();
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//Functions

//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function moveMouse(e) {
    mouseMoved = true;
    
    drawBackground();

    //calculate direction
    var rect = e.target.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    playerAngleRadians = Math.atan2(y - canvasSize/2, x - canvasSize/2);

    //Draw player
    ctx.beginPath();
    ctx.lineWidth = playerLength;
    ctx.arc(canvasSize/2, canvasSize/2, circleRadius - playerLength/2, playerAngleRadians - playerWidth/2, playerAngleRadians + playerWidth/2);
    ctx.strokeStyle = playerColor;
    ctx.stroke();
    ctx.closePath();
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function drawBackground() {
    //Border
    ctx.beginPath();
    ctx.arc(canvasSize/2, canvasSize/2, circleRadius + circleBorderWidth, 0, 2*Math.PI);
    ctx.fillStyle = circleBorderColor;
    ctx.fill();
    ctx.closePath();

    //Background
    ctx.beginPath();
    ctx.arc(canvasSize/2, canvasSize/2, circleRadius, 0, 2*Math.PI);
    ctx.fillStyle = circleColor;
    ctx.fill();
    ctx.closePath();

    //Center circle
    ctx.beginPath();
    ctx.arc(canvasSize/2, canvasSize/2, innerCircleRadius, 0, 2*Math.PI);
    ctx.fillStyle = circleBorderColor;
    ctx.fill();
    ctx.closePath();
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function between0and2PI(angle) {
    while (angle < 0) {
        angle += 2*Math.PI;
    }
    while (angle >= 2*Math.PI) {
        angle -= 2*Math.PI;
    }
    return angle;
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function betweenOrEqualsLow(num, low, high) {
    return num >= low && num < high;
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function upDateText() {
    //ClearRects
    ctx.clearRect(0, 0, canvasSize, canvasSize/2 - circleRadius - circleBorderWidth);
    ctx.clearRect(0, canvasSize/2 + circleRadius + circleBorderWidth, canvasSize, canvasSize - (canvasSize/2 + circleRadius + circleBorderWidth));

    ctx.font = `${ctxFontSize}px Arial`;

    //Lives
    ctx.beginPath();
    ctx.textAlign = "right";
    ctx.fillStyle = fontColor;
    ctx.fillText(`Lives: ${lives}`, canvasSize/2 + circleRadius, canvasSize/2 - circleRadius - ctxFontSize * 0.5 - circleBorderWidth);
    ctx.stroke();
    ctx.closePath();
    
    //Points
    ctx.beginPath();
    ctx.textAlign = "left";
    ctx.fillStyle = (points != 0 && points % 10 == 0) ? fontColorFlash : fontColor;
    ctx.fillText(`Points: ${points}`, canvasSize/2 - circleRadius, canvasSize/2 - circleRadius - ctxFontSize * 0.5 - circleBorderWidth);
    ctx.stroke();
    ctx.closePath();

    //Total
    ctx.beginPath();
    ctx.textAlign = "right";
    ctx.fillStyle = fontColor;
    ctx.fillText(`Total points: ${totalPoints}`, canvasSize/2 + circleRadius, canvasSize/2 + circleRadius + circleBorderWidth + ctxFontSize * 1.5);
    ctx.fillText(`Games played: ${gamesPlayed}`, canvasSize/2 + circleRadius, canvasSize/2 + circleRadius + circleBorderWidth + ctxFontSize * 1.5 + 30);
    ctx.stroke();
    ctx.closePath();

    //High score
    if (points > highScore) {
        highScore = points;
    }
    ctx.beginPath();
    ctx.textAlign = "left";
    ctx.fillStyle = fontColor;
    ctx.fillText(`High score: ${highScore}`, canvasSize/2 - circleRadius, canvasSize/2 + circleRadius + circleBorderWidth + ctxFontSize * 1.5);
    ctx.stroke();
    ctx.closePath();

    //Title
    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.fillStyle = fontColor;
    ctx.font = `${ctxTitleFontSize}px Arial`;
    ctx.fillText("Line Catcher", canvasSize/2, canvasSize/2 - circleRadius - ctxTitleFontSize - circleBorderWidth);
    ctx.stroke();
    ctx.closePath();

    //Update local values
    localStorage.setItem("totalPointsDataKey", totalPoints);
    localStorage.setItem("gamesPlayedDataKey", gamesPlayed);
    localStorage.setItem("highScoreDataKey", highScore);
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function gameOver() {
    //Stop previous games
    clearInterval(gameID);

    //Get ready to start new game
    c2.removeEventListener("mousemove", moveMouse);
    c2.addEventListener("click", startGame);
    mouseMoved = false;

    setTimeout(() => {
        //Draw 'game over' screen

        //Background
        ctx2.beginPath();
        ctx2.fillStyle = gameOverBackgroundColor;
        ctx2.rect(0, 0, canvasSize, canvasSize)
        ctx2.fill();
        ctx2.closePath();
    
        //Game over text
        ctx2.beginPath();
        ctx2.fillStyle = gameOverFontColor;
        ctx2.textAlign = "center";
        ctx2.font = "60px Arial";
        ctx2.fillText("GAME OVER", canvasSize/2, canvasSize/2 - 100);
        ctx2.fill();
        ctx2.closePath();

        //Points text
        ctx2.beginPath();
        ctx2.font = "20px Arial";
        ctx2.fillText(`Points: ${points}`, canvasSize/2, canvasSize/2 + 30);
        ctx2.fill();
        ctx2.closePath();
    
        //Play again text
        ctx2.beginPath();
        ctx2.fillText("(Click here to start again)", canvasSize/2, canvasSize/2 + 150);
        ctx2.fill();
        ctx2.closePath();
    }, 10);
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function startGame() {
    //Update event listeners
    c2.removeEventListener("click", startGame);
    c2.addEventListener("mousemove", moveMouse);

    //Setup new game
    var lines = [];
    var delayVariable = 0;
    lives = startLives;
    points = 0;
    upDateText();
    drawBackground();

    gameID = setInterval(() => {
        //Only start if mouse has moved
        if (!mouseMoved) {
            clearInterval(gameID);
            setTimeout(() => {
                startGame();
            }, 20);
        }

        //Maybe new line
        if (lines.length == 0) {
            lines.push(new Line());
            delayVariable = minimumDelayNewLine;
        } else {
            if (delayVariable > 0) {
                delayVariable--;
            } else {
                let randomNumber = Math.floor(Math.random() * chanceOfNewLine);
                if (randomNumber == 0) {
                    lines.push(new Line());
                    delayVariable = minimumDelayNewLine;
                }
            }
        }

        //Collision detection
        for (const [index, line] of lines.entries()) {
            //Border
            if (line.distance >= circleRadius && line.inPlay) {
                lives--;

                if (lives <= 0) {
                    gamesPlayed++;
                    gameOver();
                    return;
                } else {
                    upDateText();
                }
                line.color = lineDeadColor;
                line.inPlay = false;
                break;
            } else if (line.distance >= circleRadius + circleBorderWidth) {
                lines.splice(index, 1);
            } else if (line.distance > circleRadius) {
                break;
            }

            //Player (anywhere)
            let playerAngleMin = between0and2PI(playerAngleRadians - playerWidth/2);
            let playerAngleMax = between0and2PI(playerAngleRadians + playerWidth/2);
            if (line.distance >= circleRadius - playerLength && line.angle >= playerAngleMin && line.angle <= playerAngleMax) {
                lines.splice(index, 1);
                points++;
                totalPoints++;
                upDateText();
                continue;
            }
            
            //Player (near 0 degrees)
            let lineInDistance = line.distance >= circleRadius - playerLength;
            let playerNear0deg = betweenOrEqualsLow(between0and2PI(playerAngleRadians), 2*Math.PI - playerWidth/2, 2*Math.PI) || betweenOrEqualsLow(between0and2PI(playerAngleRadians), 0, playerWidth/2);
            let lineOnPlayer = betweenOrEqualsLow(line.angle, playerAngleMin, 2*Math.PI) || betweenOrEqualsLow(line.angle, 0, playerAngleMax)
            if (lineInDistance && playerNear0deg && lineOnPlayer) {
                lines.splice(index, 1);
                points++;
                totalPoints++;
                upDateText();
            }
        }

        //Move lines
        ctx2.clearRect(0, 0, canvasSize, canvasSize);
        for (line of lines) {
            //Draw line
            line.distance += distanceIncrease;
            let x = Math.floor((canvasSize/2) + (line.distance * Math.cos(line.angle)));
            let y = (Math.floor(canvasSize/2) + (line.distance * Math.sin(line.angle)));
            ctx2.beginPath();
            ctx2.strokeStyle = line.color;
            ctx2.moveTo(canvasSize/2, canvasSize/2);
            ctx2.lineTo(x, y);
            ctx2.stroke();
            ctx2.closePath();

            //Center circle
            ctx2.beginPath();
            ctx2.arc(canvasSize/2, canvasSize/2, innerCircleRadius, 0, 2*Math.PI);
            ctx2.fillStyle = circleBorderColor;
            ctx2.fill();
            ctx2.closePath();
        }
    }, updateSpeed)
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function removeAllData() { //NOT USED, but here for console
    localStorage.removeItem("highScoreDataKey");
    localStorage.removeItem("totalPointsDataKey");
    localStorage.removeItem("gamesPlayedDataKey");
    location.reload();
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%