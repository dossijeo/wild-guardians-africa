// Bounded, incremental ownership for static material render targets.
// No scene scan or timer: owners request work on invalidation and call step once
// per frame. Existing published data remains valid until its replacement is ready.
export class MaterialBakeQueue {
  constructor({budgetBytes, reservedBytes = 0}) {
    if (!Number.isSafeInteger(budgetBytes) || !Number.isSafeInteger(reservedBytes) || reservedBytes < 0 || budgetBytes < reservedBytes) throw Error('Invalid material cache budget');
    this.budgetBytes = budgetBytes;
    this.reservedBytes = reservedBytes;
    this.entries = new Map();
    this.pending = new Map();
    this.retired = new Map();
    this.closed = false;
    this.stats = {bytes: reservedBytes, peakBytes: reservedBytes, tiles: 0, published: 0, cancelled: 0, rejected: 0};
  }
  request(key, spec) {
    if (this.closed) throw Error('Material bake queue is closed');
    if (spec.version === undefined) throw Error('Missing material revision');
    if (!Number.isSafeInteger(spec.bytes) || spec.bytes <= 0 || !Number.isInteger(spec.tiles) || spec.tiles < 1) throw Error('Invalid material bake request');
    for (const name of ['create', 'draw', 'publish', 'destroy']) if (typeof spec[name] !== 'function') throw Error('Missing bake callback: ' + name);
    const current = this.entries.get(key), pending = this.pending.get(key);
    if (pending?.spec.version === spec.version || (!pending && current?.spec.version === spec.version)) return 'unchanged';
    if (this.retired.has(key)) return 'transition';
    // Reserve the full target, including mips, before allocation. Never evict a
    // published target merely to admit its replacement: the owner chooses fallback.
    const reclaim = pending?.spec.bytes ?? 0;
    if (this.stats.bytes - reclaim + spec.bytes > this.budgetBytes) { this.cancel(key); this.stats.rejected++; return 'budget'; }
    this.cancel(key);
    this.pending.set(key, {spec, target: null, tile: 0});
    this.stats.bytes += spec.bytes;
    this.stats.peakBytes = Math.max(this.stats.peakBytes, this.stats.bytes);
    return 'queued';
  }
  cancel(key) {
    const job = this.pending.get(key);
    if (!job) return false;
    this.pending.delete(key);
    this.stats.bytes -= job.spec.bytes;
    if (job.target) job.spec.destroy(job.target);
    this.stats.cancelled++;
    return true;
  }
  step() {
    if (this.closed) return false;
    const next = this.pending.entries().next();
    if (next.done) return false;
    const [key, job] = next.value;
    try {
      job.target ??= job.spec.create();
      job.spec.draw(job.target, job.tile, job.spec.tiles);
      this.stats.tiles++;
      if (this.pending.get(key) !== job) return true; // Owner invalidated during the draw.
      job.tile++;
      if (job.tile === job.spec.tiles) {
        const previous = this.entries.get(key);
        job.spec.publish(job.target, previous?.target ?? null);
        this.pending.delete(key);
        this.entries.set(key, job);
        this.stats.published++;
        if (previous) {
          if (job.spec.retainPrevious) this.retired.set(key, previous);
          else { this.stats.bytes -= previous.spec.bytes; previous.spec.destroy(previous.target); }
        }
      }
      return true;
    } catch (error) { this.cancel(key); throw error; }
  }
  releasePrevious(key) {
    const entry = this.retired.get(key);
    if (!entry) return false;
    this.retired.delete(key); this.stats.bytes -= entry.spec.bytes; entry.spec.destroy(entry.target);
    return true;
  }
  remove(key) {
    this.cancel(key);
    this.releasePrevious(key);
    const entry = this.entries.get(key);
    if (entry) { this.entries.delete(key); this.stats.bytes -= entry.spec.bytes; entry.spec.destroy(entry.target); }
  }
  dispose() {
    if (this.closed) return;
    for (const key of [...this.pending.keys()]) this.cancel(key);
    for (const key of [...this.entries.keys()]) this.remove(key);
    this.closed = true;
  }
}
