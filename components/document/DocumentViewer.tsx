'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PDFToolbar } from './PDFToolbar';
import { PDFThumbnails } from './PDFThumbnails';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Dynamically import PDF viewer and plugins to avoid SSR issues
const PDFViewer = dynamic(() => import('@react-pdf-viewer/core').then((mod) => mod.Viewer), { ssr: false });
const Worker = dynamic(() => import('@react-pdf-viewer/core').then((mod) => mod.Worker), { ssr: false });

// Page navigation plugin will be initialized in component

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
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [targetPage, setTargetPage] = useState<number | null>(null); // For programmatic page navigation
  const [zoomKey, setZoomKey] = useState(0); // Force re-render on zoom change
  const [pageKey, setPageKey] = useState(0); // Separate key for page navigation
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastZoomRef = useRef<number>(1); // Track last zoom to prevent unnecessary updates
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetPageRef = useRef<number | null>(null); // Track target page in ref to avoid closure issues
  const isNavigatingRef = useRef<boolean>(false); // Flag to prevent onPageChange from interfering during navigation
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const jumpToPageRef = useRef<((pageIndex: number) => void) | null>(null); // Store jumpToPage function from plugin
  const [plugins, setPlugins] = useState<any[]>([]);

  // Initialize zoom ref
  useEffect(() => {
    lastZoomRef.current = zoom;
  }, [zoom]);

  // Initialize page navigation plugin
  useEffect(() => {
    if (typeof window !== 'undefined' && plugins.length === 0) {
      import('@react-pdf-viewer/page-navigation')
        .then((mod) => {
          const pluginInstance = mod.pageNavigationPlugin();
          const { jumpToPage } = pluginInstance;
          jumpToPageRef.current = jumpToPage;
          setPlugins([pluginInstance]);
          console.log('Page navigation plugin initialized');
        })
        .catch((err) => {
          console.warn('Failed to load page-navigation plugin:', err);
        });
    }
  }, [plugins.length]);
  const viewerRef = useRef<{
    zoomTo?: (scale: number) => void;
    rotate?: (angle: number) => void;
    scrollToPage?: (page: number) => void;
    jumpToPage?: (page: number) => void;
  } | null>(null);

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

      // Timeout fallback - if PDF doesn't load in 30 seconds, show error
      // Only trigger if still loading (check current state, not closure)
      loadingTimeoutRef.current = setTimeout(() => {
        setLoading((currentLoading) => {
          if (currentLoading) {
            console.warn('PDF load timeout after 30 seconds');
            setError('PDF took too long to load. Please try refreshing the page.');
            return false;
          }
          return currentLoading;
        });
      }, 30000);

      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    }
  }, [pdfUrl, workerReady]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  const handlePageChange = (e: { currentPage: number }) => {
    // Ignore page change events during programmatic navigation
    if (isNavigatingRef.current) {
      console.log(`Ignoring page change during navigation: ${e.currentPage}, targetPage: ${targetPageRef.current}`);
      return;
    }

    const newPage = Math.max(1, Math.min(e.currentPage || 1, totalPages || 1)); // Clamp between 1 and totalPages
    const targetPageToCheck = targetPageRef.current ?? targetPage;

    // If we're navigating to a target page, only accept the change if it matches
    if (targetPageToCheck !== null) {
      if (newPage === targetPageToCheck) {
        console.log(`Navigation complete: reached target page ${newPage}`);
        setCurrentPage(newPage);
        // Clear targetPage after a short delay
        setTimeout(() => {
          targetPageRef.current = null;
          setTargetPage(null);
          isNavigatingRef.current = false;
        }, 200);
      } else {
        // Ignore intermediate page changes during navigation
        console.log(`Ignoring intermediate page change: ${newPage} (target: ${targetPageToCheck})`);
        return;
      }
    } else {
      // Normal page change (user scrolling)
      if (newPage !== currentPage && newPage > 0) {
        console.log(`Page changed: ${currentPage} -> ${newPage}`);
        setCurrentPage(newPage);
      }
    }
  };

  const handleZoomChange = (newZoom: number) => {
    const roundedZoom = Math.round(newZoom * 10) / 10; // Round to 1 decimal place
    // Only update if zoom actually changed significantly (avoid infinite loops)
    if (Math.abs(roundedZoom - lastZoomRef.current) > 0.05) {
      setZoom(roundedZoom);
      lastZoomRef.current = roundedZoom;

      // Debounce zoom key update to prevent excessive re-renders
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
      zoomTimeoutRef.current = setTimeout(() => {
        setZoomKey((prev) => prev + 1);
      }, 100); // 100ms debounce
    }
  };

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    if (viewerRef.current?.rotate) {
      viewerRef.current.rotate(newRotation);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      if (viewerRef.current?.scrollToPage) {
        viewerRef.current.scrollToPage(newPage - 1);
      }
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      if (viewerRef.current?.scrollToPage) {
        viewerRef.current.scrollToPage(newPage - 1);
      }
    }
  };

  const handlePageSelect = async (page: number) => {
    const targetPageNum = Math.max(1, Math.min(page, totalPages || 1));
    if (targetPageNum !== currentPage && totalPages > 0) {
      console.log(`Thumbnail clicked: navigating to page ${targetPageNum} (current: ${currentPage})`);

      // Clear any existing navigation timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }

      // Set navigation flag to ignore onPageChange events during navigation
      isNavigatingRef.current = true;
      // Set both state and ref
      targetPageRef.current = targetPageNum;
      setTargetPage(targetPageNum);

      // Try to use jumpToPage if available (from page-navigation plugin)
      if (jumpToPageRef.current) {
        console.log(`Using jumpToPage to navigate to page ${targetPageNum - 1} (0-indexed)`);
        try {
          jumpToPageRef.current(targetPageNum - 1); // Plugin uses 0-indexed pages
          // Update currentPage immediately
          setCurrentPage(targetPageNum);
          // Clear flag after a short delay
          navigationTimeoutRef.current = setTimeout(() => {
            isNavigatingRef.current = false;
            targetPageRef.current = null;
            setTargetPage(null);
            console.log(`Navigation complete via jumpToPage`);
          }, 300);
          return;
        } catch (error) {
          console.error('jumpToPage failed, falling back to key-based navigation:', error);
        }
      }

      // Fallback: Update pageKey to force re-render with new initialPage
      setPageKey((prev) => prev + 1);

      // Clear navigation flag after navigation should complete
      navigationTimeoutRef.current = setTimeout(() => {
        isNavigatingRef.current = false;
        console.log(`Navigation flag cleared for page ${targetPageNum}`);
      }, 1000); // Increased timeout to allow PDF to fully load and navigate
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName;
      link.click();
    }
  };

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
            <ScrollArea className="flex-1">
              <div className="flex justify-center p-4 w-full h-full">
                <div
                  className="w-full"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                    minHeight: '800px',
                  }}
                >
                  <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                    <div
                      className="w-full h-full"
                      style={{ minHeight: '800px' }}
                    >
                      <PDFViewer
                        fileUrl={pdfUrl}
                        httpHeaders={{
                          Accept: 'application/pdf',
                        }}
                        withCredentials={true}
                        plugins={plugins}
                        onDocumentLoad={(e: { doc?: { numPages?: number }; file?: unknown }) => {
                          try {
                            // Clear timeout since PDF loaded successfully
                            if (loadingTimeoutRef.current) {
                              clearTimeout(loadingTimeoutRef.current);
                              loadingTimeoutRef.current = null;
                            }

                            // Event structure: {doc: PDFDocumentProxy, file: {...}}
                            const doc = e?.doc;
                            if (doc && typeof doc.numPages === 'number') {
                              const numPages = doc.numPages;
                              console.log(
                                `PDF loaded successfully: ${numPages} pages, targetPage: ${targetPageRef.current}, currentPage: ${currentPage}`
                              );
                              setTotalPages(numPages);

                              // Check ref first (most up-to-date), then state
                              const targetPageToUse = targetPageRef.current ?? targetPage;

                              if (targetPageToUse !== null) {
                                const validTargetPage = Math.max(1, Math.min(targetPageToUse, numPages));
                                console.log(`Setting currentPage to ${validTargetPage} (from targetPage)`);
                                // Set navigation flag to prevent onPageChange from interfering
                                isNavigatingRef.current = true;
                                setCurrentPage(validTargetPage);
                                // Clear flag after navigation should be complete
                                // Don't set a new timeout here - let handlePageSelect's timeout handle it
                              } else {
                                // Only validate/reset currentPage if no targetPage is set
                                const validPage = Math.max(1, Math.min(currentPage, numPages));
                                if (validPage !== currentPage && currentPage > 0) {
                                  console.log(`Validating currentPage: ${currentPage} -> ${validPage}`);
                                  setCurrentPage(validPage);
                                }
                              }
                              setLoading(false);
                            } else {
                              console.warn('Unexpected document load event structure:', {
                                hasDoc: !!doc,
                                docType: typeof doc,
                                numPagesType: typeof doc?.numPages,
                              });
                              // If we can't get page count, assume it loaded and try to continue
                              console.log('Document loaded but page count unavailable, continuing...');
                              setLoading(false);
                            }
                          } catch (err) {
                            console.error('Error processing document load:', err);
                            setError('Failed to process PDF document');
                            setLoading(false);
                          }
                        }}
                        onPageChange={handlePageChange}
                        initialPage={targetPage !== null ? Math.max(0, targetPage - 1) : Math.max(0, currentPage - 1)}
                        key={`pdf-page-${pageKey}-zoom-${zoomKey}`}
                        defaultScale={zoom}
                        renderError={(error) => {
                          console.error('PDF render error:', error);
                          console.error('Error details:', {
                            message: error.message,
                            name: error.name,
                          });
                          setError(`Failed to render PDF: ${error.message || 'Unknown error'}`);
                          setLoading(false);
                          return (
                            <div className="p-8 text-center">
                              <p className="text-destructive font-medium mb-2">Error loading PDF</p>
                              <p className="text-sm text-muted-foreground">{error.message || 'Unknown error'}</p>
                            </div>
                          );
                        }}
                      />
                    </div>
                  </Worker>
                </div>
              </div>
            </ScrollArea>
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
