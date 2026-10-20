import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 10;

export function usePagination<T>(
  items: T[],
  pageSize = DEFAULT_PAGE_SIZE,
  resetKey?: string | number
) {
  const [page, setPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  return {
    page,
    setPage,
    totalPages,
    paginatedItems,
    totalItems,
    pageSize,
    rangeStart,
    rangeEnd,
  };
}
