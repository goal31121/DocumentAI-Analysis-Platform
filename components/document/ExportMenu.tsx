'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';

export interface ExportMenuProps {
  documentId: string;
  fileName: string;
  onExport?: (format: 'json' | 'csv' | 'pdf') => void;
  className?: string;
}

export function ExportMenu({ documentId, fileName, onExport, className }: ExportMenuProps) {
  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    if (onExport) {
      onExport(format);
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}/export?format=${format}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || `Export failed: ${response.status} ${response.statusText}`);
      }

      // Handle different content types
      const contentType = response.headers.get('content-type') || '';

      let blob: Blob;
      if (contentType.includes('application/json')) {
        const data = await response.json();
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      } else {
        blob = await response.blob();
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${fileName.replace(/\.[^/.]+$/, '')}_analysis.${
        format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'pdf'
      }`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to export document. Please try again.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={className}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
