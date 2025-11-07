new p5()

const urlParams = new URLSearchParams(window.location.search);
const canvasSize = parseInt(urlParams.get('canvasSize')) || 600;
const damp = parseFloat(urlParams.get('damp')) || 1;
const typeParam = urlParams.get('type');
const type = typeParam ? typeParam.split(',') : ["avg", "avg", "avg", "full"];
const useDeltaTime = urlParams.get('deltaTime') === 'false';
const timeStep = urlParams.get('timeStep') ? parseFloat(urlParams.get('timeStep')) : 1;
const useRK4 = !!(urlParams.get('rk4') === 'true');
const g_param = parseFloat(urlParams.get('g')) || 10;
const l1_param = parseFloat(urlParams.get('l1')) || 100;
const l2_param = parseFloat(urlParams.get('l2')) || 100;
const m1_param = parseFloat(urlParams.get('m1')) || 10;
const m2_param = parseFloat(urlParams.get('m2')) || 10;
const a1_v_param = parseFloat(urlParams.get('a1_v')) || 0;
const a2_v_param = parseFloat(urlParams.get('a2_v')) || 0;
const space_param = urlParams.get('space') || 'angle';
const init_a1_param = parseFloat(urlParams.get('init_a1')) || Math.PI/2;
const init_a2_param = parseFloat(urlParams.get('init_a2')) || Math.PI/2;
const scale_min_param = urlParams.get('scale_min') ? parseFloat(urlParams.get('scale_min')) : null;
const scale_max_param = urlParams.get('scale_max') ? parseFloat(urlParams.get('scale_max')) : null;
console.log(urlParams)
console.log("in order: canvasSize,damp,typeParam,type,useDeltaTime,timeStep,useRK4,g,l1,l2,m1,m2,a1_v,a2_v,space,init_a1,init_a2,scale_min,scale_max\n",canvasSize,damp,typeParam,type,useDeltaTime,timeStep,useRK4,g_param,l1_param,l2_param,m1_param,m2_param,a1_v_param,a2_v_param,space_param,init_a1_param,init_a2_param,scale_min_param,scale_max_param)
if(!useRK4){
  alert("use rk4 because euler simulation is very inaccurate +does not work well")
}
function getSteppingTime(deltaTime) {
  if (useDeltaTime) {
    return timeStep * deltaTime
  } else {
    return timeStep
  }
}
function getChannelValue(avg, a1, a2,angle1=0,angle2=0) {
  let channels = []
  if (type[0]=="hsv"){
    //interpret type[1] as hue, type[2] as saturation, type[3] as value
    let h = 0
    let s = 0
    let v = 0
    for (let i = 0; i < 3; i++) {
      const e = type[i+1];
      if (e == "avg") {
        if (i==0) h=avg
        if (i==1) s=avg
        if (i==2) v=avg
      } else if (e == "zero") {
        if (i==0) h=0
        if (i==1) s=0
        if (i==2) v=0
      } else if (e == "full") {
        if (i==0) h=360
        if (i==1) s=100
        if (i==2) v=100
      } else if (e == "max") {
        if (i==0) h=Math.max(a1, a2)
        if (i==1) s=Math.max(a1, a2)
        if (i==2) v=Math.max(a1, a2)
      } else if (e == "min") {
        if (i==0) h=Math.min(a1, a2)
        if (i==1) s=Math.min(a1, a2)
        if (i==2) v=Math.min(a1, a2)
      } else if (e == "a1") {
        if (i==0) h=a1
        if (i==1) s=a1
        if (i==2) v=a1
      } else if (e == "a2") {
        if (i==0) h=a2
        if (i==1) s=a2
        if (i==2) v=a2
      } else if (e == "angle1") {
        if (i==0) h=angle1 * 360 / (2*Math.PI)
        if (i==1) s=angle1 * 100 / (2*Math.PI)
        if (i==2) v=angle1 * 100 / (2*Math.PI)
      } else if (e == "angle2") {
        if (i==0) h=angle2 * 360 / (2*Math.PI)
        if (i==1) s=angle2 * 100 / (2*Math.PI)
        if (i==2) v=angle2 * 100 / (2*Math.PI)
      } else {
        try {
          const val = parseInt(e)
          if (i==0) h=val
          if (i==1) s=val
          if (i==2) v=val
        } catch (error) {
          if (i==0) h=avg
          if (i==1) s=avg
          if (i==2) v=avg
        } 
      }
    }
    //convert hsv to rgb
    let c = (v / 100) * (s / 100);
    let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    let m = (v / 100) - c;
    let r1, g1, b1;
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
    let r = Math.round((r1 + m) * 255);
    let g = Math.round((g1 + m) * 255);
    let b = Math.round((b1 + m) * 255);
    channels.push(r)
    channels.push(g)
    channels.push(b)
    channels.push(255)
    return channels
  }
  for (let i = 0; i < type.length; i++) {
    const e = type[i];
    if (e == "avg") {
      channels.push(avg)
    } else if (e == "zero") {
      channels.push(0)
    } else if (e == "full") {
      channels.push(255)
    } else if (e == "max") {
      channels.push(Math.max(a1, a2))
    } else if (e == "min") {
      channels.push(Math.min(a1, a2))
    } else if (e == "a1") {
      channels.push(a1)
    } else if (e == "a2") {
      channels.push(a2)
    } else if (e == "angle1") {
      channels.push(angle1 * 255 / (2*Math.PI))
    } else if (e == "angle2") {
      channels.push(angle2 * 255 / (2*Math.PI))
    } else {
      try {
        channels.push(parseInt(e))
      } catch (error) {
        channels.push(avg)
      }

    }
  }
  return channels
}
if(!useRK4){
function stepDoublePendulum(state, dt) {
  const { a1, a2, a1_v, a2_v, l1, l2, m1, m2, g } = state
  let num1 = -g * (2 * m1 + m2) * Math.sin(a1)
  let num2 = -m2 * g * Math.sin(a1 - 2 * a2)
  let num3 = -2 * Math.sin(a1 - a2) * m2
  let num4 = a2_v * a2_v * l2 + a1_v * a1_v * l1 * Math.cos(a1 - a2)
  let den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2))
  const a1_a = (num1 + num2 + num3 * num4) / den

  num1 = 2 * Math.sin(a1 - a2)
  num2 = (a1_v * a1_v * l1 * (m1 + m2))
  num3 = g * (m1 + m2) * Math.cos(a1)
  num4 = a2_v * a2_v * l2 * m2 * Math.cos(a1 - a2)
  den = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2))
  const a2_a = (num1 * (num2 + num3 + num4)) / den


  var new_a1_v = a1_v + a1_a * dt
  var new_a2_v = a2_v + a2_a * dt
  const new_a1 = a1 + new_a1_v * dt
  const new_a2 = a2 + new_a2_v * dt

  new_a2_v *= damp
  new_a1_v *= damp
  return {
    ...state,
    a1: new_a1,
    a2: new_a2,
    a1_v: new_a1_v,
    a2_v: new_a2_v,
  }
}
}

