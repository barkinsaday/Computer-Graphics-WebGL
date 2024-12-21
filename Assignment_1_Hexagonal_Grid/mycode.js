    //NOTES: Zoom Button eklendi, bi şey yapmıyo (kontrol et olmazsa currentMode'a zoom ekleyip click ile yapmayı dene)

//WEBGL Variables
let program;
let canvas;
let bufferId;
let vPosition;
var gl;
var points;
let uBrushColorLocation;

//Parameters
const grid_rows = 30;
const grid_cols = 30;
const hex_r = 0.035;
const center_x = -0.95;
const center_y = 0.95;

//General Drawing Variables
let hexGrid = [];  // Stores the center positions of each hexagon
let paintedHexes = []; // Stores painted state for each hexagon (true or false)
let currentMode = "brush";  // Default to brush mode
let isDrawing = false; // Flag to indicate whether the user is drawing (painting or erasing)
let brushColor = [1.0, 0.0, 0.0]; // Brush Color (Default: Red)
let lastMoveTime = 0;//For FPS on rendering

//Undo Functionality
let undoStack = [];  // Stack to store undo operations
const maxUndoSize = 20;  // Max number of undo operations
let currentOperation = null;  // Stores the current operation (being recorded during drawing)

//Zoom Functionality
let isZoomedIn = false;  // Track whether the canvas is zoomed in or out
let zoomFactor = 0.2;  // The zoom level (adjustable)
let viewX = 0.0, viewY = 0.0;  // Track the pan/translation offsets


//Line Tool Functionality
let lineStart = null;  // Store the starting hexagon when mouse is pressed
let temporaryLineHexes = [];  // To store the hexagons along the line before finalizing
let lastMousePos = { x: null, y: null };  // Track the last mouse position to avoid unnecessary recalculations
let isLineDragging = false;  // Track if the user is dragging to draw a line



window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    // Create the hexagonal grid and initialize the painted state
    let grid_vertices = CreateHexagonGrid(grid_rows, grid_cols, hex_r);
    for (let i = 0; i < grid_rows; i++) {
        paintedHexes.push(new Array(grid_cols).fill(null)); // Initialize painted state to false for each hexagon
    }

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    // Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Get the location of the brush color uniform
    uBrushColorLocation = gl.getUniformLocation(program, "uBrushColor");

    // Check if we successfully got the uniform location
    if (uBrushColorLocation === null) {
        console.log("Failed to get the uniform location for uBrushColor.");
    }

    // Load the data into the GPU
    bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(grid_vertices), gl.STATIC_DRAW);

    // Associate shader variables with data buffer
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Mode selection buttons
    updateCursor_additional();
    document.getElementById("brushButton").addEventListener("click", function() {
        currentMode = "brush"; // Set mode to brush
        updateCursor_additional();
    });
    document.getElementById("eraserButton").addEventListener("click", function() {
        currentMode = "eraser"; // Set mode to eraser
        updateCursor_additional();
    });
    document.getElementById("zoomButton").addEventListener("click", function() {
        currentMode = "zoom";  // Set the current mode to "zoom"
        updateCursor_additional();
    });
    document.getElementById("lineButton").addEventListener("click", function() {
        currentMode = "line";  // Set the current mode to "line"
        updateCursor_additional();  // Optionally, update cursor for line tool
    });

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseUp); // Stop drawing when mouse leaves canvas


    const colorPreview = document.getElementById("colorPreview");

    // Get the sliders
    const redSlider = document.getElementById("redSlider");
    const greenSlider = document.getElementById("greenSlider");
    const blueSlider = document.getElementById("blueSlider");

    // Function to update the brush color and the preview div
    function updateBrushColor() {
        const red = redSlider.value / 255.0;
        const green = greenSlider.value / 255.0;
        const blue = blueSlider.value / 255.0;
        brushColor = [red, green, blue];

        // Update the color preview div
        colorPreview.style.backgroundColor = `rgb(${redSlider.value}, ${greenSlider.value}, ${blueSlider.value})`;
    }

    // Add event listeners to the sliders
    redSlider.addEventListener("input", updateBrushColor);
    greenSlider.addEventListener("input", updateBrushColor);
    blueSlider.addEventListener("input", updateBrushColor);

    // Ensure the color is updated when the page loads
    updateBrushColor();

    //RENDER
    render();
};

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setProjectionMatrix();

    // Optional: Draw the grid (only needs to be drawn once)
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    // Set the grid color to black
    gl.uniform3fv(uBrushColorLocation, [0.0, 0.0, 0.0]);  // Always use black for the grid
    gl.drawArrays(gl.LINES, 0, 18 * grid_rows * grid_cols); // Draw grid outline

    // Render painted hexagons (do not modify the grid)
    for (let i = 0; i < grid_rows; i++) {
        for (let j = 0; j < grid_cols; j++) {
            if (paintedHexes[i][j]) {
                // Draw the filled hexagon with its stored color
                drawFilledHexagon(hexGrid[i][j].x, hexGrid[i][j].y, hex_r, paintedHexes[i][j]);
            }
        }
    }

    // Render temporary hexagons (for line tool or other temporary operations)
    temporaryLineHexes.forEach(hex => {
        if (hex && hexGrid[hex.row] && hexGrid[hex.row][hex.col]) {  // Ensure hex is valid
            const hexPos = hexGrid[hex.row][hex.col];
            drawFilledHexagon(hexPos.x, hexPos.y, hex_r, [0.5, 0.5, 0.5]);  // Gray color for temporary hexagons
        }
    });
    //gl.flush();
}


