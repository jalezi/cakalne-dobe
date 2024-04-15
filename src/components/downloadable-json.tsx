'use client';

import { toast } from 'sonner';

import { getJson } from '@/utils/get-json';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import type { FetchResponse } from '@/types';

interface DownloadableJsonProps {
  jsonId: string;
  fileName?: string;
}

export const downloadJson = async (
  jsonId: string,
  fileName?: string
): Promise<FetchResponse> => {
  try {
    const job = await getJson(jsonId);
    const blob = new Blob([JSON.stringify(job, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `${jsonId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: error?.toString() || 'Unknown error' };
  }
};

export function DownloadableJson({ jsonId, fileName }: DownloadableJsonProps) {
  const handleDownload = () => {
    toast.promise(downloadJson(jsonId, fileName), {
      loading: 'Prenašam...',
      success: 'Datoteka je bila prenesena.',
      error: () => `Nekaj je šlo narobe. Poskusi znova.`,
    });
  };

  return (
    <Button onClick={handleDownload} variant="link" size="icon">
      <Download size={16} />
      <span className="sr-only">Prenesi json</span>
    </Button>
  );
}
