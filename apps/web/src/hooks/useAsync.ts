import { useEffect, useRef, useState } from 'react'

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(deps)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError(null)
    loaderRef.current()
      .then((result) => {
        if (!active) return
        setData(result)
        setStatus('ready')
      })
      .catch((reason: unknown) => {
        if (!active) return
        setStatus('error')
        setError(reason instanceof Error ? reason.message : 'Request failed')
      })
    return () => {
      active = false
    }
  }, [key, tick])

  return { status, data, error, reload: () => setTick((value) => value + 1) }
}
