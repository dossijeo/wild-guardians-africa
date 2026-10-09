import test from 'node:test';
import assert from 'node:assert/strict';
import { LoadingOrbit } from '../src/rendering/loading-orbit.js';

const near = (a, b, epsilon = 1e-10) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
const advance = (orbit, seconds, hz = 60) => {
  for (let i = 0; i < Math.round(seconds * hz); i++) orbit.step(1 / hz);
};

test('orbit oscillates within ten degrees with a twenty second cycle', () => {
  const orbit = new LoadingOrbit();
  advance(orbit, 5);
  near(orbit.angle, Math.PI / 18);
  advance(orbit, 10);
  near(orbit.angle, -Math.PI / 18);
  advance(orbit, 5);
  near(orbit.angle, 0);
  for (let i = 0; i < 3000; i++) assert.ok(Math.abs(orbit.step(.05)) <= Math.PI / 18);
});

test('pointer hold freezes the exact pose; idle and smooth resume retain its phase', () => {
  const orbit = new LoadingOrbit();
  advance(orbit, 2);
  const pose = orbit.angle;
  orbit.beginInteraction();
  advance(orbit, 10);
  assert.equal(orbit.angle, pose);
  orbit.endInteraction();
  advance(orbit, 1);
  assert.equal(orbit.angle, pose);
  advance(orbit, .5);
  near(orbit.angle, pose);
  orbit.step(.05);
  assert.ok(orbit.speed > 0 && orbit.speed < .1);
  assert.ok(orbit.angle > pose);
  advance(orbit, 1);
  assert.equal(orbit.speed, 1);
});

test('resume integration is independent of frame subdivision', () => {
  const a = new LoadingOrbit(), b = new LoadingOrbit();
  for (const orbit of [a, b]) { orbit.beginInteraction(); orbit.endInteraction(); }
  advance(a, 4, 30);
  advance(b, 4, 120);
  near(a.phase, b.phase);
});

test('cinematic stop decelerates from the current pose without recentering', () => {
  const orbit = new LoadingOrbit();
  advance(orbit, 2);
  const before = orbit.angle;
  orbit.stop();
  assert.equal(orbit.angle, before);
  orbit.step(.05);
  assert.ok(orbit.speed > 0 && orbit.speed < 1);
  advance(orbit, 1);
  assert.equal(orbit.settled, true);
  const final = orbit.angle;
  assert.ok(final > before);
  orbit.beginInteraction(); orbit.endInteraction(); orbit.stop();
  advance(orbit, 5);
  assert.equal(orbit.angle, final);
});

test('reduced motion is static and toggling it preserves the current pose', () => {
  const initial = new LoadingOrbit({ reducedMotion: true });
  advance(initial, 10);
  assert.equal(initial.angle, 0);
  const orbit = new LoadingOrbit();
  advance(orbit, 2);
  const pose = orbit.angle;
  orbit.setReducedMotion(true);
  advance(orbit, 10);
  assert.equal(orbit.angle, pose);
  orbit.setReducedMotion(false);
  assert.equal(orbit.angle, pose);
  advance(orbit, 3);
  assert.ok(orbit.angle > pose);
});

test('a long main-thread stall cannot cause an orbit jump', () => {
  const a = new LoadingOrbit(), b = new LoadingOrbit();
  a.step(10); b.step(.1);
  assert.equal(a.angle, b.angle);
  assert.throws(() => a.step(NaN), RangeError);
  assert.throws(() => a.step(-1), RangeError);
  assert.throws(() => new LoadingOrbit({ periodSeconds: 0 }), RangeError);
});

test('stopping while interaction is held freezes immediately', () => {
  const orbit = new LoadingOrbit();
  advance(orbit, 2);
  orbit.beginInteraction(); orbit.stop(); orbit.endInteraction();
  const pose = orbit.angle;
  advance(orbit, 10);
  assert.equal(orbit.settled, true);
  assert.equal(orbit.angle, pose);
});
