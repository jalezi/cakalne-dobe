import type { NextRequest } from 'next/server';
import { handleError } from '@/utils/handle-error';
import { getJobs } from '@/utils/get-jobs';
import { z } from 'zod';
import { parseISO, isValid, format } from 'date-fns';

// Input validation schema
const FindJobByDateSchema = z.object({
  date: z.string().refine((date) => {
    const parsed = parseISO(date);
    return isValid(parsed);
  }, "Invalid date format. Use YYYY-MM-DD"),
  limit: z.number().optional().default(20),
});


export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const result = FindJobByDateSchema.safeParse(body);
    
    if (!result.success) {
      return Response.json({
        success: false,
        error: "Invalid request body",
        details: result.error.format(),
      }, { status: 400 });
    }

    const { date, limit } = result.data;
    const parsedDate = parseISO(date);
    const formattedDate = format(parsedDate, 'yyyy-MM-dd');
    
    // Fetch jobs and find one that matches the date
    let jobId = null;
    let cursor = undefined;
    let hasMore = true;
    
    while (hasMore && !jobId) {
      const response = await getJobs({
        first: limit,
        after: cursor,
      });
      
      if (!response.success) {
        return Response.json({
          success: false,
          error: response.error,
          meta: { date: formattedDate, limit }
        });
      }
      
      const { nodes, pageInfo } = response.data.jobs;
      
      // Find job that matches our date
      const matchingJob = nodes.find(job => {
        if (job.name !== 'run') return false;
        const jobDate = job.finishedAt ? format(new Date(job.finishedAt), 'yyyy-MM-dd') : null;
        return jobDate === formattedDate;
      });
      
      if (matchingJob) {
        const { detailsPath } = matchingJob.detailedStatus;
        jobId = detailsPath.split('/').pop();
        
        return Response.json({
          success: true,
          data: {
            gitLabJobId: jobId,
            jobDate: formattedDate,
            jobFinishedAt: matchingJob.finishedAt,
          }
        });
      }
      
      // Continue pagination if needed
      cursor = pageInfo.endCursor;
      hasMore = pageInfo.hasNextPage;
    }
    
    return Response.json({
      success: false,
      error: "No job found for the specified date",
      meta: { date: formattedDate }
    });
    
  } catch (error) {
    const newError = handleError(error);
    return Response.json({
      success: false,
      error: "Failed to find GitLab job by date",
      meta: { cause: newError.cause, message: newError.message }
    }, { status: 500 });
  }
}