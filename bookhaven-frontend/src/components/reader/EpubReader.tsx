"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Loader,
  Type,
} from "lucide-react";

interface EpubReaderProps {
  url: string;
  title: string;
  onClose: () => void;
  onProgress?: (percentage: number) => void;
}

export default function EpubReader({
  url,
  title,
  onClose,
  onProgress,
}: EpubReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [progress, setProgress] = useState(0);
  const [chapterTitle, setChapterTitle] = useState("");

  useEffect(() => {
    // Dynamically import epubjs to avoid SSR issues
    const initReader = async () => {
      try {
        const ePub = (await import("epubjs")).default;

        const book = ePub(url);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: "paginated",
        });

        renditionRef.current = rendition;

        // Apply initial theme
        applyTheme(rendition, darkMode, fontSize);

        // Display the book from the beginning
        await rendition.display();
        setLoading(false);

        // Track reading progress
        rendition.on("relocated", (location: any) => {
          const percentage = Math.round(location.start.percentage * 100);
          setProgress(percentage);
          onProgress?.(percentage);
        });

        // Track chapter title
        rendition.on("rendered", (section: any) => {
          const navItem = book.navigation?.get(section.href);
          if (navItem) setChapterTitle(navItem.label?.trim() || "");
        });
      } catch (err) {
        console.error("EPUB load error:", err);
        setError(
          "Failed to load this EPUB file. The file may be corrupted or inaccessible.",
        );
        setLoading(false);
      }
    };

    if (viewerRef.current) initReader();

    return () => {
      // Cleanup on unmount
      bookRef.current?.destroy();
    };
  }, [url]);

  const applyTheme = (rendition: any, dark: boolean, size: number) => {
    if (dark) {
      rendition.themes.default({
        body: {
          background: "#1e1e2e !important",
          color: "#cdd6f4 !important",
        },
        a: { color: "#89b4fa !important" },
        p: {
          "font-size": `${size}% !important`,
          "line-height": "1.8 !important",
        },
      });
    } else {
      rendition.themes.default({
        body: {
          background: "#fdf8f0 !important",
          color: "#1e293b !important",
        },
        a: { color: "#0d9488 !important" },
        p: {
          "font-size": `${size}% !important`,
          "line-height": "1.8 !important",
        },
      });
    }
  };

  const goToPrev = () => renditionRef.current?.prev();
  const goToNext = () => renditionRef.current?.next();

  const toggleDark = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    if (renditionRef.current)
      applyTheme(renditionRef.current, newDark, fontSize);
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.min(Math.max(fontSize + delta, 70), 150);
    setFontSize(newSize);
    if (renditionRef.current)
      applyTheme(renditionRef.current, darkMode, newSize);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goToNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goToPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const bgClass = darkMode ? "bg-slate-900" : "bg-parchment-50";
  const toolbarClass = darkMode
    ? "bg-slate-800 border-slate-700"
    : "bg-white border-slate-200";
  const textClass = darkMode ? "text-slate-300" : "text-slate-600";

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${bgClass}`}>
      {/* Toolbar */}
      <div
        className={`border-b px-4 py-3 flex items-center justify-between flex-shrink-0 ${toolbarClass}`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className={`${textClass} hover:text-teal-600 font-sans text-sm flex items-center gap-1 transition-colors`}
          >
            <ChevronLeft className="w-4 h-4" /> Close
          </button>
          <div>
            <p
              className={`font-display font-semibold text-sm ${darkMode ? "text-white" : "text-slate-900"}`}
            >
              {title}
            </p>
            {chapterTitle && (
              <p className={`font-sans text-xs ${textClass}`}>{chapterTitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Font size */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => changeFontSize(-10)}
              className={`p-1.5 ${textClass} hover:text-teal-600 hover:bg-slate-100 rounded transition-colors`}
              title="Decrease font size"
            >
              <Type className="w-3 h-3" />
            </button>
            <span className={`font-sans text-xs ${textClass} w-10 text-center`}>
              {fontSize}%
            </span>
            <button
              onClick={() => changeFontSize(10)}
              className={`p-1.5 ${textClass} hover:text-teal-600 hover:bg-slate-100 rounded transition-colors`}
              title="Increase font size"
            >
              <Type className="w-4 h-4" />
            </button>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className={`p-1.5 ${textClass} hover:text-teal-600 hover:bg-slate-100 rounded transition-colors`}
            title={darkMode ? "Light mode" : "Dark mode"}
          >
            {darkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Reader area */}
      <div className="flex-1 flex items-stretch relative overflow-hidden">
        {/* Previous page button */}
        <button
          onClick={goToPrev}
          className={`flex-shrink-0 w-12 flex items-center justify-center ${textClass} hover:text-teal-600 hover:bg-black/5 transition-colors`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Book content */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
                <p className={`font-sans text-sm ${textClass}`}>
                  Loading book...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <p className="font-sans text-red-500 mb-4">{error}</p>

                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-teal-600 text-white font-sans text-sm px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Download and read offline instead
                </a>
              </div>
            </div>
          )}

          <div ref={viewerRef} className="w-full h-full" />
        </div>

        {/* Next page button */}
        <button
          onClick={goToNext}
          className={`flex-shrink-0 w-12 flex items-center justify-center ${textClass} hover:text-teal-600 hover:bg-black/5 transition-colors`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Progress bar */}
      <div className={`px-4 py-2 border-t flex-shrink-0 ${toolbarClass}`}>
        <div
          className={`w-full rounded-full h-1 ${darkMode ? "bg-slate-700" : "bg-slate-200"}`}
        >
          <div
            className="bg-teal-500 h-1 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className={`font-sans text-xs ${textClass} text-center mt-1`}>
          {progress}% complete
          {progress > 0 && (
            <span className="ml-2">· Use ← → arrow keys to navigate</span>
          )}
        </p>
      </div>
    </div>
  );
}
