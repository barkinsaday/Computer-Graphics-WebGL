console.log("main.js loaded");

let gl, program;
let useCornerCamera = false; // Default to normal camera
const globalScale = 0.5; // Scale the dragon globally
const globalPosition = [0.0, 0.0, 0.0]; // Position of the dragon in the scene

// Track current rotation angles for the selected part
let currentRotation = { x: 0, y: 0, z: 0 };

//Body Parts
let body;
let upperLegLeft, upperLegRight;
let lowerLegLeft, lowerLegRight;
let footLeft, footRight;
let lowerNeckLeft, lowerNeckMiddle, lowerNeckRight;
let upperNeckLeft, upperNeckMiddle, upperNeckRight;
let headLeft, headMiddle, headRight;
let upperTail, lowerTail;
let jawLeft, jawMiddle, jawRight;
let upperWingRight, upperWingLeft;
let lowerWingRight, lowerWingLeft;

let selectedPart = body;

// Vertex data for a cube (single color)
function createCubeVertices(color) {
    const [r, g, b] = color; // Color for all vertices
    return new Float32Array([
        // Positions       // Colors
        -0.5, -0.5,  0.5,  r, g, b, // Front face
         0.5, -0.5,  0.5,  r, g, b,
         0.5,  0.5,  0.5,  r, g, b,
        -0.5,  0.5,  0.5,  r, g, b,

        -0.5, -0.5, -0.5,  r, g, b, // Back face
         0.5, -0.5, -0.5,  r, g, b,
         0.5,  0.5, -0.5,  r, g, b,
        -0.5,  0.5, -0.5,  r, g, b,
    ]);
}

// Indices for cube triangles
const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3,  // Front face
    4, 5, 6, 4, 6, 7,  // Back face
    3, 2, 6, 3, 6, 7,  // Top face
    0, 1, 5, 0, 5, 4,  // Bottom face
    1, 2, 6, 1, 6, 5,  // Right face
    0, 3, 7, 0, 7, 4,  // Left face
]);

// Initialize the WebGL application
function initialize() {
    // Initialize WebGL context
    gl = initializeWebGL_util('glCanvas');

    // Load shaders from shaders.js
    const vertexShaderSource = window.vertexShaderSource;
    const fragmentShaderSource = window.fragmentShaderSource;

    // Create and link the program
    program = createProgram_util(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);

    // Call render
    initParts();
    setCornerView(gl, program);
}

function drawRect(
    color,
    position,
    scale,
    rotations = [
        { angle: 0, axis: [1, 0, 0] }, // Rotation around X-axis
        { angle: 0, axis: [0, 1, 0] }, // Rotation around Y-axis
        { angle: 0, axis: [0, 0, 1] }  // Rotation around Z-axis
    ]
) {
    const vertices = createCubeVertices(color);

    // Create VAO and buffers
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const aColor = gl.getAttribLocation(program, 'aColor');
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(aPosition);
    gl.enableVertexAttribArray(aColor);

    // Initialize the transformation matrix
    let modelMatrix = mat4();
    modelMatrix = mult(modelMatrix, translate(position[0], position[1], position[2]));
    modelMatrix = mult(modelMatrix, rotate(rotations[0].angle, rotations[0].axis));
    modelMatrix = mult(modelMatrix, rotate(rotations[1].angle, rotations[1].axis));
    modelMatrix = mult(modelMatrix, rotate(rotations[2].angle, rotations[2].axis));
    modelMatrix = mult(modelMatrix, scalem(scale[0], scale[1], scale[2]));

    // Return an object to represent the rectangle
    return {
        color,
        position: [...position],
        scale: [...scale],
        rotations: [...rotations],
        vao,
        modelMatrix,
        // Method to update translation
        translate(newPosition) {
            this.position = [...newPosition];
            this.updateModelMatrix();
        },
        // Method to update rotation
        rotate(rotationIndex, newAngle, newAxis = this.rotations[rotationIndex].axis) {
            this.rotations[rotationIndex] = { angle: newAngle, axis: [...newAxis] };
            this.updateModelMatrix();
        },
        // Method to update the model matrix
        updateModelMatrix() {
            this.modelMatrix = mat4();
            this.modelMatrix = mult(this.modelMatrix, translate(this.position[0], this.position[1], this.position[2]));
            this.modelMatrix = mult(this.modelMatrix, rotate(this.rotations[0].angle, this.rotations[0].axis));
            this.modelMatrix = mult(this.modelMatrix, rotate(this.rotations[1].angle, this.rotations[1].axis));
            this.modelMatrix = mult(this.modelMatrix, rotate(this.rotations[2].angle, this.rotations[2].axis));
            this.modelMatrix = mult(this.modelMatrix, scalem(this.scale[0], this.scale[1], this.scale[2]));
        },
        // Method to render the rectangle
        render() {
            const uModelMatrix = gl.getUniformLocation(program, 'uModelMatrix');
            gl.bindVertexArray(this.vao);
            gl.uniformMatrix4fv(uModelMatrix, false, flatten(this.modelMatrix));
            gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        },
    };
}


