'use client';

import { downloadJson } from '@/components/downloadable-json';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { Download, ExternalLink, MoreHorizontal } from 'lucide-react';
import { getJsonPath } from '@/utils/get-json';
import { toast } from 'sonner';

interface JsonDropDownMenuProps {
  gitLabJobId: string;
  fileName?: string;
}
export function JsonDropDownMenu({
  gitLabJobId: id,
  fileName,
}: JsonDropDownMenuProps) {
  const handleDownload = () => {
    toast.promise(downloadJson(id, fileName), {
      loading: 'Prenašam...',
      success: 'Datoteka je bila prenesena.',
      error: () => `Nekaj je šlo narobe. Poskusi znova.`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="ml-auto">
        <Button aria-haspopup="true" size="icon" variant="ghost">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Odpri/Zapri menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Vir</DropdownMenuLabel>
        <DropdownMenuItem className="gap-x-2">
          <ExternalLink size={16} />
          <a href={getJsonPath(id)} target="_blank" rel="noreferrer noopener">
            Poglej
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-x-2" onClick={handleDownload}>
          <Download size={16} />
          Prenesi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
