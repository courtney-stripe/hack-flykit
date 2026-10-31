// @ts-ignore engine is plain JS
import * as E from './engine.js';

export const ZONES: { id: string; city: string; code: string }[] = (E as any).ZONES || [];
export const KITS: { k: string; name: string; text: string; sub: string }[] = (E as any).KITS;

export type KitState = Record<string, { on: boolean; text: string; qty: string | number }>;
export type Trip = {
  from: string; to: string; retFrom: string; dep: string; hours: number; nights: number;
  retTime: string; retHours: number; bedM: number; kit: KitState; checks: Record<string, number>;
};

export const CAT: Record<string, { name: string; v: string }> = {
  mellow: { name: 'Sleep', v: '--c-sleep' }, glasses: { name: 'Sleep', v: '--c-sleep' }, caffeine: { name: 'Sleep', v: '--c-sleep' },
  protect: { name: 'Supplement', v: '--c-supp' }, sustain: { name: 'Supplement', v: '--c-supp' }, reset: { name: 'Supplement', v: '--c-supp' },
  water: { name: 'Fluids', v: '--c-fluid' }, light: { name: 'Light', v: '--c-light' },
  socks: { name: 'Comfort', v: '--c-comfort' }, coffee: { name: 'Comfort', v: '--c-comfort' },
};

export function defaults(): Trip {
  const kit: KitState = {};
  KITS.forEach((k) => (kit[k.k] = { on: true, text: k.text, qty: '' }));
  return {
    from: 'America/Denver', to: 'Europe/Amsterdam', retFrom: 'Europe/Zurich',
    dep: '2026-11-01T15:40', hours: 12.25, nights: 20, retTime: '09:10', retHours: 14,
    bedM: 23 * 60, kit, checks: {},
  };
}

const KEY = 'body-clock-kit-v7';
export function load(): Trip {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    const kit = { ...d.kit };
    Object.keys(s.kit || {}).forEach((k) => { if (kit[k]) kit[k] = { ...kit[k], ...s.kit[k] }; });
    return { ...d, ...s, kit, checks: s.checks || {} };
  } catch { return d; }
}
export function save(t: Trip) { try { localStorage.setItem(KEY, JSON.stringify(t)); } catch {} }

export function plan(t: Trip) { return (E as any).buildPlan(t); }
export const fmtT: (z: string, ms: number) => string = (E as any).fmtT;
export const fmtD: (z: string, ms: number) => string = (E as any).fmtD;
const localToUTC: (z: string, y: number, mo: number, d: number, h: number, mi: number) => number = (E as any).localToUTC;

export function ymd(zone: string, ms: number) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
  return p; // YYYY-MM-DD
}
export function dayWindow(zone: string, ms: number): [number, number] {
  const [y, m, d] = ymd(zone, ms).split('-').map(Number);
  return [localToUTC(zone, y, m, d, 0, 0), localToUTC(zone, y, m, d + 1, 0, 0)];
}
// Where the traveler is at a moment, from the itinerary and not the phone's time zone.
export function whereAmI(t: Trip, p: any, now: number): string {
  if (!p || !p.info) return t.from;
  if (now < p.info.land) return t.from;
  if (p.ret && now < p.ret) return t.to;
  return t.retFrom || t.to;
}

export function toICS(events: any[], tripName = 'Body Clock Kit') {
  const z = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Body Clock Kit//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + esc(tripName)];
  events.forEach((e) => {
    L.push('BEGIN:VEVENT', 'UID:' + e.id + '@body-clock-kit', 'DTSTAMP:' + z(Date.now()), 'DTSTART:' + z(e.t), 'DURATION:PT15M',
      'SUMMARY:' + esc(e.title), 'DESCRIPTION:' + esc(e.text || ''),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(e.title), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
