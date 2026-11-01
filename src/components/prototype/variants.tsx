'use client';
// PROTOTYPE (throwaway, branch prototype/ui-current-state). Not production code.
// Four variants of the home page, switchable via ?variant=A|B|C|D, built from
// shadcn/ui components. Data: static files in public/prototype/ exported from
// dev.db by scripts/prototype-export-snapshot.ts. No server work per viewer.

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const chartFallback = () => <Skeleton className="h-56 w-full" />;
const InstitutionBars = dynamic(
  () => import('./charts').then((m) => m.InstitutionBars),
  { ssr: false, loading: chartFallback }
);
const Sparkline = dynamic(() => import('./charts').then((m) => m.Sparkline), {
  ssr: false,
  loading: () => <Skeleton className="h-8 w-56" />,
});
const WeekdayBars = dynamic(
  () => import('./charts').then((m) => m.WeekdayBars),
  { ssr: false, loading: chartFallback }
);
const Timeline = dynamic(() => import('./charts').then((m) => m.Timeline), {
  ssr: false,
  loading: chartFallback,
});

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

function useInstFilter(): [number[], (x: number[]) => void] {
  const [raw, set] = useParam('i');
  const sel = raw ? raw.split(',').map(Number) : [];
  return [sel, (x) => set(x.length ? x.join(',') : null)];
}

// Set by the artifact build (scripts/prototype-build-artifact.ts).
const EMBED = (
  globalThis as {
    __PROTO__?: { snapshot: Snapshot; history: Record<string, History> };
  }
).__PROTO__;
// In the artifact, C and D can only offer procedures with sampled history.
const HISTORY_ONLY = EMBED
  ? new Set(Object.keys(EMBED.history).map(Number))
  : undefined;

