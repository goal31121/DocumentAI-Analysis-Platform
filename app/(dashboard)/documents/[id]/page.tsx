'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

type DocumentData = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
};

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;

  const [document, setDocument] = useState<DocumentData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    const fetchDocument = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/documents/${documentId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Document not found');
          } else if (response.status === 401) {
            setError('Unauthorized. Please sign in.');
            router.push('/sign-in');
          } else {
            throw new Error('Failed to fetch document');
          }
          return;
        }

        const data = await response.json();
        if (data.success) {
          setDocument(data.document);

          // Set pdfUrl for PDF files (for viewing)
          if (data.document.fileType === 'pdf') {
            // Use proxy endpoint to avoid CORS issues - convert to absolute URL
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            setPdfUrl(`${baseUrl}/api/documents/${documentId}/view`);
          }

          // Set download URL for all file types
          if (data.url) {
            setDownloadUrl(data.url);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, router]);

  const handleDownload = async () => {
    if (!document) return;

    try {
      // Use presigned URL if available, otherwise use download endpoint
      const url = downloadUrl || `/api/documents/${documentId}/download`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/documents')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        <Card className="p-8 border-destructive/50 bg-destructive/5">
          <div className="text-center">
            <p className="text-destructive font-medium mb-2">Error loading document</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <Card className="p-8">
          <div className="text-center">
            <p className="text-muted-foreground">No document data available</p>
          </div>
        </Card>
      </div>
    );
  }

  // Validate file type is supported
  const supportedTypes = ['pdf', 'docx', 'xlsx'];
  if (!supportedTypes.includes(document.fileType.toLowerCase())) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/documents')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Documents
        </Button>
        <Card className="p-8">
          <div className="text-center">
            <p className="font-medium mb-2">Viewer not available</p>
            <p className="text-sm text-muted-foreground">
              File type {document.fileType.toUpperCase()} is not supported. Supported types: PDF, DOCX, XLSX
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/documents')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{document.fileName}</h1>
            <p className="text-xs text-muted-foreground">
              {document.status === 'completed' ? 'Ready to view' : `Status: ${document.status}`}
            </p>
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="flex-1 overflow-hidden">
        <DocumentViewer
          documentId={documentId}
          fileType={document.fileType.toLowerCase() as 'pdf' | 'docx' | 'xlsx'}
          fileName={document.fileName}
          pdfUrl={pdfUrl || undefined}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
