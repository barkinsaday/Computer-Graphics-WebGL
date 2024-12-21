// utils.js
console.log("utils.js loaded");

// Initialize WebGL context
function initializeWebGL_util(canvasId) {
    const canvas = document.getElementById(canvasId);
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("WebGL not supported");
        return null;
    }
    return gl;
}

// Create and compile a shader
function createShader_util(gl, type, source) {
    console.log("Shader source being compiled:", source); // Debugging
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        //console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

// Create a program from vertex and fragment shaders
function createProgram_util(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = createShader_util(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader_util(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

function resetCameraToNormal_util(gl, program) {
    // Define the default camera position and orientation
    const eye = [0, 0, 1]; // Camera is directly in front of the cube along the Z-axis
    const target = [0, 0, 0]; // Looking at the center of the cube
    const up = [0, 1, 0]; // Up direction remains the same

    // Create the view matrix using MV.js
    const viewMatrix = lookAt(eye, target, up);

    // Flatten the matrix for WebGL
    const flattenedMatrix = flatten(viewMatrix);

    // Get the location of uViewMatrix in the shader and set it
    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(uViewMatrix, false, flattenedMatrix);
}

function setDefault3DPerspective_util(gl, program) {
    // Define the camera position (slightly off the Z-axis)
    const eye = [3,3,6]; // Positioned at an angle to see 3 faces
    const target = [0, 0, 0]; // Looking at the center of the cube
    const up = [0, 1, 0]; // Keep the camera upright

    // Create the view matrix using MV.js
    var viewMatrix = mat4(); // Create an identity matrix
    viewMatrix = lookAt(eye, target, up); // Compute the camera view matrix

    // Pass the view matrix to the shader program
    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(viewMatrix));

    // Define the perspective projection matrix
    const fovy = 60.0; // Field of view in degrees
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight; // Aspect ratio
    const near = 0.1; // Near clipping plane
    const far = 100.0; // Far clipping plane

    var projectionMatrix = perspective(fovy, aspect, near, far); // Perspective projection
    const uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));
}

function setCameraToXYPlane_util(gl, program) {
    const eye = [0, 0, 5]; // Positioned along the Z-axis
    const target = [0, 0, 0]; // Looking at the center of the cube
    const up = [0, 1, 0]; // Y-axis as up direction

    const viewMatrix = lookAt(eye, target, up);

    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(viewMatrix));
}

function setCameraToXZPlane_util(gl, program) {
    const eye = [0, 5, 0]; // Positioned farther along the Y-axis
    const target = [0, 0, 0]; // Looking at the center of the cube
    const up = [0, 0, -1]; // Negative Z-axis as up direction

    const viewMatrix = lookAt(eye, target, up);

    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(viewMatrix));
}


function setCameraToYZPlane_util(gl, program) {
    const eye = [5, 0, 0]; // Positioned farther along the X-axis
    const target = [0, 0, 0]; // Looking at the center of the cube
    const up = [0, 1, 0]; // Y-axis as up direction

    const viewMatrix = lookAt(eye, target, up);

    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(viewMatrix));
}

function setCameraToNegativeXYPlane_util(gl, program) {
    const eye = [0, 0, -5]; // Positioned farther along the negative Z-axis
    const target = [0, 0, 0]; // Looking at the center of the cube
    const up = [0, 1, 0]; // Y-axis as up direction

    const viewMatrix = lookAt(eye, target, up);

    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(viewMatrix));
}

function setCameraToNegativeXZPlane_util(gl, program) {
    const eye = [0, -5, 0]; // Positioned farther along the negative Y-axis
    const target = [0, 0, 0]; // Looking at the center of the cube
    const up = [0, 0, 1]; // Positive Z-axis as up direction

    const viewMatrix = lookAt(eye, target, up);

    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(viewMatrix));
}

function setCameraToNegativeYZPlane_util(gl, program) {
    const eye = [-5, 0, 0]; // Positioned farther along the negative X-axis
    const target = [0, 0, 0]; // Looking at the center of the cube
    const up = [0, 1, 0]; // Y-axis as up direction

    const viewMatrix = lookAt(eye, target, up);

    const uViewMatrix = gl.getUniformLocation(program, 'uViewMatrix');
    gl.uniformMatrix4fv(uViewMatrix, false, flatten(viewMatrix));
}

function logthis(){
    console.log(    "XXXXXXXXXXXXXXX");
}

function createCheckerboardTexture(gl, customColor = [1.0, 0.5, 0.0]) {
    const size = 512; // Texture size
    const squares = 64; // Number of squares

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;

    const ctx = canvas.getContext('2d');
    const squareSize = size / squares;

    // Convert custom color to an RGB string
    const customColorRGB = `rgb(${Math.floor(customColor[0] * 255)}, ${Math.floor(customColor[1] * 255)}, ${Math.floor(customColor[2] * 255)})`;

    for (let i = 0; i < squares; i++) {
        for (let j = 0; j < squares; j++) {
            ctx.fillStyle = (i + j) % 2 === 0 ? customColorRGB : 'black';
            ctx.fillRect(i * squareSize, j * squareSize, squareSize, squareSize);
        }
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        canvas
    );

    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);

    return texture;
}



