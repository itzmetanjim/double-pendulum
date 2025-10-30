const urlParams = new URLSearchParams(window.location.search);
const a1 = parseFloat(urlParams.get('a1')) || 0;
const a2 = parseFloat(urlParams.get('a2')) || 0;
const damp = parseFloat(urlParams.get('damp')) || 1;
const timeStep = parseFloat(urlParams.get('timeStep')) || 1;
const useRK4 = urlParams.get('rk4') === 'true';
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
    const { a1, a2, a1_v, a2_v, l1, l2, m1, m2, g } = s;
    const da1 = a1_v;
    const da2 = a2_v;
    let num1 = -g * (2 * m1 + m2) * Math.sin(a1);
    let num2 = -m2 * g * Math.sin(a1 - 2 * a2);
    let num3 = -2 * Math.sin(a1 - a2) * m2;
    let num4 = a2_v * a2_v * l2 + a1_v * a1_v * l1 * Math.cos(a1 - a2);
    let den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const da1_v = (num1 + num2 + num3 * num4) / den;
    num1 = 2 * Math.sin(a1 - a2);
    num2 = (a1_v * a1_v * l1 * (m1 + m2));
    num3 = g * (m1 + m2) * Math.cos(a1);
    num4 = a2_v * a2_v * l2 * m2 * Math.cos(a1 - a2);
    den = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
    const da2_v = (num1 * (num2 + num3 + num4)) / den;
    return { da1, da2, da1_v, da2_v };
  };
function stepDoublePendulum(state, dt) {
  const k1 = getDerivatives(state);
  const state2 = { ...state,
    a1: state.a1 + k1.da1 * dt / 2,
    a2: state.a2 + k1.da2 * dt / 2,
    a1_v: state.a1_v + k1.da1_v * dt / 2,
    a2_v: state.a2_v + k1.da2_v * dt / 2,
  };
  const k2 = getDerivatives(state2);
  const state3 = { ...state,
    a1: state.a1 + k2.da1 * dt / 2,
    a2: state.a2 + k2.da2 * dt / 2,
    a1_v: state.a1_v + k2.da1_v * dt / 2,
    a2_v: state.a2_v + k2.da2_v * dt / 2,
  };
  const k3 = getDerivatives(state3);
  const state4 = { ...state,
    a1: state.a1 + k3.da1 * dt,
    a2: state.a2 + k3.da2 * dt,
    a1_v: state.a1_v + k3.da1_v * dt,
    a2_v: state.a2_v + k3.da2_v * dt,
  };
  const k4 = getDerivatives(state4);
  const final_a1 = state.a1 + (dt / 6) * (k1.da1 + 2 * k2.da1 + 2 * k3.da1 + k4.da1);
  const final_a2 = state.a2 + (dt / 6) * (k1.da2 + 2 * k2.da2 + 2 * k3.da2 + k4.da2);
  let final_a1_v = state.a1_v + (dt / 6) * (k1.da1_v + 2 * k2.da1_v + 2 * k3.da1_v + k4.da1_v);
  let final_a2_v = state.a2_v + (dt / 6) * (k1.da2_v + 2 * k2.da2_v + 2 * k3.da2_v + k4.da2_v);
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
let pendulum;
let trail = [];
function setup() {
  createCanvas(600, 600);
  pendulum = {
    a1: a1,
    a2: a2,
    a1_v: 0,
    a2_v: 0,
    l1: 100,
    l2: 100,
    m1: 10,
    m2: 10,
    g: 9.8,
  };
}
function draw() {
  background(30);
  translate(width / 2, height / 2);
  pendulum = stepDoublePendulum(pendulum, timeStep * 5 * deltaTime / 1000);
  const x1 = pendulum.l1 * Math.sin(pendulum.a1);
  const y1 = pendulum.l1 * Math.cos(pendulum.a1);
  const x2 = x1 + pendulum.l2 * Math.sin(pendulum.a2);
  const y2 = y1 + pendulum.l2 * Math.cos(pendulum.a2);
  trail.push({ x: x2, y: y2 });
  if (trail.length > 500) {
    trail.shift();
  }
  stroke(200, 200, 200);
  strokeWeight(1);
  noFill();
  beginShape();
  for (let i = 0; i < trail.length; i++) {
    vertex(trail[i].x, trail[i].y);
  }
  endShape();
  stroke(255);
  strokeWeight(2);
  line(0, 0, x1, y1);
  line(x1, y1, x2, y2);
  fill(0);
  ellipse(0, 0, 8, 8);
  ellipse(x1, y1, pendulum.m1, pendulum.m1);
  ellipse(x2, y2, pendulum.m2, pendulum.m2);
}
