const Redis = require("ioredis");

let redis = null;

// Initialize Redis connection
const connectRedis = () => {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  } else {
    redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }

  redis.on("connect", () => console.log("✅ Redis connected"));
  redis.on("error", (err) => {
    console.warn("⚠️  Redis unavailable, caching disabled:", err.message);
    redis = null; // Gracefully disable caching if Redis is not available
  });
  // redis.off('disconnect', () => console.log('❌❌ Redis disconnected'));

  return redis;
};

// Get a value from cache
const cacheGet = async (key) => {
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

// Set a value in cache with optional TTL (seconds)
const cacheSet = async (key, value, ttl = 300) => {
  if (!redis) return;
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // Silently fail — caching is an optimization, not a requirement
  }
};

// Delete a cache key (or pattern)
const cacheDel = async (key) => {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {}
};

// Invalidate all keys matching a pattern
const cacheInvalidatePattern = async (pattern) => {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {}
};

module.exports = {
  connectRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheInvalidatePattern,
};
