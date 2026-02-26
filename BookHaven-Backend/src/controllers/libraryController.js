const { query } = require('../config/database');
const { cacheInvalidatePattern } = require('../config/redis');

// SHELF CONTROLLER
// Get user's shelf (all saved books, grouped by status)
exports.getShelf = async (req, res, next) => {
  try {
    const { status } = req.query;
    const conditions = [`s.user_id = $1`];
    const params = [req.user.id];

    if (status) {
      conditions.push(`s.status = $2`);
      params.push(status);
    }

    const result = await query(`
      SELECT
        s.id, s.status, s.added_at, s.updated_at,
        b.id AS book_id, b.title, b.author, b.cover_url,
        b.file_type, b.avg_rating, b.language, b.pages,
        COALESCE(rp.percentage, 0) AS progress_percentage,
        COALESCE(rp.position, 0) AS progress_position
      FROM shelves s
      JOIN books b ON s.book_id = b.id
      LEFT JOIN reading_progress rp ON rp.user_id = s.user_id AND rp.book_id = b.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.updated_at DESC
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Add book to shelf or update its status
exports.upsertShelf = async (req, res, next) => {
  try {
    const { book_id, status } = req.body;

    const validStatuses = ['reading', 'want_to_read', 'completed', 'dropped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const result = await query(`
      INSERT INTO shelves (user_id, book_id, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, book_id) DO UPDATE SET status = $3
      RETURNING *
    `, [req.user.id, book_id, status]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Remove book from shelf
exports.removeFromShelf = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    await query(`DELETE FROM shelves WHERE user_id = $1 AND book_id = $2`, [req.user.id, bookId]);
    res.json({ success: true, message: 'Removed from shelf.' });
  } catch (error) {
    next(error);
  }
};

// READING PROGRESS CONTROLLER
// Save/update reading progress
exports.saveProgress = async (req, res, next) => {
  try {
    const { book_id, position, total_pages } = req.body;

    const percentage = total_pages > 0 ? Math.min(100, (position / total_pages) * 100) : 0;

    const result = await query(`
      INSERT INTO reading_progress (user_id, book_id, position, total_pages, percentage, last_read_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, book_id) DO UPDATE SET
        position = $3,
        total_pages = $4,
        percentage = $5,
        last_read_at = NOW()
      RETURNING *
    `, [req.user.id, book_id, position, total_pages, percentage.toFixed(2)]);

    // If book is completed (>95%), auto-update shelf status to 'completed'
    if (percentage >= 95) {
      await query(`
        UPDATE shelves SET status = 'completed'
        WHERE user_id = $1 AND book_id = $2 AND status = 'reading'
      `, [req.user.id, book_id]);
    } else if (percentage > 0) {
      // Auto-mark as 'reading' if they've started
      await query(`
        INSERT INTO shelves (user_id, book_id, status)
        VALUES ($1, $2, 'reading')
        ON CONFLICT (user_id, book_id) DO UPDATE SET status = 'reading'
        WHERE shelves.status = 'want_to_read'
      `, [req.user.id, book_id]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Get progress for a specific book
exports.getProgress = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const result = await query(`
      SELECT * FROM reading_progress WHERE user_id = $1 AND book_id = $2
    `, [req.user.id, bookId]);

    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    next(error);
  }
};

// Get reading history (recently read books)
exports.getReadingHistory = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        rp.book_id, rp.position, rp.percentage, rp.last_read_at,
        b.title, b.author, b.cover_url, b.pages, b.file_type
      FROM reading_progress rp
      JOIN books b ON rp.book_id = b.id
      WHERE rp.user_id = $1 AND rp.percentage < 100
      ORDER BY rp.last_read_at DESC
      LIMIT 20
    `, [req.user.id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// REVIEWS CONTROLLER
// Get reviews for a book
exports.getReviews = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(`
      SELECT
        r.id, r.rating, r.body, r.created_at,
        u.id AS user_id, u.name AS user_name, u.avatar_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = $1 AND r.is_flagged = false
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [bookId, parseInt(limit), offset]);

    const countResult = await query(`SELECT COUNT(*) FROM reviews WHERE book_id = $1`, [bookId]);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Create or update a review
exports.upsertReview = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const { rating, body } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    const result = await query(`
      INSERT INTO reviews (user_id, book_id, rating, body)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, book_id) DO UPDATE SET rating = $3, body = $4
      RETURNING *
    `, [req.user.id, bookId, rating, body]);

    // Recalculate the book's average rating
    await query(`
      UPDATE books SET
        avg_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE book_id = $1),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE book_id = $1)
      WHERE id = $1
    `, [bookId]);

    await cacheInvalidatePattern(`books:*`);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Delete a review
exports.deleteReview = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    await query(`DELETE FROM reviews WHERE user_id = $1 AND book_id = $2`, [req.user.id, bookId]);

    await query(`
      UPDATE books SET
        avg_rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE book_id = $1), 0),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE book_id = $1)
      WHERE id = $1
    `, [bookId]);

    res.json({ success: true, message: 'Review deleted.' });
  } catch (error) {
    next(error);
  }
};

// RECOMMENDATIONS CONTROLLER
/**
 * Get personalized book recommendations
 * Find books in genres the user has read most, that they haven't shelved yet
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const result = await query(`
      WITH user_genres AS (
        -- Find the categories the user interacts with most
        SELECT bc.category_id, COUNT(*) AS interaction_count
        FROM shelves s
        JOIN book_categories bc ON s.book_id = bc.book_id
        WHERE s.user_id = $1
        GROUP BY bc.category_id
        ORDER BY interaction_count DESC
        LIMIT 5
      ),
      user_books AS (
        -- Books the user already has on their shelf
        SELECT book_id FROM shelves WHERE user_id = $1
      )
      SELECT DISTINCT b.id, b.title, b.author, b.cover_url, b.avg_rating, b.file_type, b.language
      FROM books b
      JOIN book_categories bc ON b.id = bc.book_id
      JOIN user_genres ug ON bc.category_id = ug.category_id
      WHERE b.id NOT IN (SELECT book_id FROM user_books)
        AND b.is_public = true
      ORDER BY b.avg_rating DESC
      LIMIT 12
    `, [req.user.id]);

    // If no personalization data yet, fall back to highly rated books
    if (result.rows.length === 0) {
      const fallback = await query(`
        SELECT id, title, author, cover_url, avg_rating, file_type, language
        FROM books WHERE is_public = true
        ORDER BY avg_rating DESC, total_reads DESC
        LIMIT 12
      `);
      return res.json({ success: true, data: fallback.rows, personalized: false });
    }

    res.json({ success: true, data: result.rows, personalized: true });
  } catch (error) {
    next(error);
  }
};

// ADMIN CONTROLLER
exports.getAdminStats = async (req, res, next) => {
  try {
    const [users, books, reviews, reads] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_this_month FROM users`),
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_this_month FROM books`),
      query(`SELECT COUNT(*)::int AS total FROM reviews`),
      query(`SELECT SUM(total_reads)::int AS total FROM books`),
    ]);

    const popularBooks = await query(`
      SELECT id, title, author, cover_url, total_reads, avg_rating
      FROM books ORDER BY total_reads DESC LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        users: users.rows[0],
        books: books.rows[0],
        reviews: reviews.rows[0].total,
        total_reads: reads.rows[0].total || 0,
        popular_books: popularBooks.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const condition = search ? `WHERE name ILIKE $3 OR email ILIKE $3` : '';
    const params = search
      ? [parseInt(limit), offset, `%${search}%`]
      : [parseInt(limit), offset];

    const result = await query(`
      SELECT id, name, email, role, is_active, created_at, last_login
      FROM users ${condition}
      ORDER BY created_at DESC LIMIT $1 OFFSET $2
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await query(`
      UPDATE users SET is_active = NOT is_active
      WHERE id = $1 RETURNING id, name, email, is_active
    `, [userId]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};
