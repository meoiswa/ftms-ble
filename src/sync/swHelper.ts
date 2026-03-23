/**
 * Utility for communicating with the Service Worker
 */

type MessageType = 'GET_TOKEN' | 'SET_TOKEN' | 'CLEAR_TOKEN'

export interface TokenResponse {
  success: boolean
  token?: string | null
  expiresAt?: number
  error?: string
}

export interface StoredToken {
  token: string
  expiresAt: number
}

let swRegistration: ServiceWorkerRegistration | null = null

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    swRegistration = await navigator.serviceWorker.register(
      new URL('../sw.ts', import.meta.url),
      { type: 'module' }
    )
  } catch (err) {
    console.warn('Failed to register service worker:', err)
  }
}

export async function postMessageToSW(
  type: MessageType,
  payload?: unknown
): Promise<TokenResponse> {
  if (!swRegistration?.active && !navigator.serviceWorker.controller) {
    // Fallback if SW not active
    return { success: false, error: 'Service Worker not available' }
  }

  const channel = new MessageChannel()
  const controller = swRegistration?.active || navigator.serviceWorker.controller

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Service Worker timeout' })
    }, 5000)

    channel.port1.onmessage = (event) => {
      clearTimeout(timeout)
      resolve(event.data)
    }

    controller?.postMessage({ type, payload }, [channel.port2])
  })
}

export async function getTokenFromSW(): Promise<StoredToken | null> {
  const result = await postMessageToSW('GET_TOKEN')
  if (!result.success || !result.token || result.expiresAt === undefined) {
    return null
  }
  // Only return token if it hasn't expired
  if (result.expiresAt > Date.now()) {
    return { token: result.token, expiresAt: result.expiresAt }
  }
  return null
}

export async function setTokenInSW(
  accessToken: string,
  expiresIn: number
): Promise<boolean> {
  const result = await postMessageToSW('SET_TOKEN', { accessToken, expiresIn })
  return result.success
}

export async function clearTokenInSW(): Promise<boolean> {
  const result = await postMessageToSW('CLEAR_TOKEN')
  return result.success
}
