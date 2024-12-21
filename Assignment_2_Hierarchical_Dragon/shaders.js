console.log("shaders.js loaded");
// Vertex Shader Source
window.vertexShaderSource = `
    attribute vec4 aPosition;
    attribute vec4 aColor;
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;   // Model transformation
    uniform mat4 uProjectionMatrix;
    varying vec4 vColor;

    void main() {
        gl_Position = uProjectionMatrix * uViewMatrix *  uModelMatrix * aPosition; // Apply projection and view transformations
        vColor = aColor;
    }
`;



window.fragmentShaderSource = `
    precision mediump float;
    varying vec4 vColor;

    void main() {
        gl_FragColor = vColor;
    }
`;


