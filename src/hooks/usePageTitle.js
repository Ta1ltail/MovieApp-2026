import { useEffect } from 'react'

const BASE_TITLE = 'BingeTime — Movies & TV Series'

/**
 * usePageTitle — keeps document.title in sync with the current route.
 * Pass a string for "«title» — BingeTime", or null to restore the default
 * (e.g. while a page is still loading). The cleanup restores the base title
 * so transient states never leave a stale label behind.
 */
export const usePageTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} — BingeTime` : BASE_TITLE
    return () => { document.title = BASE_TITLE }
  }, [title])
}
