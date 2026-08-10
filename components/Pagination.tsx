import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  goToPage: (page: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  goToNextPage,
  goToPrevPage,
  goToPage,
}: PaginationProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme !== "light";

  if (!mounted || totalItems === 0) return null;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className={`mt-4 flex flex-col sm:flex-row items-center justify-between border-t px-4 py-4 sm:px-6 ${isDark ? "border-[#1f2d32]" : "border-[#E2E8F0]"}`}>
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark ? "bg-[#0b1d25] text-[#b3d2ce] hover:bg-[#14303b] border border-[#1f2d32]" : "bg-white text-[#475569] hover:bg-[#F8FAFC] border border-[#E2E8F0]"
          }`}
        >
          Previous
        </button>
        <button
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className={`relative ml-3 inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isDark ? "bg-[#0b1d25] text-[#b3d2ce] hover:bg-[#14303b] border border-[#1f2d32]" : "bg-white text-[#475569] hover:bg-[#F8FAFC] border border-[#E2E8F0]"
          }`}
        >
          Next
        </button>
      </div>
      
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className={`text-sm ${isDark ? "text-[#9eb4b0]" : "text-[#64748B]"}`}>
            Showing <span className={`font-semibold ${isDark ? "text-[#d9ece9]" : "text-[#0F172A]"}`}>{startIndex}</span> to{" "}
            <span className={`font-semibold ${isDark ? "text-[#d9ece9]" : "text-[#0F172A]"}`}>{endIndex}</span> of{" "}
            <span className={`font-semibold ${isDark ? "text-[#d9ece9]" : "text-[#0F172A]"}`}>{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-xs" aria-label="Pagination">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-sm transition-colors focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? "border-[#1f2d32] bg-[#0b1d25] text-[#9eb4b0] hover:bg-[#14303b]" : "border-[#E2E8F0] bg-white text-[#94a3b8] hover:bg-[#F8FAFC]"
              } border`}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            
            {pages.map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border ${
                      isDark ? "border-[#1f2d32] bg-[#0b1d25] text-[#9eb4b0]" : "border-[#E2E8F0] bg-white text-[#64748B]"
                    }`}
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = page === currentPage;
              return (
                <button
                  key={`page-${page}`}
                  onClick={() => goToPage(page as number)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold border transition-colors focus:z-20 focus:outline-offset-0 ${
                    isCurrent
                      ? "z-10 bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : isDark
                      ? "border-[#1f2d32] bg-[#0b1d25] text-[#b3d2ce] hover:bg-[#14303b]"
                      : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-sm transition-colors focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? "border-[#1f2d32] bg-[#0b1d25] text-[#9eb4b0] hover:bg-[#14303b]" : "border-[#E2E8F0] bg-white text-[#94a3b8] hover:bg-[#F8FAFC]"
              } border`}
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
