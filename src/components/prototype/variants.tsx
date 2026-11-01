'use client';
// PROTOTYPE (throwaway, branch prototype/ui-current-state). Not production code.
// Three variants of the home page, switchable via ?variant=A|B|C.
// Data: static files in public/prototype/ exported from dev.db by
// scripts/prototype-export-snapshot.ts. No server work per viewer.

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Snapshot = {
  date: string;
  procedures: [string, string, number, number, number][];
  institutions: string[];
  rows: [number, number, number | null, number | null, number | null][];
};
type History = {
  dates: string[];
  series: Record<
    string,
    ([number | null, number | null, number | null] | null)[]
  >;
};
type Urgency = 0 | 1 | 2;
const U_LABEL = ['Redno', 'Hitro', 'Zelo hitro'];
const U_KEY = ['regular', 'fast', 'veryFast'];

// ---------- shared helpers ----------

function useParam(name: string): [string | null, (v: string | null) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const set = (v: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (v === null || v === '') next.delete(name);
    else next.set(name, v);
    router.replace(
      `${path}?${next.toString()}` as Parameters<typeof router.replace>[0],
      { scroll: false }
    );
  };
  return [sp.get(name), set];
}

function useUrgency(): [Urgency, (u: Urgency) => void] {
  const [u, setU] = useParam('u');
  const idx = Math.max(0, U_KEY.indexOf(u ?? 'regular')) as Urgency;
  return [idx, (n) => setU(n === 0 ? null : U_KEY[n])];
}

function useJson<T>(url: string | null): { data: T | null; bytes: number } {
  const [state, setState] = useState<{ data: T | null; bytes: number }>({
    data: null,
    bytes: 0,
  });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetch(url)
      .then((r) => r.text())
      .then(
        (t) => alive && setState({ data: JSON.parse(t) as T, bytes: t.length })
      );
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}

function kb(n: number) {
  return `${(n / 1024).toFixed(0)} KB`;
}

function maxOf(s: Snapshot, p: number, u: number): number {
  return s.procedures[p][2 + u] as number;
}

function rowsFor(s: Snapshot, p: number) {
  return s.rows.filter((r) => r[0] === p);
}

function sortByUrgency<T extends { v: (number | null)[] }>(
  xs: T[],
  u: Urgency
) {
  return [...xs].sort((a, b) => (a.v[u] ?? 1e9) - (b.v[u] ?? 1e9));
}

function Cell({ v, max }: { v: number | null; max: number }) {
  if (v === null) return <span className="text-muted-foreground">—</span>;
  const over = v > max;
  return (
    <span className={over ? 'font-semibold text-destructive' : ''}>
      {v}
      {over && ' ⚠'}
    </span>
  );
}

