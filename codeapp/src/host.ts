import type { Person } from './data/types'

/** The signed-in user when the app is hosted in Power Apps, or null when running on a laptop. */
export async function getHostUser(): Promise<Person | null> {
  try {
    const { getContext } = await import('@microsoft/power-apps/app')
    const ctx = await Promise.race([
      getContext(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500)),
    ])
    const email = ctx.user.userPrincipalName
    if (!email) return null
    return { name: ctx.user.fullName ?? email, email: email.toLowerCase() }
  } catch {
    return null
  }
}
