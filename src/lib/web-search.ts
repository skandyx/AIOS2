/**
 * Web Search Utility — backend-only
 *
 * Singleton wrapper around z-ai-web-dev-sdk that provides a `search(query, num)`
 * method with simple in-memory caching (5-min TTL) and retry logic.
 *
 * IMPORTANT: This module MUST only be imported from server-side code
 * (API routes, server actions, etc.). Never import from client components.
 */

interface CacheEntry {
  results: WebSearchResult[]
  timestamp: number
}

export interface WebSearchResult {
  url: string
  name: string
  snippet: string
  hostName: string
  rank: number
  date: string
  favicon: string
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

class WebSearchService {
  private static instance: WebSearchService | null = null
  private zai: unknown = null
  private cache: Map<string, CacheEntry> = new Map()
  private initializing: Promise<void> | null = null

  private constructor() {}

  static getInstance(): WebSearchService {
    if (!WebSearchService.instance) {
      WebSearchService.instance = new WebSearchService()
    }
    return WebSearchService.instance
  }

  /**
   * Lazily initialise the ZAI SDK (singleton). Uses dynamic import so the
   * SDK code is never bundled into the client.
   */
  private async ensureInit(): Promise<void> {
    if (this.zai) return

    // If initialisation is already in-flight, wait for it
    if (this.initializing) {
      await this.initializing
      return
    }

    this.initializing = (async () => {
      try {
        const ZAI = (await import('z-ai-web-dev-sdk')).default
        this.zai = await ZAI.create()
      } catch (err) {
        console.error('[WebSearch] Failed to initialise ZAI SDK:', err)
        this.zai = null
        throw err
      } finally {
        this.initializing = null
      }
    })()

    await this.initializing
  }

  /**
   * Search the web for the given query.
   *
   * @param query  Search string
   * @param num    Desired number of results (default 10, max 20)
   * @returns      Array of results, or empty array on failure
   */
  async search(query: string, num = 10): Promise<WebSearchResult[]> {
    const cappedNum = Math.min(Math.max(num, 1), 20)
    const cacheKey = `${query}::${cappedNum}`

    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.results
    }

    // Retry loop
    let lastError: unknown = null
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.ensureInit()
        if (!this.zai) {
          console.warn('[WebSearch] SDK not initialised, skipping web search')
          return []
        }

        const raw = await this.zai.functions.invoke('web_search', {
          query,
          num: cappedNum,
        })

        if (!Array.isArray(raw)) {
          console.warn('[WebSearch] Unexpected response format:', typeof raw)
          return []
        }

        const results: WebSearchResult[] = raw.map(
          (item: any) => ({
            url: item.url || '',
            name: item.name || '',
            snippet: item.snippet || '',
            hostName: item.host_name || '',
            rank: item.rank ?? 0,
            date: item.date || '',
            favicon: item.favicon || '',
          })
        )

        // Store in cache
        this.cache.set(cacheKey, { results, timestamp: Date.now() })

        // Prune expired entries periodically (every 50 writes)
        if (this.cache.size > 50) {
          const now = Date.now()
          for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > CACHE_TTL_MS) {
              this.cache.delete(key)
            }
          }
        }

        return results
      } catch (err) {
        lastError = err
        console.warn(
          `[WebSearch] Attempt ${attempt}/${MAX_RETRIES} failed:`,
          err instanceof Error ? err.message : err
        )
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
        }
      }
    }

    console.error('[WebSearch] All retries exhausted:', lastError)
    return []
  }
}

// Convenience export — the singleton instance
export const webSearch = WebSearchService.getInstance()
