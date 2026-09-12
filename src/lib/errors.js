/**
 * describeTmdbError — one place that turns failed requests into friendly,
 * actionable messages. TMDB errors arrive as `Error("TMDB <status>: <body>")`
 * (thrown in lib/tmdb.js); network failures arrive as plain TypeErrors.
 *
 * Used by every page-level catch so a 401 on the Home feed reads the same
 * as a 401 on a details page instead of leaking raw response bodies.
 */
export const describeTmdbError = (err, fallback = 'Something went wrong. Please try again.') => {
  const match = err?.message?.match(/^TMDB (\d+)/)
  const code = match?.[1]
  if (code === '401' || code === '403') return 'TMDB API key is missing or invalid — add VITE_TMDB_API_KEY to your .env file.'
  if (code === '404') return 'This title could not be found. It may have been removed from TMDB.'
  if (code === '429') return 'TMDB rate limit reached — please wait a moment and try again.'
  if (code && code[0] === '5') return 'TMDB is having trouble right now — please try again shortly.'
  if (code) return `TMDB request failed (error ${code}).`
  return err?.message ?? fallback
}
