import { useState } from 'react'

const LazyImage = ({ src, alt, className, fallback = '/no-movie.svg', ...props }) => {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)

  return (
    <img
      src={errored ? fallback : src}
      alt={alt}
      className={`lazy-img${loaded ? ' lazy-img--loaded' : ''} ${className || ''}`}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => { setErrored(true); setLoaded(true) }}
      {...props}
    />
  )
}

export default LazyImage