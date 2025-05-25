/**
 * API Service
 * Handles all external API communications with rate limiting, caching, and retry logic
 */

export class ApiService {
  constructor() {
    // API Configuration
    this.config = {
      // Base URLs for different APIs
      baseUrls: {
        openRouteService: 'https://api.openrouteservice.org'
      },
      
      // API keys (should be moved to environment variables in production)
      keys: {
        openRouteService: '5b3ce3597851110001cf6248e0d14f9b6e5f4f3b8e9f8f9e9f8f9e9f8f9e9f8f9'
      },
      
      // Request settings
      timeout: 10000, // 10 seconds
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      cacheTtl: 300000, // 5 minutes
      
      // Rate limiting
      rateLimit: 5, // Max requests per second
      rateLimitWindow: 1000 // 1 second
    };
    
    // Initialize caches and trackers
    this.cache = new Map();
    this.requestTimestamps = [];
    this.isRefreshing = false;
    this.refreshQueue = [];
    
    // Bind methods
    this.getCachedResponse = this.getCachedResponse.bind(this);
    this.setCachedResponse = this.setCachedResponse.bind(this);
    this.waitForRateLimit = this.waitForRateLimit.bind(this);
    this.fetchWithRetry = this.fetchWithRetry.bind(this);
    this.geocode = this.geocode.bind(this);
    this.getRoute = this.getRoute.bind(this);
  }
  
  /**
   * Get cached response if available and not expired
   */
  getCachedResponse(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    const { timestamp, data } = cached;
    const now = Date.now();
    
    // Return cached data if not expired
    if (now - timestamp < this.config.cacheTtl) {
      return data;
    }
    
    // Remove expired cache entry
    this.cache.delete(cacheKey);
    return null;
  }
  
  /**
   * Set response in cache
   */
  setCachedResponse(cacheKey, data) {
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data
    });
  }
  
  /**
   * Handle rate limiting
   */
  async waitForRateLimit() {
    const now = Date.now();
    
    // Remove timestamps outside the current window
    this.requestTimestamps = this.requestTimestamps.filter(
      ts => now - ts < this.config.rateLimitWindow
    );
    
    // If under rate limit, proceed immediately
    if (this.requestTimestamps.length < this.config.rateLimit) {
      this.requestTimestamps.push(now);
      return Promise.resolve();
    }
    
    // Otherwise, wait until the next window
    const oldest = this.requestTimestamps[0];
    const waitTime = this.config.rateLimitWindow - (now - oldest) + 10; // Add 10ms buffer
    
    return new Promise(resolve => {
      setTimeout(() => {
        this.requestTimestamps = this.requestTimestamps.slice(1);
        this.requestTimestamps.push(Date.now());
        resolve();
      }, waitTime);
    });
  }
  
  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(url, options = {}, retries = this.config.maxRetries) {
    try {
      await this.waitForRateLimit();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });
      
      clearTimeout(timeoutId);
      
      // Handle rate limiting (429)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10) * 1000;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          return this.fetchWithRetry(url, options, retries - 1);
        }
        throw new Error('Rate limit exceeded');
      }
      
      // Handle other errors
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      if (retries > 0) {
        const delay = this.config.retryDelay * (this.config.maxRetries - retries + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1);
      }
      console.error('API request failed after retries:', error);
      throw error;
    }
  }
  
  /**
   * Geocode an address using OpenRouteService
   */
  async geocode(address) {
    const cacheKey = `geocode:${address}`;
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;
    
    try {
      const url = new URL('/geocode/search', this.config.baseUrls.openRouteService);
      
      const response = await this.fetchWithRetry(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': this.config.keys.openRouteService,
          'Accept': 'application/json, application/geo+json'
        },
        params: {
          text: address,
          size: 1
        }
      });
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const result = data.features[0];
        this.setCachedResponse(cacheKey, result);
        return result;
      }
      
      throw new Error('No results found');
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }
  
  /**
   * Get route between two points using OpenRouteService
   */
  async getRoute(start, end) {
    const cacheKey = `route:${JSON.stringify({start, end})}`;
    const cached = this.getCachedResponse(cacheKey);
    if (cached) return cached;
    
    try {
      const url = new URL('/v2/directions/driving-car/geojson', this.config.baseUrls.openRouteService);
      
      const response = await this.fetchWithRetry(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': this.config.keys.openRouteService,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: [start, end],
          format: 'geojson'
        })
      });
      
      const data = await response.json();
      this.setCachedResponse(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Routing error:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const apiService = new ApiService();

// Helper function to handle API errors
export function handleApiError(error) {
  console.error('API Error:', error);
  
  // Show user-friendly error message
  const errorMessage = error.message || 'Er is een fout opgetreden bij het verwerken van uw verzoek.';
  
  // You can add more specific error handling here
  if (error.message.includes('Rate limit')) {
    return 'Er zijn teveel verzoeken gedaan. Probeer het over een minuut opnieuw.';
  }
  
  return errorMessage;
}
