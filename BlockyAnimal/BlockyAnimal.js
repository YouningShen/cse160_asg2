// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor; 
  void main() {
    gl_FragColor = u_FragColor;
  }`


// Global Vars
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
    // Initialize shaders
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
      console.log('Failed to intialize shaders.');
      return;
    }
  
    // // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
      console.log('Failed to get the storage location of a_Position');
      return;
    }
  
    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
      console.log('Failed to get the storage location of u_FragColor');
      return;
    }

    // Get the storage location of u_ModelMatrix
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
      console.log('Failed to get the storage location of u_ModelMatrix');
      return;
    }

    // Get the storage location of u_GlobalRotateMatrix
    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if (!u_GlobalRotateMatrix) {
      console.log('Failed to get the storage location of u_GlobalRotateMatrix');
      return;
    }

    // Set an initial value for this matrix to identitiy
    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
  

}

// Globals related UI elements
let g_selectedColor=[1.0, 1.0, 1.0, 1.0];
let g_selectedPokemon = 'Squirtle'; 
let g_globalAngle=0;
let g_leftarmAngle=0;
let g_rightarmAngle=0;
let g_leftlegAngle=0;
let g_rightlegAngle=0;
let g_leftfootAngle=0;
let g_rightfootAngle=0;
let g_armAnimation=false;
let g_legAnimation=false;
let g_feetAnimation=false;
let g_walkAnimation=false;
let g_heartList = [];
let g_pokeMode = false;
let g_dragging = false;     // Whether the mouse is dragging
let g_lastX = -1, g_lastY = -1;  // Last mouse position
let g_globalAngleY = 0; // rotation around Y-axis (left-right)
let g_globalAngleX = 0; // rotation around X-axis (up-down)


// Set up action for the HTML UI elements
function addActionForHtmlUI() {

  // Button Events (Shape Type)
  document.getElementById('animationArmOnButton').onclick = function () { g_armAnimation = true; g_walkAnimation = false; }; 
  document.getElementById('animationArmOffButton').onclick = function () { g_armAnimation = false; };
  document.getElementById('animationLegOnButton').onclick = function () { g_legAnimation = true; g_walkAnimation = false; }; 
  document.getElementById('animationLegOffButton').onclick = function () { g_legAnimation = false; };
  document.getElementById('animationFeetOnButton').onclick = function () { g_feetAnimation = true; g_walkAnimation = false; }; 
  document.getElementById('animationFeetOffButton').onclick = function () { g_feetAnimation = false; };
  document.getElementById('animationWalkOnButton').onclick = function () { g_walkAnimation = true; g_legAnimation = false; g_armAnimation = false; g_feetAnimation = false; }; 
  document.getElementById('animationWalkOffButton').onclick = function () { g_walkAnimation = false; };

  // Color Slider Events
  document.getElementById('leftarmSlide').addEventListener('mousemove',  function() {g_leftarmAngle = this.value; renderAllShapes(); });
  document.getElementById('rightarmSlide').addEventListener('mousemove',  function() {g_rightarmAngle = this.value; renderAllShapes(); });
  document.getElementById('leftlegSlide').addEventListener('mousemove',  function() {g_leftlegAngle = this.value; renderAllShapes(); });
  document.getElementById('rightlegSlide').addEventListener('mousemove',  function() {g_rightlegAngle = this.value; renderAllShapes(); });
  document.getElementById('leftfootSlide').addEventListener('mousemove',  function() {g_leftfootAngle = this.value; renderAllShapes(); });
  document.getElementById('rightfootSlide').addEventListener('mousemove',  function() {g_rightfootAngle = this.value; renderAllShapes(); });

  // Size Slider Events
  // document.getElementById('angleSlide').addEventListener('mouseup',   function() {g_globalAngle = this.value; renderAllShapes(); });
  // document.getElementById('angleSlide').addEventListener('mousemove',   function() {g_globalAngle = this.value; renderAllShapes(); });
  
  
}


function main() {

  // Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  initVertexBuffer();

  // Set up action for the HTML UI elements
  addActionForHtmlUI();
  mouseEvents();
  
  // Register function (event handler) to be called on a mouse press
  // canvas.onmousedown = click;
  // canvas.onmousemove = click;
  // canvas.onmousemove = function(ev) { if(ev.buttons == 1) { click(ev) } };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  // Render
  requestAnimationFrame(tick);
}

function switchPokemon(pokemon) {
    g_selectedPokemon = pokemon;
    renderAllShapes();
  }

function mouseEvents() {
    canvas.onmousedown = function(ev) {
        if (ev.shiftKey) {
          // (your code for spawning hearts, keep this)
        } else {
          g_dragging = true;
          g_lastX = ev.clientX;
          g_lastY = ev.clientY;
        }
      };
      
      canvas.onmouseup = function(ev) {
        g_dragging = false;
      };
      
      canvas.onmousemove = function(ev) {
        if (g_dragging) {
          let x = ev.clientX;
          let y = ev.clientY;
      
          let factor = 0.5; // rotation sensitivity
          let dx = factor * (x - g_lastX);
          let dy = factor * (y - g_lastY);
      
          g_globalAngleY += dx; // Rotate left/right
          g_globalAngleX += dy; // Rotate up/down
      
          // Optional: Clamp vertical rotation so it doesn't flip over weirdly
          if (g_globalAngleX > 90) g_globalAngleX = 90;
          if (g_globalAngleX < -90) g_globalAngleX = -90;
      
          g_lastX = x;
          g_lastY = y;
      
          renderAllShapes();
        }
      };      
}
var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;

// Called by browser repeatedly whenever its time
function tick() {
    // Print some debug information so we know we are running
    g_seconds=performance.now()/1000.0-g_startTime;
    // console.log(g_seconds);

    // Update Animation Angles
    updatedAnimationAngles();

    if (g_pokeMode) {
        for (let heart of g_heartList) {
          heart.update();
        }
    }

    // Draw everything
    renderAllShapes();

    //Tell the browswer to update again when it has time
    requestAnimationFrame(tick);
}

// Update the angles of everything if currently animated
function updatedAnimationAngles(){
    if (g_armAnimation){
        g_leftarmAngle = (45 * Math.sin(2*g_seconds));
        g_rightarmAngle = (45 * Math.sin(2*g_seconds + Math.PI));  // opposite arm phase
    }
    if (g_legAnimation){
        g_leftlegAngle = (10 * Math.sin(3*g_seconds));
        g_rightlegAngle = (10 * Math.sin(3*g_seconds + Math.PI));  // opposite leg phase
    }
    if (g_feetAnimation){
        g_leftfootAngle = (10 * Math.sin(3*g_seconds));
        g_rightfootAngle = (10 * Math.sin(3*g_seconds + Math.PI));  // opposite feet phase
    }
    if (g_walkAnimation){
        g_leftarmAngle = (55 * Math.sin(3*g_seconds));
        g_rightarmAngle = (55 * Math.sin(3*g_seconds + Math.PI));  // opposite arm phase
        g_leftlegAngle = (10 * Math.sin(3*g_seconds));
        g_rightlegAngle = (10 * Math.sin(3*g_seconds + Math.PI));  // opposite leg phase
        g_leftfootAngle = (10 * Math.sin(3.2*g_seconds));
        g_rightfootAngle = (10 * Math.sin(3.2*g_seconds + Math.PI));  // opposite feet phase
    }
}

function renderAllShapes() {
    if (g_selectedPokemon === 'Squirtle') {
      drawSquirtle();
    } else if (g_selectedPokemon === 'Ditto') {
      drawDitto();
    } else if (g_selectedPokemon === 'Pikachu') {
      drawPikachu();
    }
  }  

// Draw Squirtle
function drawSquirtle() {

    // Check the time at the start of this function
    var startTime = performance.now();

    // Create rotation matrices
    let globalRotationMatrix = new Matrix4();
    globalRotationMatrix.rotate(g_globalAngleY, 0, 1, 0); // Y-axis
    globalRotationMatrix.rotate(g_globalAngleX, 1, 0, 0); // X-axis

    // Pass to shader
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotationMatrix.elements);

    // Pass the matrix to u_ModelMatrix attribute
    // var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
    // gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // gl.clear(gl.COLOR_BUFFER_BIT);

    for (let heart of g_heartList) {
        heart.render();
    }
  
    // Head
    var squirtle_head = new Cube();
    squirtle_head.color = [0.573, 0.863, 0.937, 1];
    squirtle_head.matrix.translate(-0.3, 0, 0);
    squirtle_head.matrix.rotate(-25, 0, 1, 0);
    var squirtle_headMat=new Matrix4(squirtle_head.matrix);
    squirtle_head.matrix.scale(0.5, 0.4, 0.4);
    squirtle_head.render();

    // Left Eye
    var squirtle_lefteye = new Cube();
    squirtle_lefteye.matrix = new Matrix4(squirtle_headMat);
    squirtle_lefteye.color = [1, 1, 1, 1];
    squirtle_lefteye.matrix.translate(0.1, 0.2, -0.01);
    var squirtle_lefteyeMat=new Matrix4(squirtle_lefteye.matrix);
    squirtle_lefteye.matrix.scale(0.12, 0.15, 0.001);
    squirtle_lefteye.render();

    // Left Pupil
    var squirtle_leftpupil = new Cube();
    squirtle_leftpupil.matrix = new Matrix4(squirtle_lefteyeMat);
    squirtle_leftpupil.color = [0, 0, 0, 1];
    squirtle_leftpupil.matrix.translate(0.015, 0, -0.001);
    var squirtle_leftpupilMat=new Matrix4(squirtle_leftpupil.matrix);
    squirtle_leftpupil.matrix.scale(0.09, 0.12, 0.001);
    squirtle_leftpupil.render();

    // Left High Light
    var squirtle_lefthl = new Cube();
    squirtle_lefthl.matrix = new Matrix4(squirtle_leftpupilMat);
    squirtle_lefthl.color = [1, 1, 1, 1];
    squirtle_lefthl.matrix.translate(0.04, 0.07, -0.001);
    squirtle_lefthl.matrix.scale(0.04, 0.04, 0.001);
    squirtle_lefthl.render();

    // Right Eye
    var squirtle_righteye = new Cube();
    squirtle_righteye.matrix = new Matrix4(squirtle_headMat);
    squirtle_righteye.color = [1, 1, 1, 1];
    squirtle_righteye.matrix.translate(0.3, 0.2, -0.01);
    var squirtle_righteyeMat=new Matrix4(squirtle_righteye.matrix);
    squirtle_righteye.matrix.scale(0.12, 0.15, 0.001);
    squirtle_righteye.render();

    // Right Pupil
    var squirtle_rightpupil = new Cube();
    squirtle_rightpupil.matrix = new Matrix4(squirtle_righteyeMat);
    squirtle_rightpupil.color = [0, 0, 0, 1];
    squirtle_rightpupil.matrix.translate(0.015, 0, -0.001);
    var squirtle_rightpupilMat=new Matrix4(squirtle_rightpupil.matrix);
    squirtle_rightpupil.matrix.scale(0.09, 0.12, 0.001);
    squirtle_rightpupil.render();

    // Right High Light
    var squirtle_righthl = new Cube();
    squirtle_righthl.matrix = new Matrix4(squirtle_rightpupilMat);
    squirtle_righthl.color = [1, 1, 1, 1];
    squirtle_righthl.matrix.translate(0.04, 0.07, -0.001);
    squirtle_righthl.matrix.scale(0.04, 0.04, 0.001);
    squirtle_righthl.render();

    // Mouth
    var squirtle_mouth = new Cube();
    squirtle_mouth.matrix = new Matrix4(squirtle_headMat);
    squirtle_mouth.color = [0.573, 0.863, 0.937, 1];
    squirtle_mouth.matrix.translate(0, 0, -0.1);
    var squirtle_mouthMat=new Matrix4(squirtle_mouth.matrix);
    squirtle_mouth.matrix.scale(0.5, 0.2, 0.2);
    squirtle_mouth.render();

    // Mouth, Pink
    var squirtle_mouthp = new Cube();
    squirtle_mouthp.matrix = new Matrix4(squirtle_mouthMat);
    squirtle_mouthp.color = [0.859, 0.541, 0.71, 1];
    squirtle_mouthp.matrix.translate(0.05, 0.05, -0.001);
    squirtle_mouthp.matrix.scale(0.4, 0.1, 0.001);
    squirtle_mouthp.render();

    // Body
    var squirtle_body = new Cube();
    squirtle_body.color = [0.976, 0.910, 0.780, 1];
    squirtle_body.matrix = squirtle_headMat;
    squirtle_body.matrix.translate(0.05, -0.45, 0);
    var squirtle_bodyMat=new Matrix4(squirtle_body.matrix);
    squirtle_body.matrix.scale(0.4, 0.45, 0.26);
    squirtle_body.render();

    // Back, White
    var squirtle_whiteback = new Cube();
    squirtle_whiteback.color = [1, 1, 1, 1];
    squirtle_whiteback.matrix = squirtle_bodyMat;
    squirtle_whiteback.matrix.translate(0, 0, 0.26);
    var squirtle_whitebackMat=new Matrix4(squirtle_whiteback.matrix);
    squirtle_whiteback.matrix.scale(0.4, 0.45, 0.05);
    squirtle_whiteback.render();
    
    // Back, Brown
    var squirtle_brownback = new Cube();
    squirtle_brownback.color = [0.612, 0.502, 0.463, 1];
    squirtle_brownback.matrix = squirtle_whitebackMat;
    squirtle_brownback.matrix.translate(0, 0.05, 0.05);
    var squirtle_brownbackMat=new Matrix4(squirtle_brownback.matrix);
    squirtle_brownback.matrix.scale(0.4, 0.4, 0.2);
    squirtle_brownback.render();

    // left arm
    var squirtle_leftarm = new Cube();
    squirtle_leftarm.color = [0.573, 0.863, 0.937, 1];
    squirtle_leftarm.matrix = new Matrix4(squirtle_brownbackMat);
    squirtle_leftarm.matrix.translate(-0.12, 0.35, -0.25);
    squirtle_leftarm.matrix.rotate(g_leftarmAngle, 1, 0, 0);
    squirtle_leftarm.matrix.translate(0, -0.3, 0);
    squirtle_leftarm.matrix.scale(0.12, 0.3, 0.12);
    squirtle_leftarm.render();

    // left leg
    var squirtle_leftleg = new Cube();
    squirtle_leftleg.color = [0.573, 0.863, 0.937, 1];
    squirtle_leftarm.matrix = new Matrix4(squirtle_brownbackMat);
    squirtle_leftleg.matrix.translate(-0.3, -0.55, 0.03);
    squirtle_leftleg.matrix.rotate(-25, 0, 1, 0);
    squirtle_leftleg.matrix.rotate(g_leftlegAngle, 1, 0, 0);
    var squirtle_leftlegMat=new Matrix4(squirtle_leftleg.matrix);
    squirtle_leftleg.matrix.scale(0.17, 0.15, 0.2);
    // squirtle_leftleg.matrix.translate(-.50, 0, 0);
    squirtle_leftleg.render();

    // left foot
    var squirtle_leftfoot = new Cube();
    squirtle_leftfoot.color = [0.573, 0.863, 0.937, 1];
    squirtle_leftfoot.matrix = new Matrix4(squirtle_leftlegMat);
    squirtle_leftfoot.matrix.translate(0, -0.05, -0.03);
    squirtle_leftfoot.matrix.rotate(g_leftfootAngle, 1, 0, 0);
    squirtle_leftfoot.matrix.scale(0.17, 0.05, 0.23);
    squirtle_leftfoot.render();

    // right arm
    var squirtle_rightarm = new Cube();
    squirtle_rightarm.color = [0.573, 0.863, 0.937, 1];
    squirtle_leftarm.matrix = new Matrix4(squirtle_brownbackMat);
    squirtle_rightarm.matrix.translate(0.1, -0.05, 0.25);
    squirtle_rightarm.matrix.rotate(-25, 0, 1, 0);
    squirtle_rightarm.matrix.rotate(g_rightarmAngle, 1, 0, 0);
    squirtle_rightarm.matrix.translate(0, -0.3, 0); 
    squirtle_rightarm.matrix.scale(0.12, 0.3, 0.12);
    squirtle_rightarm.render();

    // right leg
    var squirtle_rightleg = new Cube();
    squirtle_rightleg.color = [0.573, 0.863, 0.937, 1];
    squirtle_leftarm.matrix = new Matrix4(squirtle_brownbackMat);
    squirtle_rightleg.matrix.translate(0.05, -0.55, 0.2);
    squirtle_rightleg.matrix.rotate(-25, 0, 1, 0);
    squirtle_rightleg.matrix.rotate(g_rightlegAngle, 1, 0, 0);
    var squirtle_rightlegMat=new Matrix4(squirtle_rightleg.matrix);
    squirtle_rightleg.matrix.scale(0.17, 0.15, 0.2);
    squirtle_rightleg.matrix.translate(-.50, 0, 0);
    squirtle_rightleg.render();

    // right foot
    var squirtle_rightfoot = new Cube();
    squirtle_rightfoot.color = [0.573, 0.863, 0.937, 1];
    squirtle_rightfoot.matrix = squirtle_rightlegMat;
    squirtle_rightfoot.matrix.translate(-0.085, -0.05, -0.03);
    squirtle_rightfoot.matrix.rotate(g_rightfootAngle, 1, 0, 0);
    squirtle_rightfoot.matrix.scale(0.17, 0.05, 0.23);
    squirtle_rightfoot.render();
  
    // Check the time at the end of the function, and show on web page
    var duration = performance.now() - startTime;
    sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");  

}

// Draw Pikachu
function drawPikachu() {

    // Check the time at the start of this function
    var startTime = performance.now();

    // Create rotation matrices
    let globalRotationMatrix = new Matrix4();
    globalRotationMatrix.rotate(g_globalAngleY, 0, 1, 0); // Y-axis
    globalRotationMatrix.rotate(g_globalAngleX, 1, 0, 0); // X-axis

    let frontlegAngle = g_leftlegAngle;
    let backlegAngle = g_rightlegAngle;
    let frontfootAngle = g_leftfootAngle;
    let backfootAngle = g_rightfootAngle;
    let earAngle = g_rightarmAngle*2 - g_leftarmAngle;

    // Pass to shader
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotationMatrix.elements);

    // Pass the matrix to u_ModelMatrix attribute
    // var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
    // gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // gl.clear(gl.COLOR_BUFFER_BIT);

    for (let heart of g_heartList) {
        heart.render();
    }
  
    // Body Line 1
    var pikachu_line1 = new Cube();
    pikachu_line1.color = [0.612, 0.502, 0.463, 1];
    pikachu_line1.matrix.translate(-0.301, 0.0505, 0.3);
    pikachu_line1.matrix.rotate(-25, 0, 1, 0);
    var pikachu_line1Mat=new Matrix4(pikachu_line1.matrix);
    pikachu_line1.matrix.scale(0.602, 0.101, 0.1);
    pikachu_line1.render();

    // Body Line 2
    var pikachu_line2 = new Cube();
    pikachu_line2.color = [0.612, 0.502, 0.463, 1];
    pikachu_line2.matrix = new Matrix4(pikachu_line1Mat);
    pikachu_line2.matrix.translate(0, 0, 0.2);
    pikachu_line2.matrix.scale(0.602, 0.101, 0.1);
    pikachu_line2.render();

    // Body
    var pikachu_body = new Cube();
    pikachu_body.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_body.matrix = new Matrix4(pikachu_line1Mat);
    pikachu_body.matrix.translate(0.001, -0.401, -0.3);
    var pikachu_bodyMat=new Matrix4(pikachu_body.matrix);
    pikachu_body.matrix.scale(0.6, 0.5, 0.7);
    pikachu_body.render();

    // left front leg
    var pikachu_leftfleg = new Cube();
    pikachu_leftfleg.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_leftfleg.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_leftfleg.matrix.translate(0.05, -0.1, 0.1);
    pikachu_leftfleg.matrix.rotate(frontlegAngle, 1, 0, 0);
    var pikachu_leftflegMat=new Matrix4(pikachu_leftfleg.matrix);
    pikachu_leftfleg.matrix.scale(0.15, 0.2, 0.15);
    pikachu_leftfleg.render();

    // left front foot
    var pikachu_leftffoot = new Cube();
    pikachu_leftffoot.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_leftffoot.matrix = new Matrix4(pikachu_leftflegMat);
    pikachu_leftffoot.matrix.translate(0, -0.03, -0.02);
    pikachu_leftffoot.matrix.rotate(0, 0, 1, 0);
    pikachu_leftffoot.matrix.rotate(frontfootAngle, 1, 0, 0);
    pikachu_leftffoot.matrix.scale(0.15, 0.03, 0.17);
    pikachu_leftffoot.render();

    // right front leg
    var pikachu_rightfleg = new Cube();
    pikachu_rightfleg.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_rightfleg.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_rightfleg.matrix.translate(0.4, -0.1, 0.1);
    pikachu_rightfleg.matrix.rotate(frontlegAngle, 1, 0, 0);
    var pikachu_rightflegMat=new Matrix4(pikachu_rightfleg.matrix);
    pikachu_rightfleg.matrix.scale(0.15, 0.2, 0.15);
    pikachu_rightfleg.render();

    // right front foot
    var pikachu_rightffoot = new Cube();
    pikachu_rightffoot.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_rightffoot.matrix = new Matrix4(pikachu_rightflegMat);
    pikachu_rightffoot.matrix.translate(0, -0.03, -0.02);
    pikachu_rightffoot.matrix.rotate(0, 0, 1, 0);
    pikachu_rightffoot.matrix.rotate(frontfootAngle, 1, 0, 0);
    pikachu_rightffoot.matrix.scale(0.15, 0.03, 0.17);
    pikachu_rightffoot.render();

    // left back leg
    var pikachu_leftbleg = new Cube();
    pikachu_leftbleg.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_leftbleg.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_leftbleg.matrix.translate(0.05, -0.1, 0.5);
    pikachu_leftbleg.matrix.rotate(backlegAngle, 1, 0, 0);
    var pikachu_leftblegMat=new Matrix4(pikachu_leftbleg.matrix);
    pikachu_leftbleg.matrix.scale(0.15, 0.2, 0.15);
    pikachu_leftbleg.render();

    // left back foot
    var pikachu_leftbfoot = new Cube();
    pikachu_leftbfoot.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_leftbfoot.matrix = new Matrix4(pikachu_leftblegMat);
    pikachu_leftbfoot.matrix.translate(0, -0.03, -0.02);
    pikachu_leftbfoot.matrix.rotate(0, 0, 1, 0);
    pikachu_leftbfoot.matrix.rotate(backfootAngle, 1, 0, 0);
    pikachu_leftbfoot.matrix.scale(0.15, 0.03, 0.17);
    pikachu_leftbfoot.render();

    // right back leg
    var pikachu_rightbleg = new Cube();
    pikachu_rightbleg.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_rightbleg.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_rightbleg.matrix.translate(0.4, -0.1, 0.5);
    pikachu_rightbleg.matrix.rotate(backlegAngle, 1, 0, 0);
    var pikachu_rightblegMat=new Matrix4(pikachu_rightbleg.matrix);
    pikachu_rightbleg.matrix.scale(0.15, 0.2, 0.15);
    pikachu_rightbleg.render();

    // right back foot
    var pikachu_rightbfoot = new Cube();
    pikachu_rightbfoot.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_rightbfoot.matrix = new Matrix4(pikachu_rightblegMat);
    pikachu_rightbfoot.matrix.translate(0, -0.03, -0.02);
    pikachu_rightbfoot.matrix.rotate(0, 0, 1, 0);
    pikachu_rightbfoot.matrix.rotate(backfootAngle, 1, 0, 0);
    pikachu_rightbfoot.matrix.scale(0.15, 0.03, 0.17);
    pikachu_rightbfoot.render();

    // Left Eye
    var pikachu_lefteye = new Cube();
    pikachu_lefteye.color = [0, 0, 0, 1];
    pikachu_lefteye.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_lefteye.matrix.translate(0.1, 0.2, -0.01);
    pikachu_lefteye.matrix.rotate(0, 0, 1, 0);
    var pikachu_lefteyeMat=new Matrix4(pikachu_lefteye.matrix);
    pikachu_lefteye.matrix.scale(0.1, 0.12, 0.001);
    pikachu_lefteye.render();

    // Left High Light
    var pikachu_lefthl = new Cube();
    pikachu_lefthl.matrix = new Matrix4(pikachu_lefteyeMat);
    pikachu_lefthl.color = [1, 1, 1, 1];
    pikachu_lefthl.matrix.translate(0.04, 0.07, -0.001);
    pikachu_lefthl.matrix.rotate(0, 0, 1, 0);
    pikachu_lefthl.matrix.scale(0.04, 0.04, 0.001);
    pikachu_lefthl.render();

    // Right Eye
    var pikachu_righteye = new Cube();
    pikachu_righteye.color = [0, 0, 0, 1];
    pikachu_righteye.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_righteye.matrix.translate(0.4, 0.2, -0.01);
    pikachu_righteye.matrix.rotate(0, 0, 1, 0);
    var pikachu_righteyeMat=new Matrix4(pikachu_righteye.matrix);
    pikachu_righteye.matrix.scale(0.1, 0.12, 0.001);
    pikachu_righteye.render();

    // Right High Light
    var pikachu_righthl = new Cube();
    pikachu_righthl.matrix = new Matrix4(pikachu_righteyeMat);
    pikachu_righthl.color = [1, 1, 1, 1];
    pikachu_righthl.matrix.translate(0.04, 0.07, -0.001);
    pikachu_righthl.matrix.scale(0.04, 0.04, 0.001);
    pikachu_righthl.render();

    // Nose
    var pikachu_nose = new Cube();
    pikachu_nose.color = [0, 0, 0, 1];
    pikachu_nose.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_nose.matrix.translate(0.275, 0.27, -0.001);
    pikachu_nose.matrix.scale(0.04, 0.04, 0.001);
    pikachu_nose.render();

    // Mouth
    var pikachu_mouth = new Cube();
    pikachu_mouth.color = [0, 0, 0, 1];
    pikachu_mouth.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_mouth.matrix.translate(0.22, 0.25, -0.001);
    pikachu_mouth.matrix.scale(0.16, 0.01, 0.001);
    pikachu_mouth.render();

    // Left Ear
    var pikachu_leftear = new Cube();
    pikachu_leftear.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_leftear.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_leftear.matrix.translate(0.1, 0.4, 0.1);
    pikachu_leftear.matrix.rotate(0.5*earAngle, 0, 0, 1);
    var pikachu_leftearMat=new Matrix4(pikachu_leftear.matrix);
    pikachu_leftear.matrix.scale(0.12, 0.25, 0.12);
    pikachu_leftear.render();

    // Left Ear, brown
    var pikachu_leftearbrown = new Cube();
    pikachu_leftearbrown.color = [0.612, 0.502, 0.463, 1];
    pikachu_leftearbrown.matrix = new Matrix4(pikachu_leftearMat);
    pikachu_leftearbrown.matrix.translate(0, 0.25, 0);
    pikachu_leftearbrown.matrix.scale(0.12, 0.1, 0.12);
    pikachu_leftearbrown.render();

    // Right Ear
    var pikachu_rightear = new Cube();
    pikachu_rightear.color = [0.969, 0.890, 0.478, 1.0];
    pikachu_rightear.matrix = new Matrix4(pikachu_bodyMat);
    pikachu_rightear.matrix.translate(0.38, 0.4, 0.1);
    pikachu_rightear.matrix.rotate(0.5*earAngle, 0, 0, 1);
    var pikachu_rightearMat=new Matrix4(pikachu_rightear.matrix);
    pikachu_rightear.matrix.scale(0.12, 0.25, 0.12);
    pikachu_rightear.render();

    // Right Ear, brown
    var pikachu_rightearbrown = new Cube();
    pikachu_rightearbrown.color = [0.612, 0.502, 0.463, 1];
    pikachu_rightearbrown.matrix = new Matrix4(pikachu_rightearMat);
    pikachu_rightearbrown.matrix.translate(0, 0.25, 0);
    pikachu_rightearbrown.matrix.scale(0.12, 0.1, 0.12);
    pikachu_rightearbrown.render();


    // Check the time at the end of the function, and show on web page
    var duration = performance.now() - startTime;
    sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");  

}

// Draw Ditto
function drawDitto() {

    // Check the time at the start of this function
    var startTime = performance.now();

    // Create rotation matrices
    let globalRotationMatrix = new Matrix4();
    globalRotationMatrix.rotate(g_globalAngleY, 0, 1, 0); // Y-axis
    globalRotationMatrix.rotate(g_globalAngleX, 1, 0, 0); // X-axis

    let armrotate = g_leftarmAngle*2 - g_rightarmAngle;
    let baserotate = g_leftfootAngle*2 - g_rightfootAngle;

    // Pass to shader
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotationMatrix.elements);

    // Pass the matrix to u_ModelMatrix attribute
    // var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
    // gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // gl.clear(gl.COLOR_BUFFER_BIT);

    for (let heart of g_heartList) {
        heart.render();
    }
  
    // Body
    var ditto_body = new Cube();
    ditto_body.color = [0.878, 0.792, 0.929, 1.0];
    ditto_body.matrix.translate(-0.3, -0.4, 0);
    ditto_body.matrix.rotate(-25, 0, 1, 0);
    var ditto_bodyMat=new Matrix4(ditto_body.matrix);
    ditto_body.matrix.scale(0.6, 0.5, 0.3);
    ditto_body.render();

    // Left Ear
    var ditto_lefteye = new Cube();
    ditto_lefteye.color = [0.878, 0.792, 0.929, 1.0];
    ditto_lefteye.matrix.translate(-0.25, 0.1, 0.05);
    ditto_lefteye.matrix.rotate(-25, 0, 1, 0);
    ditto_lefteye.matrix.rotate(0.05*armrotate, 1, 0, 0);
    ditto_lefteye.matrix.scale(0.2, 0.1, 0.25);
    ditto_lefteye.render();

    // Right Ear
    var ditto_righteye = new Cube();
    ditto_righteye.color = [0.878, 0.792, 0.929, 1.0];
    ditto_righteye.matrix.translate(0, 0.1, 0.17);
    ditto_righteye.matrix.rotate(-25, 0, 1, 0);
    ditto_righteye.matrix.rotate(0.05*armrotate, 1, 0, 0);
    ditto_righteye.matrix.scale(0.2, 0.1, 0.25);
    ditto_righteye.render();

    // Left Eye
    var ditto_lefteye = new Cube();
    ditto_lefteye.color = [0, 0, 0, 1];
    ditto_lefteye.matrix.translate(-0.135, 0, 0.065);
    ditto_lefteye.matrix.rotate(-25, 0, 1, 0);
    ditto_lefteye.matrix.scale(0.02, 0.02, 0.001);
    ditto_lefteye.render();

    // Right Eye
    var ditto_righteye = new Cube();
    ditto_righteye.color = [0, 0, 0, 1];
    ditto_righteye.matrix.translate(0.1, 0, 0.175);
    ditto_righteye.matrix.rotate(-25, 0, 1, 0);
    ditto_righteye.matrix.scale(0.02, 0.02, 0.001);
    ditto_righteye.render();

    // Mouth
    var ditto_mouth = new Cube();
    ditto_mouth.color = [0.859, 0.541, 0.71, 1];
    ditto_mouth.matrix.translate(-0.07, 0, 0.09);
    ditto_mouth.matrix.rotate(-25, 0, 1, 0);
    ditto_mouth.matrix.scale(0.15, 0.01, 0.001);
    ditto_mouth.render();

    // left arm
    var ditto_leftarm = new Cube();
    ditto_leftarm.color = [0.878, 0.792, 0.929, 1.0];
    ditto_leftarm.matrix = new Matrix4(ditto_bodyMat);
    ditto_leftarm.matrix.translate(-0.1, 0.4, 0.05);
    ditto_leftarm.matrix.rotate(0.25*g_leftlegAngle, 0, 1, 0);
    ditto_leftarm.matrix.translate(0, -0.3, 0);
    ditto_leftarm.matrix.scale(0.15, 0.25, 0.2);
    ditto_leftarm.render();

    // right arm
    var ditto_rightarm = new Cube();
    ditto_rightarm.color = [0.878, 0.792, 0.929, 1.0];
    ditto_rightarm.matrix = new Matrix4(ditto_bodyMat);
    ditto_rightarm.matrix.translate(0.6, 0.4, 0.05);
    ditto_rightarm.matrix.rotate(0.25*g_rightlegAngle, 0, 1, 0);
    ditto_rightarm.matrix.translate(0, -0.3, 0); 
    ditto_rightarm.matrix.scale(0.12, 0.3, 0.12);
    ditto_rightarm.render();

    // Base
    var ditto_base = new Cube();
    ditto_base.color = [0.878, 0.792, 0.929, 1.0];
    ditto_base.matrix = new Matrix4(ditto_bodyMat);
    ditto_base.matrix.translate(0.3, -0.2, -0.25);
    ditto_base.matrix.rotate(0.3*baserotate, 0, 1, 0);
    ditto_base.matrix.scale(0.8, 0.2, 0.4);
    ditto_base.matrix.translate(-0.5, 0, 0.5);
    ditto_base.render();

    // Check the time at the end of the function, and show on web page
    var duration = performance.now() - startTime;
    sendTextToHTML("ms: " + Math.floor(duration) + " fps: " + Math.floor(10000/duration)/10, "numdot");  

}

var g_shapeList = [];

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = [];  // The array to store the size of a point

function click(ev) {
    let [x, y] = convertCoordinatesEventToGL(ev);

    if (ev.shiftKey) {
        g_pokeMode = true;
        // Create multiple hearts
        for (let i = 0; i < 10; i++) {
        g_heartList.push(new Heart(x, y));
        }
    } else {
        g_pokeMode = false;

        // Normal click behavior
        let point;
        if (g_selectedType == POINT) {
        point = new Point();
        } else if (g_selectedType == TRIANGLE) {
        point = new Triangle();
        } else {
        point = new Circle();
        point.segments = g_selectedSegments;
        }
        point.position = [x, y];
        point.color = g_selectedColor.slice();
        point.size = g_selectedSize;
        g_shapeList.push(point);
    }

renderAllShapes();
}  

// Extract the event click and return it in WebGL coordinates
function convertCoordinatesEventToGL(ev) { 
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y]);
}


// Set the text of a HTML element
function sendTextToHTML(text, htmlID){
  var htmlElm = document.getElementById(htmlID);
  if (!htmlElm) {
    console.log("Failed to get " + htmlID + "from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}