if(useRK4){
const getDerivatives = (s) => {
    // The state s has the same structure: { a1, a2, a1_v, a2_v, ... }
    const { a1, a2, a1_v, a2_v, l1, l2, m1, m2, g } = s;

    // The derivative of an angle is its angular velocity.
    const da1 = a1_v;
    const da2 = a2_v;

    // The derivative of an angular velocity is its angular acceleration.
    // This is the same physics calculation as in your original function.
    let num1 = -g * (2 * m1 + m2) * Math.sin(a1);
    let num2 = -m2 * g * Math.sin(a1 - 2 * a2);
    let num3 = -2 * Math.sin(a1 - a2) * m2;
    let num4 = a2_v * a2_v * l2 + a1_v * a1_v * l1 * Math.cos(a1 - a2);
    let den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const da1_v = (num1 + num2 + num3 * num4) / den; // This is a1_a

    num1 = 2 * Math.sin(a1 - a2);
    num2 = (a1_v * a1_v * l1 * (m1 + m2));
    num3 = g * (m1 + m2) * Math.cos(a1);
    num4 = a2_v * a2_v * l2 * m2 * Math.cos(a1 - a2);
    den = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const da2_v = (num1 * (num2 + num3 + num4)) / den; // This is a2_a

    return { da1, da2, da1_v, da2_v };
  };
function stepDoublePendulum(state, dt) {


  // staring point
  const k1 = getDerivatives(state);

  // maybe middle point
  const state2 = { ...state,
    a1: state.a1 + k1.da1 * dt / 2,
    a2: state.a2 + k1.da2 * dt / 2,
    a1_v: state.a1_v + k1.da1_v * dt / 2,
    a2_v: state.a2_v + k1.da2_v * dt / 2,
  };
  const k2 = getDerivatives(state2);

  //also middle point but better ig
  const state3 = { ...state,
    a1: state.a1 + k2.da1 * dt / 2,
    a2: state.a2 + k2.da2 * dt / 2,
    a1_v: state.a1_v + k2.da1_v * dt / 2,
    a2_v: state.a2_v + k2.da2_v * dt / 2,
  };
  const k3 = getDerivatives(state3);

  // endpoint
  const state4 = { ...state,
    a1: state.a1 + k3.da1 * dt,
    a2: state.a2 + k3.da2 * dt,
    a1_v: state.a1_v + k3.da1_v * dt,
    a2_v: state.a2_v + k3.da2_v * dt,
  };
  const k4 = getDerivatives(state4);

  //avg them
  const final_a1 = state.a1 + (dt / 6) * (k1.da1 + 2 * k2.da1 + 2 * k3.da1 + k4.da1);
  const final_a2 = state.a2 + (dt / 6) * (k1.da2 + 2 * k2.da2 + 2 * k3.da2 + k4.da2);
  let final_a1_v = state.a1_v + (dt / 6) * (k1.da1_v + 2 * k2.da1_v + 2 * k3.da1_v + k4.da1_v);
  let final_a2_v = state.a2_v + (dt / 6) * (k1.da2_v + 2 * k2.da2_v + 2 * k3.da2_v + k4.da2_v);
  //damp
  final_a1_v *= damp;
  final_a2_v *= damp;
  return {
    ...state,
    a1: final_a1,
    a2: final_a2,
    a1_v: final_a1_v,
    a2_v: final_a2_v,
  };
}
}