function createHexagonVertices(x, y, r) {
    const vertices = [];
    const angleStep = Math.PI / 3;

    for (let i = 0; i < 6; i++) {
        const angle = i * angleStep;
        const xPos = x + r * Math.cos(angle);
        const yPos = y + r * Math.sin(angle);
        vertices.push(xPos, yPos);
    }

    for (let i = 0; i < 6; i++) {
        const currentVertexIndex = i * 2;
        const nextVertexIndex = (i + 1) % 6 * 2;
        vertices.push(vertices[currentVertexIndex], vertices[currentVertexIndex + 1]);
        vertices.push(vertices[nextVertexIndex], vertices[nextVertexIndex + 1]);
    }

    return vertices;
}

function CreateHexagonGrid(rows, cols, hex_r) {
    let grid_vertices = [];

    for (let i = 0; i < rows; i++) {
        hexGrid[i] = [];
        for (let j = 0; j < cols; j++) {
            let x = center_x + 1.5 * i * hex_r;
            let y = center_y - Math.sqrt(3) * j * hex_r;
            if (i % 2 !== 0) {
                y -= Math.sqrt(3) * hex_r / 2;
            }

            let hex_vertices = createHexagonVertices(x, y, hex_r);
            grid_vertices = grid_vertices.concat(hex_vertices);

            // Store the center of each hexagon in the grid
            hexGrid[i][j] = { x: x, y: y };
        }
    }
    return grid_vertices;
}

function drawFilledHexagon(x, y, r, color) {
    const vertices = [];
    const angleStep = Math.PI / 3;

    // Generate the vertices for the hexagon
    for (let i = 0; i < 6; i++) {
        const angle = i * angleStep;
        vertices.push(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }

    // Use the shader program and bind the buffer (without re-uploading static data)
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    
    // Send the vertices of the filled hexagon to the GPU only when drawing the hexagon
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Pass the stored color to the shader for this hexagon
    gl.uniform3fv(uBrushColorLocation, color);

    // Draw the hexagon as a filled shape
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 6);
}



//Part 1 and Part2: Drawing and ersing
function handleDraw(x, y, operation) {
    let updated = false; // Track if we actually need to re-render
    for (let i = 0; i < grid_rows; i++) {
        for (let j = 0; j < grid_cols; j++) {
            const hexCenter = hexGrid[i][j];
            if (isInsideHexagon(x, y, hexCenter.x, hexCenter.y, hex_r)) {
                const prevColor = paintedHexes[i][j];  // Store previous color before changing

                if (currentMode === "brush") {
                    if (!paintedHexes[i][j] || !arraysEqual_util(paintedHexes[i][j], brushColor)) {
                        paintedHexes[i][j] = [...brushColor]; // Paint the hexagon
                        addToOperation(operation, i, j, prevColor);  // Track this change
                        updated = true;
                    }
                } else if (currentMode === "eraser" && paintedHexes[i][j]) {
                    paintedHexes[i][j] = null;  // Erase the hexagon
                    addToOperation(operation, i, j, prevColor);  // Track this change
                    updated = true;
                }
            }
        }
    }
    if (updated) {
        render();  // Re-render after changes
    }
}

