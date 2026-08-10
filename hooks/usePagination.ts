import { useState, useMemo, useEffect } from "react";

export function usePagination<T>(data: T[], itemsPerPage = 10, dependencies: any[] = []) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when dependencies change (like search filters)
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));

  // Ensure current page does not exceed total pages (in case data shrinks without dependencies changing)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const currentData = useMemo(() => {
    const validPage = Math.min(currentPage, totalPages);
    const start = (validPage - 1) * itemsPerPage;
    return data.slice(start, start + itemsPerPage);
  }, [data, currentPage, totalPages, itemsPerPage]);

  const goToNextPage = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const goToPrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const validPage = Math.min(currentPage, totalPages);
  
  return {
    currentPage: validPage,
    totalPages,
    currentData,
    goToNextPage,
    goToPrevPage,
    goToPage,
    totalItems: data.length,
    startIndex: data.length === 0 ? 0 : (validPage - 1) * itemsPerPage + 1,
    endIndex: Math.min(validPage * itemsPerPage, data.length),
  };
}
