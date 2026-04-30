(function (global) {
  'use strict';

  function mapRange(value, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMin;
    return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin));
  }

  function parseType(typeValue) {
    if (Array.isArray(typeValue)) {
      return typeValue.map(function (entry) {
        return typeof entry === 'string' ? entry.trim() : entry;
      });
    }
    if (typeof typeValue === 'string' && typeValue.length > 0) {
      return typeValue.split(',').map(function (entry) {
        return entry.trim();
      });
    }
    return ['avg', 'avg', 'avg', 'full'];
  }

  function getScaleMin(space, scaleMin) {
    if (typeof scaleMin === 'number' && !Number.isNaN(scaleMin)) return scaleMin;
    if (space === 'velocity' || space === 'momentum') return -10;
    if (space === 'mass') return 1;
    if (space === 'length') return 10;
    return -Math.PI;
  }

  function getScaleMax(space, scaleMax) {
    if (typeof scaleMax === 'number' && !Number.isNaN(scaleMax)) return scaleMax;
    if (space === 'velocity' || space === 'momentum') return 10;
    if (space === 'mass') return 100;
    if (space === 'length') return 200;
    return Math.PI;
  }

  function resolveTokenValue(token, avg, a1, a2, angle1, angle2, fullValue, angleScale) {
    if (token === 'avg') return avg;
    if (token === 'zero') return 0;
    if (token === 'full') return fullValue;
    if (token === 'max') return Math.max(a1, a2);
    if (token === 'min') return Math.min(a1, a2);
    if (token === 'a1') return a1;
    if (token === 'a2') return a2;
    if (token === 'angle1') return angle1 * angleScale;
    if (token === 'angle2') return angle2 * angleScale;
    var parsed = parseInt(token, 10);
    if (!Number.isNaN(parsed)) return parsed;
    return avg;
  }

  function getChannelValue(tokens, avg, a1, a2, angle1, angle2, out) {
    if (tokens[0] === 'hsv') {
      var h = 0;
      var s = 0;
      var v = 0;
      for (var i = 0; i < 3; i++) {
        var token = tokens[i + 1] || 'avg';
        if (token === 'avg') {
          if (i === 0) h = avg;
          if (i === 1) s = avg;
          if (i === 2) v = avg;
        } else if (token === 'zero') {
          if (i === 0) h = 0;
          if (i === 1) s = 0;
          if (i === 2) v = 0;
        } else if (token === 'full') {
          if (i === 0) h = 360;
          if (i === 1) s = 100;
          if (i === 2) v = 100;
        } else if (token === 'max') {
          if (i === 0) h = Math.max(a1, a2);
          if (i === 1) s = Math.max(a1, a2);
          if (i === 2) v = Math.max(a1, a2);
        } else if (token === 'min') {
          if (i === 0) h = Math.min(a1, a2);
          if (i === 1) s = Math.min(a1, a2);
          if (i === 2) v = Math.min(a1, a2);
        } else if (token === 'a1') {
          if (i === 0) h = a1;
          if (i === 1) s = a1;
          if (i === 2) v = a1;
        } else if (token === 'a2') {
          if (i === 0) h = a2;
          if (i === 1) s = a2;
          if (i === 2) v = a2;
        } else if (token === 'angle1') {
          if (i === 0) h = angle1 * 360 / (2 * Math.PI);
          if (i === 1) s = angle1 * 100 / (2 * Math.PI);
          if (i === 2) v = angle1 * 100 / (2 * Math.PI);
        } else if (token === 'angle2') {
          if (i === 0) h = angle2 * 360 / (2 * Math.PI);
          if (i === 1) s = angle2 * 100 / (2 * Math.PI);
          if (i === 2) v = angle2 * 100 / (2 * Math.PI);
        } else {
          var hsvParsed = parseInt(token, 10);
          if (!Number.isNaN(hsvParsed)) {
            if (i === 0) h = hsvParsed;
            if (i === 1) s = hsvParsed;
            if (i === 2) v = hsvParsed;
          } else {
            if (i === 0) h = avg;
            if (i === 1) s = avg;
            if (i === 2) v = avg;
          }
        }
      }
      var c = (v / 100) * (s / 100);
      var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      var m = (v / 100) - c;
      var r1;
      var g1;
      var b1;
      if (0 <= h && h < 60) {
        r1 = c; g1 = x; b1 = 0;
      } else if (60 <= h && h < 120) {
        r1 = x; g1 = c; b1 = 0;
      } else if (120 <= h && h < 180) {
        r1 = 0; g1 = c; b1 = x;
      } else if (180 <= h && h < 240) {
        r1 = 0; g1 = x; b1 = c;
      } else if (240 <= h && h < 300) {
        r1 = x; g1 = 0; b1 = c;
      } else {
        r1 = c; g1 = 0; b1 = x;
      }
      out[0] = Math.round((r1 + m) * 255);
      out[1] = Math.round((g1 + m) * 255);
      out[2] = Math.round((b1 + m) * 255);
      out[3] = 255;
      return out;
    }

    var channels = out;
    for (var cIndex = 0; cIndex < 4; cIndex++) {
      var channelToken = tokens[cIndex] || (cIndex === 3 ? 'full' : 'avg');
      channels[cIndex] = resolveTokenValue(
        channelToken,
        avg,
        a1,
        a2,
        angle1,
        angle2,
        255,
        255 / (2 * Math.PI)
      );
    }
    return channels;
  }

  function createSimulator(options) {
    var width = options.width;
    var height = options.height;
    var startRow = options.startRow || 0;
    var endRow = typeof options.endRow === 'number' ? options.endRow : height;
    var sliceHeight = endRow - startRow;
    var gridWidth = width + 1;
    var gridHeight = sliceHeight + 1;
    var totalCells = gridWidth * gridHeight;

    var typeTokens = parseType(options.type);
    var space = options.space || 'angle';
    var scaleMin = getScaleMin(space, options.scaleMin);
    var scaleMax = getScaleMax(space, options.scaleMax);

    var a1 = new Float32Array(totalCells);
    var a2 = new Float32Array(totalCells);
    var a1v = new Float32Array(totalCells);
    var a2v = new Float32Array(totalCells);
    var l1 = new Float32Array(totalCells);
    var l2 = new Float32Array(totalCells);
    var m1 = new Float32Array(totalCells);
    var m2 = new Float32Array(totalCells);

    var initA1 = options.initA1;
    var initA2 = options.initA2;
    var initA1v = options.a1v;
    var initA2v = options.a2v;
    var baseL1 = options.l1;
    var baseL2 = options.l2;
    var baseM1 = options.m1;
    var baseM2 = options.m2;

    for (var y = 0; y < gridHeight; y++) {
      var globalY = startRow + y;
      var val2 = mapRange(globalY, 0, height, scaleMin, scaleMax);
      for (var x = 0; x < gridWidth; x++) {
        var val1 = mapRange(x, 0, width, scaleMin, scaleMax);
        var idx = x + y * gridWidth;
        a1[idx] = space === 'angle' ? val1 : initA1;
        a2[idx] = space === 'angle' ? val2 : initA2;
        a1v[idx] = (space === 'velocity' || space === 'momentum') ? val1 : initA1v;
        a2v[idx] = (space === 'velocity' || space === 'momentum') ? val2 : initA2v;
        l1[idx] = space === 'length' ? val1 : baseL1;
        l2[idx] = space === 'length' ? val2 : baseL2;
        m1[idx] = space === 'mass' ? val1 : baseM1;
        m2[idx] = space === 'mass' ? val2 : baseM2;
      }
    }

    var useDeltaTime = !!options.useDeltaTime;
    var useRK4 = !!options.useRK4;
    var timeStep = options.timeStep;
    var damp = options.damp;
    var gravity = options.g;
    var channelBuffer = [0, 0, 0, 255];

    function getStateAt(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      if (y < startRow || y >= endRow) return null;
      var localY = y - startRow;
      var idx = x + localY * gridWidth;
      return {
        a1: a1[idx],
        a2: a2[idx],
        a1_v: a1v[idx],
        a2_v: a2v[idx],
        l1: l1[idx],
        l2: l2[idx],
        m1: m1[idx],
        m2: m2[idx],
        g: gravity
      };
    }

    function stepAndRender(deltaTime, pixels) {
      var stepTime = useDeltaTime ? timeStep * deltaTime : timeStep;

      for (var row = 0; row < sliceHeight; row++) {
        var rowOffset = row * gridWidth;
        var pixelOffset = row * width * 4;
        for (var col = 0; col < width; col++) {
          var idx = col + rowOffset;
          var idxXNext = idx + 1;
          var idxYNext = idx + gridWidth;
          var divergence = (Math.abs(a1[idx] - a1[idxXNext]) + Math.abs(a2[idx] - a2[idxXNext])) / 2;
          var a1div = Math.abs(a1[idx] - a1[idxXNext]);
          var a2div = Math.abs(a2[idx] - a2[idxYNext]);
          var bright = mapRange(divergence, 0, 1, 0, 255);
          var a1Bright = mapRange(a1div, 0, 1, 0, 255);
          var a2Bright = mapRange(a2div, 0, 1, 255, 0);
          var channels = getChannelValue(typeTokens, bright, a1Bright, a2Bright, a1[idx], a2[idx], channelBuffer);
          var outIndex = pixelOffset + col * 4;
          pixels[outIndex] = channels[0];
          pixels[outIndex + 1] = channels[1];
          pixels[outIndex + 2] = channels[2];
          pixels[outIndex + 3] = channels[3];
        }
      }

      for (var updateRow = 0; updateRow < gridHeight; updateRow++) {
        var updateOffset = updateRow * gridWidth;
        for (var updateCol = 0; updateCol < gridWidth; updateCol++) {
          var updateIdx = updateCol + updateOffset;
          var a1Val = a1[updateIdx];
          var a2Val = a2[updateIdx];
          var a1vVal = a1v[updateIdx];
          var a2vVal = a2v[updateIdx];
          var l1Val = l1[updateIdx];
          var l2Val = l2[updateIdx];
          var m1Val = m1[updateIdx];
          var m2Val = m2[updateIdx];

          if (!useRK4) {
            var num1 = -gravity * (2 * m1Val + m2Val) * Math.sin(a1Val);
            var num2 = -m2Val * gravity * Math.sin(a1Val - 2 * a2Val);
            var num3 = -2 * Math.sin(a1Val - a2Val) * m2Val;
            var num4 = a2vVal * a2vVal * l2Val + a1vVal * a1vVal * l1Val * Math.cos(a1Val - a2Val);
            var den = l1Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1Val - 2 * a2Val));
            var a1a = (num1 + num2 + num3 * num4) / den;

            num1 = 2 * Math.sin(a1Val - a2Val);
            num2 = a1vVal * a1vVal * l1Val * (m1Val + m2Val);
            num3 = gravity * (m1Val + m2Val) * Math.cos(a1Val);
            num4 = a2vVal * a2vVal * l2Val * m2Val * Math.cos(a1Val - a2Val);
            den = l2Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1Val - 2 * a2Val));
            var a2a = (num1 * (num2 + num3 + num4)) / den;

            var newA1v = a1vVal + a1a * stepTime;
            var newA2v = a2vVal + a2a * stepTime;
            var newA1 = a1Val + newA1v * stepTime;
            var newA2 = a2Val + newA2v * stepTime;
            newA1v *= damp;
            newA2v *= damp;

            a1[updateIdx] = newA1;
            a2[updateIdx] = newA2;
            a1v[updateIdx] = newA1v;
            a2v[updateIdx] = newA2v;
          } else {
            var k1a1 = a1vVal;
            var k1a2 = a2vVal;
            var k1a1v;
            var k1a2v;

            var n1 = -gravity * (2 * m1Val + m2Val) * Math.sin(a1Val);
            var n2 = -m2Val * gravity * Math.sin(a1Val - 2 * a2Val);
            var n3 = -2 * Math.sin(a1Val - a2Val) * m2Val;
            var n4 = a2vVal * a2vVal * l2Val + a1vVal * a1vVal * l1Val * Math.cos(a1Val - a2Val);
            var d1 = l1Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1Val - 2 * a2Val));
            k1a1v = (n1 + n2 + n3 * n4) / d1;

            n1 = 2 * Math.sin(a1Val - a2Val);
            n2 = a1vVal * a1vVal * l1Val * (m1Val + m2Val);
            n3 = gravity * (m1Val + m2Val) * Math.cos(a1Val);
            n4 = a2vVal * a2vVal * l2Val * m2Val * Math.cos(a1Val - a2Val);
            d1 = l2Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1Val - 2 * a2Val));
            k1a2v = (n1 * (n2 + n3 + n4)) / d1;

            var a1_2 = a1Val + k1a1 * stepTime / 2;
            var a2_2 = a2Val + k1a2 * stepTime / 2;
            var a1v_2 = a1vVal + k1a1v * stepTime / 2;
            var a2v_2 = a2vVal + k1a2v * stepTime / 2;

            var k2a1 = a1v_2;
            var k2a2 = a2v_2;
            var k2a1v;
            var k2a2v;

            n1 = -gravity * (2 * m1Val + m2Val) * Math.sin(a1_2);
            n2 = -m2Val * gravity * Math.sin(a1_2 - 2 * a2_2);
            n3 = -2 * Math.sin(a1_2 - a2_2) * m2Val;
            n4 = a2v_2 * a2v_2 * l2Val + a1v_2 * a1v_2 * l1Val * Math.cos(a1_2 - a2_2);
            d1 = l1Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1_2 - 2 * a2_2));
            k2a1v = (n1 + n2 + n3 * n4) / d1;

            n1 = 2 * Math.sin(a1_2 - a2_2);
            n2 = a1v_2 * a1v_2 * l1Val * (m1Val + m2Val);
            n3 = gravity * (m1Val + m2Val) * Math.cos(a1_2);
            n4 = a2v_2 * a2v_2 * l2Val * m2Val * Math.cos(a1_2 - a2_2);
            d1 = l2Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1_2 - 2 * a2_2));
            k2a2v = (n1 * (n2 + n3 + n4)) / d1;

            var a1_3 = a1Val + k2a1 * stepTime / 2;
            var a2_3 = a2Val + k2a2 * stepTime / 2;
            var a1v_3 = a1vVal + k2a1v * stepTime / 2;
            var a2v_3 = a2vVal + k2a2v * stepTime / 2;

            var k3a1 = a1v_3;
            var k3a2 = a2v_3;
            var k3a1v;
            var k3a2v;

            n1 = -gravity * (2 * m1Val + m2Val) * Math.sin(a1_3);
            n2 = -m2Val * gravity * Math.sin(a1_3 - 2 * a2_3);
            n3 = -2 * Math.sin(a1_3 - a2_3) * m2Val;
            n4 = a2v_3 * a2v_3 * l2Val + a1v_3 * a1v_3 * l1Val * Math.cos(a1_3 - a2_3);
            d1 = l1Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1_3 - 2 * a2_3));
            k3a1v = (n1 + n2 + n3 * n4) / d1;

            n1 = 2 * Math.sin(a1_3 - a2_3);
            n2 = a1v_3 * a1v_3 * l1Val * (m1Val + m2Val);
            n3 = gravity * (m1Val + m2Val) * Math.cos(a1_3);
            n4 = a2v_3 * a2v_3 * l2Val * m2Val * Math.cos(a1_3 - a2_3);
            d1 = l2Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1_3 - 2 * a2_3));
            k3a2v = (n1 * (n2 + n3 + n4)) / d1;

            var a1_4 = a1Val + k3a1 * stepTime;
            var a2_4 = a2Val + k3a2 * stepTime;
            var a1v_4 = a1vVal + k3a1v * stepTime;
            var a2v_4 = a2vVal + k3a2v * stepTime;

            var k4a1 = a1v_4;
            var k4a2 = a2v_4;
            var k4a1v;
            var k4a2v;

            n1 = -gravity * (2 * m1Val + m2Val) * Math.sin(a1_4);
            n2 = -m2Val * gravity * Math.sin(a1_4 - 2 * a2_4);
            n3 = -2 * Math.sin(a1_4 - a2_4) * m2Val;
            n4 = a2v_4 * a2v_4 * l2Val + a1v_4 * a1v_4 * l1Val * Math.cos(a1_4 - a2_4);
            d1 = l1Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1_4 - 2 * a2_4));
            k4a1v = (n1 + n2 + n3 * n4) / d1;

            n1 = 2 * Math.sin(a1_4 - a2_4);
            n2 = a1v_4 * a1v_4 * l1Val * (m1Val + m2Val);
            n3 = gravity * (m1Val + m2Val) * Math.cos(a1_4);
            n4 = a2v_4 * a2v_4 * l2Val * m2Val * Math.cos(a1_4 - a2_4);
            d1 = l2Val * (2 * m1Val + m2Val - m2Val * Math.cos(2 * a1_4 - 2 * a2_4));
            k4a2v = (n1 * (n2 + n3 + n4)) / d1;

            var nextA1 = a1Val + (stepTime / 6) * (k1a1 + 2 * k2a1 + 2 * k3a1 + k4a1);
            var nextA2 = a2Val + (stepTime / 6) * (k1a2 + 2 * k2a2 + 2 * k3a2 + k4a2);
            var nextA1v = a1vVal + (stepTime / 6) * (k1a1v + 2 * k2a1v + 2 * k3a1v + k4a1v);
            var nextA2v = a2vVal + (stepTime / 6) * (k1a2v + 2 * k2a2v + 2 * k3a2v + k4a2v);

            nextA1v *= damp;
            nextA2v *= damp;

            a1[updateIdx] = nextA1;
            a2[updateIdx] = nextA2;
            a1v[updateIdx] = nextA1v;
            a2v[updateIdx] = nextA2v;
          }
        }
      }
    }

    return {
      width: width,
      height: height,
      sliceHeight: sliceHeight,
      stepAndRender: stepAndRender,
      getStateAt: getStateAt
    };
  }

  global.SimulationCore = {
    createSimulator: createSimulator,
    parseType: parseType
  };
})(typeof self !== 'undefined' ? self : this);
