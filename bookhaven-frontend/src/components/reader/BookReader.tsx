"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useReadUrl } from "@/hooks/useLibrary";
import { useSaveProgress } from "@/hooks/useLibrary";
import { Book } from "@/types";
import { BookOpen, ExternalLink, Loader } from "lucide-react";

// Dynamic imports prevent SSR issues with browser-only libraries
const PdfReader = dynamic(() => import("./PdfReader"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center">
      <Loader className="w-8 h-8 text-teal-400 animate-spin" />
    </div>
  ),
});

const EpubReader = dynamic(() => import("./EpubReader"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center">
      <Loader className="w-8 h-8 text-teal-400 animate-spin" />
    </div>
  ),
});

interface BookReaderProps {
  book: Book;
  onClose: () => void;
}

export default function BookReader({ book, onClose }: BookReaderProps) {
  const { data, isLoading, error } = useReadUrl(book.id, true);
  const { mutate: saveProgress } = useSaveProgress();

  const handleProgress = (percentage: number) => {
    saveProgress({
      book_id: book.id,
      progress_percentage: percentage,
      last_read_at: new Date().toISOString(),
    });
  };

  // Loading the read URL
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 text-teal-400 animate-spin mx-auto mb-4" />
          <p className="font-sans text-slate-400">Preparing your book...</p>
        </div>
      </div>
    );
  }

  // Failed to get URL
  if (error || !data?.readUrl) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="font-display text-xl text-white font-bold mb-2">
            Unable to Load Book
          </h3>
          <p className="font-sans text-slate-400 mb-6 text-sm">
            This book couldn't be loaded for reading. Try opening it directly.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-white font-sans text-sm rounded-lg hover:bg-slate-600 transition-colors"
            >
              Close
            </button>

            <a
              href={book.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-teal-600 text-white font-sans text-sm rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open Externally
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { readUrl, fileType } = data;

  // Route to correct reader based on file type
  if (fileType === "pdf") {
    return (
      <PdfReader
        url={readUrl}
        title={book.title}
        onClose={onClose}
        onProgress={handleProgress}
      />
    );
  }

  if (fileType === "epub") {
    return (
      <EpubReader
        url={readUrl}
        title={book.title}
        onClose={onClose}
        onProgress={handleProgress}
      />
    );
  }

  // Google Books or other external links — open in new tab
  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <BookOpen className="w-12 h-12 text-teal-600 mx-auto mb-4" />
        <h3 className="font-display text-xl font-bold text-slate-900 mb-2">
          {book.title}
        </h3>
        <p className="font-sans text-slate-500 text-sm mb-6">
          This book opens in Google Books for the best reading experience.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 font-sans text-sm rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>

          <a
            href={readUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="px-6 py-2 bg-teal-600 text-white font-sans text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open Book
          </a>
        </div>
      </div>
    </div>
  );
}
