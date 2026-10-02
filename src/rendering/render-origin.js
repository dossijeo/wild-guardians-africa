// Bioma Lab V4.0: recenter only beyond 144 units, on its 48-unit grid.
// Simulation/navigation coordinates remain global JavaScript numbers.
export class RenderOrigin {
  x = 0;
  z = 0;
  revision = 0;
  update(target) {
    if (Math.abs(target.x-this.x)<=144 && Math.abs(target.z-this.z)<=144) return false;
    this.x=Math.round(target.x/48)*48;
    this.z=Math.round(target.z/48)*48;
    this.revision++;
    return true;
  }
}
