console.log("shaders.js loaded");
// Vertex Shader Source
window.vertexShaderSource = `
    attribute vec4 aPosition;   // Vertex position
    attribute vec4 aColor;      // Vertex color
    attribute vec2 aUV;         // UV coordinates
    uniform mat4 uViewMatrix;
    uniform mat4 uModelMatrix;
    uniform mat4 uProjectionMatrix;
    varying vec4 vColor;        // Color for interpolation
    varying vec2 vUV;           // UV coordinates for the fragment shader

    void main() {
        gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
        vColor = aColor;
        vUV = aUV; // Pass UV to the fragment shader
    }


`;



window.fragmentShaderSource = `
    precision mediump float;
    varying vec4 vColor;        // Interpolated color
    varying vec2 vUV;           // UV coordinates
    uniform sampler2D uTexture; // Texture sampler

    void main() {
        vec4 texColor = texture2D(uTexture, vUV); // Sample the texture
        gl_FragColor = texColor * vColor;         // Combine texture and color
    }

`;


