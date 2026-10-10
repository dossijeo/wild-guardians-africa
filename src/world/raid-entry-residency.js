// Finite sparse residency demand; never fills the expanded active rectangle.
export function raidEntryChunks(entry, radii) {
  const keys = new Set();
  if (!entry) return keys;
  for (let i = 0; i < radii.length; i++) {
    const radius = radii[i] + 1;
    for (const point of [entry.entries[i], entry.exits[i]]) {
      for (let z = Math.floor((point.z - radius + 24) / 48); z <= Math.floor((point.z + radius + 24) / 48); z++) {
        for (let x = Math.floor((point.x - radius + 24) / 48); x <= Math.floor((point.x + radius + 24) / 48); x++) keys.add(`${x},${z}`);
      }
    }
  }
  return keys;
}
export function raidResidentDemand(state, nav) {
  const keys = new Set(), pending = nav.raidEntryDemand ?? nav.pendingRaidEntry;
  const add = (entry, radii) => { for (const key of raidEntryChunks(entry, radii)) keys.add(key); };
  if (pending) add(pending.entry, pending.radii);
  for (const actor of state.raid?.animals ?? []) {
    if (actor.status === 'gone') continue;
    add({entries: [actor], exits: [actor.exit ?? actor.spawn]}, [actor.radius]);
    if (actor.path?.length) {
      const point = actor.path[0], length = Math.hypot(point.x - actor.x, point.z - actor.z);
      const t = length ? Math.min(1, 4 / length) : 0;
      const next = {x: actor.x + (point.x - actor.x) * t, z: actor.z + (point.z - actor.z) * t};
      add({entries: [actor], exits: [next]}, [actor.radius]);
    }
  }
  return keys;
}
export function includeRaidBounds(bounds, keys) {
  const result = [...bounds];
  for (const key of keys) {
    const [x, z] = key.split(',').map(Number);
    result[0] = Math.min(result[0], x * 48 - 24); result[1] = Math.min(result[1], z * 48 - 24);
    result[2] = Math.max(result[2], x * 48 + 24); result[3] = Math.max(result[3], z * 48 + 24);
  }
  return result;
}
