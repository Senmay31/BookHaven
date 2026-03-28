"use client";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader,
} from "lucide-react";

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PdfReaderProps {
  url: string;
  title: string;
  onClose: () => void;
  onProgress?: (percentage: number) => void;
}

export default function PdfReader({
  url,
  title,
  onClose,
  onProgress,
}: PdfReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const goToPrevPage = () => {
    const newPage = Math.max(currentPage - 1, 1);
    setCurrentPage(newPage);
    onProgress?.(Math.round((newPage / numPages) * 100));
  };

  const goToNextPage = () => {
    const newPage = Math.min(currentPage + 1, numPages);
    setCurrentPage(newPage);
    onProgress?.(Math.round((newPage / numPages) * 100));
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.5));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
      {/* Reader toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-sans text-sm flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Close
          </button>
          <span className="font-display text-white font-medium truncate max-w-xs">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Zoom controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-sans text-slate-400 text-sm w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Page controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-sans text-slate-400 text-sm">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PDF content area */}
      <div className="flex-1 overflow-auto flex justify-center bg-slate-700 p-4">
        {loading && (
          <div className="flex items-center justify-center w-full">
            <div className="text-center">
              <Loader className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
              <p className="font-sans text-slate-400 text-sm">Loading PDF...</p>
            </div>
          </div>
        )}

        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => console.error("PDF load error:", error)}
          loading=""
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            className="shadow-2xl"
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Bottom progress bar */}
      <div className="bg-slate-800 px-4 py-2 flex-shrink-0">
        <div className="w-full bg-slate-700 rounded-full h-1">
          <div
            className="bg-teal-500 h-1 rounded-full transition-all duration-300"
            style={{
              width: `${numPages ? (currentPage / numPages) * 100 : 0}%`,
            }}
          />
        </div>
        <p className="font-sans text-xs text-slate-500 text-center mt-1">
          {numPages ? Math.round((currentPage / numPages) * 100) : 0}% complete
        </p>
      </div>
    </div>
  );
}
