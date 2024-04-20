import { type NextRequest } from 'next/server';
import { getJobs } from '@/utils/get-jobs';

export type GetLatestGitLabJobId =
  | {
      success: true;
      data: {
        gitLabJobId: string;
        jobFinishedAt: string;
      };
    }
  | {
      success: false;
      error: string;
      meta?: {
        params?: {
          first: number;
          after: string | undefined;
        };
        nodes?: number;
        pageInfo?: {
          endCursor: string;
          hasNextPage: boolean;
        };
      };
    };

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const first = searchParams.get('first');

  if (first && isNaN(parseInt(first))) {
    // return proper error response

    return Response.json(
      {
        success: false,
        error: 'Invalid first parameter',
      },
      { status: 400 }
    );
  }

  const firstNumber =
    first && !isNaN(parseInt(first)) ? parseInt(first, 10) : 10;
  const after = searchParams.get('after') ?? undefined;

  const response = await getJobs({
    first: firstNumber,
    after,
  });
  if (!response.success) {
    return Response.json({
      success: false,
      error: response.error,
      meta: { params: { first, after } },
    });
  }

  const { nodes, pageInfo } = response.data.jobs;
  const job = nodes.find((job) => job.name === 'run');
  const meta = {
    params: {
      first: firstNumber,
      after,
    },
    nodes: nodes.length,
    pageInfo,
  };

  if (!job) {
    return Response.json({
      success: false,
      error: 'No job found',
      meta,
    });
  }

  const { detailsPath } = job.detailedStatus;
  const gitLabJobId = detailsPath.split('/').pop();

  if (!gitLabJobId) {
    return Response.json({
      success: false,
      error: 'No GitLab job ID found',
      meta,
    });
  }

  return Response.json({
    success: true,
    data: { gitLabJobId, jobFinishedAt: job.finishedAt },
    meta,
  });
}