// Helper function to compare two arrays (used for brush color comparison)
function arraysEqual_util(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}


function isInsideHexagon(x, y, centerX, centerY, r) {
    const dx = x - centerX;
    const dy = y - centerY;
    const distSquared = dx * dx + dy * dy;
    return distSquared <= r * r;
}


function convertClickToGLCoords_util(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const glX = (clickX / canvas.width) * 2 - 1;
    const glY = (canvas.height - clickY) / canvas.height * 2 - 1;
    return [glX, glY];
}

function onMouseDown(event) {
    const [glX, glY] = convertClickToGLCoords_util(event, canvas);

    if (currentMode === "zoom") {
        // Zoom in: Adjust viewX and viewY to center on the clicked point
        if (!isZoomedIn){
            isZoomedIn = true;

            // Convert click to WebGL world coordinates relative to current view
            viewX = glX * (zoomFactor - 1);
            viewY = glY * (zoomFactor - 1);
        } else{
            // Zoom out and reset translation
            isZoomedIn = false;
            viewX = 0.0;
            viewY = 0.0;
        }
        render();  // Re-render to apply zoom
    }
    else if(currentMode === "line"){
        lineStart = { x: glX, y: glY };  // Store the start of the line
        isLineDragging = true;  // Begin drawing the line
        temporaryLineHexes = [];  // Clear temporary hexagons
    }
    else{ 
        isDrawing = true;
        currentOperation = startOperation();  // Start tracking an operation
        handleDraw(glX, glY, currentOperation);  // Paint/erase when mouse is pressed
    }
}

function onMouseMove(event) {
    const now = Date.now();
    const [glX, glY] = convertClickToGLCoords_util(event, canvas);

    // Only recalculate the line if the mouse moved significantly (improves performance)
    const distanceMoved = Math.sqrt(Math.pow(glX - lastMousePos.x, 2) + Math.pow(glY - lastMousePos.y, 2));

    if (currentMode === "line" && isLineDragging) {
        // Check if the mouse moved enough to warrant recalculating the line
        if (distanceMoved > 0.01) {  
            temporaryLineHexes = getHexagonsAlongLine(lineStart.x, lineStart.y, glX, glY);
            render();  // Re-render to show the temporary hexagons

            // Update the last mouse position
            lastMousePos = { x: glX, y: glY };
        }
    } else if (isDrawing && now - lastMoveTime > 30) {  // Throttle to 30ms
        handleDraw(glX, glY, currentOperation);  // Track hexagons during mouse drag
        lastMoveTime = now;
    }
}

function onMouseUp() {
    if (currentMode === "line" && isLineDragging) {
        currentOperation = startOperation();

        temporaryLineHexes.forEach(({ row, col }) => {
            const prevColor = paintedHexes[row][col];  // Store the previous color
            paintedHexes[row][col] = [...brushColor];  // Paint the hexagon
            addToOperation(currentOperation, row, col, prevColor);  // Track the change
        });
        finishOperation(currentOperation);  // Finalize the line
        temporaryLineHexes = [];  // Clear temporary buffer
        isLineDragging = false;
        render();  // Re-render after finalizing
    } 
    else{
        isDrawing = false;  // Stop drawing when mouse is released
        if (currentOperation) {
            finishOperation(currentOperation);  // Complete and store the operation as one
            currentOperation = null;  // Reset the operation
        }
    }
    isDrawing = false;  // Stop drawing when mouse is released
}

//Part 5: Undo
function startOperation() {
    return { hexagons: [], mode: currentMode }; // Start a new operation
}

function addToOperation(operation, row, col, prevColor) {
    operation.hexagons.push({ row, col, prevColor }); // Track affected hexagons
}

