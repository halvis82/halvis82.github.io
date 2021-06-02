// Halvor, 26.05.2021 - 02.06.2021, Conway's game of life - Terrible performance & for some reason switched x & y coords


// Variables & game setup
// /////////////////////////////////////////////////////
let interval = 500 //ms
let cells = 150 //Lower for performance  //140!!!
const borderThickness = 25 //Higher means thinner border

// Essential globals (dont change?)
let canvasSize = (cells * borderThickness) + 2
let gameRunning = true
let addOrRemove = true
let previousInterval = interval
let gameID
let lastCell = [-1, -1]
let game = []

// Add lists and values to game
for (let i = 0; i < cells; i++){
  game.push([])
}
for (let list of game) {
  for (let i = 0; i < cells; i++) {
    list.push(false)
  }
}
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


// Canvas setup
// /////////////////////////////////////////////////////
const c = document.getElementsByTagName("canvas")[0]
c.width = canvasSize
c.height = canvasSize
let ctx = c.getContext("2d")
ctx.fillStyle =  "#FFFF00" //Yellow cells
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


// Game explanation (in console)
// /////////////////////////////////////////////////////
// Explanation
console.log("%cConway's game of life", "color: #bada55")
console.log("https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life")
console.log("")

// Controls
console.log("%cControls:", "text-decoration: underline;")
console.log("%cClick %c-> Toggle cell (can hold and drag)", "color: #FF00FF", "color: #FFFFFF;")
console.log("%cSpace %c-> Pause", "color: #FF00FF", "color: #FFFFFF;")
console.log("%cEscape %c-> Reset game", "color: #FF00FF", "color: #FFFFFF;")
console.log("%cR %c-> Random pattern", "color: #FF00FF", "color: #FFFFFF;")
console.log("%c1-3 %c-> Cool patterns", "color: #FF00FF", "color: #FFFFFF;")
console.log("%cPage up/down %c-> Change interval (ms)", "color: #FF00FF", "color: #FFFFFF;")

// Commands
console.log("%cCommands:", "text-decoration: underline;")
console.log("%c'globalInterval = x' %c-> Change interval (ms)", "color: #FF00FF", "color: #FFFFFF;")
console.log("%c'cells = x' %c-> Change cell amount (careful)", "color: #FF00FF", "color: #FFFFFF;")
console.log("")

showAlert("Check console (F12)")
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


// Event listeners
// /////////////////////////////////////////////////////
document.addEventListener("keyup", (e) => {
  switch (e.code) {
    case "Space": //Pause game
      gameRunning = !gameRunning
      showAlert(`${(gameRunning) ? "resumed" : "paused"} game`)
      break
    case "Escape": //Reset game
      resetGame()
      showAlert("Reset game")
      gameRunning = false
      break
    case "KeyR": //Random game
      randomPattern(0.1)
      showAlert("Randomized game")
      break
    case "PageUp": //Interval up
      if (interval < 100) {
        interval += 10
      } else if (interval < 300) {
        interval += 50
      } else if (interval < 600) {
        interval += 150
      } else if (interval < 1000) {
        interval += 400
      } else {
        interval += 1000
      }
      break
    case "PageDown": //Interval down
      if (interval > 2000) {
        interval -= 1000
      } else if (interval > 500) {
        interval -= 200
      } else if (interval > 300) {
        interval -= 100
      } else if (interval > 100) {
        interval -= 50
      } else {
        interval -= 10
      }

      if (interval < 0) {
        interval = 0
      }
      break
    case "Digit1": //Shooter
      if (cells < 40) {
        showAlert("Too few cells")
        break
      }
      showPattern(getPattern(0), [-6, -20])
      interval = 50
      break
    case "Digit2": //Crab moving up
      if (cells < 30) {
        showAlert("Too few cells")
        break
      }
      showPattern(getPattern(1), [1, -7])
      interval = 100
      break
    case "Digit3": //Recursive circle
      if (cells < 20) {
        showAlert("Too few cells")
        break
      }
      showPattern(getPattern(2), [0, 0])
      interval = 250
      break
    case "Digit4": //Lobster
      if (cells < 50) {
        showAlert("Too few cells")
        break
      }
      showPattern(getPattern(3), [-3, -3])
      interval = 100
      break
    case "Digit5": //Diamond
      if (cells < 30) {
        showAlert("Too few cells")
        break
      }
      showPattern(getPattern(4))
      interval = 250
      break
    case "Digit6": //Trailing bug
      if (cells < 40) {
        showAlert("Too few cells")
        break
      }
      showPattern(getPattern(5), [-1, 0])
      interval = 100
      break
    case "Digit7": //Big pattern
      if (cells < 40) {
        showAlert("Too few cells")
        break
      }
      showPattern(getPattern(6), [-8, 5])
      interval = 200
      break
    case "Digit8": //Spaceship
      if (cells < 40) {
        showAlert("Too few cells")
        break
      }
      showPattern(getPattern(7))
      interval = 200
      break
    case "Digit9": //Infinite expansion
      if (cells < 60) {
        showAlert("Too few cells")
        break
      }
      showPattern(getPattern(8))
      interval = 100
      break
    default: //Disable mousemove after mousedown
      c.removeEventListener("mousemove", mousemove)
      break
  }
})

