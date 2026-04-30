importScripts('simulation-core.js');

var simulator = null;
var workerWidth = 0;
var sliceHeight = 0;
var startRow = 0;

self.onmessage = function (event) {
  var data = event.data || {};
  if (data.type === 'init') {
    workerWidth = data.width;
    startRow = data.startRow;
    sliceHeight = data.endRow - data.startRow;
    simulator = SimulationCore.createSimulator({
      width: data.width,
      height: data.height,
      startRow: data.startRow,
      endRow: data.endRow,
      damp: data.damp,
      useRK4: data.useRK4,
      useDeltaTime: data.useDeltaTime,
      timeStep: data.timeStep,
      g: data.g,
      l1: data.l1,
      l2: data.l2,
      m1: data.m1,
      m2: data.m2,
      a1v: data.a1v,
      a2v: data.a2v,
      space: data.space,
      initA1: data.initA1,
      initA2: data.initA2,
      scaleMin: data.scaleMin,
      scaleMax: data.scaleMax,
      type: data.type
    });
    self.postMessage({
      type: 'ready',
      startRow: startRow,
      sliceHeight: sliceHeight
    });
    return;
  }

  if (data.type === 'step' && simulator) {
    var pixels = new Uint8ClampedArray(workerWidth * sliceHeight * 4);
    simulator.stepAndRender(data.deltaTime, pixels);
    self.postMessage({
      type: 'frame',
      startRow: startRow,
      width: workerWidth,
      height: sliceHeight,
      pixels: pixels.buffer
    }, [pixels.buffer]);
  }
  if (data.type === 'state' && simulator) {
    var state = simulator.getStateAt(data.x, data.y);
    self.postMessage({
      type: 'state',
      state: state
    });
  }
};
