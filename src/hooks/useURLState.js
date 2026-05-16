import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Sync a value to/from a URL search param */
export const useURLState = (key, defaultValue) => {
  const [params, setParams] = useSearchParams()

  const value = params.get(key) ?? defaultValue

  const setValue = useCallback((newVal) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (newVal === defaultValue || newVal === '' || newVal == null) {
        next.delete(key)
      } else {
        next.set(key, String(newVal))
      }
      return next
    }, { replace: true })
  }, [key, defaultValue, setParams])

  return [value, setValue]
}