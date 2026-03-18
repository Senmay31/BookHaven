const express = require("express");
const rateLimit = require("express-rate-limit");

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
  libraryController.importBooks,
);

module.exports = router;
