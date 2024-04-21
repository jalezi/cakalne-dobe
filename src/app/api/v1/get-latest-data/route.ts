import { type GetLatestGitLabJobId } from '../get-latest-gitlab-job-id/route';
import { handleError } from '@/utils/handle-error';
import type { AllData } from '@/lib/zod-schemas/data-schemas';
import type { NextRequest } from 'next/server';

const BASE_URL = new URL('https://mitar.gitlab.io');
const BASE_JOBS_URL = new URL('-/cakalne-dobe/-/jobs', BASE_URL);
const JSON_OUT_PATH = '/artifacts/out.json';

export type GetLatestData =
  | {
      success: true;
      data: AllData & { gitLabJobId: string };
      meta?: Record<string, unknown>;
    }
  | {
      success: false;
      error: string;
      meta?: Record<string, unknown>;
    };

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const siteUrl = request.nextUrl.origin;
  const apiUrl = new URL('/api/v1/get-latest-gitlab-job-id', siteUrl);

  let gitLabJobId: string;

  try {
    const response = await fetch(apiUrl, {
      next: { revalidate: 0, tags: ['getLatestGitLabJobIs'] },
    });

    if (!response.ok) {
      return Response.json({
        success: false,
        error: 'Failed to fetch latest GitLab job ID',
        meta: {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        },
      });
    }

    const result = (await response.json()) as GetLatestGitLabJobId;
    if (!result.success) {
      return Response.json({
        success: false,
        error: result.error,
        meta: result,
      });
    }
    gitLabJobId = result.data.gitLabJobId;
    if (!gitLabJobId) {
      // ? should we check for empty string or undefined? It might be redundant
      throw new Error('GitLab job ID is missing');
    }
  } catch (error) {
    const newError = handleError(error);
    return Response.json({
      success: false,
      error: 'Failed to fetch latest GitLab job ID',
      meta: { cause: newError.message, message: newError.message, url: apiUrl },
    });
  }

  const jobUrl = new URL(`jobs/${gitLabJobId}${JSON_OUT_PATH}`, BASE_JOBS_URL);

  try {
    const responseOut = await fetch(jobUrl, {
      next: { revalidate: 60, tags: ['getLatestData'] },
    });

    if (!responseOut.ok) {
      return Response.json(
        {
          success: false,
          error: 'Failed to fetch job output',
          meta: {
            gitLabJobId,
            jobUrl,
            status: responseOut.status,
            statusText: responseOut.statusText,
          },
        },
        { status: responseOut.status }
      );
    }

    const data = (await responseOut.json()) as AllData;
    const jobData = { gitLabJobId } as const;
    const combinedData: { gitLabJobId: string } & AllData = Object.assign(
      jobData,
      data
    );
    return Response.json({
      success: true,
      data: combinedData,
      meta: {
        gitLabJobId,
        jobUrl,
      },
    });
  } catch (error) {
    console.error(error);
    const newError = handleError(error);
    // ? should we check what kind of error it is and return different response?
    return Response.json({
      success: false,
      error: 'Failed to fetch job output',
      meta: { gitLabJobId, jobUrl, cause: newError.message },
    });
  }
}