// Enable cell toggling on move
c.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return

  // Get element width and coordinates in game
  const cElementWidth = parseInt(window.getComputedStyle(c).width, 10)
  const y = Math.floor((e.layerY / cElementWidth) * cells)
  const x = Math.floor((e.layerX / cElementWidth) * cells)

  addOrRemove = !game[y][x]
  c.addEventListener("mousemove", mousemove)
})

// Disable cell toggling on move, and toggle this cell
c.addEventListener("mouseup", (e) => {
  if (e.button !== 0) return
  
  mousemove(e)
  lastCell = [-1, -1]
  c.removeEventListener("mousemove", mousemove)
})

// Disable cell toggling on move
c.addEventListener("mouseleave", () => {
  c.removeEventListener("mousemove", mousemove)
})
function mousemove(e) {
  // Get element width and coordinates in game
    const cElementWidth = parseInt(window.getComputedStyle(c).width, 10)
    const y = Math.floor((e.layerY / cElementWidth) * cells)
    const x = Math.floor((e.layerX / cElementWidth) * cells)
    
  // Cancel if same as last cell
    if (x === lastCell[0] && y === lastCell[1]) {
      return
    }
    
    // Update cell
    lastCell = [x, y]
    if (game[y][x] === addOrRemove) {
      return
    }
    game[y][x] = addOrRemove

    // Update cell graphically
    if (addOrRemove) {
      ctx.beginPath()
      ctx.fillRect(x * borderThickness + 2, y * borderThickness + 2, borderThickness - 2, borderThickness - 2)
      ctx.closePath()
      return
    }

    ctx.clearRect(x * borderThickness + 2, y * borderThickness + 2, borderThickness - 2, borderThickness - 2)
}
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


// Main loop
// /////////////////////////////////////////////////////
randomPattern(0.1)
drawBorders()
drawGame()
mainLoop(interval, cells)
function mainLoop(localInterval, localCells) {
  previousInterval = localInterval

  gameID = setInterval(() => {
    // Cell amount changed (console)
    if (localCells !== cells) {
      if (+cells < 5 || isNaN(cells)) {
        showAlert(`Min. cells: 5`)
        cells = localCells
      } else {
        showAlert(`New cells: ${cells}`)
        cellsChanged()
        return
      }
    }
    
    // Skip iteration if paused
    if (!gameRunning) return
  
    // Calculate new game iteration
    let updatedCells = []
    for (let y = 0; y < game.length; y++) {
      for (let x = 0; x < game.length; x++) {
        if (game[y][x] !== isAlive(y, x)) {
          updatedCells.push({cellY: y, cellX: x})
        }
      }
    }
  
    // Update cells
    updatedCells.map(cell => game[cell.cellY][cell.cellX] = !game[cell.cellY][cell.cellX])
  
    // Draw updated cells
    updatedCells.map(cell => {
      // Fill if true, clear if false
      if (game[cell.cellY][cell.cellX]) {
        ctx.beginPath()
        ctx.fillRect(cell.cellX * borderThickness + 2, cell.cellY * borderThickness + 2, borderThickness - 2, borderThickness - 2)
        ctx.closePath()
      } else {
        ctx.clearRect(cell.cellX * borderThickness + 2, cell.cellY * borderThickness + 2, borderThickness - 2, borderThickness - 2)
      }
    })
  }, localInterval)
}
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


// Changed interval loop
// /////////////////////////////////////////////////////
setInterval(() => {
  if (interval != previousInterval) {
    changeInterval()
  }
}, 200);
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


// Game functions
// /////////////////////////////////////////////////////
function drawGame() {
  ctx.clearRect(0, 0, canvasSize, canvasSize)

  // Draw square if coordinate is true
  for (let y = 0; y < game.length; y++) {
    for (let x = 0; x < game.length; x++) {
      if (game[y][x]) {
        ctx.beginPath()
        ctx.fillRect(x * borderThickness + 2, y * borderThickness + 2, borderThickness - 2, borderThickness - 2)
        ctx.closePath()
      }
    }
  }
}