/////////////////////////////////////////////


var penduli = [] // pendulums
var divergences = []
var a1divergences = []
var a2divergences = []
function getScaleMin() {
  if (scale_min_param !== null) return scale_min_param;
  if (space_param === 'angle') return -Math.PI;
  if (space_param === 'velocity' || space_param === 'momentum') return -10;
  if (space_param === 'mass') return 1;
  if (space_param === 'length') return 10;
  return -Math.PI;
}
function getScaleMax() {
  if (scale_max_param !== null) return scale_max_param;
  if (space_param === 'angle') return Math.PI;
  if (space_param === 'velocity' || space_param === 'momentum') return 10;
  if (space_param === 'mass') return 100;
  if (space_param === 'length') return 200;
  return Math.PI;
}
function setup() {
  createCanvas(canvasSize, canvasSize)
  var colorPlot = createImage(width, height)
  colorPlot.loadPixels();

  for (let i = 0; i < canvasSize + 1; i++) {
    penduli.push([])
  }
  divergences = structuredClone(penduli)
  for (let i = 0; i < divergences.length; i++) {
    let e = divergences[i];
    for (let j = 0; j < canvasSize + 1; j++) {
      e.push(0)
    }

  }
  a1divergences = structuredClone(divergences)
  a2divergences = structuredClone(divergences)
  const scaleMin = getScaleMin();
  const scaleMax = getScaleMax();
  for (let i = 0; i < canvasSize + 1; i++) {
    for (let j = 0; j < canvasSize + 1; j++) {
      let val1 = map(i, 0, canvasSize, scaleMin, scaleMax)
      let val2 = map(j, 0, canvasSize, scaleMin, scaleMax)
      let p = {
        a1: space_param === 'angle' ? val1 : init_a1_param,
        a2: space_param === 'angle' ? val2 : init_a2_param,
        a1_v: (space_param === 'velocity' || space_param === 'momentum') ? val1 : a1_v_param,
        a2_v: (space_param === 'velocity' || space_param === 'momentum') ? val2 : a2_v_param,
        l1: space_param === 'length' ? val1 : l1_param,
        l2: space_param === 'length' ? val2 : l2_param,
        m1: space_param === 'mass' ? val1 : m1_param,
        m2: space_param === 'mass' ? val2 : m2_param,
        g: g_param,
      }
      penduli[i].push(p)
    }
  }

}




