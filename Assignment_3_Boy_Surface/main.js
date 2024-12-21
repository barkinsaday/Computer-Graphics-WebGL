console.log("main.js loaded");

let gl, program;
let boySurfaceBufferInfo;

// Default Boy Surface parameters
let uRange = [-Math.PI / 2, Math.PI / 2];
let vRange = [0, Math.PI];
let precision = 0.1;
let useFixedColor = false; // Toggle for fixed color
const fixedColor = [1.0, 0.5, 0.0]; // Orange Color

// Initialize the WebGL application
function initialize() {
    gl = initializeWebGL_util('glCanvas');
    if (!gl) {
        console.error("Failed to initialize WebGL");
        return;
    }

    const vertexShaderSource = window.vertexShaderSource;
    const fragmentShaderSource = window.fragmentShaderSource;

    program = createProgram_util(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    gl.enable(gl.DEPTH_TEST);

    // Create and bind the checkerboard texture
    const texture = createCheckerboardTexture(gl);
    const uTexture = gl.getUniformLocation(program, 'uTexture');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTexture, 0);

    initializeBoySurface();

    setDefault3DPerspective_util(gl, program);

    render();
}


function initializeBoySurface() {
    const { vertices, indices } = generateBoySurface(uRange, vRange, precision);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    boySurfaceBufferInfo = {
        vertexBuffer: vertexBuffer,
        indexBuffer: indexBuffer,
        vertexCount: indices.length,
    };

    const stride = 8 * Float32Array.BYTES_PER_ELEMENT;
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aPosition);

    const aColor = gl.getAttribLocation(program, 'aColor');
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(aColor);

    const aUV = gl.getAttribLocation(program, 'aUV');
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
    gl.enableVertexAttribArray(aUV);
}



function generateBoySurface(uRange, vRange, precision) {
    const vertices = [];
    const indices = [];

    const [uMin, uMax] = uRange;
    const [vMin, vMax] = vRange;

    const uSteps = Math.ceil((uMax - uMin) / precision);
    const vSteps = Math.ceil((vMax - vMin) / precision);

    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    let zMin = Infinity, zMax = -Infinity;

    // First pass: Calculate bounding box
    for (let i = 0; i <= uSteps; i++) {
        const u = uMin + i * precision;

        for (let j = 0; j <= vSteps; j++) {
            const v = vMin + j * precision;

            const x = (Math.sqrt(2) * Math.cos(v) ** 2 * Math.cos(2 * u) + Math.cos(u) * Math.sin(2 * v)) /
                      (2 - Math.sqrt(2) * Math.sin(3 * u) * Math.sin(2 * v));
            const y = (Math.sqrt(2) * Math.cos(v) ** 2 * Math.sin(2 * u) - Math.sin(u) * Math.sin(2 * v)) /
                      (2 - Math.sqrt(2) * Math.sin(3 * u) * Math.sin(2 * v));
            const z = (3 * Math.cos(v) ** 2) /
                      (2 - Math.sqrt(2) * Math.sin(3 * u) * Math.sin(2 * v));

            xMin = Math.min(xMin, x);
            xMax = Math.max(xMax, x);
            yMin = Math.min(yMin, y);
            yMax = Math.max(yMax, y);
            zMin = Math.min(zMin, z);
            zMax = Math.max(zMax, z);
        }
    }

    const xRange = xMax - xMin;
    const yRange = yMax - yMin;

    // Second pass: Generate vertices with normalized UVs
    for (let i = 0; i <= uSteps; i++) {
        const u = uMin + i * precision;

        for (let j = 0; j <= vSteps; j++) {
            const v = vMin + j * precision;

            const x = (Math.sqrt(2) * Math.cos(v) ** 2 * Math.cos(2 * u) + Math.cos(u) * Math.sin(2 * v)) /
                      (2 - Math.sqrt(2) * Math.sin(3 * u) * Math.sin(2 * v));
            const y = (Math.sqrt(2) * Math.cos(v) ** 2 * Math.sin(2 * u) - Math.sin(u) * Math.sin(2 * v)) /
                      (2 - Math.sqrt(2) * Math.sin(3 * u) * Math.sin(2 * v));
            const z = (3 * Math.cos(v) ** 2) /
                      (2 - Math.sqrt(2) * Math.sin(3 * u) * Math.sin(2 * v));

            // Normalize UVs using geometry bounds
            const uNormalized = (x - xMin) / xRange;
            const vNormalized = (y - yMin) / yRange;

            vertices.push(x, y, z, 1.0, 1.0, 1.0, uNormalized, vNormalized);

            if (i < uSteps && j < vSteps) {
                const current = i * (vSteps + 1) + j;
                const next = current + vSteps + 1;

                indices.push(current, next, current + 1);
                indices.push(current + 1, next, next + 1);
            }
        }
    }

    return { vertices, indices };
}




function render() {
    // Set the WebGL background color
    gl.clearColor(0.6, 0.5, 0.5, 1.0); // Example: Light blue background
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Apply a simple model transformation
    const modelMatrix = rotate(0, [0, 1, 0]); // Rotate (optional) (default 0)
    const uModelMatrix = gl.getUniformLocation(program, 'uModelMatrix');
    gl.uniformMatrix4fv(uModelMatrix, false, flatten(modelMatrix));

    // Draw the Boy Surface
    gl.bindBuffer(gl.ARRAY_BUFFER, boySurfaceBufferInfo.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, boySurfaceBufferInfo.indexBuffer);
    gl.drawElements(gl.TRIANGLES, boySurfaceBufferInfo.vertexCount, gl.UNSIGNED_SHORT, 0);
}


// Regenerate the Boy Surface with new precision
function updateSurfaceParameters(newURange, newVRange, newPrecision) {
    uRange = newURange;
    vRange = newVRange;
    precision = newPrecision;

    initializeBoySurface();
    render();
}

// Apply new parameters and update the Boy Surface
function applyParameters() {
    const uMin = parseFloat(document.getElementById("uMin").value);
    const uMax = parseFloat(document.getElementById("uMax").value);
    const vMin = parseFloat(document.getElementById("vMin").value);
    const vMax = parseFloat(document.getElementById("vMax").value);
    const newPrecision = parseFloat(document.getElementById("precision").value);

    // Update ranges and precision
    updateSurfaceParameters([uMin, uMax], [vMin, vMax], newPrecision);
}

function toggleColor() {
    useFixedColor = !useFixedColor; // Toggle between random and fixed color
    initializeBoySurface(); // Regenerate the Boy Surface
    render(); // Re-render the shape
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

// Call initialize on window load (global scope)
window.onload = initialize;



