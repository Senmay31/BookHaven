const express = require("express");
const rateLimit = require("express-rate-limit");
const { generateTokenPair } = require("../utils/jwt");
const { query } = require("../config/database");
const passport = require("../config/passport");
const authController = require("../controllers/authController");
const booksController = require("../controllers/booksController");
const libraryController = require("../controllers/libraryController");
const {
  authenticate,
  optionalAuthenticate,
  authorize,
} = require("../middleware/auth");
const { validate } = require("../middleware/errorHandler");
const { upload } = require("../config/storage");

const router = express.Router();

// ─── RATE LIMITERS ───
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    success: false,
    message: "Too many attempts. Please wait 15 minutes.",
  },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: "Too many requests. Please check again later.",
  },
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
  },
});

router.use(apiLimiter);

// ─── AUTH ROUTES ───
router.post(
  "/auth/register",
  authLimiter,
  authController.registerValidation,
  validate,
  authController.register,
);
router.post(
  "/auth/login",
  authLimiter,
  authController.loginValidation,
  validate,
  authController.login,
);
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=google_failed`,
    session: false,
  }),
  async (req, res) => {
    try {
      const user = req.user;
      // console.log("🔍 Google callback - user received:", user ? "yes" : "no");
      // console.log(
      //   "🔍 User data:",
      //   JSON.stringify({
      //     id: user?.id,
      //     email: user?.email,
      //     role: user?.role,
      //   }),
      // );

      // if (!user) {
      //   console.error("❌ No user object from passport");
      //   return res.redirect(
      //     `${process.env.FRONTEND_URL}/auth/login?error=no_user`,
      //   );
      // }

      // const { generateTokenPair } = require("../utils/jwt");
      const { accessToken, refreshToken } = await generateTokenPair(user);

      // Store refresh token in database
      await query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')
         ON CONFLICT (token) DO UPDATE
         SET expires_at = NOW() + INTERVAL '7 days'`,
        [user.id, refreshToken],
      );

      // console.log("🔍 Refresh token stored");

      // Redirect to frontend with tokens in URL params
      // Frontend reads these and stores them in Zustand
      const params = new URLSearchParams({
        accessToken,
        refreshToken,
        userId: user.id,
      });

      // const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`;
      // console.log("🔍 Redirecting to:", redirectUrl.substring(0, 60) + "...");

      // res.redirect(redirectUrl);

      res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`,
      );
    } catch (error) {
      // console.error("❌ Google callback error:", error.message);
      // console.error("❌ Full error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/login?error=server_error`);
    }
  },
);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout", authController.logout);
router.post("/auth/logout-all", authenticate, authController.logoutAll);
router.get("/auth/me", authenticate, authController.getMe);
router.patch("/auth/profile", authenticate, authController.updateProfile);

// ─── BOOKS ROUTES ───
router.get("/books", booksController.getBooks);
router.get("/books/featured", booksController.getFeatured);
router.get("/books/categories", booksController.getCategories);
router.get("/books/:id", booksController.getBook);
router.get("/books/:id/read-url", authenticate, booksController.getReadUrl);

router.post(
  "/books",
  authenticate,
  authorize("admin", "librarian"),
  upload.fields([
    { name: "book", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  booksController.uploadBook,
);
router.patch(
  "/books/:id",
  authenticate,
  authorize("admin", "librarian"),
  booksController.updateBook,
);
router.delete(
  "/books/:id",
  authenticate,
  authorize("admin"),
  booksController.deleteBook,
);

// ─── REVIEWS ROUTES ───
router.get("/books/:bookId/reviews", libraryController.getReviews);
router.post(
  "/books/:bookId/reviews",
  authenticate,
  libraryController.upsertReview,
);
router.delete(
  "/books/:bookId/reviews",
  authenticate,
  libraryController.deleteReview,
);

// ─── SHELF ROUTES ───
router.get("/shelf", authenticate, libraryController.getShelf);
router.post("/shelf", authenticate, libraryController.upsertShelf);
router.delete(
  "/shelf/:bookId",
  authenticate,
  libraryController.removeFromShelf,
);

// ─── READING PROGRESS ROUTES ───
router.get(
  "/progress/history",
  authenticate,
  libraryController.getReadingHistory,
);
router.get("/progress/:bookId", authenticate, libraryController.getProgress);
router.post("/progress", authenticate, libraryController.saveProgress);

// ─── RECOMMENDATIONS ───
router.get(
  "/recommendations",
  authenticate,
  libraryController.getRecommendations,
);

// ─── ADMIN ROUTES ───
router.get(
  "/admin/stats",
  authenticate,
  authorize("admin"),
  libraryController.getAdminStats,
);
router.get(
  "/admin/users",
  authenticate,
  authorize("admin"),
  libraryController.getAdminUsers,
);
router.patch(
  "/admin/users/:userId/toggle",
  authenticate,
  authorize("admin"),
  libraryController.toggleUserStatus,
);
router.post(
  "/admin/import-books",
  authenticate,
  authorize("admin"),
  libraryController.importBooksFromGoogle,
);
router.post(
  "/admin/import-books/openlibrary",
  authenticate,
  libraryController.importFromOpenLibrary,
);
router.post(
  "/admin/import-books/gutenberg",
  authenticate,
  libraryController.importFromGutenberg,
);

module.exports = router;
