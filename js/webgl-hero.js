(function () {
    "use strict";

    const hero = document.querySelector(".hero-header");
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.className = "hero-webgl";
    canvas.setAttribute("aria-hidden", "true");
    hero.prepend(canvas);

    let gl;
    try {
        gl = canvas.getContext("webgl", {
            alpha: true,
            antialias: false,
            powerPreference: "low-power"
        });
    } catch (error) {
        canvas.remove();
        return;
    }
    if (!gl) {
        canvas.remove();
        return;
    }

    const vertexSource = `
        attribute vec2 position;
        varying vec2 uv;
        void main() {
            uv = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `;
    const fragmentSource = `
        precision mediump float;
        varying vec2 uv;
        uniform vec2 resolution;
        uniform float time;

        float glow(vec2 point, vec2 center, float radius) {
            float distanceFromCenter = length((point - center) * vec2(resolution.x / resolution.y, 1.0));
            return exp(-distanceFromCenter * distanceFromCenter / radius);
        }

        void main() {
            vec2 point = uv;
            float drift = time * 0.055;
            float amber = glow(point, vec2(0.82 + sin(drift) * 0.08, 0.36 + cos(drift * 0.8) * 0.08), 0.12);
            float teal = glow(point, vec2(0.18 + cos(drift * 0.7) * 0.07, 0.72 + sin(drift) * 0.06), 0.18);
            float soft = glow(point, vec2(0.52, 0.48), 0.48);
            vec3 color = vec3(0.99, 0.42, 0.06) * amber * 0.22;
            color += vec3(0.04, 0.42, 0.38) * teal * 0.19;
            color += vec3(0.12, 0.14, 0.20) * soft * 0.52;
            gl_FragColor = vec4(color, 0.62);
        }
    `;

    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) {
        canvas.remove();
        return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        canvas.remove();
        return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, "resolution");
    const time = gl.getUniformLocation(program, "time");

    function resize() {
        const scale = Math.min(window.devicePixelRatio || 1, 1.5);
        const width = Math.max(1, Math.round(hero.clientWidth * scale));
        const height = Math.max(1, Math.round(hero.clientHeight * scale));
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
            gl.uniform2f(resolution, width, height);
        }
    }

    let startTime = 0;
    let animationFrame = 0;
    function render(timestamp) {
        resize();
        if (!startTime) startTime = timestamp;
        gl.uniform1f(time, (timestamp - startTime) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        animationFrame = window.requestAnimationFrame(render);
    }

    function setVisibility() {
        if (document.hidden) {
            window.cancelAnimationFrame(animationFrame);
        } else {
            startTime = 0;
            animationFrame = window.requestAnimationFrame(render);
        }
    }

    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", setVisibility);
    resize();
    animationFrame = window.requestAnimationFrame(render);
})();
