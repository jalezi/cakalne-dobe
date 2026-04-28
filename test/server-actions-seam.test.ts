import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMocks = vi.hoisted(() => ({
  getProcedureAvgWtForJob: vi.fn(),
  getProcedureAvgWtPerJobChart: vi.fn(),
  getProcedureWtForInstOnDay: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {},
}));

vi.mock('@/db/queries/waiting-periods', () => ({
  getProcedureAvgWtForJob: queryMocks.getProcedureAvgWtForJob,
  getProcedureAvgWtPerJobChart: queryMocks.getProcedureAvgWtPerJobChart,
  getProcedureWtForInstOnDay: queryMocks.getProcedureWtForInstOnDay,
}));

import { getProcedureAvgWtForJob } from '../src/actions/get-procedure-avg-wt-for-job';
import { getProcedureAvgWtPerJobChart } from '../src/actions/get-procedure-avg-wt-per-job-chart';
import { getProcedureWtForInstOnDay } from '../src/actions/get-procedure-wt-for-inst-on-day';

describe('Action seam: getProcedureAvgWtForJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a typed success result for valid input', async () => {
    queryMocks.getProcedureAvgWtForJob.mockResolvedValueOnce([
      {
        avg: { regular: 10, fast: 5, veryFast: 2 },
        total: { regular: 10, fast: 5, veryFast: 2 },
        count: { regular: 1, fast: 1, veryFast: 1 },
        procedureCode: 'ABC-123',
        procedureName: 'Procedure',
      },
    ]);

    const result = await getProcedureAvgWtForJob({ jobId: 'job-1' });

    expect(result).toEqual({
      success: true,
      data: [
        {
          avg: { regular: 10, fast: 5, veryFast: 2 },
          total: { regular: 10, fast: 5, veryFast: 2 },
          count: { regular: 1, fast: 1, veryFast: 1 },
          procedureCode: 'ABC-123',
          procedureName: 'Procedure',
        },
      ],
    });
  });

  it('returns a typed invalid-input error when params are malformed', async () => {
    const result = await getProcedureAvgWtForJob({ jobId: '' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
      if (result.error.code === 'INVALID_INPUT') {
        expect(result.error.issues).toHaveLength(1);
      }
    }

    expect(queryMocks.getProcedureAvgWtForJob).not.toHaveBeenCalled();
  });

  it('returns a typed query error instead of throwing', async () => {
    queryMocks.getProcedureAvgWtForJob.mockRejectedValueOnce(
      new Error('db down')
    );

    const result = await getProcedureAvgWtForJob({ jobId: 'job-1' });

    expect(result).toEqual({
      success: false,
      error: {
        code: 'QUERY_FAILED',
        message:
          'Failed to fetch waiting-period averages for the selected job.',
      },
    });
  });
});

describe('Action seam: getProcedureAvgWtPerJobChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a typed success result for valid input', async () => {
    queryMocks.getProcedureAvgWtPerJobChart.mockResolvedValueOnce([
      { x: '2025-01-10', y: { regular: 10, fast: 4, veryFast: 1 } },
    ]);

    const result = await getProcedureAvgWtPerJobChart({
      procedureCode: 'ABC-123',
      fromDate: '2025-01-01',
      toDate: '2025-01-31',
    });

    expect(result).toEqual({
      success: true,
      data: [{ x: '2025-01-10', y: { regular: 10, fast: 4, veryFast: 1 } }],
    });
  });

  it('fills date-range defaults when only procedureCode is provided', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-28T10:15:00.000Z'));
    queryMocks.getProcedureAvgWtPerJobChart.mockResolvedValueOnce([]);

    await getProcedureAvgWtPerJobChart({
      procedureCode: 'ABC-123',
    });

    expect(queryMocks.getProcedureAvgWtPerJobChart).toHaveBeenCalledWith(
      {},
      {
        procedureCode: 'ABC-123',
        fromDate: '2026-03-29',
        toDate: '2026-04-28',
      }
    );

    vi.useRealTimers();
  });

  it('returns a typed invalid-input error when date range is invalid', async () => {
    const result = await getProcedureAvgWtPerJobChart({
      procedureCode: 'ABC-123',
      fromDate: '2026-05-01',
      toDate: '2026-04-01',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
    }

    expect(queryMocks.getProcedureAvgWtPerJobChart).not.toHaveBeenCalled();
  });

  it('returns a typed query error instead of throwing', async () => {
    queryMocks.getProcedureAvgWtPerJobChart.mockRejectedValueOnce(
      new Error('db down')
    );

    const result = await getProcedureAvgWtPerJobChart({
      procedureCode: 'ABC-123',
      fromDate: '2026-03-01',
      toDate: '2026-04-01',
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: 'QUERY_FAILED',
        message: 'Failed to fetch chart data for the selected procedure.',
      },
    });
  });
});

describe('Action seam: getProcedureWtForInstOnDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a typed success result for valid input', async () => {
    queryMocks.getProcedureWtForInstOnDay.mockResolvedValueOnce([
      {
        x: 'Institution',
        y: { regular: 15, fast: 7, veryFast: 3 },
      },
    ]);

    const result = await getProcedureWtForInstOnDay({
      procedureCode: 'ABC-123',
      date: '2026-04-28',
    });

    expect(result).toEqual({
      success: true,
      data: [
        {
          x: 'Institution',
          y: { regular: 15, fast: 7, veryFast: 3 },
        },
      ],
    });
  });

  it('returns a typed invalid-input error when params are malformed', async () => {
    const result = await getProcedureWtForInstOnDay({
      procedureCode: 'ABC-123',
      date: 'not-a-date',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.code).toBe('INVALID_INPUT');
      if (result.error.code === 'INVALID_INPUT') {
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    }

    expect(queryMocks.getProcedureWtForInstOnDay).not.toHaveBeenCalled();
  });

  it('returns a typed query error instead of throwing', async () => {
    queryMocks.getProcedureWtForInstOnDay.mockRejectedValueOnce(
      new Error('db down')
    );

    const result = await getProcedureWtForInstOnDay({
      procedureCode: 'ABC-123',
      date: '2026-04-28',
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: 'QUERY_FAILED',
        message:
          'Failed to fetch institution waiting periods for the selected date.',
      },
    });
  });
});
