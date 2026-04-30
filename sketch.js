new p5();

const urlParams = new URLSearchParams(window.location.search);
const canvasSize = parseInt(urlParams.get('canvasSize'), 10) || 600;
const damp = parseFloat(urlParams.get('damp')) || 1;
const typeParam = urlParams.get('type');
const type = typeParam ? typeParam.split(',') : ['avg', 'avg', 'avg', 'full'];
const useDeltaTime = urlParams.get('deltaTime') === 'true';
const timeStep = urlParams.get('timeStep') ? parseFloat(urlParams.get('timeStep')) : 1;
const useRK4 = urlParams.get('rk4') === 'false' ? false : true;
const g_param = parseFloat(urlParams.get('g')) || 10;
const l1_param = parseFloat(urlParams.get('l1')) || 100;
const l2_param = parseFloat(urlParams.get('l2')) || 100;
const m1_param = parseFloat(urlParams.get('m1')) || 10;
const m2_param = parseFloat(urlParams.get('m2')) || 10;
const a1_v_param = parseFloat(urlParams.get('a1_v')) || 0;
const a2_v_param = parseFloat(urlParams.get('a2_v')) || 0;
const space_param = urlParams.get('space') || 'angle';
const init_a1_param = parseFloat(urlParams.get('init_a1')) || Math.PI / 2;
const init_a2_param = parseFloat(urlParams.get('init_a2')) || Math.PI / 2;
const scale_min_param = urlParams.get('scale_min') ? parseFloat(urlParams.get('scale_min')) : null;
const scale_max_param = urlParams.get('scale_max') ? parseFloat(urlParams.get('scale_max')) : null;
let computeMethod = urlParams.get('compute') || 'normal';

console.log(urlParams);
console.log(
  'in order: canvasSize,damp,typeParam,type,useDeltaTime,timeStep,useRK4,g,l1,l2,m1,m2,a1_v,a2_v,space,init_a1,init_a2,scale_min,scale_max,compute',
  canvasSize,
  damp,
  typeParam,
  type,
  useDeltaTime,
  timeStep,
  useRK4,
  g_param,
  l1_param,
  l2_param,
  m1_param,
  m2_param,
  a1_v_param,
  a2_v_param,
  space_param,
  init_a1_param,
  init_a2_param,
  scale_min_param,
  scale_max_param,
  computeMethod
);

if (!useRK4) {
  alert('use rk4 because euler simulation is very inaccurate +does not work well');
}

let backend = null;
let localContext = null;
let localImageData = null;
let localPixels = null;
let localSimulator = null;
let webglCanvas = null;
let webglRenderer = null;
let workerStateRequest = null;

function setup() {
  pixelDensity(1);
  createCanvas(canvasSize, canvasSize);
  localContext = drawingContext;
  backend = initBackend(computeMethod);
}

function draw() {
  if (backend && typeof backend.draw === 'function') {
    backend.draw(deltaTime);
  }
}

function buildSimulatorOptions(overrides) {
  const options = {
    width: canvasSize,
    height: canvasSize,
    damp: damp,
    useRK4: useRK4,
    useDeltaTime: useDeltaTime,
    timeStep: timeStep,
    g: g_param,
    l1: l1_param,
    l2: l2_param,
    m1: m1_param,
    m2: m2_param,
    a1v: a1_v_param,
    a2v: a2_v_param,
    space: space_param,
    initA1: init_a1_param,
    initA2: init_a2_param,
    scaleMin: scale_min_param,
    scaleMax: scale_max_param,
    type: type
  };
  if (!overrides) return options;
  return Object.assign(options, overrides);
}

function initBackend(method) {
  if (typeof SimulationCore === 'undefined') {
    console.warn('SimulationCore not found; simulation is disabled.');
    return { draw: function () {} };
  }

  if (method === 'workers') {
    const workerBackend = initWorkerBackend();
    if (workerBackend) return workerBackend;
    computeMethod = 'normal';
  }

  if (method === 'webgl') {
    const webglBackend = initWebglBackend();
    if (webglBackend) return webglBackend;
    computeMethod = 'normal';
  }

  return initLocalBackend();
}

function initLocalBackend() {
  localSimulator = SimulationCore.createSimulator(buildSimulatorOptions());
  localImageData = localContext.createImageData(canvasSize, canvasSize);
  localPixels = localImageData.data;
  workerStateRequest = null;

  return {
    draw: function (deltaTime) {
      localSimulator.stepAndRender(deltaTime, localPixels);
      localContext.putImageData(localImageData, 0, 0);
      window.cfDeltaTime = deltaTime;
      console.log(deltaTime);
    }
  };
}

function initWebglBackend() {
  webglCanvas = document.createElement('canvas');
  webglCanvas.width = canvasSize;
  webglCanvas.height = canvasSize;
  const gl = webglCanvas.getContext('webgl', { premultipliedAlpha: false });
  if (!gl) {
    console.warn('WebGL not available; falling back to normal renderer.');
    return null;
  }

  webglRenderer = createWebglRenderer(gl, canvasSize, canvasSize);
  if (!webglRenderer) {
    console.warn('WebGL renderer failed to initialize; falling back to normal renderer.');
    return null;
  }

  localSimulator = SimulationCore.createSimulator(buildSimulatorOptions());
  localPixels = new Uint8ClampedArray(canvasSize * canvasSize * 4);
  workerStateRequest = null;

  return {
    draw: function (deltaTime) {
      localSimulator.stepAndRender(deltaTime, localPixels);
      webglRenderer.draw(localPixels);
      localContext.drawImage(webglCanvas, 0, 0);
      window.cfDeltaTime = deltaTime;
      console.log(deltaTime);
    }
  };
}

