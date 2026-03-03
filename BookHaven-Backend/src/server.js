require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cron = require("node-cron");

const routes = require("./routes");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { connectRedis } = require("./config/redis");
const { query } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── SECURITY MIDDLEWARE ───
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow S3 image embeds
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = (
        process.env.ALLOWED_ORIGINS || "http://localhost:3000"
      ).split(",");
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── GENERAL MIDDLEWARE ────
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ─── HEALTH CHECK ───
app.get("/health", async (req, res) => {
  try {
    await query("SELECT 1");
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    res
      .status(503)
      .json({
        status: "unhealthy",
        message: "Database connection failed.",
        error: error.message,
      });
  }
});

// ─── API ROUTES ───
app.use("/api/v1", routes);

// ─── ERROR HANDLING ───
app.use(notFound);
app.use(errorHandler);

// ─── CRON JOBS ───
// Clean up expired refresh tokens daily at 3 AM
cron.schedule("0 3 * * *", async () => {
  try {
    const result = await query(
      `DELETE FROM refresh_tokens WHERE expires_at < NOW()`,
    );
    console.log(`🧹 Cleaned ${result.rowCount} expired refresh tokens`);
  } catch (error) {
    console.error("❌ Token cleanup failed:", error.message);
  }
});

// ─── STARTUP ────
const startServer = async () => {
  // Connect to Redis (non-blocking — app works without it)
  connectRedis();

  app.listen(PORT, () => {
    console.log("");
    console.log("📚 ═══════════════════════════════════════════════");
    console.log("   BookHaven API Server");
    console.log(`   🚀 Running on http://localhost:${PORT}`);
    console.log(`   🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`   📖 API Base: http://localhost:${PORT}/api/v1`);
    console.log("   ═══════════════════════════════════════════════");
    console.log("");
  });
};

startServer();

module.exports = app;