function draw() {
  //plot all the pendulums, so plot the difference between the pendulum and the pendulum right after it
  background(0)
  loadPixels();
  //first fill the divergences array
  //divergences[x][y] = (a1-a1'+a2-a2')/2 where a1',a2' are the angles of the pendulum right after
  for (let x = 0; x < penduli.length - 1; x++) {
    for (let y = 0; y < penduli[x].length - 1; y++) {
      let p = penduli[x][y]
      let pNext = penduli[x + 1][y] || penduli[x][y + 1] //edge case
      let divergence = (Math.abs(p.a1 - pNext.a1) + Math.abs(p.a2 - pNext.a2)) / 2
      divergences[x][y] = divergence
    }
  }


  for (let x = 0; x < penduli.length - 1; x++) {
    for (let y = 0; y < penduli[x].length - 1; y++) {
      let p = penduli[x][y]
      let pNext = penduli[x + 1][y] || penduli[x][y + 1] //edge case
      let divergence = Math.abs(p.a1 - pNext.a1)
      a1divergences[x][y] = divergence
    }
  }


  for (let x = 0; x < penduli.length - 1; x++) {
    for (let y = 0; y < penduli[x].length - 1; y++) {
      let p = penduli[x][y]
      let pNext = penduli[x][y + 1] || penduli[x + 1][y] //edge case
      let divergence = Math.abs(p.a2 - pNext.a2)
      a2divergences[x][y] = divergence
    }
  }
  //now plot the divergences
  for (let x = 0; x < divergences.length; x++) {
    for (let y = 0; y < divergences[x].length; y++) {
      let divergence = divergences[x][y]
      let bright = map(divergence, 0, 1, 0, 255)
      let a1div = map(a1divergences[x][y], 0, 1, 0, 255)
      let a2div = map(a2divergences[x][y], 0, 1, 255, 0)
      let index = (x + y * width) * 4
      let chv = getChannelValue(bright, a1div, a2div,penduli[x][y].a1,penduli[x][y].a2)
      pixels[index] = chv[0]
      pixels[index + 1] = chv[1]
      pixels[index + 2] = chv[2]
      pixels[index + 3] = chv[3]

    }
  }
  updatePixels();
  // now step all the pendulums
  for (let x = 0; x < penduli.length; x++) {
    for (let y = 0; y < penduli[x].length; y++) {
      let p = penduli[x][y]
      penduli[x][y] = stepDoublePendulum(p, getSteppingTime(deltaTime))
    }
  }
  window.cfDeltaTime = deltaTime
  

  console.log(deltaTime)
  

}

function keyPressed() {
  if (key === 's') {
    save();
  }
}
function doubleClicked() {
  const x = Math.floor(mouseX);
  const y = Math.floor(mouseY);
  if (x >= 0 && x < penduli.length && y >= 0 && y < penduli[0].length) {
    const p = penduli[x][y];
    const params = new URLSearchParams({
      a1: p.a1,
      a2: p.a2,
      damp: damp,
      timeStep: timeStep,
      rk4: useRK4,
      g: p.g,
      l1: p.l1,
      l2: p.l2,
      m1: p.m1,
      m2: p.m2,
      a1_v: p.a1_v,
      a2_v: p.a2_v
    });
    window.open(`pendulum.html?${params.toString()}`, '_blank');
  }
  return false;
}
window.saveSketch = save
function mousePressed(){
  if (mouseButton === RIGHT){
    save();
  }
}
