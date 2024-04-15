'use client';

import { getJson } from '@/utils/get-json';
import { Button } from './ui/button';
import { Download } from 'lucide-react';

interface DownloadableJsonProps {
  jsonId: string;
}

export const downloadJson = async (jsonId: string) => {
  try {
    const job = await getJson(jsonId);
    const blob = new Blob([JSON.stringify(job, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jsonId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return { success: true, data: 'ok' };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error };
  }
};

export function DownloadableJson({ jsonId }: DownloadableJsonProps) {
  const handleDownload = () => {
    downloadJson(jsonId);
  };

  return (
    <Button onClick={handleDownload} variant="link" size="icon">
      <Download size={16} />
      <span className="sr-only">Prenesi json</span>
    </Button>
  );
}
