'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CAT, KITS, ZONES, Trip, defaults, dayWindow, fmtD, fmtT, load, plan, save, toICS, whereAmI } from '../lib/trip';

type View = 'today' | 'plan' | 'kit' | 'trip';
const hourIn = (z: string, ms: number) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: z, hour: '2-digit', hourCycle: 'h23' }).format(ms));
const zc = (id: string) => ZONES.find((z) => z.id === id) || { id, city: id.split('/').pop() || id, code: id.slice(-3).toUpperCase() };
const catOf = (k: string) => CAT[k] || { name: 'Step', v: '--dot' };
const dotC = (k: string) => `var(${catOf(k).v})`;

function until(ms: number) {
  const m = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d >= 1) return `${d} day${d > 1 ? 's' : ''}${h ? ` ${h} h` : ''}`;
  if (h >= 1) return `${h} h${mm ? ` ${mm} min` : ''}`;
  return `${mm} min`;
}

function usePullRefresh(sheet: { current: HTMLDivElement | null }, label: { current: HTMLDivElement | null }) {
  useEffect(() => {
    let startY = 0, startX = 0, dy = 0, active = false, armed = false;
    const shift = (y: number, drag: boolean, arm: boolean) => {
      const node = sheet.current;
      const hint = label.current;
      if (node) {
        node.style.transform = y ? `translateY(${y}px)` : '';
        node.classList.toggle('drag', drag);
      }
      if (hint) {
        hint.classList.toggle('show', drag);
        hint.classList.toggle('armed', arm);
        if (arm !== armed) hint.textContent = arm ? 'Release to refresh' : 'Pull to refresh';
      }
      armed = arm;
    };
    const start = (e: TouchEvent) => {
      if (window.scrollY > 0 || e.touches.length !== 1) return;
      const tgt = e.target as HTMLElement;
      if (tgt.closest('input, textarea, select, .tabs')) return;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      dy = 0;
      active = true;
    };
    const move = (e: TouchEvent) => {
      if (!active) return;
      const y = e.touches[0].clientY - startY;
      const x = e.touches[0].clientX - startX;
      if (y < 8 || window.scrollY > 0) { dy = 0; shift(0, false, false); if (y < 8) return; active = false; return; }
      if (Math.abs(x) > y) { active = false; dy = 0; shift(0, false, false); return; }
      dy = y;
      if (e.cancelable) e.preventDefault();
      shift(Math.min(y * 0.45, 84), true, y > 96);
    };
    const end = () => {
      if (!active) return;
      active = false;
      if (dy > 96) { location.reload(); return; }
      shift(0, false, false);
    };
    window.addEventListener('touchstart', start, { passive: true });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    return () => {
      window.removeEventListener('touchstart', start);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
  }, [sheet, label]);
}

export default function Page() {
  const [t, setT] = useState<Trip | null>(null);
  const [view, setView] = useState<View>('today');
  const [now, setNow] = useState(0);
  const [, bump] = useState(0);
  const [undo, setUndo] = useState<{ id: string } | null>(null);
  const played = useRef(false);
  const [go, setGo] = useState(false);
  const [deckIn, setDeckIn] = useState(false);
  const [deckReady, setDeckReady] = useState(false);
  const undoTimer = useRef<any>(null);
  const pullSheet = useRef<HTMLDivElement>(null);
  const pullLabel = useRef<HTMLDivElement>(null);
  usePullRefresh(pullSheet, pullLabel);

  useEffect(() => {
    setT(load()); setNow(Date.now());
    document.documentElement.removeAttribute('data-theme');
    try { localStorage.removeItem('bck-theme'); } catch {}
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (t) save(t); }, [t]);
  useEffect(() => {
    if (!t) return;
    const r = requestAnimationFrame(() => {
      setGo(true);
      requestAnimationFrame(() => setDeckIn(true));
    });
    const done = setTimeout(() => { played.current = true; }, 3600);
    const settled = setTimeout(() => setDeckReady(true), 1400);
    return () => { cancelAnimationFrame(r); clearTimeout(done); clearTimeout(settled); };
  }, [!!t]);
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  const p = useMemo(() => (t ? plan(t) : null), [t && JSON.stringify({ ...t, checks: 0 })]);
  if (!t || !p) return null;

  const events: any[] = p.events;
  const zoneNow = whereAmI(t, p, now);
  const [ws, we] = dayWindow(zoneNow, now);
  const todayEv = events.filter((e) => e.t >= ws && e.t < we);
  const pending = todayEv.filter((e) => !t.checks[e.id]);
  const upcoming = events.filter((e) => e.t >= now && !t.checks[e.id]);
  const nextEv = upcoming[0];

  const setCheck = (id: string, on: boolean) => {
    const checks = { ...t.checks };
    if (on) checks[id] = Date.now(); else delete checks[id];
    setT({ ...t, checks });
    if (on) {
      setUndo({ id }); clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setUndo(null), 5000);
      setTimeout(() => bump((n) => n + 1), 3050);
    }
  };
  const download = () => {
    const blob = new Blob([toICS(events)], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'body-clock-kit.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const cls = `app ${go ? 'go' : ''} ${played.current ? 'static' : ''}`;

  return (
    <div className={cls}>
      <div className="ptr" ref={pullLabel} aria-hidden="true">Pull to refresh</div>
      <div className="pull" ref={pullSheet}>
        {view === 'today' && Today()}
        {view === 'plan' && Plan()}
        {view === 'kit' && Kit()}
        {view === 'trip' && <TripForm />}
      </div>

      <button className={`undo ${undo ? 'show' : ''}`} onClick={() => { if (undo) setCheck(undo.id, false); setUndo(null); }}>Undo</button>
      <nav className="tabs"><div className="in">
        {([['today', 'Today'], ['plan', 'Plan'], ['kit', 'Kit'], ['trip', 'Trip']] as [View, string][]).map(([v, label]) => (
          <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)} aria-current={view === v ? 'page' : undefined}>{label}</button>
        ))}
      </div></nav>
    </div>
  );

  /* ---------- views ---------- */
  function Hero() {
    const info = p.info;
    const A = zc(t!.from), B = zc(t!.to);
    const landMs = info.land;
    return (
      <>
        <div className="hero">
          <div className="stage">
            <svg className="map" viewBox="0 0 330 120" aria-hidden="true">
              <path className="arc" d="M14 100 Q165 -20 316 100" />
              <path className="trail" pathLength={100} d="M14 100 Q165 -20 316 100" />
            </svg>
            <svg className="plane" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" /></svg>
          </div>
          <div className="cities"><span>{A.code} {fmtT(t!.from, p.dep)}</span><span>{B.code} {fmtT(t!.to, landMs)}</span></div>
        </div>
        <div className="ticket">
          <div className="main">
            <div className="lbl">Flight</div>
            <div className="f"><div><div className="big">{A.code}</div><div className="lbl">{A.city}</div></div><div style={{ textAlign: 'right' }}><div className="big">{B.code}</div><div className="lbl">{B.city}</div></div></div>
            <div className="lbl" style={{ marginTop: 10 }}>{fmtD(t!.from, p.dep)} · Departs {fmtT(t!.from, p.dep)}</div>
          </div>
          <div className="stub">
            <div className="lbl">Shift</div>
            <div className="big">{info.shift > 0 ? '+' : ''}{info.shift} h</div>
            <div className="lbl">{info.east ? 'East' : 'West'}</div>
            <div className="lbl" style={{ marginTop: 8 }}>{A.code} {fmtT(t!.from, now)}</div>
            <div className="lbl">{B.code} {fmtT(t!.to, now)}</div>
            <div className="meter">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < info.adj ? 'on' : ''} />)}</div>
          </div>
        </div>
      </>
    );
  }

  function Deck({ list, interactive = true }: { list: any[]; interactive?: boolean }) {
    const rk = [{ y: 0, s: 1, b: 1 }, { y: 11, s: 0.95, b: 0.9 }, { y: 21, s: 0.9, b: 0.8 }];
    const shown = list.slice(0, 3);
    return (
      <div className={`deck${deckReady ? ' ready' : ''}`} style={{ height: 86 + (shown.length - 1) * 11 + 6 }}>
        {shown.map((e, i) => {
          const delay = 0.18 + (shown.length - 1 - i) * 0.09;
          return (
          <button key={e.id} className="ncard" disabled={!interactive}
            style={{
              zIndex: 10 - i,
              opacity: deckIn ? 1 : 0,
              transform: `translateY(${rk[i].y + (deckIn ? 0 : 20)}px) scale(${rk[i].s})`,
              filter: `brightness(${rk[i].b})`,
              transition: deckReady ? undefined : deckIn
                ? `transform .62s cubic-bezier(.32,1.12,.55,1) ${delay}s, opacity .45s cubic-bezier(.22,1,.36,1) ${delay}s`
                : 'none',
            }}
            onClick={() => interactive && setCheck(e.id, true)}>
            <div className="k">{i === 0 && e.t <= now ? 'NOW' : 'NEXT UP'} · {fmtT(e.zone, e.t)}</div>
            <div className="n"><span className="dot" style={{ background: dotC(e.kind) }} />{e.title}</div>
            <div className="d">{e.text}</div>
          </button>
          );
        })}
      </div>
    );
  }

  function Legend() {
    const seen: Record<string, string> = {};
    Object.keys(CAT).forEach((k) => (seen[CAT[k].name] = CAT[k].v));
    return <div className="legend">{Object.keys(seen).map((n) => <span key={n}><i className="dot" style={{ background: `var(${seen[n]})` }} />{n}</span>)}</div>;
  }

  function Rows({ list }: { list: any[] }) {
    return (
      <>
        {list.map((e, i) => {
          const at = t!.checks[e.id];
          const state = at ? (Date.now() - at < 3000 ? 'done fresh' : 'done settled') : '';
          return (
            <button key={e.id} className={`row ${state}`} style={{ animationDelay: `${0.55 + Math.min(i, 5) * 0.04}s` }} onClick={() => setCheck(e.id, !at)}>
              <span className="dot" style={{ background: dotC(e.kind) }} />
              <span className="t"><span className="tt">{e.title}</span><small>{fmtT(e.zone, e.t)} · {zc(e.zone).city}</small></span>
              <span className="cb" />
            </button>
          );
        })}
      </>
    );
  }

  function Today() {
    const empty = (title: string, body: string, extra?: React.ReactNode) => (
      <div className="empty"><h3>{title}</h3><p>{body}</p>{extra}</div>
    );
    const nextBox = nextEv && (
      <div className="next"><div className="lbl mono" style={{ fontSize: 11, color: 'var(--muted)' }}>NEXT STEP</div>
        <b>{nextEv.title}</b><div className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtD(nextEv.zone, nextEv.t)} · {fmtT(nextEv.zone, nextEv.t)}</div></div>
    );
    if (!p.info) return empty('Add your flights', 'Enter your departure and arrival to build your schedule.', <button className="btn p" style={{ marginTop: 14 }} onClick={() => setView('trip')}>Add trip</button>);
    const last = events[events.length - 1];
    let body: React.ReactNode;
    if (events.length === 0) body = empty('No adjustment needed', 'This trip shifts you by under 2 hours, so there are no steps to follow.');
    else if (last && now > last.t + 6 * 36e5) body = empty('Welcome home', `${Object.keys(t!.checks).length} of ${events.length} steps checked off. Sleep well.`, <button className="btn" style={{ marginTop: 14 }} onClick={() => setView('trip')}>Plan another trip</button>);
    else if (todayEv.length && pending.length) body = <>{Deck({ list: pending })}{Legend()}<div className="grp">{(['Morning', 'Afternoon', 'Evening', 'Night'] as const).map((g) => {
      const items = todayEv.filter((e) => { const h = hourIn(e.zone, e.t); return (g === 'Morning' ? h < 12 : g === 'Afternoon' ? h >= 12 && h < 17 : g === 'Evening' ? h >= 17 && h < 21 : h >= 21); });
      return items.length ? <div key={g}><h4><span>{g}</span><span>{zc(zoneNow).city}</span></h4>{Rows({ list: items })}</div> : null;
    })}</div></>;
    else if (todayEv.length) body = <>{empty("That's everything for today", nextEv ? 'Nice work. Here is what is next.' : 'All steps are done.', nextBox)}<div className="grp"><h4><span>Today</span></h4>{Rows({ list: todayEv })}</div></>;
    else if (nextEv && now < events[0].t) body = <>{empty(`Starts in ${until(events[0].t - now)}`, 'Your first step is coming up.')}{Deck({ list: upcoming, interactive: false })}{Legend()}</>;
    else body = empty("You're adjusted", 'Nothing scheduled today. Return prep picks up later.', nextBox);
    return <div key="today">{Hero()}{body}<p className="note">General wellness reminders, not medical advice. Check supplements with your clinician if you take prescription medication.</p></div>;
  }

  function Plan() {
    const groups: { key: string; name: string; zone: string; list: any[] }[] = [];
    events.forEach((e) => { let g = groups.find((x) => x.key === e.grp.key); if (!g) { g = { key: e.grp.key, name: e.grp.name, zone: e.zone, list: [] }; groups.push(g); } g.list.push(e); });
    return (
      <div className="sheet static">
        <h2>The plan</h2>
        {events.length === 0 ? <div className="empty"><h3>Nothing to plan</h3><p>Add flights in Trip.</p></div> : (
          <>
            <button className="btn" onClick={download}>Add to calendar (.ics) with alerts</button>
            {groups.map((g) => {
              const done = g.list.filter((e) => t!.checks[e.id]).length;
              const isToday = g.list.some((e) => e.t >= ws && e.t < we);
              return (
                <div className="grp" key={g.key}>
                  <h4><span>{g.name} · {zc(g.zone).city} · {fmtD(g.zone, g.list[0].t)}{isToday ? ' · TODAY' : ''}</span><span>{done}/{g.list.length}</span></h4>
                  {Rows({ list: g.list })}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  function Kit() {
    const set = (k: string, patch: any) => setT({ ...t!, kit: { ...t!.kit, [k]: { ...t!.kit[k], ...patch } } });
    return (
      <div className="sheet">
        <h2>My kit</h2>
        {KITS.map((k) => {
          const v = t!.kit[k.k];
          return (
            <div className="kit" key={k.k}>
              <div className="h"><b><span className="dot" style={{ background: dotC(k.k) }} />{k.name}</b>
                <button className={`sw ${v.on ? 'on' : ''}`} aria-label={`Toggle ${k.name}`} onClick={() => set(k.k, { on: !v.on })} /></div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{k.sub}</div>
              {v.on && <>
                <textarea rows={2} value={v.text} onChange={(e) => set(k.k, { text: e.target.value })} />
                <div className="q">Max doses to schedule <input inputMode="numeric" placeholder="all" value={v.qty as any} onChange={(e) => set(k.k, { qty: e.target.value })} /></div>
              </>}
            </div>
          );
        })}
        <p className="note">General wellness reminders, not medical advice. Melatonin, vitamin C, fish oil and B12 steps follow a common travel routine; only timing of light, caffeine, sleep and melatonin has solid support.</p>
        
      </div>
    );
  }

  function TripForm() {
    const [f, setF] = useState(() => ({ ...t! }));
    const num = (k: keyof Trip) => (e: any) => setF({ ...f, [k]: e.target.value === '' ? '' : Number(e.target.value) } as any);
    const sel = (k: keyof Trip, label: string) => (
      <label className="field"><span>{label}</span><select value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value } as any)}>{ZONES.map((z) => <option key={z.id} value={z.id}>{z.city}</option>)}</select></label>
    );
    const bed = `${String(Math.floor(f.bedM / 60)).padStart(2, '0')}:${String(f.bedM % 60).padStart(2, '0')}`;
    return (
      <div className="sheet">
        <h2>Trip</h2>
        <div className="two">{sel('from', 'From')}{sel('to', 'To')}</div>
        <label className="field"><span>Departure (local)</span><input type="datetime-local" value={f.dep} onChange={(e) => setF({ ...f, dep: e.target.value })} /></label>
        <div className="two">
          <label className="field"><span>Flight hours</span><input type="number" step="0.25" value={f.hours} onChange={num('hours')} /></label>
          <label className="field"><span>Nights away</span><input type="number" value={f.nights} onChange={num('nights')} /></label>
        </div>
        {f.nights > 0 && <>
          <div className="two">{sel('retFrom', 'Fly home from')}<label className="field"><span>Return departs</span><input type="time" value={f.retTime} onChange={(e) => setF({ ...f, retTime: e.target.value })} /></label></div>
          <label className="field"><span>Return flight hours</span><input type="number" step="0.25" value={f.retHours} onChange={num('retHours')} /></label>
        </>}
        <label className="field"><span>Usual bedtime</span><input type="time" value={bed} onChange={(e) => { const [h, m] = e.target.value.split(':').map(Number); setF({ ...f, bedM: h * 60 + m }); }} /></label>
        <button className="btn p" onClick={() => { setT({ ...f, checks: f.dep === t!.dep ? t!.checks : {} }); setView('today'); }}>Save trip</button>
        <button className="btn" style={{ marginTop: 8 }} onClick={() => { if (confirm('Reset trip and kit to defaults?')) { setT(defaults()); setView('today'); } }}>Reset to defaults</button>
      </div>
    );
  }
}
