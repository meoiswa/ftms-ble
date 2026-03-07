const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

let accessToken: string | null = null
let tokenExpiry: number = 0

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID)
}

export function isSignedIn(): boolean {
  return Boolean(accessToken) && Date.now() < tokenExpiry
}

/** Resolves when the GIS library is ready, or rejects after 10 seconds. */
function waitForGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) { resolve(); return }
    let elapsed = 0
    const id = setInterval(() => {
      if ((window as any).google?.accounts?.oauth2) {
        clearInterval(id)
        resolve()
      } else if ((elapsed += 250) >= 10_000) {
        clearInterval(id)
        reject(new Error('Google Identity Services failed to load'))
      }
    }, 250)
  })
}

function requestToken(prompt: '' | 'consent' | 'select_account'): Promise<string> {
  if (!GOOGLE_CLIENT_ID) return Promise.reject(new Error('VITE_GOOGLE_CLIENT_ID is not set'))

  return waitForGis().then(() => new Promise((resolve, reject) => {
    const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response: { access_token?: string; error?: string; expires_in?: number }) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'No access token returned'))
        } else {
          accessToken = response.access_token
          tokenExpiry = Date.now() + (response.expires_in ?? 3600) * 1000
          localStorage.setItem('google_signed_in', '1')
          resolve(response.access_token)
        }
      },
    })
    // prompt is passed to requestAccessToken, not initTokenClient, per GIS spec
    tokenClient.requestAccessToken({ prompt })
  }))
}

export function signIn(): Promise<string> {
  return requestToken('consent')
}

/** Silently restores the session if the user previously granted consent.
 *  Resolves with the token on success, rejects if consent is needed. */
export function silentSignIn(): Promise<string> {
  return requestToken('')
}

export function signOut(): void {
  if (accessToken) {
    (window as any).google?.accounts?.oauth2?.revoke(accessToken)
  }
  accessToken = null
  tokenExpiry = 0
  localStorage.removeItem('google_signed_in')
}

export function getAccessToken(): string | null {
  if (accessToken && Date.now() < tokenExpiry) return accessToken
  return null
}

/** Returns true if the user was previously signed in (token may need refresh) */
export function wasPreviouslySignedIn(): boolean {
  return localStorage.getItem('google_signed_in') === '1'
}