function initWorkerBackend() {
  if (typeof Worker === 'undefined') {
    console.warn('Web Workers not supported; falling back to normal renderer.');
    return null;
  }

  const maxWorkers = Math.min(navigator.hardwareConcurrency || 4, 8);
  const workerCount = Math.max(1, Math.min(maxWorkers, canvasSize));
  const workers = [];
  const workerSlices = [];
  let readyCount = 0;
  let pendingSlices = 0;
  let frameInFlight = false;
  let lastDeltaTime = 0;
  let fallbackTriggered = false;
  workerStateRequest = function (x, y) {
    const target = workerSlices.find(function (slice) {
      return y >= slice.startRow && y < slice.endRow;
    });
    if (!target) return;
    target.worker.postMessage({
      type: 'state',
      x: x,
      y: y
    });
  };

  let startRow = 0;
  const baseRows = Math.floor(canvasSize / workerCount);
  let remainder = canvasSize % workerCount;

  for (let i = 0; i < workerCount; i++) {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    const endRow = startRow + baseRows + extra;
    const worker = new Worker('compute-worker.js');

    const slice = {
      worker: worker,
      startRow: startRow,
      endRow: endRow,
      height: endRow - startRow
    };

    worker.onmessage = function (event) {
      const data = event.data || {};
      if (data.type === 'ready') {
        readyCount += 1;
        return;
      }
      if (data.type === 'frame') {
        const pixels = new Uint8ClampedArray(data.pixels);
        const imageData = new ImageData(pixels, data.width, data.height);
        localContext.putImageData(imageData, 0, data.startRow);
        pendingSlices -= 1;
        if (pendingSlices === 0) {
          frameInFlight = false;
          window.cfDeltaTime = lastDeltaTime;
          console.log(lastDeltaTime);
        }
        return;
      }
      if (data.type === 'state' && data.state) {
        openPendulumFromState(data.state);
        return;
      }
    };

    worker.onerror = function (error) {
      console.error('Worker failed:', error);
      if (!fallbackTriggered) {
        fallbackTriggered = true;
        workers.forEach(function (activeWorker) {
          activeWorker.terminate();
        });
        computeMethod = 'normal';
        workerStateRequest = null;
        backend = initLocalBackend();
      }
    };

    worker.postMessage({
      type: 'init',
      width: canvasSize,
      height: canvasSize,
      startRow: startRow,
      endRow: endRow,
      damp: damp,
      useRK4: useRK4,
      useDeltaTime: useDeltaTime,
      timeStep: timeStep,
      g: g_param,
      l1: l1_param,
      l2: l2_param,
      m1: m1_param,
      m2: m2_param,
      a1v: a1_v_param,
      a2v: a2_v_param,
      space: space_param,
      initA1: init_a1_param,
      initA2: init_a2_param,
      scaleMin: scale_min_param,
      scaleMax: scale_max_param,
      type: type
    });

    workers.push(worker);
    workerSlices.push(slice);
    startRow = endRow;
  }

  return {
    draw: function (deltaTime) {
      if (readyCount < workerCount) return;
      if (frameInFlight) return;
      frameInFlight = true;
      pendingSlices = workerSlices.length;
      lastDeltaTime = deltaTime;
      workerSlices.forEach(function (slice) {
        slice.worker.postMessage({
          type: 'step',
          deltaTime: deltaTime
        });
      });
    }
  };
}

function createWebglRenderer(gl, width, height) {
  const vertexShaderSource = [
    'attribute vec2 a_position;',
    'attribute vec2 a_texCoord;',
    'varying vec2 v_texCoord;',
    'void main() {',
    '  v_texCoord = a_texCoord;',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
  ].join('\n');

  const fragmentShaderSource = [
    'precision mediump float;',
    'uniform sampler2D u_texture;',
    'varying vec2 v_texCoord;',
    'void main() {',
    '  gl_FragColor = texture2D(u_texture, v_texCoord);',
    '}'
  ].join('\n');

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error('Vertex shader error:', gl.getShaderInfoLog(vertexShader));
    gl.deleteShader(vertexShader);
    return null;
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error('Fragment shader error:', gl.getShaderInfoLog(fragmentShader));
    gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Shader link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1, 0, 0,
      1, -1, 1, 0,
      -1, 1, 0, 1,
      -1, 1, 0, 1,
      1, -1, 1, 0,
      1, 1, 1, 1
    ]),
    gl.STATIC_DRAW
  );

  const positionLocation = gl.getAttribLocation(program, 'a_position');
  const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  const textureLocation = gl.getUniformLocation(program, 'u_texture');

  return {
    draw: function (pixels) {
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.uniform1i(textureLocation, 0);
      gl.disable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };
}

function keyPressed() {
  if (key === 's') {
    save();
  }
}

function openPendulumFromState(state) {
  const params = new URLSearchParams({
    a1: state.a1,
    a2: state.a2,
    damp: damp,
    timeStep: timeStep,
    rk4: useRK4,
    g: state.g,
    l1: state.l1,
    l2: state.l2,
    m1: state.m1,
    m2: state.m2,
    a1_v: state.a1_v,
    a2_v: state.a2_v
  });
  window.open(`pendulum.html?${params.toString()}`, '_blank');
}

function doubleClicked() {
  const x = Math.floor(mouseX);
  const y = Math.floor(mouseY);
  if (x < 0 || y < 0 || x >= canvasSize || y >= canvasSize) return false;
  if (computeMethod === 'workers') {
    if (typeof workerStateRequest === 'function') {
      workerStateRequest(x, y);
    }
    return false;
  }
  if (!localSimulator) return false;
  const state = localSimulator.getStateAt(x, y);
  if (!state) return false;
  openPendulumFromState(state);
  return false;
}
window.saveSketch = save;
function mousePressed() {
  if (mouseButton === RIGHT) {
    save();
  }
}
