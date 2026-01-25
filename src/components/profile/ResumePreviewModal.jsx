"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Helper function to format dates
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' }).format(new Date(dateString));
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return dateString; // Return original if invalid
  }
};

// New Resume Preview Modal Component
export default function ResumePreviewModal({ isOpen, onClose, resumeUrl }) {
  // Define PDF.js worker and core library paths
  const PDF_JS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const PDF_JS_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageRendering, setPageRendering] = useState(false);
  const [pageNumPending, setPageNumPending] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const canvasRef = useRef(null);
  const containerRef = useRef(null); // Ref for the parent container of the canvas


  // This useEffect will reliably trigger rendering when pdfDoc is loaded AND canvas is available
  useEffect(() => {
    console.log('DEBUG: Canvas/PDF sync effect triggered. pdfDoc:', !!pdfDoc, 'canvasRef.current:', !!canvasRef.current, 'pageNum:', pageNum);
    if (pdfDoc && canvasRef.current) {
      console.log('DEBUG: PDF document and canvas are both available. Initiating page render for page:', pageNum);
      queueRenderPage(pageNum);
    }
  }, [pdfDoc, pageNum, zoomLevel]); // Removed queueRenderPage from dependencies

  useEffect(() => {
    // Load PDF.js library dynamically
    const loadPdfJs = async () => {
      console.log('DEBUG: loadPdfJs called. isOpen:', isOpen, 'resumeUrl:', resumeUrl);
      if (typeof window === 'undefined' || !isOpen || !resumeUrl) {
        console.log('DEBUG: loadPdfJs - conditions not met for loading.');
        return;
      }

      if (!window.pdfjsLib) {
        console.log('DEBUG: PDF.js library not found, attempting to load.');
        setLoadingPdf(true);
        setPdfError('');
        try {
          const script = document.createElement('script');
          script.src = PDF_JS_LIB_URL;
          script.async = true;
          document.body.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = () => {
              console.log('DEBUG: PDF.js script loaded successfully.');
              resolve();
            };
            script.onerror = (e) => {
              console.error('DEBUG: PDF.js script failed to load:', e);
              reject(e);
            };
          });

          // Set worker source only after pdfjsLib is confirmed available
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER_URL;
          console.log('DEBUG: PDF.js worker source set.');

          // ADDED: Small delay to ensure PDF.js is fully initialized
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('DEBUG: Short delay after PDF.js load complete.');

        } catch (error) {
          console.error("Error loading PDF.js:", error);
          setPdfError("Failed to load PDF viewer. Please try again later.");
          setLoadingPdf(false);
          return;
        } finally {
          setLoadingPdf(false);
        }
      } else {
        console.log('DEBUG: PDF.js library already loaded.');
      }
      // Now that PDF.js is confirmed loaded, proceed to load the document
      await loadPdfDocument();
    };

    const loadPdfDocument = async () => {
      console.log('DEBUG: loadPdfDocument called. window.pdfjsLib:', !!window.pdfjsLib, 'resumeUrl:', resumeUrl);
      if (!window.pdfjsLib || !resumeUrl) {
        console.log('DEBUG: loadPdfDocument - conditions not met for loading document.');
        return;
      }

      setLoadingPdf(true);
      setPdfError('');
      setPdfDoc(null); // Clear previous PDF document
      setPageNum(1); // Reset to first page for new document

      try {
        console.log(`DEBUG: Attempting to get PDF document from proxy: /api/resume-proxy?url=${encodeURIComponent(resumeUrl)}`);
        const loadingTask = window.pdfjsLib.getDocument(`/api/resume-proxy?url=${encodeURIComponent(resumeUrl)}`);
        const pdf = await loadingTask.promise;
        console.log('DEBUG: PDF document loaded successfully.');
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setLoadingPdf(false);

        // Removed explicit setTimeout for initial page rendering.
        // The new useEffect hook (above) based on pdfDoc and canvasRef.current readiness now handles this.

      } catch (error) {
        console.error("Error loading PDF document:", error);
        setPdfError(`Failed to load PDF document: ${error.message}.`);
        setLoadingPdf(false);
      }
    };

    if (isOpen && resumeUrl) { // Only attempt to load if modal is open and URL exists
      loadPdfJs();
    } else if (!isOpen) { // Reset state when modal is closed
      setPdfDoc(null);
      setPageNum(1);
      setNumPages(0);
      setPageRendering(false);
      setPageNumPending(null);
      setPdfError('');
    }

  }, [isOpen, resumeUrl]);

  const renderPage = useCallback((num) => {
    console.log('DEBUG: renderPage called for page:', num, 'pdfDoc:', !!pdfDoc);
    if (!pdfDoc) {
      console.log('DEBUG: pdfDoc not available for rendering.');
      return;
    }

    setPageRendering(true);
    setPdfError('');

    pdfDoc.getPage(num).then((page) => {
      const canvas = canvasRef.current;
      const container = containerRef.current; // Get the container element
      console.log('DEBUG: Canvas ref current (inside renderPage):', canvas);
      console.log('DEBUG: Container ref current (inside renderPage):', container);

      if (!canvas || !container) {
        console.warn("Canvas or container element not available for rendering (renderPage).");
        setPageRendering(false);
        return;
      }

      const originalViewport = page.getViewport({ scale: zoomLevel });

      // Determine the maximum available space for the canvas
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      let renderScale = zoomLevel;

      // Calculate an additional scale to fit within the container if needed
      if (originalViewport.width > containerWidth || originalViewport.height > containerHeight) {
        const widthRatio = containerWidth / originalViewport.width;
        const heightRatio = containerHeight / originalViewport.height;
        renderScale = zoomLevel * Math.min(widthRatio, heightRatio); // Use the smaller ratio to fit both dimensions
      }

      const scaledViewport = page.getViewport({ scale: renderScale });
      const context = canvas.getContext('2d');

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(scaledViewport.width * outputScale);
      canvas.height = Math.floor(scaledViewport.height * outputScale);

      canvas.style.width = Math.floor(scaledViewport.width) + 'px';
      canvas.style.height = Math.floor(scaledViewport.height) + 'px';

      console.log(`DEBUG: Rendering page ${num}. Canvas dimensions set to:`);
      console.log(`  canvas.width (internal pixels): ${canvas.width}`);
      console.log(`  canvas.height (internal pixels): ${canvas.height}`);
      console.log(`  canvas.style.width (CSS pixels): ${canvas.style.width}`);
      console.log(`  canvas.style.height (CSS pixels): ${canvas.style.height}`);
      console.log(`  originalViewport.width: ${originalViewport.width}`);
      console.log(`  originalViewport.height: ${originalViewport.height}`);
      console.log(`  scaledViewport.width: ${scaledViewport.width}`);
      console.log(`  scaledViewport.height: ${scaledViewport.height}`);
      console.log(`  zoomLevel: ${zoomLevel}`);
      console.log(`  renderScale (final): ${renderScale}`);
      console.log(`  outputScale: ${outputScale}`);
      console.log(`  containerWidth: ${containerWidth}`);
      console.log(`  containerHeight: ${containerHeight}`);


      context.clearRect(0, 0, canvas.width, canvas.height);
      context.scale(outputScale, outputScale);

      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport, // Use the scaledViewport for rendering
      };

      const renderTask = page.render(renderContext);
      renderTask.promise.then(() => {
        console.log(`DEBUG: Page ${num} rendering complete.`);
        setPageRendering(false);
        if (pageNumPending !== null && pageNumPending !== num) {
          console.log(`DEBUG: Found pending page ${pageNumPending}, queuing render.`);
          renderPage(pageNumPending);
          setPageNumPending(null);
        }
      }).catch(err => {
        console.error("Error rendering page:", err);
        setPdfError("Error rendering PDF page.");
        setPageRendering(false);
      });
    }).catch(err => {
      console.error("Error getting page:", err);
      setPdfError("Error accessing PDF page.");
      setPageRendering(false);
    });
  }, [pdfDoc, pageNumPending, zoomLevel]);

  const queueRenderPage = useCallback((num) => {
    console.log('DEBUG: queueRenderPage called for page:', num, 'pageRendering:', pageRendering);
    if (pageRendering) {
      setPageNumPending(num);
      console.log(`DEBUG: Page ${num} queued because another page is rendering.`);
    } else {
      renderPage(num);
      console.log(`DEBUG: Immediately rendering page ${num}.`);
    }
  }, [pageRendering, renderPage]);

  const onPrevPage = () => {
    if (pageNum <= 1) {
      return;
    }
    setPageNum(prev => prev - 1);
  };

  const onNextPage = () => {
    if (pageNum >= numPages) {
      return;
    }
    setPageNum(prev => prev + 1);
  };

  const onZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 3.0));
  };

  const onZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full h-full max-w-4xl max-h-screen flex flex-col animate-scale-in">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-slate-600">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Resume Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition duration-150 ease-in-out p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        {/* MODIFIED: Added 'overflow-hidden' to the container div and attached containerRef */}
        <div ref={containerRef} className="flex-grow p-4 flex flex-col items-center justify-center relative min-h-[500px] overflow-hidden dark:bg-slate-900">
          {loadingPdf && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-800 bg-opacity-80 dark:bg-opacity-80 z-10 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Loading PDF...</p>
              </div>
            </div>
          )}
          {pdfError && !loadingPdf && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg z-10">
              <p className="text-center">{pdfError}</p>
            </div>
          )}
          {!loadingPdf && !pdfError && !pdfDoc && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <i className="fas fa-file-pdf text-6xl mb-4"></i>
              <p>No PDF document loaded or selected.</p>
            </div>
          )}

          <canvas ref={canvasRef} id="pdf-canvas" className="border border-gray-300 dark:border-slate-600 shadow-md rounded-lg bg-gray-200 dark:bg-slate-700"></canvas>
        </div>

        {pdfDoc && (
          <div className="flex justify-center items-center p-4 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 space-x-2 rounded-b-lg">
            <button
              onClick={onPrevPage}
              disabled={pageNum <= 1 || pageRendering}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <i className="fas fa-chevron-left"></i>
              <span>Prev</span>
            </button>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              Page {pageNum} / {numPages}
            </span>
            <button
              onClick={onNextPage}
              disabled={pageNum >= numPages || pageRendering}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <span>Next</span>
              <i className="fas fa-chevron-right"></i>
            </button>
            <button
              onClick={onZoomIn}
              disabled={pageRendering}
              className="px-3 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Zoom In"
            >
              <i className="fas fa-search-plus"></i>
            </button>
            <button
              onClick={onZoomOut}
              disabled={pageRendering}
              className="px-3 py-2 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Zoom Out"
            >
              <i className="fas fa-search-minus"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}