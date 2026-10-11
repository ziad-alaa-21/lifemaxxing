/**
 * Reading Engine (Stage 7c)
 * Book catalog, daily page logs, and reading velocity metrics
 */

export interface ReadingBook {
  id: string;
  user_id?: string;
  title: string;
  author?: string | null;
  total_pages?: number | null;
  current_page: number;
  status: "reading" | "completed" | "abandoned";
  created_at?: string;
  deleted_at?: string | null;
}

export interface ReadingLog {
  id?: string;
  user_id?: string;
  book_id?: string | null;
  logged_date: string;
  pages_read: number;
  duration_minutes?: number | null;
  notes?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

export interface BookProgressSummary {
  percentComplete: number;
  pagesRemaining: number | null;
  isComplete: boolean;
  displayText: string;
}

/**
 * Calculate book completion percentage and remaining pages
 */
export function calculateBookProgress(book: ReadingBook): BookProgressSummary {
  if (!book.total_pages || book.total_pages <= 0) {
    return {
      percentComplete: 0,
      pagesRemaining: null,
      isComplete: book.status === "completed",
      displayText: `Page ${book.current_page}`,
    };
  }

  const clampedCurrent = Math.min(book.current_page, book.total_pages);
  const pct = Math.min(100, Math.round((clampedCurrent / book.total_pages) * 100));
  const remaining = Math.max(0, book.total_pages - clampedCurrent);

  return {
    percentComplete: pct,
    pagesRemaining: remaining,
    isComplete: clampedCurrent >= book.total_pages || book.status === "completed",
    displayText: `${clampedCurrent} / ${book.total_pages} pages (${pct}%)`,
  };
}

/**
 * Validate reading log submission
 */
export function validateReadingLog(
  pagesRead: number,
  durationMinutes?: number | null
): { valid: boolean; error?: string } {
  if (!pagesRead || pagesRead <= 0) {
    return { valid: false, error: "Pages read must be a positive number greater than 0." };
  }
  if (pagesRead > 2000) {
    return { valid: false, error: "Unusually high page count (max 2000 pages per log)." };
  }
  if (durationMinutes !== undefined && durationMinutes !== null) {
    if (durationMinutes <= 0) {
      return { valid: false, error: "Duration must be greater than 0 minutes." };
    }
    if (durationMinutes > 1440) {
      return { valid: false, error: "Duration cannot exceed 24 hours (1440 minutes)." };
    }
  }
  return { valid: true };
}
