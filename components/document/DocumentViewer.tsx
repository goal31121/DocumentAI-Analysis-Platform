'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { PDFToolbar } from './PDFToolbar';
import { PDFThumbnails } from './PDFThumbnails';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

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
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const isNavigatingRef = useRef<boolean>(false);
  const scrollUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentPageRef = useRef<number>(currentPage);

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

  // Setup Intersection Observer to detect current page from scroll
  useEffect(() => {
    if (loading || totalPages === 0 || !workerReady) return;

    // Clean up existing observer
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
      intersectionObserverRef.current = null;
    }

    // Clear any pending scroll updates
    if (scrollUpdateTimeoutRef.current) {
      clearTimeout(scrollUpdateTimeoutRef.current);
      scrollUpdateTimeoutRef.current = null;
    }

    const setupScrollObserver = () => {
      const scrollContainer = document.querySelector('.rpv-core__viewer') as HTMLElement;
      if (!scrollContainer) return;

      const pageElements = Array.from(
        document.querySelectorAll('[role="region"][aria-label^="Page"]')
      ) as HTMLElement[];

      if (pageElements.length === 0) return;

      // Create Intersection Observer to track which page is most visible
      const observer = new IntersectionObserver(
        (entries) => {
          // Don't update if we're programmatically navigating
          if (isNavigatingRef.current) return;

          // Clear any pending update
          if (scrollUpdateTimeoutRef.current) {
            clearTimeout(scrollUpdateTimeoutRef.current);
          }

          // Debounce the update to prevent excessive state changes
          scrollUpdateTimeoutRef.current = setTimeout(() => {
            if (isNavigatingRef.current) return;

            // Find the page with the highest visibility
            let maxVisibility = 0;
            const currentPageValue = currentPageRef.current;
            let mostVisiblePage = currentPageValue;

            entries.forEach((entry) => {
              const pageLabel = (entry.target as HTMLElement).getAttribute('aria-label');
              if (!pageLabel) return;

              const pageNum = parseInt(pageLabel.replace('Page ', ''));
              if (isNaN(pageNum)) return;

              // Calculate visibility percentage
              const boundingRect = entry.boundingClientRect;
              const rootRect = entry.rootBounds;

              if (rootRect && boundingRect) {
                // Calculate how much of the page is visible in the viewport
                const visibleHeight =
                  Math.min(boundingRect.bottom, rootRect.bottom) - Math.max(boundingRect.top, rootRect.top);
                const visibilityPercent = (visibleHeight / boundingRect.height) * 100;

                // Prefer pages with higher visibility, and if equal, prefer the one closer to center
                if (
                  visibilityPercent > maxVisibility ||
                  (visibilityPercent === maxVisibility &&
                    Math.abs(pageNum - currentPageValue) < Math.abs(mostVisiblePage - currentPageValue))
                ) {
                  maxVisibility = visibilityPercent;
                  mostVisiblePage = pageNum;
                }
              }
            });

            // Update current page if a different page is now most visible
            if (mostVisiblePage !== currentPageValue && mostVisiblePage > 0 && mostVisiblePage <= totalPages) {
              setCurrentPage(mostVisiblePage);
            }
          }, 150); // 150ms debounce
        },
        {
          root: scrollContainer,
          rootMargin: '-20% 0px -20% 0px', // Only consider pages in the center 60% of viewport
          threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        }
      );

      // Observe all page elements
      pageElements.forEach((pageElement) => {
        observer.observe(pageElement);
      });

      intersectionObserverRef.current = observer;
    };

    // Wait for pages to render before setting up observer
    const setupTimeout = setTimeout(() => {
      setupScrollObserver();
    }, 500);

    return () => {
      clearTimeout(setupTimeout);
      if (scrollUpdateTimeoutRef.current) {
        clearTimeout(scrollUpdateTimeoutRef.current);
      }
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
        intersectionObserverRef.current = null;
      }
    };
    // Note: currentPage is intentionally NOT in dependencies to avoid recreating observer on every page change
  }, [loading, totalPages, workerReady]);

  // Cleanup timeouts and observers on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (scrollUpdateTimeoutRef.current) {
        clearTimeout(scrollUpdateTimeoutRef.current);
      }
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, []);

  // Keep ref in sync with currentPage state
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const handlePageChange = (e: { currentPage: number }) => {
    // Only update if not programmatically navigating (to avoid conflicts)
    if (!isNavigatingRef.current) {
      const newPage = Math.max(1, Math.min(e.currentPage || 1, totalPages || 1));
      if (newPage !== currentPage && newPage > 0) {
        setCurrentPage(newPage);
      }
    }
  };

  const handleZoomChange = (newZoom: number) => {
    const roundedZoom = Math.round(newZoom * 10) / 10;
    if (Math.abs(roundedZoom - zoom) > 0.05) {
      setZoom(roundedZoom);
      // Zoom will be applied via defaultScale prop
    }
  };

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    // Rotation will be handled via CSS transform on the container
  };

  // Navigate to a specific page by scrolling to it with retry mechanism
  useEffect(() => {
    if (targetPage !== null && totalPages > 0 && !loading) {
      isNavigatingRef.current = true;

      const scrollToPage = (attempt: number = 1, maxAttempts: number = 3) => {
        requestAnimationFrame(() => {
          try {
            // Find the page element by aria-label
            const pageElement = document.querySelector(
              `[role="region"][aria-label="Page ${targetPage}"]`
            ) as HTMLElement;

            if (pageElement) {
              // Find the scrollable container - use the react-pdf-viewer's viewer class
              const scrollContainer = document.querySelector('.rpv-core__viewer') as HTMLElement;

              if (scrollContainer) {
                const containerRect = scrollContainer.getBoundingClientRect();
                const pageRect = pageElement.getBoundingClientRect();
                const scrollTop = scrollContainer.scrollTop + (pageRect.top - containerRect.top) - 20; // 20px offset from top

                scrollContainer.scrollTo({
                  top: scrollTop,
                  behavior: 'auto', // Instant scroll for better performance
                });

                // Verify scroll success after a delay
                setTimeout(() => {
                  const verifyRect = pageElement.getBoundingClientRect();
                  const containerVerifyRect = scrollContainer.getBoundingClientRect();
                  const isVisible =
                    verifyRect.top < containerVerifyRect.bottom && verifyRect.bottom > containerVerifyRect.top;

                  if (!isVisible && attempt < maxAttempts) {
                    // Retry with longer delay for pages that haven't rendered yet
                    const retryDelay = attempt * 300; // 300ms, 600ms, 900ms
                    setTimeout(() => scrollToPage(attempt + 1, maxAttempts), retryDelay);
                  } else {
                    // Navigation complete, wait longer before re-enabling scroll observer
                    // This prevents the observer from immediately overriding the navigation
                    setTimeout(() => {
                      isNavigatingRef.current = false;
                    }, 300); // Increased from 100ms to 300ms to allow navigation to settle
                  }
                }, 100);
              } else {
                // Fallback: scroll the page into view
                pageElement.scrollIntoView({ behavior: 'auto', block: 'start' });
                setTimeout(() => {
                  isNavigatingRef.current = false;
                }, 100);
              }
            } else if (attempt < maxAttempts) {
              // Page element not found, retry with longer delay
              const retryDelay = attempt * 500; // 500ms, 1000ms, 1500ms for pages beyond viewport
              setTimeout(() => scrollToPage(attempt + 1, maxAttempts), retryDelay);
            } else {
              // Max attempts reached, give up
              console.warn(`Failed to find page ${targetPage} after ${maxAttempts} attempts`);
              isNavigatingRef.current = false;
            }
          } catch (error) {
            console.warn('Failed to scroll to page:', error);
            isNavigatingRef.current = false;
          }
        });
      };

      // Initial delay - longer for pages beyond initial viewport
      const initialDelay = targetPage > 5 ? 500 : 200;
      const scrollTimeout = setTimeout(() => {
        scrollToPage();
        setTargetPage(null);
      }, initialDelay);

      return () => {
        clearTimeout(scrollTimeout);
        isNavigatingRef.current = false;
      };
    }
  }, [targetPage, totalPages, loading]);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      setTargetPage(newPage);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      setTargetPage(newPage);
    }
  };

  const handlePageSelect = (page: number) => {
    const targetPageNum = Math.max(1, Math.min(page, totalPages || 1));
    if (targetPageNum !== currentPage && totalPages > 0) {
      setCurrentPage(targetPageNum);
      setTargetPage(targetPageNum);
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
            <div
              className="flex-1 h-full w-full pdf-viewer-container"
              ref={viewerContainerRef}
            >
              <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                <div
                  className="h-full w-full pdf-viewer-rotation"
                  style={{ '--rotation': `${rotation}deg` } as React.CSSProperties}
                >
                  <PDFViewer
                    fileUrl={pdfUrl}
                    httpHeaders={{
                      Accept: 'application/pdf',
                    }}
                    withCredentials={true}
                    key={`pdf-${zoom}`}
                    initialPage={0}
                    defaultScale={zoom}
                    onDocumentLoad={(e: { doc?: { numPages?: number }; file?: unknown }) => {
                      try {
                        // Clear timeout since PDF loaded successfully
                        if (loadingTimeoutRef.current) {
                          clearTimeout(loadingTimeoutRef.current);
                          loadingTimeoutRef.current = null;
                        }

                        const doc = e?.doc;
                        if (doc && typeof doc.numPages === 'number') {
                          const numPages = doc.numPages;
                          setTotalPages(numPages);
                          // Validate current page
                          const validPage = Math.max(1, Math.min(currentPage, numPages));
                          if (validPage !== currentPage && currentPage > 0) {
                            setCurrentPage(validPage);
                          }
                          setLoading(false);
                        } else {
                          setLoading(false);
                        }
                      } catch (err) {
                        console.error('Error processing document load:', err);
                        setError('Failed to process PDF document');
                        setLoading(false);
                      }
                    }}
                    onPageChange={handlePageChange}
                    renderError={(error) => {
                      console.error('PDF render error:', error);
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
