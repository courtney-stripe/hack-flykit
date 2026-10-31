const test = require('node:test');
const assert = require('node:assert');
const { buildPlan, KITS } = require('../lib/engine.js');

function state(over) {
  const kit = {};
  KITS.forEach((k) => { kit[k.k] = { on: true, text: k.text, qty: '' }; });
  return Object.assign({
    from: 'America/Denver', to: 'Europe/Amsterdam', retFrom: 'Europe/Zurich',
    dep: '2026-11-01T15:40', hours: 12.25, nights: 20, retTime: '09:10', retHours: 14,
    bedM: 23 * 60, kit, checks: {}
  }, over || {});
}

test('Denver to Amsterdam is an 8 hour eastward shift', () => {
  const p = buildPlan(state());
  assert.strictEqual(p.info.shift, 8);
  assert.strictEqual(p.info.east, true);
  assert.strictEqual(p.info.adj, 5);
});

test('plane sleep step exists eastbound only', () => {
  const p = buildPlan(state());
  const out = p.events.filter((e) => e.grp.key === 'out-air' && e.kind === 'mellow');
  const ret = p.events.filter((e) => e.grp.key === 'ret-air' && e.kind === 'mellow');
  assert.strictEqual(out.length, 1);
  assert.strictEqual(ret.length, 0);
});

test('melatonin on the ground only for the first three nights', () => {
  const p = buildPlan(state());
  const nights = p.events.filter((e) => e.kind === 'mellow' && /^out-d/.test(e.grp.key));
  assert.strictEqual(nights.length, 3);
});

test('same-zone trip returns no events', () => {
  const p = buildPlan(state({ to: 'America/Denver', retFrom: 'America/Denver' }));
  assert.strictEqual(p.events.length, 0);
});

test('events are sorted by time', () => {
  const p = buildPlan(state());
  for (let i = 1; i < p.events.length; i++) assert.ok(p.events[i].t >= p.events[i - 1].t);
});
