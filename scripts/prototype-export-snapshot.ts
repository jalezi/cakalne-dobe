// PROTOTYPE (throwaway, branch prototype/ui-current-state): export the latest
// Job's Snapshot from dev.db to public/prototype/snapshot.json, normalized.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:dev.db' });

async function main() {
  const job = (
    await db.execute(
      'select id, start_date as date from jobs order by start_date desc limit 1'
    )
  ).rows[0];
  const procs = (
    await db.execute({
      sql: `select p.id, p.code, p.name, m.regular, m.fast, m.very_fast
            from procedures p join max_allowed_days m on m.procedure_id = p.id
            where m.job_id = ? order by p.name`,
      args: [job.id],
    })
  ).rows;
  const insts = (
    await db.execute({
      sql: `select distinct i.id, i.name from institutions i
            join waiting_periods w on w.institution_id = i.id
            where w.job_id = ? order by i.name`,
      args: [job.id],
    })
  ).rows;
  const pIdx = new Map(procs.map((p, i) => [p.id, i]));
  const iIdx = new Map(insts.map((x, i) => [x.id, i]));
  const wps = (
    await db.execute({
      sql: 'select procedure_id, institution_id, regular, fast, very_fast from waiting_periods where job_id = ?',
      args: [job.id],
    })
  ).rows;
  const out = {
    date: job.date,
    // [code, name, maxRegular, maxFast, maxVeryFast]
    procedures: procs.map((p) => [
      p.code,
      p.name,
      p.regular,
      p.fast,
      p.very_fast,
    ]),
    institutions: insts.map((x) => x.name),
    // [procedureIdx, institutionIdx, regular, fast, veryFast]
    rows: wps
      .filter((w) => pIdx.has(w.procedure_id))
      .map((w) => [
        pIdx.get(w.procedure_id),
        iIdx.get(w.institution_id),
        w.regular,
        w.fast,
        w.very_fast,
      ]),
  };
  const json = JSON.stringify(out);
  mkdirSync('public/prototype', { recursive: true });
  writeFileSync('public/prototype/snapshot.json', json);
  process.stdout.write(
    `job ${job.date}: ${out.procedures.length} procedures, ${out.institutions.length} institutions, ${out.rows.length} rows, ${(json.length / 1024).toFixed(0)} KB\n`
  );

  // History: one file per procedure, public/prototype/history/<procIdx>.json
  // { dates: [...], series: { [instIdx]: [[r,f,vf] | null per date] } }
  const jobs = (
    await db.execute(
      'select id, substr(start_date, 1, 10) as d from jobs order by start_date'
    )
  ).rows;
  const jIdx = new Map(jobs.map((j, i) => [j.id, i]));
  const dates = jobs.map((j) => j.d);
  mkdirSync('public/prototype/history', { recursive: true });
  let total = 0;
  for (const [pi, p] of procs.entries()) {
    const rs = (
      await db.execute({
        sql: 'select job_id, institution_id, regular, fast, very_fast from waiting_periods where procedure_id = ?',
        args: [p.id],
      })
    ).rows;
    const series: Record<number, (number[] | null)[]> = {};
    for (const r of rs) {
      const ii = iIdx.get(r.institution_id);
      if (ii === undefined) continue; // institution not in latest Snapshot
      series[ii] ??= dates.map(() => null);
      series[ii][jIdx.get(r.job_id) as number] = [
        r.regular,
        r.fast,
        r.very_fast,
      ] as number[];
    }
    const h = JSON.stringify({ dates, series });
    total += h.length;
    writeFileSync(`public/prototype/history/${pi}.json`, h);
  }
  process.stdout.write(
    `history: ${procs.length} files, ${dates.length} days, ${(total / 1024 / 1024).toFixed(1)} MB total, avg ${(total / procs.length / 1024).toFixed(1)} KB\n`
  );
}
main();
