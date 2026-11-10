const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || ''

/** Build authenticated WebSocket URL for `/ws`. */
export function realtimeWsUrl(token: string) {
  const httpBase =
    API_URL ||
    `${window.location.protocol}//${window.location.host}`
  const wsBase = httpBase.replace(/^http/, 'ws')
  return `${wsBase}/ws?token=${encodeURIComponent(token)}`
}
