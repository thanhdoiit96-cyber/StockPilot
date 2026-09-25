import { useEffect, useState } from 'react'
import { startRequest } from '../services/api.mjs'

const identity = value => value
const idle = { status: 'idle', data: null, error: '' }
const pending = { status: 'loading', data: null, error: '' }

export default function useApiResource(url, select = identity) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ ...idle, url: null, attempt: -1 })

  useEffect(() => {
    if (!url) return
    const request = startRequest(url, select, result => setState({ ...result, url, attempt }))
    return request.cancel
  }, [url, select, attempt])

  // Hide the previous selection during render, before effect cleanup/setup runs.
  const current = !url ? idle : state.url === url && state.attempt === attempt ? state : pending
  return { ...current, retry: () => setAttempt(value => value + 1) }
}