function drawBorders() { // Draw static borders (on second canvas for performance)
  const c2 = document.getElementsByTagName("canvas")[1]
  c2.style.pointerEvents = "none" //Click through canvas 2
  c2.width = canvasSize
  c2.height = canvasSize
  const ctx2 = c2.getContext("2d")
  ctx2.strokeStyle = "#999999" //Gray borders
  ctx2.clearRect(0, 0, canvasSize, canvasSize)

  // x
  for (let x = 1; x < canvasSize; x += borderThickness) {
    ctx2.moveTo(x, 0)
    ctx2.lineTo(x, canvasSize)
    ctx2.stroke()
  }
  // y
  for (let y = 1; y < canvasSize; y += borderThickness) {
    ctx2.moveTo(0, y)
    ctx2.lineTo(canvasSize, y)
    ctx2.stroke()
  }
}

function isAlive(y, x) {
  // Calculate neighbors (2d loop with x & y + (-1, 0, 1))
  let neighbors = 0
  let neighborCoords = [-1, 0, 1]
  for (let yHere of neighborCoords) {
    for (let xHere of neighborCoords) {
      const isThisCoord = yHere === 0 && xHere === 0
      const isOutOfBounds = y + yHere < 0 || y + yHere >= game.length || x + xHere < 0 || x + xHere >= game.length
      if (isThisCoord || isOutOfBounds) {
        continue
      }

      if (game[y + yHere][x + xHere]) {
        neighbors++
      }
    }
  }

  // Game of life rules
  if (neighbors < 2) return false
  if (neighbors > 3) return false
  if (neighbors === 3) return true
  return game[y][x]
}

function resetGame() {
  // Set all coordinates to false
  for (let y = 0; y < game.length; y++) {
    for (let x = 0; x < game.length; x++) {
      game[y][x] = false
    }
  }
  drawGame()
}

function randomPattern(probability /*Between 0 & 1*/) {
  
  // Change every boolean in game according to probability
  for (let y = 0; y < game.length; y++) {
    for (let x = 0; x < game.length; x++) {
      game[y][x] = Math.random() < probability
    }
  }
  drawGame()
}

function listLivingCells(fromCenter = true) { //For debugging?
  //Find living cells 
  const center = Math.floor(cells / 2)
  let livingCells = []
  for (let y = 0; y < game.length; y++) {
    for (let x = 0; x < game.length; x++) {
      if (game[y][x]) {
        livingCells.push([y, x])
      }
    }
  }

  // Subtract center cell coord
  if (fromCenter) {
    livingCells = livingCells.map(list => list.map(variable => variable - center))
  }

  // Print and return results
  console.log(livingCells.map(list => `[${list[0]}, ${list[1]}]`).join(", "))
  return livingCells
}

function showPattern(coordsList, offset = [0, 0]) {
  // Kill all cells
  resetGame()

  // Revive specified cells
  const center = Math.floor(cells / 2)
  for (let point of coordsList) {
    game[point[0] + center + offset[0]][point[1] + center + offset[1]] = true
  }
  drawGame()
}

function showAlert(text) {
  // Remove first if more than 10 alerts
  const alertBox = document.getElementsByClassName("alert-box")[0]
  if (alertBox.children.length >= 10) {
    alertBox.children[0].remove()
  }

  // Make alert element and add to container
  const alert = document.createElement("div")
  alert.className = "alert"
  alert.innerText = text
  alertBox.append(alert)
  const animationTime = 2000

  // Slide in from right
  alert.animate([
    {marginLeft: "-12vw"},
    {marginLeft: "0"}
  ], {
    duration: animationTime / 5,
    fill: "forwards"
  })

  // Fade out
  alert.animate([
    {opacity: "0.5"},
    {opacity: "0"},
  ], {
    duration: animationTime / 2,
    fill: "forwards",
    delay: animationTime * 2
  })

  // Remove element
  setTimeout(() => {
    alert.remove()
  }, animationTime * 2 + animationTime / 2)
}

