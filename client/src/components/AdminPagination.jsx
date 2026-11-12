export default function AdminPagination({
  page,
  pages = 1,
  total = 0,
  pageSize,
  onPageChange,
  label = "items",
  summary,
  numbered = false,
  footerClassName = "",
  controlsClassName = "",
  as = "div",
}) {
  const Container = as;
  const pageCount = Math.max(1, pages);
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);
  const visiblePages = pageCount <= 3
    ? Array.from({ length: pageCount }, (_, index) => index + 1)
    : page <= 2
      ? [1, 2, 3]
      : page >= pageCount - 1
        ? [pageCount - 2, pageCount - 1, pageCount]
        : [page - 1, page, page + 1];

  return (
    <Container className={footerClassName}>
      <span>
        {summary || `Showing ${first}–${last} of ${total.toLocaleString()} ${label}`}
      </span>
      <div className={controlsClassName}>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </button>
        {numbered ? (
          <>
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={page === pageNumber ? "page-active" : ""}
                aria-current={page === pageNumber ? "page" : undefined}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
            {pageCount > 3 && page < pageCount - 2 && <span aria-hidden="true">…</span>}
            {pageCount > 3 && page < pageCount - 2 && (
              <button type="button" onClick={() => onPageChange(pageCount)}>{pageCount}</button>
            )}
          </>
        ) : (
          <b>Page {page} of {pageCount}</b>
        )}
        <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
        </button>
      </div>
    </Container>
  );
}
