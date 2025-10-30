const urlParams = new URLSearchParams(window.location.search);
const canvasSize = parseInt(urlParams.get('canvasSize')) || 600;
const damp = parseFloat(urlParams.get('damp')) || 0.99;
const typeParam = urlParams.get('type');
const type = typeParam ? typeParam.split(',') : ["avg","avg","avg","full"];
function getChannelValue(avg, a1, a2) {
  let channels=[]
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
function stepDoublePendulum(state, dt) {
  const { a1, a2, a1_v, a2_v, l1, l2, m1, m2, g } = state
  //loads of code that I will 
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

/////////////////////////////////////////////


var penduli = [] // pendulums
var divergences = []
var a1divergences = []
var a2divergences = []
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
  //load the pendulums with different initial conditions
  //thetas(a1,a2) from -pi to pi
  for (let i = 0; i < canvasSize + 1; i++) {
    for (let j = 0; j < canvasSize + 1; j++) {
      let a1 = map(i, 0, canvasSize, -Math.PI, Math.PI)
      let a2 = map(j, 0, canvasSize, -Math.PI, Math.PI)
      let p = {
        a1: a1,
        a2: a2,
        a1_v: 0,
        a2_v: 0,
        l1: 100,
        l2: 100,
        m1: 10,
        m2: 10,
        g: 1,
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
      let pNext = penduli[x][y +1] || penduli[x+1][y] //edge case
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
      let chv = getChannelValue(bright, a1div, a2div)
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
      penduli[x][y] = stepDoublePendulum(p, 1)
    }
  }
  console.log(deltaTime)
  
}

