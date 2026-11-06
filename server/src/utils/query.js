export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parsePagination(query, { defaultLimit, maxLimit }) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit),
  );
  return { page, limit };
}

export function paginationMetadata(page, limit, total) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}
