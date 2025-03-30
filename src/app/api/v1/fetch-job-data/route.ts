import { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError } from '@/utils/handle-error';

const BASE_URL = new URL('https://wayback-automachine.gitlab.io');
const BASE_JOBS_URL = new URL('-/cakalne-dobe/-/jobs', BASE_URL);
const JSON_OUT_PATH = '/artifacts/out.json';

const FetchJobDataSchema = z.object({
  gitLabJobId: z.string().min(1, "GitLab job ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const result = FetchJobDataSchema.safeParse(body);
    
    if (!result.success) {
      return Response.json({
        success: false,
        error: "Invalid request body",
        details: result.error.format(),
      }, { status: 400 });
    }
    
    const { gitLabJobId } = result.data;
    const jobUrl = new URL(
        `jobs/${gitLabJobId}${JSON_OUT_PATH}`,
        BASE_JOBS_URL
      );
    
    // Fetch job output
    const responseOut = await fetch(jobUrl);
    
    if (!responseOut.ok) {
      return Response.json({
        success: false,
        error: `Failed to fetch job output (HTTP ${responseOut.status})`,
        meta: { gitLabJobId, jobUrl: jobUrl.toString() }
      });
    }
    
    // Parse the JSON output
    const jobOutput = await responseOut.json();
    
    return Response.json({
      success: true,
      data: {
        gitLabJobId,
        jobOutput
      }
    });
    
  } catch (error) {
    const newError = handleError(error);
    return Response.json({
      success: false,
      error: "Failed to fetch job data",
      meta: { cause: newError.cause, message: newError.message }
    }, { status: 500 });
  }
}