function UrgencyTabs({ u, setU }: { u: Urgency; setU: (u: Urgency) => void }) {
  return (
    <div className="inline-flex rounded-md border p-0.5 text-sm">
      {U_LABEL.map((l, i) => (
        <button
          type="button"
          key={l}
          onClick={() => setU(i as Urgency)}
          className={`rounded px-3 py-1 ${u === i ? 'bg-primary text-primary-foreground' : ''}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function ProcedurePicker({
  s,
  value,
  onPick,
}: {
  s: Snapshot;
  value: number | null;
  onPick: (p: number) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const t = q.toLowerCase();
    return s.procedures
      .map((p, i) => ({ p, i }))
      .filter(
        ({ p }) =>
          !t || p[1].toLowerCase().includes(t) || p[0].toLowerCase().includes(t)
      )
      .slice(0, 30);
  }, [q, s]);
  return (
    <div className="relative">
      <input
        className="w-full rounded-md border bg-background px-3 py-2"
        placeholder={
          value === null
            ? 'Poišči postopek (ime ali šifra)…'
            : s.procedures[value][1]
        }
        value={q}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQ(e.target.value)}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-background shadow-lg">
          {matches.map(({ p, i }) => (
            <li key={p[0]}>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                onMouseDown={() => {
                  onPick(i);
                  setQ('');
                }}
              >
                <span className="text-muted-foreground">{p[0]}</span> {p[1]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InstitutionFilter({
  names,
  selected,
  setSelected,
}: {
  names: { i: number; name: string }[];
  selected: number[];
  setSelected: (x: number[]) => void;
}) {
  const [q, setQ] = useState('');
  const t = q.toLowerCase();
  const hits = t
    ? names
        .filter(
          (n) => n.name.toLowerCase().includes(t) && !selected.includes(n.i)
        )
        .slice(0, 8)
    : [];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {selected.map((i) => (
          <button
            type="button"
            key={i}
            onClick={() => setSelected(selected.filter((x) => x !== i))}
            className="rounded-full bg-muted px-2.5 py-0.5 text-xs"
          >
            {names.find((n) => n.i === i)?.name ?? i} ✕
          </button>
        ))}
      </div>
      <input
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
        placeholder="Filtriraj ustanove (#2)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {hits.length > 0 && (
        <ul className="rounded-md border text-sm">
          {hits.map((h) => (
            <li key={h.i}>
              <button
                type="button"
                className="w-full px-3 py-1 text-left hover:bg-muted"
                onClick={() => {
                  setSelected([...selected, h.i]);
                  setQ('');
                }}
              >
                {h.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useInstFilter(): [number[], (x: number[]) => void] {
  const [raw, set] = useParam('i');
  const sel = raw ? raw.split(',').map(Number) : [];
  return [sel, (x) => set(x.length ? x.join(',') : null)];
}

function CostNote({ items }: { items: [string, number][] }) {
  return (
    <p className="mt-6 text-xs text-muted-foreground">
      Naloženo v brskalnik: {items.map(([l, b]) => `${l} ${kb(b)}`).join(' + ')}{' '}
      (gzip ≈ 4–5× manj). Strežnik ne izvaja ničesar.
    </p>
  );
}

function ProcedureHeader({ s, p }: { s: Snapshot; p: number }) {
  const [code, name, mr, mf, mv] = s.procedures[p];
  return (
    <div>
      <h2 className="text-xl font-semibold">{name}</h2>
      <p className="text-sm text-muted-foreground">
        Šifra {code} · Najdaljša dovoljena čakalna doba: redno {mr} d, hitro{' '}
        {mf} d, zelo hitro {mv} d
      </p>
    </div>
  );
}

// ---------- Variant A: picker + table ----------

function VariantA({ s, bytes }: { s: Snapshot; bytes: number }) {
  const [pRaw, setP] = useParam('p');
  const [u, setU] = useUrgency();
  const [sel, setSel] = useInstFilter();
  const p = pRaw === null ? null : Number(pRaw);
  const rows = useMemo(() => {
    if (p === null) return [];
    const r = rowsFor(s, p).map((r) => ({
      i: r[1],
      name: s.institutions[r[1]],
      v: [r[2], r[3], r[4]],
    }));
    return sortByUrgency(r, u);
  }, [s, p, u]);
  const shown = sel.length ? rows.filter((r) => sel.includes(r.i)) : rows;
  return (
    <section className="space-y-4">
      <ProcedurePicker s={s} value={p} onPick={(i) => setP(String(i))} />
      {p === null ? (
        <p className="text-muted-foreground">
          Izberi postopek, da vidiš čakalne dobe po ustanovah.
        </p>
      ) : (
        <>
          <ProcedureHeader s={s} p={p} />
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">Razvrsti po:</span>
            <UrgencyTabs u={u} setU={setU} />
          </div>
          <InstitutionFilter
            names={rows.map((r) => ({ i: r.i, name: r.name }))}
            selected={sel}
            setSelected={setSel}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Ustanova</th>
                  {U_LABEL.map((l, i) => (
                    <th
                      key={l}
                      className={`py-2 pr-2 text-right ${u === i ? 'underline' : ''}`}
                    >
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r, k) => (
                  <tr key={r.i} className="border-b last:border-0">
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {k + 1}
                    </td>
                    <td className="py-1.5 pr-2">{r.name}</td>
                    {[0, 1, 2].map((x) => (
                      <td
                        key={x}
                        className="py-1.5 pr-2 text-right tabular-nums"
                      >
                        <Cell v={r.v[x]} max={maxOf(s, p, x)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <CostNote items={[['snapshot.json', bytes]]} />
    </section>
  );
}

// ---------- Variant B: overview of all procedures, expand for bars ----------

function VariantB({ s, bytes }: { s: Snapshot; bytes: number }) {
  const [u, setU] = useUrgency();
  const [pRaw, setP] = useParam('p');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'over' | 'name' | 'min'>('over');
  const open = pRaw === null ? null : Number(pRaw);
  const summary = useMemo(() => {
    const by = new Map<number, (number | null)[][]>();
    for (const r of s.rows) {
      const a = by.get(r[0]) ?? [];
      a.push([r[2], r[3], r[4]]);
      by.set(r[0], a);
    }
    return s.procedures.map((p, i) => {
      const vals = (by.get(i) ?? [])
        .map((v) => v[u])
        .filter((v): v is number => v !== null);
      const max = p[2 + u] as number;
      return {
        i,
        code: p[0],
        name: p[1],
        n: vals.length,
        min: vals.length ? Math.min(...vals) : null,
        over: vals.length
          ? vals.filter((v) => v > max).length / vals.length
          : 0,
      };
    });
  }, [s, u]);
  const t = q.toLowerCase();
  const list = summary
    .filter(
      (x) =>
        x.n > 0 &&
        (!t ||
          x.name.toLowerCase().includes(t) ||
          x.code.toLowerCase().includes(t))
    )
    .sort((a, b) =>
      sort === 'over'
        ? b.over * b.n - a.over * a.n
        : sort === 'min'
          ? (a.min ?? 1e9) - (b.min ?? 1e9)
          : a.name.localeCompare(b.name)
    );
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <UrgencyTabs u={u} setU={setU} />
        <select
          className="rounded-md border bg-background px-2 py-1 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="over">Največ ustanov nad mejo (število)</option>
          <option value="min">Najkrajša čakalna doba</option>
          <option value="name">Po abecedi</option>
        </select>
        <input
          className="min-w-48 flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
          placeholder="Išči postopek…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {list.length} postopkov · {U_LABEL[u].toLowerCase()} · stanje{' '}
        {s.date.slice(0, 10)}
      </p>
      <ul className="divide-y rounded-md border">
        {list.slice(0, 200).map((x) => (
          <li key={x.i}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => setP(open === x.i ? null : String(x.i))}
            >
              <span className="flex-1">
                {x.name}{' '}
                <span className="text-muted-foreground">({x.code})</span>
              </span>
              <span className="w-20 text-right tabular-nums">{x.n} ust.</span>
              <span className="w-24 text-right tabular-nums">
                min {x.min ?? '—'} d
              </span>
              <span className="w-28">
                <span className="block h-2 rounded bg-muted">
                  <span
                    className="block h-2 rounded bg-destructive"
                    style={{ width: `${x.over * 100}%` }}
                  />
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(x.over * 100)} % nad mejo
                </span>
              </span>
            </button>
            {open === x.i && <Bars s={s} p={x.i} u={u} />}
          </li>
        ))}
      </ul>
      {list.length > 200 && (
        <p className="text-xs text-muted-foreground">
          Prikazanih prvih 200 — zoži iskanje.
        </p>
      )}
      <CostNote items={[['snapshot.json', bytes]]} />
    </section>
  );
}

function Bars({ s, p, u }: { s: Snapshot; p: number; u: Urgency }) {
  const max = maxOf(s, p, u);
  const rows = sortByUrgency(
    rowsFor(s, p).map((r) => ({
      name: s.institutions[r[1]],
      v: [r[2], r[3], r[4]],
    })),
    u
  ).filter((r) => r.v[u] !== null);
  const top = Math.max(max, ...rows.map((r) => r.v[u] as number)) || 1;
  return (
    <div className="space-y-1 bg-muted/40 px-3 py-3">
      {rows.map((r) => {
        const v = r.v[u] as number;
        return (
          <div key={r.name} className="flex items-center gap-2 text-xs">
            <span className="w-56 shrink-0 truncate" title={r.name}>
              {r.name}
            </span>
            <span className="relative h-3 flex-1">
              <span
                className={`absolute inset-y-0 left-0 rounded ${v > max ? 'bg-destructive' : 'bg-primary/70'}`}
                style={{ width: `${(v / top) * 100}%` }}
              />
              <span
                className="absolute inset-y-[-2px] w-px bg-foreground"
                style={{ left: `${(max / top) * 100}%` }}
                title={`meja ${max} d`}
              />
            </span>
            <span className="w-12 text-right tabular-nums">{v} d</span>
          </div>
        );
      })}
      <p className="pt-1 text-xs text-muted-foreground">
        Navpična črta = najdaljša dovoljena doba ({max} d).
      </p>
    </div>
  );
}

// ---------- Variant C: procedure + history (sparklines, weekday view #1) ----------

const WEEKDAYS = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];

function VariantC({ s, bytes }: { s: Snapshot; bytes: number }) {
  const [pRaw, setP] = useParam('p');
  const [u, setU] = useUrgency();
  const [sel, setSel] = useInstFilter();
  const p = pRaw === null ? null : Number(pRaw);
  const h = useJson<History>(
    p === null ? null : `/prototype/history/${p}.json`
  );
  const hist = h.data;
  const insts = useMemo(() => {
    if (!hist || p === null) return [];
    const r = Object.entries(hist.series).map(([i, ser]) => {
      const vals = ser.map((x) => (x ? x[u] : null));
      const cur = vals.at(-1) ?? null;
      const ago = vals.at(-31) ?? null;
      return {
        i: Number(i),
        name: s.institutions[Number(i)],
        vals,
        cur,
        delta: cur !== null && ago !== null ? cur - ago : null,
      };
    });
    return r.sort((a, b) => (a.cur ?? 1e9) - (b.cur ?? 1e9));
  }, [hist, p, u, s]);
  const shown = sel.length ? insts.filter((r) => sel.includes(r.i)) : insts;
  const weekday = useMemo(() => {
    // average across (filtered) institutions, per date, last 4 weeks grouped by weekday
    if (!hist) return null;
    const n = hist.dates.length;
    const avg = hist.dates.map((_, d) => {
      const v = shown
        .map((r) => r.vals[d])
        .filter((x): x is number => x !== null);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    });
    const weeks: (number | null)[][] = [[], [], [], []].map(() =>
      Array(7).fill(null)
    );
    for (let d = Math.max(0, n - 28); d < n; d++) {
      const date = new Date(hist.dates[d]);
      const wd = (date.getUTCDay() + 6) % 7;
      const w = 3 - Math.floor((n - 1 - d) / 7);
      if (w >= 0) weeks[w][wd] = avg[d];
    }
    return weeks;
  }, [hist, shown]);
  return (
    <section className="space-y-4">
      <ProcedurePicker s={s} value={p} onPick={(i) => setP(String(i))} />
      {p === null ? (
        <p className="text-muted-foreground">
          Izberi postopek za trenutno stanje in zgodovino zadnjih ~5 mesecev.
        </p>
      ) : !hist ? (
        <p>Nalagam zgodovino…</p>
      ) : (
        <>
          <ProcedureHeader s={s} p={p} />
          <UrgencyTabs u={u} setU={setU} />
          <InstitutionFilter
            names={insts.map((r) => ({ i: r.i, name: r.name }))}
            selected={sel}
            setSelected={setSel}
          />
          {weekday && <WeekdayChart weeks={weekday} max={maxOf(s, p, u)} />}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Ustanova</th>
                <th className="py-2">
                  {hist.dates[0]} → {hist.dates.at(-1)}
                </th>
                <th className="py-2 text-right">Zdaj</th>
                <th className="py-2 text-right">Δ 30 d</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.i} className="border-b last:border-0">
                  <td className="py-1.5 pr-2">{r.name}</td>
                  <td className="py-1.5 pr-2">
                    <Spark vals={r.vals} max={maxOf(s, p, u)} />
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    <Cell v={r.cur} max={maxOf(s, p, u)} />
                  </td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${r.delta && r.delta > 0 ? 'text-destructive' : ''}`}
                  >
                    {r.delta === null
                      ? '—'
                      : r.delta > 0
                        ? `+${r.delta}`
                        : r.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <CostNote
        items={[
          ['snapshot.json', bytes],
          ...(h.bytes
            ? [[`history/${p}.json`, h.bytes] as [string, number]]
            : []),
        ]}
      />
    </section>
  );
}

function Spark({ vals, max }: { vals: (number | null)[]; max: number }) {
  const W = 220;
  const H = 28;
  const nums = vals.filter((v): v is number => v !== null);
  if (!nums.length) return <span className="text-muted-foreground">—</span>;
  const top = Math.max(max, ...nums) || 1;
  const pts = vals
    .map((v, i) =>
      v === null ? null : `${(i / (vals.length - 1)) * W},${H - (v / top) * H}`
    )
    .filter(Boolean)
    .join(' ');
  const my = H - (max / top) * H;
  return (
    <svg width={W} height={H} className="overflow-visible">
      <line
        x1={0}
        x2={W}
        y1={my}
        y2={my}
        className="stroke-destructive"
        strokeDasharray="3 3"
        strokeWidth={1}
      />
      <polyline
        points={pts}
        fill="none"
        className="stroke-foreground"
        strokeWidth={1.25}
      />
    </svg>
  );
}

function WeekdayChart({
  weeks,
  max,
}: {
  weeks: (number | null)[][];
  max: number;
}) {
  const all = weeks.flat().filter((v): v is number => v !== null);
  const top = Math.max(max, ...all) || 1;
  const H = 120;
  const shades = ['opacity-25', 'opacity-50', 'opacity-75', 'opacity-100'];
  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-sm font-medium">
        Povprečje po dnevih v tednu, zadnji 4 tedni (#1) — svetlo = starejši
        teden
      </p>
      <div className="flex items-end gap-3" style={{ height: H }}>
        {WEEKDAYS.map((d, wd) => (
          <div key={d} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="flex w-full items-end justify-center gap-0.5"
              style={{ height: H - 18 }}
            >
              {weeks.map((w, k) => (
                <div
                  key={k}
                  className={`w-2 rounded-t bg-primary ${shades[k]}`}
                  style={{ height: `${((w[wd] ?? 0) / top) * 100}%` }}
                  title={w[wd] === null ? '—' : `${w[wd]?.toFixed(1)} d`}
                />
              ))}
            </div>
            <span className="text-xs">{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- switcher ----------

const VARIANTS = [
  ['A', 'Iskalnik + tabela'],
  ['B', 'Pregled vseh postopkov'],
  ['C', 'Postopek + zgodovina'],
] as const;

function Switcher({
  current,
  set,
}: {
  current: string;
  set: (v: string) => void;
}) {
  const idx = Math.max(
    0,
    VARIANTS.findIndex((v) => v[0] === current)
  );
  const go = (d: number) =>
    set(VARIANTS[(idx + d + VARIANTS.length) % VARIANTS.length][0]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black px-4 py-2 text-sm text-white shadow-xl">
      <button type="button" onClick={() => go(-1)}>
        ←
      </button>
      <span>
        PROTOTIP {VARIANTS[idx][0]} ({VARIANTS[idx][1]})
      </span>
      <button type="button" onClick={() => go(1)}>
        →
      </button>
    </div>
  );
}

export function PrototypeHome() {
  const [variant, setVariant] = useParam('variant');
  const { data, bytes } = useJson<Snapshot>('/prototype/snapshot.json');
  const v = variant ?? 'A';
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-24">
      <h1 className="mb-1 text-2xl font-semibold">Čakalne dobe</h1>
      {data && (
        <p className="mb-6 text-sm text-muted-foreground">
          Stanje na dan {new Date(data.date).toLocaleDateString('sl-SI')} ·{' '}
          {data.procedures.length} postopkov · {data.institutions.length}{' '}
          ustanov
        </p>
      )}
      {!data ? (
        <p>Nalagam…</p>
      ) : v === 'B' ? (
        <VariantB s={data} bytes={bytes} />
      ) : v === 'C' ? (
        <VariantC s={data} bytes={bytes} />
      ) : (
        <VariantA s={data} bytes={bytes} />
      )}
      <Switcher current={v} set={setVariant} />
    </main>
  );
}