function cellsChanged() {
  clearInterval(gameID)

  // Resetup variables
  canvasSize = (cells * borderThickness) + 2
  c.width = canvasSize
  c.height = canvasSize
  ctx.fillStyle =  "#FFFF00" //Apparently necessary again
  let oldGame = [...game]
  game = []
  // Add lists and values to game
  for (let i = 0; i < cells; i++) {
    game.push([])
  }
  for (let list of game) {
    for (let i = 0; i < cells; i++) {
      list.push(false)
    }
  }

  let centerOldGame = []
  if (game.length >= oldGame.length) {
    // Add old game to center of new game
    centerOldGame = [...oldGame]
    const startPosThisGame = Math.floor((game.length / 2) - (oldGame.length / 2) + Math.random()) // + 1

    // Set new values in new game
    for (let y = 0; y < oldGame.length; y++) {
      for (let x = 0; x < oldGame.length; x++) {
        game[y + startPosThisGame][x + startPosThisGame] = centerOldGame[y][x]
      }
    }
  } else {
    // Add center of old game to new game
    const startPosThisGame = Math.floor((oldGame.length / 2) - (game.length / 2) + Math.random()) // + 1

    for (let y = 0; y < game.length; y++) {
      centerOldGame.push([])
      for (let x = 0; x < game.length; x++) {
        centerOldGame[y].push(oldGame[y + startPosThisGame][x + startPosThisGame])
      }
    }

    // Set new values in new game
    for (let y = 0; y < game.length; y++) {
      for (let x = 0; x < game.length; x++) {
        game[y][x] = centerOldGame[y][x]
      }
    }
  }

  // Start new game
  drawBorders()
  drawGame()
  mainLoop(interval, cells)
}

function changeInterval() {
  // Cancel if invalid interval
  if (+interval < 0 || isNaN(interval)) {
    showAlert(`Min. interval: 0`)
    interval = previousInterval
    return
  }

  // Start new game loop
  clearInterval(gameID)
  showAlert(`New interval: ${interval} ms`)
  mainLoop(interval, cells)
}