function finishOperation(operation) {
    if (operation.hexagons.length > 0) {
        undoStack.push(operation);  // Store operation in undo stack
        if (undoStack.length > maxUndoSize) {
            undoStack.shift();  // Remove oldest operation if exceeding max size
        }
    }
}

function undoOperation() {
    if (undoStack.length > 0) {
        const lastOperation = undoStack.pop();  // Get the last operation

        // Restore the hexagons to their previous color
        lastOperation.hexagons.forEach(({ row, col, prevColor }) => {
            paintedHexes[row][col] = prevColor;
        });

        render();  // Re-render the canvas after undo
    }
}

// Undo with Ctrl + Z
window.addEventListener('keydown', function(event) {
    if (event.ctrlKey && event.key === 'z') {
        undoOperation();  // Undo the last operation
    }
});

function updateCursor_additional() {
    if (currentMode === "brush") {
        canvas.style.cursor = "crosshair";  // Set brush cursor
    } else if (currentMode === "eraser") {
        canvas.style.cursor = "no-drop";  // Set eraser cursor
    }
    else if (currentMode === "zoom") {
        canvas.style.cursor = isZoomedIn ? "zoom-out" : "zoom-in";  // Set zoom cursor
    }
    else if (currentMode === "line"){
        canvas.style.cursor = "pointer";
    }
}

//Part 6: Zooming
function setProjectionMatrix() {
    let scale = isZoomedIn ? zoomFactor : 1.0;

    // Corrected translation logic (invert viewX and viewY)
    let left = -1.0 * scale - viewX;
    let right = 1.0 * scale - viewX;
    let bottom = -1.0 * scale - viewY;
    let top = 1.0 * scale - viewY;

    let projectionMatrix = ortho(left, right, bottom, top, -1.0, 1.0);

    let projectionMatrixLocation = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLocation, false, flatten(projectionMatrix));
}

//Part 7: Line Tool
function getHexagonsAlongLine_util(row1, col1, row2, col2) {
    const hexagons = [];

    // Start and end positions in grid coordinates
    const startHex = { row: row1, col: col1 };
    const endHex = { row: row2, col: col2 };

    // Calculate the number of steps to take along the line
    const distance = Math.max(Math.abs(startHex.row - endHex.row), Math.abs(startHex.col - endHex.col));

    for (let step = 0; step <= distance; step++) {
        // Linearly interpolate between start and end hexagons
        const t = step / distance;
        const interpolatedRow = Math.round(lerp(startHex.row, endHex.row, t));
        const interpolatedCol = Math.round(lerp(startHex.col, endHex.col, t));

        // Ensure no duplicate hexagons are added
        if (!hexagons.some(h => h.row === interpolatedRow && h.col === interpolatedCol)) {
            hexagons.push({ row: interpolatedRow, col: interpolatedCol });
        }
    }

    return hexagons;
}

// // Helper function to linearly interpolate between two points
function lerp(start, end, t) {
    return start + (end - start) * t;
}
function getHexagonsAlongLine(x1, y1, x2, y2) {
    let hexagons = [];

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1;
    const sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;
    let steps = 0;  // Safety step counter to avoid infinite loops

    while ((Math.abs(x - x2) > 0.01 || Math.abs(y - y2) > 0.01) && steps < 1000) {  // Limit steps to 1000
        const hex = getHexagonAtPosition(x, y);
        if (hex && !hexagons.some(h => h.row === hex.row && h.col === hex.col)) {
            hexagons.push(hex);  // Add hexagon if it's not already added
        }

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx * hex_r;  // Move x in hex increments
        }
        if (e2 < dx) {
            err += dx;
            y += sy * hex_r;  // Move y in hex increments
        }

        steps++;  // Increment step counter
    }

    return hexagons;
}

function getHexagonAtPosition(x, y) {
    for (let i = 0; i < grid_rows; i++) {
        for (let j = 0; j < grid_cols; j++) {
            const hexCenter = hexGrid[i][j];
            if (isInsideHexagon(x, y, hexCenter.x, hexCenter.y, hex_r)) {
                return { row: i, col: j };  // Return the hexagon at (i, j)
            }
        }
    }
    return null;  // No hexagon found
}


    






















