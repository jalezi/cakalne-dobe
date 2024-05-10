import { type NextRequest } from 'next/server';
import { handleError } from '@/utils/handle-error';
import { getLastJobId } from '@/utils/get-last-job-id';

export type GetLatestGitLabJobId =
  | {
      success: true;
      data: {
        gitLabJobId: string;
        jobFinishedAt: string;
      };
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

  try {
    const response = await getLastJobId(firstNumber, after);

    if (!response.success) {
      return Response.json({
        success: false,
        error: response.error,
        meta: response.meta,
      });
    }

    return Response.json({
      success: true,
      data: {
        gitLabJobId: response.data.gitLabJobId,
        jobFinishedAt: response.data.jobFinishedAt,
      },
      meta: response.meta,
    });
  } catch (error) {
    const newError = handleError(error);
    // ? should we check what kind of error it is and return different response?
    return Response.json({
      success: false,
      error: 'Failed to fetch latest GitLab job ID',
      meta: { cause: newError.cause, message: newError.message },
    });
  }
}
