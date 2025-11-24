'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PDFToolbar } from './PDFToolbar';
import { PDFThumbnails } from './PDFThumbnails';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { LoadError } from '@react-pdf-viewer/core';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { zoomPlugin } from '@react-pdf-viewer/zoom';

// Dynamically import PDF viewer to avoid SSR issues
const PDFViewer = dynamic(() => import('@react-pdf-viewer/core').then((mod) => mod.Viewer), { ssr: false });
const Worker = dynamic(() => import('@react-pdf-viewer/core').then((mod) => mod.Worker), { ssr: false });

export interface DocumentViewerProps {
  pdfUrl: string;
  fileName: string;
  highlights?: Array<{
    pageIndex: number;
    text: string;
    position?: { x: number; y: number; width: number; height: number };
  }>;
  onDownload?: () => void;
  className?: string;
}

export function DocumentViewer({ pdfUrl, fileName, onDownload, className }: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const totalPagesRef = useRef(totalPages);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef<HTMLDivElement>(null);
  const pageNavigationPluginRef = useRef<ReturnType<typeof pageNavigationPlugin> | null>(null);
  const zoomPluginRef = useRef<ReturnType<typeof zoomPlugin> | null>(null);
  const pageNavigationPluginInstance = pageNavigationPlugin();
  const zoomPluginInstance = zoomPlugin();

  // Configure PDF.js worker
  useEffect(() => {
    // Set worker source for PDF.js
    if (typeof window !== 'undefined') {
      import('pdfjs-dist')
        .then((pdfjs) => {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          setWorkerReady(true);
          console.log('PDF.js worker configured');
        })
        .catch((err) => {
          console.error('Failed to load PDF.js:', err);
          setError('Failed to initialize PDF viewer');
        });
    }
  }, []);

  // Reset loading state when PDF URL changes and verify URL accessibility
  useEffect(() => {
    if (pdfUrl && workerReady) {
      setLoading(true);
      setError(null);
      console.log('PDF URL set, waiting for document load:', pdfUrl);

      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Test if URL is accessible
      fetch(pdfUrl, { method: 'HEAD', credentials: 'include' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`PDF URL returned ${response.status}: ${response.statusText}`);
          }
          console.log('PDF URL is accessible, content-type:', response.headers.get('content-type'));
        })
        .catch((err) => {
          console.error('PDF URL accessibility check failed:', err);
          // Don't set error here, let the PDF viewer handle it
        });

      // Timeout fallback - if PDF doesn't load in 60 seconds, show error
      // Increased timeout to account for plugin initialization and PDF loading
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading((currentLoading) => {
          if (currentLoading) {
            console.warn('PDF load timeout after 60 seconds');
            setError('PDF took too long to load. Please try refreshing the page.');
            return false;
          }
          return currentLoading;
        });
      }, 60000);

      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    }
  }, [pdfUrl, workerReady]);

  // Cleanup loading timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (rotationRef.current) {
      rotationRef.current.style.setProperty('--rotation', `${rotation}deg`);
    }
  }, [rotation]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  useEffect(() => {
    pageNavigationPluginRef.current = pageNavigationPluginInstance;
    zoomPluginRef.current = zoomPluginInstance;
  }, [pageNavigationPluginInstance, pageNavigationPluginRef, zoomPluginInstance, zoomPluginRef]);

  const handlePageChange = useCallback((e: { currentPage: number }) => {
    setCurrentPage((prevPage) => {
      const boundedTotalPages = totalPagesRef.current || Infinity;
      const newPage = Math.min(Math.max(1, e.currentPage + 1), boundedTotalPages);
      return newPage !== prevPage ? newPage : prevPage;
    });
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    const roundedZoom = Math.round(newZoom * 10) / 10;
    setZoom((prevZoom) => {
      if (Math.abs(roundedZoom - prevZoom) > 0.05) {
        zoomPluginRef.current?.zoomTo(roundedZoom);
        return roundedZoom;
      }
      return prevZoom;
    });
  }, []);

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    // Rotation will be handled via CSS transform on the container
  };

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      pageNavigationPluginRef.current?.jumpToPreviousPage();
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      pageNavigationPluginRef.current?.jumpToNextPage();
    }
  }, [currentPage, totalPages]);

  const handlePageSelect = useCallback(
    (page: number) => {
      if (totalPages === 0) {
        return;
      }
      const targetPageNum = Math.max(1, Math.min(page, totalPages));
      if (targetPageNum !== currentPage) {
        pageNavigationPluginRef.current?.jumpToPage(targetPageNum - 1);
      }
    },
    [currentPage, totalPages]
  );

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = useCallback(() => {
    if (onDownload) {
      onDownload();
    } else {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.click();
    }
  }, [onDownload, pdfUrl, fileName]);

  const handleDocumentLoad = useCallback((e: { doc?: { numPages?: number }; file?: unknown }) => {
    try {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      const doc = e?.doc;
      if (doc && typeof doc.numPages === 'number') {
        const numPages = doc.numPages;
        setTotalPages(numPages);
        setCurrentPage((prev) => {
          const validPage = Math.max(1, Math.min(prev, numPages));
          return validPage !== prev ? validPage : prev;
        });
      }
    } catch (err) {
      console.error('Error processing document load:', err);
      setError('Failed to process PDF document');
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePDFZoom = useCallback((event: { scale: number }) => {
    const roundedScale = Math.round(event.scale * 10) / 10;
    setZoom((prevZoom) => {
      return Math.abs(roundedScale - prevZoom) > 0.01 ? roundedScale : prevZoom;
    });
  }, []);

  const handleRenderError = useCallback((renderError: LoadError): React.ReactElement => {
    console.error('PDF render error:', renderError);
    setError(`Failed to render PDF: ${renderError.message || 'Unknown error'}`);
    setLoading(false);
    return (
      <div className="p-8 text-center">
        <p className="text-destructive font-medium mb-2">Error loading PDF</p>
        <p className="text-sm text-muted-foreground">{renderError.message || 'Unknown error'}</p>
      </div>
    );
  }, []);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Toolbar */}
      <PDFToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        rotation={rotation}
        onZoomChange={handleZoomChange}
        onRotate={handleRotate}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onDownload={handleDownload}
        onFullscreen={handleFullscreen}
        onToggleThumbnails={() => setShowThumbnails(!showThumbnails)}
        showThumbnails={showThumbnails}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <PDFThumbnails
            totalPages={totalPages}
            currentPage={currentPage}
            onPageSelect={handlePageSelect}
            pdfUrl={pdfUrl}
          />
        )}

        {/* PDF Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <p className="text-destructive font-medium mb-2">Failed to load PDF</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {!error && pdfUrl && workerReady && (
            <div
              className="flex-1 h-full w-full pdf-viewer-container"
              ref={viewerContainerRef}
            >
              <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                <div
                  className="h-full w-full pdf-viewer-rotation"
                  ref={rotationRef}
                >
                  <PDFViewer
                    fileUrl={pdfUrl}
                    httpHeaders={{
                      Accept: 'application/pdf',
                    }}
                    withCredentials={true}
                    initialPage={0}
                    defaultScale={zoom}
                    plugins={[pageNavigationPluginInstance, zoomPluginInstance]}
                    onDocumentLoad={handleDocumentLoad}
                    onZoom={handlePDFZoom}
                    onPageChange={handlePageChange}
                    renderError={handleRenderError}
                  />
                </div>
              </Worker>
            </div>
          )}

          {!error && pdfUrl && !workerReady && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Initializing PDF viewer...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
