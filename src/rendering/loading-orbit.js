const TAU = Math.PI * 2;
const integral = u => u * u * u - .5 * u * u * u * u;
const smooth = u => u * u * (3 - 2 * u);

/** Scalar camera motion only: no renderer, allocations per frame or simulation clock. */
export class LoadingOrbit {
  constructor({ amplitudeDegrees = 10, periodSeconds = 20, idleSeconds = 1.5,
    resumeSeconds = .7, stopSeconds = .35, maxStepSeconds = .1,
    reducedMotion = false } = {}) {
    for (const [name, value] of Object.entries({ amplitudeDegrees, periodSeconds,
      idleSeconds, resumeSeconds, stopSeconds, maxStepSeconds })) {
      if (!Number.isFinite(value) || value < 0 ||
        (value === 0 && !['amplitudeDegrees', 'idleSeconds'].includes(name))) {
        throw new RangeError(`Invalid orbit ${name}`);
      }
    }
    this.amplitude = amplitudeDegrees * Math.PI / 180;
    this.frequency = TAU / periodSeconds;
    this.idleSeconds = idleSeconds;
    this.resumeSeconds = resumeSeconds;
    this.stopSeconds = stopSeconds;
    this.maxStepSeconds = maxStepSeconds;
    this.phase = 0;
    this.speed = reducedMotion ? 0 : 1;
    this.reducedMotion = Boolean(reducedMotion);
    this.held = false;
    this.stopping = false;
    this.quiet = 0;
    this.rampDuration = 0;
    this.rampElapsed = 0;
    this.rampFrom = 0;
    this.rampTo = 0;
  }

  get angle() { return this.amplitude * Math.sin(this.phase); }
  get settled() { return this.reducedMotion || (this.stopping && this.speed === 0); }

  beginInteraction() {
    if (this.stopping) return;
    this.held = true;
    this.speed = 0;
    this.rampDuration = 0;
    this.quiet = 0;
  }

  endInteraction() {
    if (!this.held) return;
    this.held = false;
    this.quiet = this.idleSeconds;
  }

  ramp(to, duration) {
    this.rampFrom = this.speed;
    this.rampTo = to;
    this.rampDuration = duration;
    this.rampElapsed = 0;
  }

  stop() {
    if (this.stopping) return;
    this.stopping = true;
    this.quiet = 0;
    this.held = false;
    if (this.speed > 0) this.ramp(0, this.stopSeconds);
    else this.rampDuration = 0;
  }

  setReducedMotion(value) {
    value = Boolean(value);
    if (value === this.reducedMotion) return;
    this.reducedMotion = value;
    this.speed = 0;
    this.rampDuration = 0;
    this.quiet = value ? 0 : this.idleSeconds;
  }

  step(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Invalid orbit delta');
    let remaining = Math.min(dt, this.maxStepSeconds);
    if (this.held || this.reducedMotion || this.settled) return this.angle;
    while (remaining > 0) {
      if (this.quiet > 0) {
        const wait = Math.min(remaining, this.quiet);
        this.quiet -= wait;
        remaining -= wait;
        if (!remaining) break;
      }
      if (!this.rampDuration && this.speed === 0 && !this.stopping) {
        this.ramp(1, this.resumeSeconds);
      }
      let elapsed = remaining;
      if (this.rampDuration) {
        const duration = this.rampDuration;
        const slice = Math.min(remaining, duration - this.rampElapsed);
        const u0 = this.rampElapsed / duration;
        this.rampElapsed += slice;
        const u1 = Math.min(1, this.rampElapsed / duration);
        elapsed = this.rampFrom * slice + (this.rampTo - this.rampFrom) *
          duration * (integral(u1) - integral(u0));
        this.speed = this.rampFrom + (this.rampTo - this.rampFrom) * smooth(u1);
        remaining -= slice;
        if (u1 === 1) {
          this.speed = this.rampTo;
          this.rampDuration = 0;
        }
      } else remaining = 0;
      this.phase = (this.phase + this.frequency * elapsed) % TAU;
    }
    return this.angle;
  }
}
