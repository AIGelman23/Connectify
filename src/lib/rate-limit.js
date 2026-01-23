/**
 * Simple in-memory rate limiter that doesn't require external dependencies
 */
const rateLimitStore = {
  requests: new Map(),
  resetTimers: new Map(),
};

export function rateLimit({ interval = 60000, maxRequests = 3 }) {
  // Clean up stale entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of rateLimitStore.resetTimers.entries()) {
      if (now > timestamp) {
        rateLimitStore.requests.delete(key);
        rateLimitStore.resetTimers.delete(key);
      }
    }
  }, 60000); // Clean up every minute

  return {
    check: async (identifier) => {
      const now = Date.now();

      // Initialize or get current count
      const currentCount = rateLimitStore.requests.get(identifier) || 0;

      // Check if limit exceeded
      if (currentCount >= maxRequests) {
        return {
          success: false,
          limit: maxRequests,
          remaining: 0,
          resetAt: rateLimitStore.resetTimers.get(identifier) || now + interval,
        };
      }

      // Increment count
      rateLimitStore.requests.set(identifier, currentCount + 1);

      // Set expiry time if not already set
      if (!rateLimitStore.resetTimers.has(identifier)) {
        rateLimitStore.resetTimers.set(identifier, now + interval);
      }

      // Return success with remaining attempts
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - (currentCount + 1),
        resetAt: rateLimitStore.resetTimers.get(identifier),
      };
    },
  };
}