function useJson<T>(url: string | null): { data: T | null; bytes: number } {
  const [state, setState] = useState<{ data: T | null; bytes: number }>({
    data: null,
    bytes: 0,
  });
  useEffect(() => {
    if (!url) return;
    if (EMBED) {
      // Artifact build: sample data embedded in the page, no fetch.
      const id = url.match(/(\d+)\.json$/)?.[1];
      const d = (id ? EMBED.history[id] : EMBED.snapshot) ?? null;
      setState({ data: d as T, bytes: d ? JSON.stringify(d).length : 0 });
      return;
    }
    let alive = true;
    setState({ data: null, bytes: 0 });
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

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
const maxOf = (s: Snapshot, p: number, u: number) =>
  s.procedures[p][2 + u] as number;

function Days({ v, max }: { v: number | null; max: number }) {
  if (v === null) return <span className="text-muted-foreground">—</span>;
  if (v > max) return <Badge variant="destructive">{v}</Badge>;
  return <span className="tabular-nums">{v}</span>;
}

function UrgencyToggle({
  u,
  setU,
}: {
  u: Urgency;
  setU: (u: Urgency) => void;
}) {
  return (
    <ToggleGroup
      variant="outline"
      spacing={0}
      value={[String(u)]}
      onValueChange={(v) => v.length && setU(Number(v[0]) as Urgency)}
    >
      {U_LABEL.map((l, i) => (
        <ToggleGroupItem key={l} value={String(i)}>
          {l}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

type Item = { value: string; label: string };

function ProcedureCombobox({
  s,
  value,
  onPick,
  only,
}: {
  s: Snapshot;
  value: number | null;
  onPick: (p: number | null) => void;
  only?: Set<number>;
}) {
  const items = useMemo<Item[]>(
    () =>
      s.procedures
        .map((p, i) => ({
          value: String(i),
          label: `${p[1]} (${p[0]})`,
        }))
        .filter((it) => !only || only.has(Number(it.value))),
    [s, only]
  );
  return (
    <Combobox
      items={items}
      limit={50}
      value={
        value === null
          ? null
          : (items.find((it) => it.value === String(value)) ?? null)
      }
      onValueChange={(v) => onPick(v ? Number((v as Item).value) : null)}
      isItemEqualToValue={(a: Item, b: Item) => a.value === b.value}
    >
      <ComboboxInput placeholder="Poišči postopek (ime ali šifra)…" showClear />
      <ComboboxContent>
        <ComboboxEmpty>Ni zadetkov.</ComboboxEmpty>
        <ComboboxList>
          {(item: Item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function InstitutionCombobox({
  options,
  selected,
  setSelected,
}: {
  options: { i: number; name: string }[];
  selected: number[];
  setSelected: (x: number[]) => void;
}) {
  const anchor = useComboboxAnchor();
  const items = useMemo<Item[]>(
    () => options.map((o) => ({ value: String(o.i), label: o.name })),
    [options]
  );
  const value = items.filter((it) => selected.includes(Number(it.value)));
  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value}
      onValueChange={(v) =>
        setSelected((v as Item[]).map((x) => Number(x.value)))
      }
      isItemEqualToValue={(a: Item, b: Item) => a.value === b.value}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(values: Item[]) => (
            <Fragment>
              {values.map((x) => (
                <ComboboxChip key={x.value}>{x.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Filtriraj ustanove (#2)…" />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>Ni zadetkov.</ComboboxEmpty>
        <ComboboxList>
          {(item: Item) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function CostNote({ items }: { items: [string, number][] }) {
  return (
    <p className="text-xs text-muted-foreground">
      Naloženo v brskalnik: {items.map(([l, b]) => `${l} ${kb(b)}`).join(' + ')}{' '}
      (gzip ≈ 4–5× manj). Strežnik ne izvaja ničesar.
    </p>
  );
}

function PickPrompt({ text }: { text: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyTitle>Izberi postopek</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function ProcedureCardHeader({ s, p }: { s: Snapshot; p: number }) {
  const [code, name, mr, mf, mv] = s.procedures[p];
  return (
    <CardHeader>
      <CardTitle>{name}</CardTitle>
      <CardDescription>
        Šifra {code} · Najdaljša dovoljena čakalna doba: redno {mr} d, hitro{' '}
        {mf} d, zelo hitro {mv} d
      </CardDescription>
    </CardHeader>
  );
}

function SortHeader({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick}>
      {label}
      <ArrowUpDown data-icon="inline-end" />
    </Button>
  );
}

// Generic data table (shadcn Data Table pattern on TanStack v8).
function DataTable<T>({
  data,
  columns,
  sorting,
  setSorting,
  globalFilter,
  onRowClick,
  renderExpanded,
  limit,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  sorting: SortingState;
  setSorting: (s: SortingState) => void;
  globalFilter?: string;
  onRowClick?: (row: T) => void;
  renderExpanded?: (row: T) => React.ReactNode;
  limit?: number;
}) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: (u) =>
      setSorting(typeof u === 'function' ? u(sorting) : u),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: { sortUndefined: 'last' },
  });
  const rows = table.getRowModel().rows;
  return (
    <>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.slice(0, limit ?? rows.length).map((r) => {
            const expanded = renderExpanded?.(r.original);
            return (
              <Fragment key={r.id}>
                <TableRow
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={() => onRowClick?.(r.original)}
                >
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                {expanded && (
                  <TableRow>
                    <TableCell colSpan={columns.length}>{expanded}</TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
      {limit && rows.length > limit && (
        <p className="text-xs text-muted-foreground">
          Prikazanih prvih {limit} od {rows.length} — zoži iskanje.
        </p>
      )}
    </>
  );
}

// ---------- Variant A: picker + data table ----------

type InstRow = {
  i: number;
  name: string;
  regular: number | undefined;
  fast: number | undefined;
  veryFast: number | undefined;
};

function VariantA({ s, bytes }: { s: Snapshot; bytes: number }) {
  const [pRaw, setP] = useParam('p');
  const [sel, setSel] = useInstFilter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'regular', desc: false },
  ]);
  const p = pRaw === null ? null : Number(pRaw);
  const rows = useMemo<InstRow[]>(() => {
    if (p === null) return [];
    return s.rows
      .filter((r) => r[0] === p)
      .map((r) => ({
        i: r[1],
        name: s.institutions[r[1]],
        regular: r[2] ?? undefined,
        fast: r[3] ?? undefined,
        veryFast: r[4] ?? undefined,
      }));
  }, [s, p]);
  const shown = sel.length ? rows.filter((r) => sel.includes(r.i)) : rows;
  const columns = useMemo<ColumnDef<InstRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <SortHeader label="Ustanova" onClick={() => column.toggleSorting()} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-normal">{row.original.name}</span>
        ),
      },
      ...(['regular', 'fast', 'veryFast'] as const).map(
        (k, x): ColumnDef<InstRow> => ({
          accessorKey: k,
          header: ({ column }) => (
            <SortHeader
              label={U_LABEL[x]}
              onClick={() => column.toggleSorting()}
            />
          ),
          cell: ({ row }) => (
            <Days
              v={row.original[k] ?? null}
              max={p === null ? 0 : maxOf(s, p, x)}
            />
          ),
        })
      ),
    ],
    [s, p]
  );
  return (
    <div className="flex flex-col gap-4">
      <ProcedureCombobox
        s={s}
        value={p}
        onPick={(i) => setP(i === null ? null : String(i))}
      />
      {p === null ? (
        <PickPrompt text="Izberi postopek, da vidiš čakalne dobe po ustanovah." />
      ) : (
        <Card>
          <ProcedureCardHeader s={s} p={p} />
          <CardContent className="flex flex-col gap-4">
            <InstitutionCombobox
              options={rows.map((r) => ({ i: r.i, name: r.name }))}
              selected={sel}
              setSelected={setSel}
            />
            <DataTable
              data={shown}
              columns={columns}
              sorting={sorting}
              setSorting={setSorting}
            />
          </CardContent>
          <CardFooter>
            <CostNote items={[['snapshot.json', bytes]]} />
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

// ---------- Variant B: all procedures, expand for bar chart ----------

type ProcRow = {
  i: number;
  code: string;
  name: string;
  n: number;
  min: number | undefined;
  overN: number;
  over: number;
};

function VariantB({ s, bytes }: { s: Snapshot; bytes: number }) {
  const [u, setU] = useUrgency();
  const [pRaw, setP] = useParam('p');
  const [q, setQ] = useState('');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'overN', desc: true },
  ]);
  const open = pRaw === null ? null : Number(pRaw);
  const data = useMemo<ProcRow[]>(() => {
    const by = new Map<number, number[]>();
    for (const r of s.rows) {
      const v = r[2 + u];
      if (v === null) continue;
      const a = by.get(r[0]) ?? [];
      a.push(v);
      by.set(r[0], a);
    }
    return s.procedures
      .map((p, i) => {
        const vals = by.get(i) ?? [];
        const max = p[2 + u] as number;
        const overN = vals.filter((v) => v > max).length;
        return {
          i,
          code: p[0],
          name: p[1],
          n: vals.length,
          min: vals.length ? Math.min(...vals) : undefined,
          overN,
          over: vals.length ? overN / vals.length : 0,
        };
      })
      .filter((x) => x.n > 0);
  }, [s, u]);
  const columns = useMemo<ColumnDef<ProcRow>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <SortHeader label="Postopek" onClick={() => column.toggleSorting()} />
        ),
        cell: ({ row }) => (
          <div className="max-w-md whitespace-normal">
            {row.original.name}{' '}
            <span className="text-muted-foreground">({row.original.code})</span>
          </div>
        ),
      },
      {
        accessorKey: 'n',
        header: ({ column }) => (
          <SortHeader label="Ustanov" onClick={() => column.toggleSorting()} />
        ),
      },
      {
        accessorKey: 'min',
        header: ({ column }) => (
          <SortHeader
            label="Najkrajša"
            onClick={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => `${row.original.min ?? '—'} d`,
      },
      {
        accessorKey: 'overN',
        header: ({ column }) => (
          <SortHeader label="Nad mejo" onClick={() => column.toggleSorting()} />
        ),
        cell: ({ row }) =>
          row.original.overN ? (
            <Badge variant="destructive">
              {row.original.overN} ({Math.round(row.original.over * 100)} %)
            </Badge>
          ) : (
            <Badge variant="secondary">0</Badge>
          ),
      },
    ],
    []
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vsi postopki</CardTitle>
        <CardDescription>
          {data.length} postopkov · {U_LABEL[u].toLowerCase()} · klikni vrstico
          za graf po ustanovah
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <UrgencyToggle u={u} setU={setU} />
          <Input
            className="max-w-sm"
            placeholder="Išči postopek…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <DataTable
          data={data}
          columns={columns}
          sorting={sorting}
          setSorting={setSorting}
          globalFilter={q}
          limit={100}
          onRowClick={(r) => setP(open === r.i ? null : String(r.i))}
          renderExpanded={(r) =>
            open === r.i ? <BarsFor s={s} p={r.i} u={u} /> : null
          }
        />
      </CardContent>
      <CardFooter>
        <CostNote items={[['snapshot.json', bytes]]} />
      </CardFooter>
    </Card>
  );
}

// recharts loops if `data` is a new array on every render, so memoize it.
function BarsFor({ s, p, u }: { s: Snapshot; p: number; u: Urgency }) {
  const data = useMemo(
    () =>
      s.rows
        .filter((x) => x[0] === p && x[2 + u] !== null)
        .map((x) => ({ name: s.institutions[x[1]], days: x[2 + u] as number }))
        .sort((a, b) => a.days - b.days),
    [s, p, u]
  );
  return <InstitutionBars max={maxOf(s, p, u)} data={data} />;
}

// ---------- history helpers (C, D) ----------

function useHistory(p: number | null) {
  return useJson<History>(p === null ? null : `/prototype/history/${p}.json`);
}

function seriesFor(hist: History, u: Urgency) {
  return Object.entries(hist.series).map(([i, ser]) => ({
    i: Number(i),
    vals: ser.map((x) => (x ? x[u] : null)),
  }));
}

function averageByDate(
  hist: History,
  series: { vals: (number | null)[] }[]
): (number | null)[] {
  return hist.dates.map((_, d) => {
    const v = series
      .map((r) => r.vals[d])
      .filter((x): x is number => x !== null);
    return v.length
      ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10
      : null;
  });
}

// ---------- Variant C: procedure + history (sparklines, weekday #1) ----------

const WEEKDAYS = ['Pon', 'Tor', 'Sre', 'Čet', 'Pet', 'Sob', 'Ned'];
type WeekRow = {
  day: string;
  w1: number | null;
  w2: number | null;
  w3: number | null;
  w4: number | null;
};

function VariantC({ s, bytes }: { s: Snapshot; bytes: number }) {
  const [pRaw, setP] = useParam('p');
  const [u, setU] = useUrgency();
  const [sel, setSel] = useInstFilter();
  const p = pRaw === null ? null : Number(pRaw);
  const h = useHistory(p);
  const hist = h.data;
  const insts = useMemo(() => {
    if (!hist) return [];
    return seriesFor(hist, u)
      .map((r) => {
        const cur = r.vals.at(-1) ?? null;
        const ago = r.vals.at(-31) ?? null;
        return {
          ...r,
          spark: r.vals.map((v, k) => ({ d: hist.dates[k], v })),
          name: s.institutions[r.i],
          cur,
          delta: cur !== null && ago !== null ? cur - ago : null,
        };
      })
      .sort((a, b) => (a.cur ?? 1e9) - (b.cur ?? 1e9));
  }, [hist, u, s]);
  const shown = sel.length ? insts.filter((r) => sel.includes(r.i)) : insts;
  const weekday = useMemo<WeekRow[]>(() => {
    if (!hist) return [];
    const avg = averageByDate(hist, shown);
    const n = hist.dates.length;
    const out: WeekRow[] = WEEKDAYS.map((day) => ({
      day,
      w1: null,
      w2: null,
      w3: null,
      w4: null,
    }));
    for (let d = Math.max(0, n - 28); d < n; d++) {
      const wd = (new Date(hist.dates[d]).getUTCDay() + 6) % 7;
      const w = 4 - Math.floor((n - 1 - d) / 7);
      out[wd][`w${w}` as 'w1' | 'w2' | 'w3' | 'w4'] = avg[d];
    }
    return out;
  }, [hist, shown]);
  return (
    <div className="flex flex-col gap-4">
      <ProcedureCombobox
        only={HISTORY_ONLY}
        s={s}
        value={p}
        onPick={(i) => setP(i === null ? null : String(i))}
      />
      {p === null ? (
        <PickPrompt text="Trenutno stanje in zgodovina zadnjih ~5 mesecev." />
      ) : (
        <Card>
          <ProcedureCardHeader s={s} p={p} />
          <CardContent className="flex flex-col gap-4">
            {!hist ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <UrgencyToggle u={u} setU={setU} />
                <InstitutionCombobox
                  options={insts.map((r) => ({ i: r.i, name: r.name }))}
                  selected={sel}
                  setSelected={setSel}
                />
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>
                      Po dnevih v tednu, zadnji 4 tedni (#1)
                    </CardTitle>
                    <CardDescription>
                      Povprečje {sel.length ? 'izbranih' : 'vseh'} ustanov
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WeekdayBars data={weekday} />
                  </CardContent>
                </Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ustanova</TableHead>
                      <TableHead>
                        {hist.dates[0]} → {hist.dates.at(-1)}
                      </TableHead>
                      <TableHead className="text-right">Zdaj</TableHead>
                      <TableHead className="text-right">Δ 30 d</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shown.map((r) => (
                      <TableRow key={r.i}>
                        <TableCell className="whitespace-normal">
                          {r.name}
                        </TableCell>
                        <TableCell>
                          <Sparkline max={maxOf(s, p, u)} data={r.spark} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Days v={r.cur} max={maxOf(s, p, u)} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.delta === null ? (
                            '—'
                          ) : r.delta > 0 ? (
                            <Badge variant="outline">+{r.delta}</Badge>
                          ) : (
                            r.delta
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
          <CardFooter>
            <CostNote
              items={[
                ['snapshot.json', bytes],
                [`history/${p}.json`, h.bytes],
              ]}
            />
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

// ---------- Variant D: timeline ----------

function VariantD({ s, bytes }: { s: Snapshot; bytes: number }) {
  const [pRaw, setP] = useParam('p');
  const [u, setU] = useUrgency();
  const [sel, setSel] = useInstFilter();
  const [range, setRange] = useState('all');
  const p = pRaw === null ? null : Number(pRaw);
  const h = useHistory(p);
  const hist = h.data;
  const series = useMemo(() => (hist ? seriesFor(hist, u) : []), [hist, u]);
  const data = useMemo(() => {
    if (!hist) return [];
    const avg = averageByDate(hist, series);
    const chosen = series.filter((r) => sel.includes(r.i)).slice(0, 5);
    const rows = hist.dates.map((d, k) => {
      const row: Record<string, string | number | null> = { d, avg: avg[k] };
      for (const c of chosen) row[`i${c.i}`] = c.vals[k];
      return row;
    });
    const days = range === 'all' ? rows.length : Number(range);
    return rows.slice(-days);
  }, [hist, series, sel, range]);
  const lines = sel
    .slice(0, 5)
    .map((i) => ({ key: `i${i}`, label: s.institutions[i] }));
  return (
    <div className="flex flex-col gap-4">
      <ProcedureCombobox
        only={HISTORY_ONLY}
        s={s}
        value={p}
        onPick={(i) => setP(i === null ? null : String(i))}
      />
      {p === null ? (
        <PickPrompt text="Časovnica čakalne dobe za izbrani postopek." />
      ) : (
        <Card>
          <ProcedureCardHeader s={s} p={p} />
          <CardContent className="flex flex-col gap-4">
            {!hist ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <UrgencyToggle u={u} setU={setU} />
                  <Select
                    items={[
                      { value: '30', label: 'Zadnjih 30 dni' },
                      { value: '90', label: 'Zadnjih 90 dni' },
                      { value: 'all', label: `Vse (${hist.dates.length} dni)` },
                    ]}
                    value={range}
                    onValueChange={(v) => setRange(v ?? 'all')}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="30">Zadnjih 30 dni</SelectItem>
                        <SelectItem value="90">Zadnjih 90 dni</SelectItem>
                        <SelectItem value="all">
                          Vse ({hist.dates.length} dni)
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <InstitutionCombobox
                  options={series.map((r) => ({
                    i: r.i,
                    name: s.institutions[r.i],
                  }))}
                  selected={sel}
                  setSelected={setSel}
                />
                {sel.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    Na grafu je prvih 5 izbranih ustanov.
                  </p>
                )}
                <Timeline data={data} lines={lines} max={maxOf(s, p, u)} />
              </>
            )}
          </CardContent>
          <CardFooter>
            <CostNote
              items={[
                ['snapshot.json', bytes],
                [`history/${p}.json`, h.bytes],
              ]}
            />
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

// ---------- switcher ----------

const VARIANTS = [
  ['A', 'Iskalnik + tabela'],
  ['B', 'Pregled vseh postopkov'],
  ['C', 'Postopek + zgodovina'],
  ['D', 'Časovnica'],
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
  // Shown in the artifact build too; this branch never ships to prod.
  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-sm text-background shadow-xl">
      <button type="button" onClick={() => go(-1)} aria-label="Prejšnja">
        <ChevronLeft />
      </button>
      <span>
        PROTOTIP {VARIANTS[idx][0]} ({VARIANTS[idx][1]})
      </span>
      <button type="button" onClick={() => go(1)} aria-label="Naslednja">
        <ChevronRight />
      </button>
    </div>
  );
}

export function PrototypeHome() {
  const [variant, setVariant] = useParam('variant');
  const { data, bytes } = useJson<Snapshot>('/prototype/snapshot.json');
  const v = variant ?? 'A';
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Čakalne dobe</h1>
        {EMBED && (
          <p className="text-sm">
            <Badge variant="outline">Prototip</Badge> Vzorčni podatki iz
            razvojne baze, niso aktualni. Zgodovina (C, D) je na voljo za{' '}
            {HISTORY_ONLY?.size} postopkov. Postavitve menjaš s puščicami
            spodaj.
          </p>
        )}
        {data ? (
          <p className="text-sm text-muted-foreground">
            Stanje na dan {new Date(data.date).toLocaleDateString('sl-SI')} ·{' '}
            {data.procedures.length} postopkov · {data.institutions.length}{' '}
            ustanov
          </p>
        ) : (
          <Skeleton className="h-4 w-72" />
        )}
      </div>
      {!data ? (
        <Skeleton className="h-96 w-full" />
      ) : v === 'B' ? (
        <VariantB s={data} bytes={bytes} />
      ) : v === 'C' ? (
        <VariantC s={data} bytes={bytes} />
      ) : v === 'D' ? (
        <VariantD s={data} bytes={bytes} />
      ) : (
        <VariantA s={data} bytes={bytes} />
      )}
      <Switcher current={v} set={setVariant} />
    </main>
  );
}
