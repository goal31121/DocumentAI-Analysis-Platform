'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { PDFToolbar } from './PDFToolbar';
import { PDFThumbnails } from './PDFThumbnails';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { LoadError, Plugin, PluginOnDocumentLoad, PluginOnTextLayerRender } from '@react-pdf-viewer/core';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { zoomPlugin } from '@react-pdf-viewer/zoom';

// Import CSS styles for plugins (CRITICAL for proper functionality)
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';

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
  const [viewerReady, setViewerReady] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rotationRef = useRef<HTMLDivElement>(null);

  // Use refs to track the latest state without causing re-renders in the plugin
  const currentPageCallbackRef = useRef((page: number) => {
    console.log('📄 Page changed via scroll:', page);
    setCurrentPage(page);
  });

  // Update callbacks when state changes
  useEffect(() => {
    currentPageCallbackRef.current = (page: number) => {
      if (page !== currentPage && page > 0) {
        console.log('📄 Page changed via scroll:', page);
        setCurrentPage(page);
      }
    };
  }, [currentPage]);

  // Create a custom plugin to track page and zoom changes using refs
  const stateTrackerPlugin = useRef<Plugin>({
    install: () => {
      console.log('🔧 State tracker plugin installing...');

      return {
        onDocumentLoad: (props: PluginOnDocumentLoad) => {
          console.log('📚 Document loaded in plugin:', props.doc.numPages);

          // Mark viewer as ready after document loads and pages are rendered
          // Use multiple timeouts to ensure pages are fully rendered
          setTimeout(() => {
            const allPages = document.querySelectorAll('.rpv-core__page-layer');
            console.log(`📄 Found ${allPages.length} page elements in DOM (first check)`);

            // Wait a bit more for all pages to render
            setTimeout(() => {
              const allPages2 = document.querySelectorAll('.rpv-core__page-layer');
              console.log(`📄 Found ${allPages2.length} page elements in DOM (second check)`);

              setViewerReady(true);
              console.log('✅ Viewer is now ready for navigation');
            }, 1500);
          }, 500);
        },
        onTextLayerRender: (props: PluginOnTextLayerRender) => {
          // Use callback ref to avoid stale closures
          const newPage = props.pageIndex + 1; // 0-based to 1-based
          currentPageCallbackRef.current(newPage);
        },
      };
    },
  }).current;

  // Refs to hold plugin instances (stable across renders)
  const pageNavigationPluginRef = useRef(pageNavigationPlugin());
  const zoomPluginRef = useRef(zoomPlugin());

  // Extract zoom method from plugin (zoom seems to work, but page navigation doesn't)
  const zoomTo = zoomPluginRef.current.zoomTo;

  // Get the viewer's scroll container and page elements
  const getViewerScrollContainer = useCallback(() => {
    // Try multiple selectors for the scroll container
    const selectors = [
      '.rpv-core__viewer',
      '.rpv-core__inner-pages',
      '[data-testid="core__viewer"]',
      '.pdf-viewer-container > div > div',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element && element.scrollHeight > element.clientHeight) {
        console.log('✅ Found scroll container with selector:', selector);
        return element;
      }
    }

    // Fallback: find any scrollable container in the viewer
    const viewerContainer = document.querySelector('.pdf-viewer-container');
    if (viewerContainer) {
      const scrollable = Array.from(viewerContainer.querySelectorAll('*')).find((el) => {
        const htmlEl = el as HTMLElement;
        return htmlEl.scrollHeight > htmlEl.clientHeight && htmlEl.scrollTop !== undefined;
      }) as HTMLElement | undefined;
      if (scrollable) {
        console.log('✅ Found scrollable container via fallback');
        return scrollable;
      }
    }

    console.warn('❌ Could not find scroll container');
    return null;
  }, []);

  const getPageElement = useCallback((pageIndex: number) => {
    // Try multiple selectors as react-pdf-viewer uses different class names
    const selectors = [
      `.rpv-core__page-layer[data-page-index="${pageIndex}"]`,
      `[data-testid="core__page-layer-${pageIndex}"]`,
      `.rpv-core__page-layer:nth-of-type(${pageIndex + 1})`,
      `.rpv-core__page-layer:nth-child(${pageIndex + 1})`,
      `[data-page-index="${pageIndex}"]`,
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        console.log(`✅ Found page ${pageIndex} with selector:`, selector);
        return element;
      }
    }

    // Fallback: get all page layers and use index
    const allPages = document.querySelectorAll('.rpv-core__page-layer');
    if (allPages.length > pageIndex) {
      console.log(`✅ Found page ${pageIndex} via fallback (total pages: ${allPages.length})`);
      return allPages[pageIndex] as HTMLElement;
    }

    console.warn(`❌ Could not find page element for page index ${pageIndex}`);
    console.log('Available page elements:', document.querySelectorAll('.rpv-core__page-layer').length);
    return null;
  }, []);

  // Use IntersectionObserver to track which page is visible
  useEffect(() => {
    if (!viewerReady || totalPages === 0) return;

    // Debug: Log DOM structure
    setTimeout(() => {
      const scrollContainer = getViewerScrollContainer();
      const allPages = document.querySelectorAll('.rpv-core__page-layer');
      console.log('🔍 DOM Debug Info:');
      console.log('  - Scroll container found:', !!scrollContainer);
      console.log('  - Total page elements found:', allPages.length);
      console.log('  - Expected pages:', totalPages);

      if (scrollContainer) {
        console.log('  - Scroll container class:', scrollContainer.className);
        console.log('  - Scroll container scrollHeight:', scrollContainer.scrollHeight);
        console.log('  - Scroll container clientHeight:', scrollContainer.clientHeight);
      }

      allPages.forEach((page, index) => {
        const htmlPage = page as HTMLElement;
        console.log(`  - Page ${index}:`, {
          className: htmlPage.className,
          dataAttributes: Array.from(htmlPage.attributes)
            .filter((attr) => attr.name.startsWith('data-'))
            .map((attr) => `${attr.name}="${attr.value}"`),
        });
      });
    }, 2000);

    // Use IntersectionObserver for better page tracking
    const observers: IntersectionObserver[] = [];
    const pageElements: HTMLElement[] = [];

    for (let i = 0; i < totalPages; i++) {
      const pageElement = getPageElement(i);
      if (pageElement) {
        pageElements.push(pageElement);

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                const newPage = i + 1; // Convert to 1-based
                if (newPage !== currentPage) {
                  console.log('📄 Page changed via IntersectionObserver:', newPage);
                  setCurrentPage(newPage);
                }
              }
            });
          },
          {
            root: getViewerScrollContainer(),
            threshold: [0, 0.25, 0.5, 0.75, 1],
          }
        );

        observer.observe(pageElement);
        observers.push(observer);
      }
    }

    // Fallback: Also add scroll listener
    const scrollContainer = getViewerScrollContainer();
    if (scrollContainer) {
      const handleScroll = () => {
        const containerRect = scrollContainer.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;

        let closestPage = 1;
        let closestDistance = Infinity;

        for (let i = 0; i < totalPages; i++) {
          const pageElement = getPageElement(i);
          if (pageElement) {
            const pageRect = pageElement.getBoundingClientRect();
            const pageCenter = pageRect.top + pageRect.height / 2;
            const distance = Math.abs(pageCenter - containerCenter);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestPage = i + 1;
            }
          }
        }

        if (closestPage !== currentPage) {
          console.log('📄 Page changed via scroll:', closestPage);
          setCurrentPage(closestPage);
        }
      };

      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        observers.forEach((observer) => observer.disconnect());
        scrollContainer.removeEventListener('scroll', handleScroll);
      };
    }

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [viewerReady, totalPages, currentPage, getViewerScrollContainer, getPageElement]);

  // Configure PDF.js worker
  useEffect(() => {
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

  // Reset loading state when PDF URL changes
  useEffect(() => {
    if (pdfUrl && workerReady) {
      setLoading(true);
      setError(null);
      console.log('PDF URL set, waiting for document load:', pdfUrl);

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Test URL accessibility
      fetch(pdfUrl, { method: 'HEAD', credentials: 'include' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`PDF URL returned ${response.status}: ${response.statusText}`);
          }
          console.log('PDF URL is accessible, content-type:', response.headers.get('content-type'));
        })
        .catch((err) => {
          console.error('PDF URL accessibility check failed:', err);
        });

      // 60 second timeout
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Apply rotation via CSS
  useEffect(() => {
    if (rotationRef.current) {
      rotationRef.current.style.setProperty('--rotation', `${rotation}deg`);
    }
  }, [rotation]);

  // Handle document load
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
        setCurrentPage(1); // Reset to first page
        console.log('📚 PDF loaded successfully, total pages:', numPages);
      }
    } catch (err) {
      console.error('Error processing document load:', err);
      setError('Failed to process PDF document');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle render errors
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

  // Toolbar handlers - use plugin methods (zoom plugin seems to work)
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoom + 0.25, 3);
    console.log('🔍 Zoom In clicked, new zoom:', newZoom);
    setZoom(newZoom);
    zoomTo(newZoom);
  }, [zoom, zoomTo]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoom - 0.25, 0.5);
    console.log('🔍 Zoom Out clicked, new zoom:', newZoom);
    setZoom(newZoom);
    zoomTo(newZoom);
  }, [zoom, zoomTo]);

  const handleZoomSliderChange = useCallback(
    (newZoom: number) => {
      console.log('🔍 Zoom slider changed, new zoom:', newZoom);
      setZoom(newZoom);
      zoomTo(newZoom);
    },
    [zoomTo]
  );

  const handleRotate = useCallback(() => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
  }, [rotation]);

  // Helper function to scroll to a page with retry logic
  const scrollToPage = useCallback(
    (pageIndex: number, retries = 3) => {
      const pageElement = getPageElement(pageIndex);
      const scrollContainer = getViewerScrollContainer();

      if (pageElement && scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = pageElement.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top) - 20; // Add small offset

        scrollContainer.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        });
        return true;
      } else if (retries > 0) {
        // Retry after a short delay
        console.log(`⏳ Retrying page navigation (${retries} retries left)...`);
        setTimeout(() => scrollToPage(pageIndex, retries - 1), 200);
        return false;
      } else {
        console.warn(`❌ Could not find page element or scroll container for page index ${pageIndex}`);
        return false;
      }
    },
    [getPageElement, getViewerScrollContainer]
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      console.log('⬅️ Jumping to previous page:', currentPage - 1);
      const targetPage = currentPage - 2; // 0-based index
      if (scrollToPage(targetPage)) {
        setCurrentPage(currentPage - 1);
      }
    }
  }, [currentPage, scrollToPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      console.log('➡️ Jumping to next page:', currentPage + 1);
      const targetPage = currentPage; // 0-based index
      if (scrollToPage(targetPage)) {
        setCurrentPage(currentPage + 1);
      }
    }
  }, [currentPage, totalPages, scrollToPage]);

  const handlePageSelect = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        console.log('🎯 Jumping to page:', page);
        const targetPage = page - 1; // 0-based index
        if (scrollToPage(targetPage)) {
          setCurrentPage(page);
        }
      }
    },
    [totalPages, scrollToPage]
  );

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

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

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Toolbar */}
      <PDFToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        rotation={rotation}
        onZoomChange={handleZoomSliderChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
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
            <div className="flex-1 h-full w-full pdf-viewer-container">
              <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                <div
                  className="h-full w-full pdf-viewer-rotation"
                  ref={rotationRef}
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <PDFViewer
                    fileUrl={pdfUrl}
                    httpHeaders={{
                      Accept: 'application/pdf',
                    }}
                    withCredentials={true}
                    initialPage={0}
                    defaultScale={1}
                    plugins={[pageNavigationPluginRef.current, zoomPluginRef.current, stateTrackerPlugin]}
                    onDocumentLoad={handleDocumentLoad}
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