function getPattern(num) {
  const patterns = [
    [ //Shooter
      [-4, 24], [-3, 22], [-3, 24], [-2, 12], [-2, 13], [-2, 20], [-2, 21], [-2, 34], [-2, 35], [-1, 11], [-1, 15], [-1, 20], [-1, 21], [-1, 34], [-1, 35], [0, 0], [0, 1], [0, 10], [0, 16], [0, 20], [0, 21], [1, 0], [1, 1], [1, 10], [1, 14], [1, 16], [1, 17], [1, 22], [1, 24], [2, 10], [2, 16], [2, 24], [3, 11], [3, 15], [4, 12], [4, 13]
    ],
    [ //Crab moving up
      [0, 0], [0, 13], [1, -1], [1, 1], [1, 12], [1, 14], [2, -2], [2, 2], [2, 11], [2, 15], [3, -1], [3, 2], [3, 11], [3, 14], [4, -1], [4, 1], [4, 6], [4, 7], [4, 12], [4, 14], [5, 0], [5, 1], [5, 2], [5, 6], [5, 7], [5, 11], [5, 12], [5, 13], [6, 3], [6, 10], [7, 2], [7, 5], [7, 6], [7, 7], [7, 8], [7, 11], [8, 6], [8, 7], [9, 3], [9, 4], [9, 5], [9, 8], [9, 9], [9, 10]
    ],
    [ //Recursive circle
      [-6, 0], [-6, 1], [-5, 0], [-5, 2], [-4, -5], [-4, 0], [-4, 2], [-4, 3], [-3, -6], [-3, -5], [-3, 1], [-2, -7], [-2, -4], [-1, -7], [-1, -6], [-1, -5], [1, 3], [1, 4], [1, 5], [2, 2], [2, 5], [3, -3], [3, 3], [3, 4], [4, -5], [4, -4], [4, -2], [4, 3], [5, -4], [5, -2], [6, -3], [6, -2]
    ],
    [ //Lobster
      [-8, -1], [-7, -1], [-7, 0], [-6, -2], [-6, 0], [-5, -5], [-5, -4], [-4, -5], [-4, -4], [-4, -1], [-4, 0], [-3, -2], [-3, -1], [-3, 0], [-2, -2], [-1, -2], [-1, -1], [2, -6], [2, -2], [3, -7], [3, -6], [3, -5], [3, -4], [3, -3], [4, -8], [4, -7], [4, -4], [5, -8], [5, -7], [5, 8], [5, 9], [5, 11], [5, 12], [6, 6], [6, 8], [6, 9], [6, 12], [6, 13], [7, -12], [7, -11], [7, -10], [7, -6], [7, 3], [7, 6], [7, 7], [7, 8], [7, 11], [8, -12], [8, -11], [8, -10], [8, -9], [8, -6], [8, -5], [8, 2], [9, -9], [9, -6], [9, -5], [9, 1], [9, 2], [9, 9], [9, 10], [10, -4], [10, -3], [10, 2], [10, 9], [10, 10], [11, -7], [11, -6], [11, -4], [11, -3], [11, -2], [11, 2], [11, 3], [12, -11], [12, -7], [12, -6], [12, 0], [12, 1], [12, 2], [13, -13], [13, -12], [13, -11], [13, 0], [13, 1], [14, -13], [14, -12], [14, -11], [14, -4], [14, -3], [15, -3], [15, -2], [16, -9], [16, -8], [16, -7], [16, -3], [16, -2], [17, -9], [17, -8], [17, -3], [17, -2], [18, -9], [18, -8]
    ],
    [ //Diamond
      [-4, -2], [-4, -1], [-4, 0], [-4, 1], [-2, -4], [-2, -3], [-2, -2], [-2, -1], [-2, 0], [-2, 1], [-2, 2], [-2, 3], [0, -6], [0, -5], [0, -4], [0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [2, -4], [2, -3], [2, -2], [2, -1], [2, 0], [2, 1], [2, 2], [2, 3], [4, -2], [4, -1], [4, 0], [4, 1]
    ],
    [ //Trailing bug
      [-8, 5], [-7, 4], [-7, 5], [-6, 4], [-6, 6], [-6, 10], [-5, 8], [-5, 9], [-4, 9], [-4, 12], [-3, 7], [-3, 8], [-3, 10], [-3, 13], [-2, 3], [-2, 4], [-2, 5], [-2, 7], [-2, 8], [-2, 13], [-1, 2], [-1, 5], [-1, 10], [0, 1], [0, 6], [0, 11], [0, 12], [1, -4], [1, -3], [1, 1], [1, 7], [1, 9], [1, 11], [1, 12], [2, -5], [2, -4], [2, 1], [2, 2], [2, 12], [3, -3], [3, 3], [3, 13], [4, 0], [4, 1], [4, 4], [4, 11], [4, 12], [4, 13], [5, -2], [5, 0], [5, 1], [5, 13], [5, 15], [6, -2], [6, -1], [6, 4], [6, 14], [6, 15], [7, -3], [7, 0], [7, 2], [8, 3], [8, 4], [8, 7], [9, -1], [9, 3], [9, 4], [9, 5], [9, 7], [10, 0], [10, 1], [10, 6], [10, 7], [10, 8], [11, 9], [12, 8], [12, 9]
    ],
    [ //Big pattern
      [-12, -23], [-12, -22], [-12, -19], [-12, -18], [-12, -15], [-12, -14], [-12, -13], [-12, -12], [-12, -8], [-12, -7], [-12, -1], [-12, 0], [-12, 1], [-12, 4], [-12, 5], [-12, 6], [-12, 11], [-12, 12], [-11, -21], [-11, -20], [-11, -17], [-11, -16], [-11, -11], [-11, -10], [-11, -9], [-11, -6], [-11, -5], [-11, -4], [-11, -3], [-11, -2], [-11, 2], [-11, 3], [-11, 7], [-11, 8], [-11, 9], [-11, 10], [-10, -23], [-10, -22], [-10, -19], [-10, -18], [-10, -15], [-10, -14], [-10, -13], [-10, -12], [-10, -8], [-10, -7], [-10, -1], [-10, 0], [-10, 1], [-10, 4], [-10, 5], [-10, 6], [-10, 11], [-10, 12], [-9, -21], [-9, -20], [-9, -17], [-9, -16], [-9, -11], [-9, -10], [-9, -9], [-9, -6], [-9, -5], [-9, -4], [-9, -3], [-9, -2], [-9, 2], [-9, 3], [-9, 7], [-9, 8], [-9, 9], [-9, 10], [-8, -23], [-8, -22], [-8, -19], [-8, -18], [-8, -15], [-8, -14], [-8, -13], [-8, -12], [-8, -8], [-8, -7], [-8, -1], [-8, 0], [-8, 1], [-8, 4], [-8, 5], [-8, 6], [-8, 11], [-8, 12], [-7, -21], [-7, -20], [-7, -17], [-7, -16], [-7, -11], [-7, -10], [-7, -9], [-7, -6], [-7, -5], [-7, -4], [-7, -3], [-7, -2], [-7, 2], [-7, 3], [-7, 7], [-7, 8], [-7, 9], [-7, 10], [-6, -23], [-6, -22], [-6, -19], [-6, -18], [-6, -15], [-6, -14], [-6, -13], [-6, -12], [-6, -8], [-6, -7], [-6, -1], [-6, 0], [-6, 1], [-6, 4], [-6, 5], [-6, 6], [-6, 11], [-6, 12], [-5, -21], [-5, -20], [-5, -17], [-5, -16], [-5, -11], [-5, -10], [-5, -9], [-5, -6], [-5, -5], [-5, -4], [-5, -3], [-5, -2], [-5, 2], [-5, 3], [-5, 7], [-5, 8], [-5, 9], [-5, 10], [-4, -23], [-4, -22], [-4, -19], [-4, -18], [-4, -15], [-4, -14], [-4, -13], [-4, -12], [-4, -8], [-4, -7], [-4, -1], [-4, 0], [-4, 1], [-4, 4], [-4, 5], [-4, 6], [-4, 11], [-4, 12], [-3, -21], [-3, -20], [-3, -17], [-3, -16], [-3, -11], [-3, -10], [-3, -9], [-3, -6], [-3, -5], [-3, -4], [-3, -3], [-3, -2], [-3, 2], [-3, 3], [-3, 7], [-3, 8], [-3, 9], [-3, 10], [-2, -23], [-2, -22], [-2, -19], [-2, -18], [-2, -15], [-2, -14], [-2, -13], [-2, -12], [-2, -8], [-2, -7], [-2, -1], [-2, 0], [-2, 1], [-2, 4], [-2, 5], [-2, 6], [-2, 11], [-2, 12], [-1, -21], [-1, -20], [-1, -17], [-1, -16], [-1, -11], [-1, -10], [-1, -9], [-1, -6], [-1, -5], [-1, -4], [-1, -3], [-1, -2], [-1, 2], [-1, 3], [-1, 7], [-1, 8], [-1, 9], [-1, 10], [0, -23], [0, -22], [0, -19], [0, -18], [0, -15], [0, -14], [0, -13], [0, -12], [0, -8], [0, -7], [0, -1], [0, 0], [0, 1], [0, 4], [0, 5], [0, 6], [0, 11], [0, 12], [1, -21], [1, -20], [1, -17], [1, -16], [1, -11], [1, -10], [1, -9], [1, -6], [1, -5], [1, -4], [1, -3], [1, -2], [1, 2], [1, 3], [1, 7], [1, 8], [1, 9], [1, 10], [2, -23], [2, -22], [2, -19], [2, -18], [2, -15], [2, -14], [2, -13], [2, -12], [2, -8], [2, -7], [2, -1], [2, 0], [2, 1], [2, 4], [2, 5], [2, 6], [2, 11], [2, 12], [3, -21], [3, -20], [3, -17], [3, -16], [3, -11], [3, -10], [3, -9], [3, -6], [3, -5], [3, -4], [3, -3], [3, -2], [3, 2], [3, 3], [3, 7], [3, 8], [3, 9], [3, 10], [4, -23], [4, -22], [4, -19], [4, -18], [4, -15], [4, -14], [4, -13], [4, -12], [4, -8], [4, -7], [4, -1], [4, 0], [4, 1], [4, 4], [4, 5], [4, 6], [4, 11], [4, 12], [5, -21], [5, -20], [5, -17], [5, -16], [5, -11], [5, -10], [5, -9], [5, -6], [5, -5], [5, -4], [5, -3], [5, -2], [5, 2], [5, 3], [5, 7], [5, 8], [5, 9], [5, 10], [6, -23], [6, -22], [6, -19], [6, -18], [6, -15], [6, -14], [6, -13], [6, -12], [6, -8], [6, -7], [6, -1], [6, 0], [6, 1], [6, 4], [6, 5], [6, 6], [6, 11], [6, 12], [7, -21], [7, -20], [7, -17], [7, -16], [7, -11], [7, -10], [7, -9], [7, -6], [7, -5], [7, -4], [7, -3], [7, -2], [7, 2], [7, 3], [7, 7], [7, 8], [7, 9], [7, 10], [8, -23], [8, -22], [8, -19], [8, -18], [8, -15], [8, -14], [8, -13], [8, -12], [8, -8], [8, -7], [8, -1], [8, 0], [8, 1], [8, 4], [8, 5], [8, 6], [8, 11], [8, 12], [9, -21], [9, -20], [9, -17], [9, -16], [9, -11], [9, -10], [9, -9], [9, -6], [9, -5], [9, -4], [9, -3], [9, -2], [9, 2], [9, 3], [9, 7], [9, 8], [9, 9], [9, 10], [10, -23], [10, -22], [10, -19], [10, -18], [10, -15], [10, -14], [10, -13], [10, -12], [10, -8], [10, -7], [10, -1], [10, 0], [10, 1], [10, 4], [10, 5], [10, 6], [10, 11], [10, 12], [11, -21], [11, -20], [11, -17], [11, -16], [11, -11], [11, -10], [11, -9], [11, -6], [11, -5], [11, -4], [11, -3], [11, -2], [11, 2], [11, 3], [11, 7], [11, 8], [11, 9], [11, 10], [12, -23], [12, -22], [12, -19], [12, -18], [12, -15], [12, -14], [12, -13], [12, -12], [12, -8], [12, -7], [12, -1], [12, 0], [12, 1], [12, 4], [12, 5], [12, 6], [12, 11], [12, 12], [13, -21], [13, -20], [13, -17], [13, -16], [13, -11], [13, -10], [13, -9], [13, -6], [13, -5], [13, -4], [13, -3], [13, -2], [13, 2], [13, 3], [13, 7], [13, 8], [13, 9], [13, 10], [14, -23], [14, -22], [14, -19], [14, -18], [14, -15], [14, -14], [14, -13], [14, -12], [14, -8], [14, -7], [14, -1], [14, 0], [14, 1], [14, 4], [14, 5], [14, 6], [14, 11], [14, 12], [15, -21], [15, -20], [15, -17], [15, -16], [15, -11], [15, -10], [15, -9], [15, -6], [15, -5], [15, -4], [15, -3], [15, -2], [15, 2], [15, 3], [15, 7], [15, 8], [15, 9], [15, 10], [16, -23], [16, -22], [16, -19], [16, -18], [16, -15], [16, -14], [16, -13], [16, -12], [16, -8], [16, -7], [16, -1], [16, 0], [16, 1], [16, 4], [16, 5], [16, 6], [16, 11], [16, 12], [17, -21], [17, -20], [17, -17], [17, -16], [17, -11], [17, -10], [17, -9], [17, -6], [17, -5], [17, -4], [17, -3], [17, -2], [17, 2], [17, 3], [17, 7], [17, 8], [17, 9], [17, 10], [18, -23], [18, -22], [18, -19], [18, -18], [18, -15], [18, -14], [18, -13], [18, -12], [18, -8], [18, -7], [18, -1], [18, 0], [18, 1], [18, 4], [18, 5], [18, 6], [18, 11], [18, 12], [19, -21], [19, -20], [19, -17], [19, -16], [19, -11], [19, -10], [19, -9], [19, -6], [19, -5], [19, -4], [19, -3], [19, -2], [19, 2], [19, 3], [19, 7], [19, 8], [19, 9], [19, 10], [20, -23], [20, -22], [20, -19], [20, -18], [20, -15], [20, -14], [20, -13], [20, -12], [20, -8], [20, -7], [20, -1], [20, 0], [20, 1], [20, 4], [20, 5], [20, 6], [20, 11], [20, 12], [21, -21], [21, -20], [21, -17], [21, -16], [21, -11], [21, -10], [21, -9], [21, -6], [21, -5], [21, -4], [21, -3], [21, -2], [21, 2], [21, 3], [21, 7], [21, 8], [21, 9], [21, 10], [22, -23], [22, -22], [22, -19], [22, -18], [22, -15], [22, -14], [22, -13], [22, -12], [22, -8], [22, -7], [22, -1], [22, 0], [22, 1], [22, 4], [22, 5], [22, 6], [22, 11], [22, 12], [23, -21], [23, -20], [23, -17], [23, -16], [23, -11], [23, -10], [23, -9], [23, -6], [23, -5], [23, -4], [23, -3], [23, -2], [23, 2], [23, 3], [23, 7], [23, 8], [23, 9], [23, 10], [24, -23], [24, -22], [24, -19], [24, -18], [24, -15], [24, -14], [24, -13], [24, -12], [24, -8], [24, -7], [24, -1], [24, 0], [24, 1], [24, 4], [24, 5], [24, 6], [24, 11], [24, 12], [25, -21], [25, -20], [25, -17], [25, -16], [25, -11], [25, -10], [25, -9], [25, -6], [25, -5], [25, -4], [25, -3], [25, -2], [25, 2], [25, 3], [25, 7], [25, 8], [25, 9], [25, 10], [26, -23], [26, -22], [26, -19], [26, -18], [26, -15], [26, -14], [26, -13], [26, -12], [26, -8], [26, -7], [26, -1], [26, 0], [26, 1], [26, 4], [26, 5], [26, 6], [26, 11], [26, 12], [27, -21], [27, -20], [27, -17], [27, -16], [27, -11], [27, -10], [27, -9], [27, -6], [27, -5], [27, -4], [27, -3], [27, -2], [27, 2], [27, 3], [27, 7], [27, 8], [27, 9], [27, 10]
    ],
    [ //Spaceship
      [-4, -3], [-4, -2], [-4, -1], [-4, 1], [-4, 2], [-4, 3], [-3, -4], [-3, -1], [-3, 1], [-3, 4], [-2, -5], [-2, -1], [-2, 1], [-2, 5], [-1, -10], [-1, -9], [-1, -8], [-1, -6], [-1, -3], [-1, -1], [-1, 1], [-1, 3], [-1, 6], [-1, 8], [-1, 9], [-1, 10], [0, -11], [0, -8], [0, -6], [0, -1], [0, 1], [0, 6], [0, 8], [0, 11], [1, -12], [1, -8], [1, -6], [1, -4], [1, -2], [1, 2], [1, 4], [1, 6], [1, 8], [1, 12], [2, -12], [2, 12], [3, -10], [3, 10], [4, -13], [4, -11], [4, 11], [4, 13], [5, -14], [5, -13], [5, -11], [5, -9], [5, -8], [5, -7], [5, 7], [5, 8], [5, 9], [5, 11], [5, 13], [5, 14], [6, -15], [6, -13], [6, -11], [6, -7], [6, 7], [6, 11], [6, 13], [6, 15], [7, -16], [7, -15], [7, -13], [7, 13], [7, 15], [7, 16], [8, -17], [8, -13], [8, -7], [8, -6], [8, 6], [8, 7], [8, 13], [8, 17], [10, -17], [10, -16], [10, -14], [10, -13], [10, 13], [10, 14], [10, 16], [10, 17]
    ],
    [ //Infinite expansion
      [-11, -4], [-11, -3], [-11, -2], [-11, 2], [-11, 3], [-11, 4], [-10, -5], [-10, -2], [-10, 2], [-10, 5], [-9, -24], [-9, -23], [-9, -22], [-9, -21], [-9, -2], [-9, 2], [-9, 21], [-9, 22], [-9, 23], [-9, 24], [-8, -24], [-8, -20], [-8, -2], [-8, 2], [-8, 20], [-8, 24], [-7, -24], [-7, -15], [-7, -2], [-7, 2], [-7, 15], [-7, 24], [-6, -23], [-6, -20], [-6, -17], [-6, -16], [-6, -13], [-6, 13], [-6, 16], [-6, 17], [-6, 20], [-6, 23], [-5, -18], [-5, -12], [-5, -4], [-5, -3], [-5, -2], [-5, 2], [-5, 3], [-5, 4], [-5, 12], [-5, 18], [-4, -18], [-4, -12], [-4, -3], [-4, 3], [-4, 12], [-4, 18], [-3, -18], [-3, -12], [-3, -3], [-3, -2], [-3, -1], [-3, 0], [-3, 1], [-3, 2], [-3, 3], [-3, 12], [-3, 18], [-2, -23], [-2, -20], [-2, -17], [-2, -16], [-2, -13], [-2, -10], [-2, -9], [-2, -4], [-2, 4], [-2, 9], [-2, 10], [-2, 13], [-2, 16], [-2, 17], [-2, 20], [-2, 23], [-1, -24], [-1, -15], [-1, -11], [-1, -10], [-1, -5], [-1, -4], [-1, -3], [-1, -2], [-1, -1], [-1, 0], [-1, 1], [-1, 2], [-1, 3], [-1, 4], [-1, 5], [-1, 10], [-1, 11], [-1, 15], [-1, 24], [0, -24], [0, -20], [0, -10], [0, -9], [0, 9], [0, 10], [0, 20], [0, 24], [1, -24], [1, -23], [1, -22], [1, -21], [1, -9], [1, -8], [1, -7], [1, -6], [1, -5], [1, -4], [1, -3], [1, -2], [1, -1], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 21], [1, 22], [1, 23], [1, 24], [2, -8], [2, -6], [2, 6], [2, 8], [3, -5], [3, -4], [3, -3], [3, -2], [3, -1], [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [4, -5], [4, 5], [5, -4], [5, -3], [5, -2], [5, -1], [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [6, 0], [7, -4], [7, -3], [7, -2], [7, 2], [7, 3], [7, 4], [8, -2], [8, 2], [10, -3], [10, -2], [10, -1], [10, 1], [10, 2], [10, 3], [11, -3], [11, -2], [11, -1], [11, 1], [11, 2], [11, 3], [12, -4], [12, -2], [12, -1], [12, 1], [12, 2], [12, 4], [13, -4], [13, -3], [13, -2], [13, 2], [13, 3], [13, 4], [14, -3], [14, 3]
    ]
  ]

  return patterns[num]
}
// /////////////////////////////////////////////////////