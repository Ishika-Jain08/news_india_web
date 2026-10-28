import { useState } from 'react'

export function NewsImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-navy text-paper ${className ?? ''}`} role="img" aria-label={alt}>
        <span className="px-3 text-center font-serif text-lg">News India</span>
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />
}
