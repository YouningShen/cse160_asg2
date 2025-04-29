class Heart {
  constructor(x, y) {
    this.position = [x, y, 0.0]; // Now a 3D position (x, y, z)
    this.color = [0.9, 0.3, 0.6, 1]; // Pink color
    this.size = 0.5; 
    this.ySpeed = 0.01 + Math.random() * 0.03; // Upward speed
    this.xDrift = (Math.random() - 0.5) * 0.02; // Small sideways drift
    this.zDrift = (Math.random() - 0.5) * 0.02; // Small depth drift
  }

  update() {
    this.position[0] += this.xDrift; // Move sideways
    this.position[1] += this.ySpeed; // Move upward
    this.position[2] += this.zDrift; // Move in/out of screen
  }

  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

    let x = this.position[0];
    let y = this.position[1];
    let z = this.position[2];
    let d = this.size;

    let segments = 20;  // number of triangles for roundness
    let angleStep = 180 / segments;

    // Draw left half-circle (top left of heart)
    for (let angle = 0; angle < 180; angle += angleStep) {
      let angle1 = angle * Math.PI / 180;
      let angle2 = (angle + angleStep) * Math.PI / 180;

      let centerX = x - d/2;
      let centerY = y;
      let centerZ = z;

      let p1 = [centerX, centerY, centerZ];
      let p2 = [
        centerX + Math.cos(angle1) * d/2,
        centerY + Math.sin(angle1) * d/2,
        centerZ
      ];
      let p3 = [
        centerX + Math.cos(angle2) * d/2,
        centerY + Math.sin(angle2) * d/2,
        centerZ
      ];

      drawTriangle3D([...p1, ...p2, ...p3]);
    }

    // Draw right half-circle (top right of heart)
    for (let angle = 0; angle < 180; angle += angleStep) {
      let angle1 = angle * Math.PI / 180;
      let angle2 = (angle + angleStep) * Math.PI / 180;

      let centerX = x + d/2;
      let centerY = y;
      let centerZ = z;

      let p1 = [centerX, centerY, centerZ];
      let p2 = [
        centerX + Math.cos(angle1) * d/2,
        centerY + Math.sin(angle1) * d/2,
        centerZ
      ];
      let p3 = [
        centerX + Math.cos(angle2) * d/2,
        centerY + Math.sin(angle2) * d/2,
        centerZ
      ];

      drawTriangle3D([...p1, ...p2, ...p3]);
    }

    // Draw bottom triangle (the pointy tip)
    drawTriangle3D([
      x - d, y, z,
      x + d, y, z,
      x, y - d * 1.4, z
    ]);
  }
}