function createTrapezoidVertices(color, sideScales = { top: 0.5, bottom: 1.0 }) {
    const bottomWidth = sideScales.bottom; // Bottom base width
    const topWidth = sideScales.top;      // Top base width
    const height = 1.0;                  // Height of the trapezoid
    const depth = 0.5;                   // Depth (Z-axis)

    // Vertices for the trapezoid (positions and colors interleaved)
    return new Float32Array([
        // Bottom base (y = -height / 2)
        -bottomWidth / 2, -height / 2, depth / 2,  ...color, // Bottom front-left
         bottomWidth / 2, -height / 2, depth / 2,  ...color, // Bottom front-right
         bottomWidth / 2, -height / 2, -depth / 2, ...color, // Bottom back-right
        -bottomWidth / 2, -height / 2, -depth / 2, ...color, // Bottom back-left

        // Top base (y = height / 2)
        -topWidth / 2, height / 2, depth / 2,   ...color, // Top front-left
         topWidth / 2, height / 2, depth / 2,   ...color, // Top front-right
         topWidth / 2, height / 2, -depth / 2,  ...color, // Top back-right
        -topWidth / 2, height / 2, -depth / 2,  ...color  // Top back-left
    ]);
}

const trapezoidIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3, // Bottom face
    4, 5, 6, 4, 6, 7, // Top face
    0, 1, 5, 0, 5, 4, // Front face
    3, 2, 6, 3, 6, 7, // Back face
    0, 3, 7, 0, 7, 4, // Left face
    1, 2, 6, 1, 6, 5 // Right face
]);

function drawWingShape(
    color,
    position,
    scale,
    rotations = [
        { angle: 0, axis: [1, 0, 0] }, // First rotation
        { angle: 0, axis: [0, 1, 0] }, // Second rotation
        { angle: 0, axis: [0, 0, 1] }  // Third rotation (newly added)
    ],
    sideScales = { top: 0.5, bottom: 1.0 } // Top and bottom width scaling
) {
    const trapezoidVertices = createTrapezoidVertices(color, sideScales);

    // Create VAO and buffers
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, trapezoidVertices, gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, trapezoidIndices, gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    const aColor = gl.getAttribLocation(program, 'aColor');
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 3 * Float32Array.BYTES_PER_ELEMENT);

    gl.enableVertexAttribArray(aPosition);
    gl.enableVertexAttribArray(aColor);

    // Initialize the transformation matrix
    let modelMatrix = mat4();
    modelMatrix = mult(modelMatrix, translate(position[0], position[1], position[2]));
    modelMatrix = mult(modelMatrix, rotate(rotations[0].angle, rotations[0].axis));
    modelMatrix = mult(modelMatrix, rotate(rotations[1].angle, rotations[1].axis));
    modelMatrix = mult(modelMatrix, rotate(rotations[2].angle, rotations[2].axis));
    modelMatrix = mult(modelMatrix, scalem(scale[0], scale[1], scale[2]));

    // Return an object with transformation and rendering capabilities
    return {
        position: [...position],
        scale: [...scale],
        rotations: [...rotations],
        vao,
        modelMatrix,
        sideScales: { ...sideScales },
        // Update model matrix after transformations
        updateModelMatrix() {
            this.modelMatrix = mat4();
            this.modelMatrix = mult(this.modelMatrix, translate(this.position[0], this.position[1], this.position[2]));
            this.modelMatrix = mult(this.modelMatrix, rotate(this.rotations[0].angle, this.rotations[0].axis));
            this.modelMatrix = mult(this.modelMatrix, rotate(this.rotations[1].angle, this.rotations[1].axis));
            this.modelMatrix = mult(this.modelMatrix, rotate(this.rotations[2].angle, this.rotations[2].axis));
            this.modelMatrix = mult(this.modelMatrix, scalem(this.scale[0], this.scale[1], this.scale[2]));
        },
        // Apply translation
        translate(newPosition) {
            this.position = [...newPosition];
            this.updateModelMatrix();
        },
        // Apply rotation
        rotate(rotationIndex, newAngle, newAxis = this.rotations[rotationIndex].axis) {
            this.rotations[rotationIndex] = { angle: newAngle, axis: [...newAxis] };
            this.updateModelMatrix();
        },
        // Render the wing
        render() {
            const uModelMatrix = gl.getUniformLocation(program, 'uModelMatrix');
            gl.bindVertexArray(this.vao);
            gl.uniformMatrix4fv(uModelMatrix, false, flatten(this.modelMatrix));
            gl.drawElements(gl.TRIANGLES, trapezoidIndices.length, gl.UNSIGNED_SHORT, 0);
        },
    };
}

 
function initParts() {
    // Initialize body
    body = drawRect([0.5, 0.25, 0], [0.0, 0.0, -0.4], [0.5, 0.5, 1], [
        { angle: 0, axis: [1, 0, 0] }, // Rotation around X
        { angle: 0, axis: [0, 1, 0] }, // Rotation around Y
        { angle: 0, axis: [0, 0, 1] }  // Rotation around Z
    ]);
    window.body = body;

    // Initialize upper legs
    upperLegLeft = drawRect([1.0, 0.5, 0], [0.13, -0.4, -0.45], [0.2, 0.2, 0.9], [
        { angle: 60, axis: [1, 0, 0] }, // Rotation around X
        { angle: 0, axis: [0, 1, 0] },  // Rotation around Y
        { angle: 0, axis: [0, 0, 1] }   // Rotation around Z
    ]);
    upperLegRight = drawRect([1.0, 0.5, 0], [-0.13, -0.4, -0.45], [0.2, 0.2, 0.9], [
        { angle: 60, axis: [1, 0, 0] }, // Rotation around X
        { angle: 0, axis: [0, 1, 0] },  // Rotation around Y
        { angle: 0, axis: [0, 0, 1] }   // Rotation around Z
    ]);
    window.upperLegLeft = upperLegLeft;
    window.upperLegRight = upperLegRight;

    // Initialize lower legs
    lowerLegLeft = drawRect([1.0, 0, 1.0], [0.13, -0.9, -0.25], [0.18, 0.45, 0.13], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    lowerLegRight = drawRect([1.0, 0, 1.0], [-0.13, -0.9, -0.25], [0.18, 0.45, 0.13], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    window.lowerLegLeft = lowerLegLeft;
    window.lowerLegRight = lowerLegRight;

    // Initialize feet
    footLeft = drawRect([0, 1, 0], [0.13, -1.15, -0.17], [0.19, 0.05, 0.3], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    footRight = drawRect([0, 1, 0], [-0.13, -1.15, -0.17], [0.19, 0.05, 0.3], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    window.footLeft = footLeft;
    window.footRight = footRight;

    // Initialize lower necks
    lowerNeckLeft = drawRect([1, 0, 0], [0.31, 0.4, 0.19], [0.15, 0.6, 0.1], [
        { angle: 60, axis: [1, 1, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    lowerNeckMiddle = drawRect([1, 1, 0], [0, 0.4, 0.15], [0.15, 0.6, 0.1], [
        { angle: 30, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    lowerNeckRight = drawRect([0, 0, 1], [-0.31, 0.4, 0.19], [0.15, 0.6, 0.1], [
        { angle: 60, axis: [1, -1, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    window.lowerNeckLeft = lowerNeckLeft;
    window.lowerNeckMiddle = lowerNeckMiddle;
    window.lowerNeckRight = lowerNeckRight;

    // Initialize upper necks
    upperNeckLeft = drawRect([1, 0.3, 0.3], [0.36, 0.7, 0.35], [0.08, 0.3, 0.08], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    upperNeckMiddle = drawRect([0.8, 0.8, 0.3], [0.0, 0.7, 0.28], [0.08, 0.3, 0.08], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    upperNeckRight = drawRect([0.3, 0.3, 1], [-0.36, 0.7, 0.35], [0.08, 0.3, 0.08], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    window.upperNeckLeft = upperNeckLeft;
    window.upperNeckMiddle = upperNeckMiddle;
    window.upperNeckRight = upperNeckRight;

    // Initialize heads
    headLeft = drawRect([0.7, 0, 0], [0.36, 0.9, 0.45], [0.2, 0.15, 0.3], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    headMiddle = drawRect([0.7, 0.7, 0], [0, 0.9, 0.45], [0.2, 0.15, 0.3], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    headRight = drawRect([0, 0, 0.7], [-0.36, 0.9, 0.45], [0.2, 0.15, 0.3], [
        { angle: 0, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    window.headLeft = headLeft;
    window.headMiddle = headMiddle;
    window.headRight = headRight;

    // Initialize tail
    upperTail = drawRect([0, 1, 1], [0, 0, -1.2], [0.18, 0.18, 0.6], [
        { angle: -15, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    lowerTail = drawRect([1, 0, 0], [0, -0.18, -1.65], [0.1, 0.1, 0.4], [
        { angle: -30, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    window.upperTail = upperTail;
    window.lowerTail = lowerTail;

    // Initialize jaws
    jawLeft = drawRect([0.7, 0.2, 0.2], [0.36, 0.77, 0.5], [0.13, 0.03, 0.2], [
        { angle: 45, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    jawMiddle = drawRect([1, 1, 0.4], [0, 0.77, 0.5], [0.13, 0.03, 0.2], [
        { angle: 45, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    jawRight = drawRect([0.2, 0.2, 0.7], [-0.36, 0.77, 0.5], [0.13, 0.03, 0.2], [
        { angle: 45, axis: [1, 0, 0] },
        { angle: 0, axis: [0, 1, 0] },
        { angle: 0, axis: [0, 0, 1] }
    ]);
    window.jawLeft = jawLeft;
    window.jawMiddle = jawMiddle;
    window.jawRight = jawRight;

    // Upper Wings
    upperWingLeft = drawWingShape(
        [0.8, 0.2, 0.2],         // Color
        [0.65, 0.5, -0.3],       // Position
        [0.4, 1, 0.15],          // Scale (width, height, depth)
        [
            { angle: 0, axis: [1, 0, 0] },   // Second rotation: 0 around X
            { angle: 120, axis: [0, 0, 1] },  // First rotation: 120° around Z
            { angle: 90, axis: [0, 1, 0] }   // Second rotation: 90° around Y
        ],
        {
            top: 0.3,            // Top width
            bottom: 1            // Bottom width
        }
    );

    upperWingRight = drawWingShape(
        [0.8, 0.2, 0.2],         // Color
        [-0.65, 0.5, -0.3],      // Position
        [0.4, 1, 0.15],          // Scale
        [
            { angle: 0, axis: [1, 0, 0] },   // Second rotation: 0 around X
            { angle: -120, axis: [0, 0, 1] }, // First rotation: -120° around Z
            { angle: -90, axis: [0, 1, 0] }  // Second rotation: -90° around Y
        ],
        {
            top: 0.3,
            bottom: 1
        }
    );
    window.upperWingRight = upperWingRight;
    window.upperWingLeft = upperWingLeft;

    // Lower Wings
    lowerWingLeft = drawWingShape(
        [1, 0, 0.5],             // Color
        [1.48, 0.5, -0.3],       // Position
        [0.42, 1, 0.2],          // Scale
        [
            { angle: 0, axis: [1, 0, 0] },   // Second rotation: 0 around X
            { angle: -120, axis: [0, 0, 1] }, // First rotation: -120° around Z
            { angle: 90, axis: [0, 1, 0] }   // Second rotation: 90° around Y
        ],
        {
            top: 0.3,
            bottom: 1
        }
    );

    lowerWingRight = drawWingShape(
        [1, 0, 0.5],             // Color
        [-1.48, 0.5, -0.3],      // Position
        [0.42, 1, 0.2],          // Scale
        [
            { angle: 0, axis: [1, 0, 0] },   // Second rotation: 0 around X
            { angle: 120, axis: [0, 0, 1] },  // First rotation: 120° around Z
            { angle: -90, axis: [0, 1, 0] }  // Second rotation: -90° around Y
        ],
        {
            top: 0.3,
            bottom: 1
        }
    );
    window.lowerWingRight = lowerWingRight;
    window.lowerWingLeft = lowerWingLeft;
}

function render() {
    // Clear the screen
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render all parts
    //body.rotate(30, [1,0,0])
    body.render();
    upperLegLeft.render();
    upperLegRight.render();
    lowerLegLeft.render();
    lowerLegRight.render();
    footLeft.render();
    footRight.render();
    lowerNeckLeft.render();
    lowerNeckMiddle.render();
    lowerNeckRight.render();
    upperNeckLeft.render();
    upperNeckMiddle.render();
    upperNeckRight.render();
    headLeft.render();
    headMiddle.render();
    headRight.render();
    upperTail.render();
    lowerTail.render();
    jawLeft.render();
    jawMiddle.render();
    jawRight.render();
    upperWingRight.render();
    upperWingLeft.render();
    lowerWingRight.render();
    lowerWingLeft.render();
}

function setDefaultPerspective() {
    resetCameraToNormal_util(gl, program);
    render();
}

function setCornerView() {
    setDefault3DPerspective_util(gl, program);
    render();
}

function setCameraToXYPlane() {
    setCameraToXYPlane_util(gl, program);
    render();
}

function setCameraToXZPlane() {
    setCameraToXZPlane_util(gl, program);
    render();
}

function setCameraToYZPlane() {
    setCameraToYZPlane_util(gl, program);
    render();
}

function setCameraToNegativeXYPlane() {
    setCameraToNegativeXYPlane_util(gl, program);
    render();
}

function setCameraToNegativeXZPlane() {
    setCameraToNegativeXZPlane_util(gl, program);
    render();
}

function setCameraToNegativeYZPlane() {
    setCameraToNegativeYZPlane_util(gl, program);
    render();
}

let isJawAnimating = false; // Global flag to control animation
function toggleJawAnimation() {
    console.log("JAW ANIMATION");
}

// Add event listeners for rotation sliders
// Rotate X-axis
document.getElementById('rotateX').addEventListener('input', (event) => {
    const angle = parseFloat(event.target.value);
    document.getElementById('rotateXValue').textContent = angle;

    if (selectedPart) {
        if (selectedPart.hasOwnProperty('rotations')) { // Check if it's a wing
            selectedPart.rotate(0, angle, [1, 0, 0]); // Apply to the first rotation
        } else {
            selectedPart.rotate(angle, [1, 0, 0]); // Apply standard rotation
        }
        render();
    }
});

// Rotate Y-axis
document.getElementById('rotateY').addEventListener('input', (event) => {
    const angle = parseFloat(event.target.value);
    document.getElementById('rotateYValue').textContent = angle;

    if (selectedPart) {
        if (selectedPart.hasOwnProperty('rotations')) { // Check if it's a wing
            selectedPart.rotate(2, angle, [0, 1, 0]); // Apply to the second rotation
        } else {
            selectedPart.rotate(angle, [0, 1, 0]); // Apply standard rotation
        }
        render();
    }
});

// Rotate Z-axis
document.getElementById('rotateZ').addEventListener('input', (event) => {
    const angle = parseFloat(event.target.value);
    document.getElementById('rotateZValue').textContent = angle;

    if (selectedPart) {
        if (selectedPart.hasOwnProperty('rotations')) { // Check if it's a wing
            selectedPart.rotate(1, angle, [0, 0, 1]); // Apply to the second rotation
        } else {
            selectedPart.rotate(angle, [0, 0, 1]); // Apply standard rotation
        }
        render();
    }
});


// Reset sliders when a new part is selected
function resetSliders() {
    document.getElementById('rotateX').value = currentRotation.x = 0;
    document.getElementById('rotateY').value = currentRotation.y = 0;
    document.getElementById('rotateZ').value = currentRotation.z = 0;

    const angle = parseFloat(event.target.value); // Get the slider's value
    document.getElementById('rotateXValue').textContent = 0; // Update the UI
    document.getElementById('rotateYValue').textContent = 0;
    document.getElementById('rotateZValue').textContent = 0;
}

// Update rotation when selecting a new part
function selectPart(partName) {
    selectedPart = window[partName];
    console.log(`Selected part: ${partName}`, selectedPart);
    resetSliders(); // Reset sliders for the new part

    // Highlight the selected button
    // Remove highlight from previously selected buttons
    const buttons = document.querySelectorAll('[data-part]');
    buttons.forEach(button => button.style.backgroundColor = '');

    // Highlight the current button
    const currentButton = document.querySelector(`[data-part="${partName}"]`);
    if (currentButton) {
        currentButton.style.backgroundColor = 'lightblue';
    }
}


// Function to compute world position for joint points
function calculateJointPositions() {
    const jointPositions = {};

    // Helper function to apply transformation
    function applyTransform(position, parentMatrix) {
        let modelMatrix = mat4();
        modelMatrix = mult(parentMatrix, translate(position[0], position[1], position[2]));
        return modelMatrix[3].slice(0, 3); // Extract world coordinates (translation vector)
    }

    // Initialize body (no parent for the body)
    jointPositions.body = body.position;

    // Upper legs
    jointPositions.upperLegLeft = applyTransform(upperLegLeft.position, body.modelMatrix);
    jointPositions.upperLegRight = applyTransform(upperLegRight.position, body.modelMatrix);

    // Lower legs
    jointPositions.lowerLegLeft = applyTransform(lowerLegLeft.position, upperLegLeft.modelMatrix);
    jointPositions.lowerLegRight = applyTransform(lowerLegRight.position, upperLegRight.modelMatrix);

    // Feet
    jointPositions.footLeft = applyTransform(footLeft.position, lowerLegLeft.modelMatrix);
    jointPositions.footRight = applyTransform(footRight.position, lowerLegRight.modelMatrix);

    // Lower necks
    jointPositions.lowerNeckLeft = applyTransform(lowerNeckLeft.position, body.modelMatrix);
    jointPositions.lowerNeckMiddle = applyTransform(lowerNeckMiddle.position, body.modelMatrix);
    jointPositions.lowerNeckRight = applyTransform(lowerNeckRight.position, body.modelMatrix);

    // Upper necks
    jointPositions.upperNeckLeft = applyTransform(upperNeckLeft.position, lowerNeckLeft.modelMatrix);
    jointPositions.upperNeckMiddle = applyTransform(upperNeckMiddle.position, lowerNeckMiddle.modelMatrix);
    jointPositions.upperNeckRight = applyTransform(upperNeckRight.position, lowerNeckRight.modelMatrix);

    // Heads
    jointPositions.headLeft = applyTransform(headLeft.position, upperNeckLeft.modelMatrix);
    jointPositions.headMiddle = applyTransform(headMiddle.position, upperNeckMiddle.modelMatrix);
    jointPositions.headRight = applyTransform(headRight.position, upperNeckRight.modelMatrix);

    // Jaws
    jointPositions.jawLeft = applyTransform(jawLeft.position, headLeft.modelMatrix);
    jointPositions.jawMiddle = applyTransform(jawMiddle.position, headMiddle.modelMatrix);
    jointPositions.jawRight = applyTransform(jawRight.position, headRight.modelMatrix);

    // Tail
    jointPositions.upperTail = applyTransform(upperTail.position, body.modelMatrix);
    jointPositions.lowerTail = applyTransform(lowerTail.position, upperTail.modelMatrix);

    // Wings
    jointPositions.upperWingLeft = applyTransform(upperWingLeft.position, body.modelMatrix);
    jointPositions.upperWingRight = applyTransform(upperWingRight.position, body.modelMatrix);
    jointPositions.lowerWingLeft = applyTransform(lowerWingLeft.position, upperWingLeft.modelMatrix);
    jointPositions.lowerWingRight = applyTransform(lowerWingRight.position, upperWingRight.modelMatrix);

    return jointPositions;
}



// Call initialize on window load (global scope)
window.onload = initialize;



