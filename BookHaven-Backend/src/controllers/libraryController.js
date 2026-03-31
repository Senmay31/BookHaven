const { query } = require("../config/database");
const axios = require("axios");
const { cacheInvalidatePattern } = require("../config/redis");

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

    const result = await query(
      `
      SELECT
        s.id, s.status, s.added_at, s.updated_at,
        b.id AS book_id, b.title, b.author, b.cover_url,
        b.file_type, b.avg_rating, b.language, b.pages,
        COALESCE(rp.percentage, 0) AS progress_percentage,
        COALESCE(rp.position, 0) AS progress_position
      FROM shelves s
      JOIN books b ON s.book_id = b.id
      LEFT JOIN reading_progress rp ON rp.user_id = s.user_id AND rp.book_id = b.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY s.updated_at DESC
    `,
      params,
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// Add book to shelf or update its status
exports.upsertShelf = async (req, res, next) => {
  try {
    const { book_id, status } = req.body;

    const validStatuses = ["reading", "want_to_read", "completed", "dropped"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    }

    const result = await query(
      `
      INSERT INTO shelves (user_id, book_id, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, book_id) DO UPDATE SET status = $3
      RETURNING *
    `,
      [req.user.id, book_id, status],
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// Remove book from shelf
exports.removeFromShelf = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    await query(`DELETE FROM shelves WHERE user_id = $1 AND book_id = $2`, [
      req.user.id,
      bookId,
    ]);
    res.json({ success: true, message: "Removed from shelf." });
  } catch (error) {
    next(error);
  }
};

// READING PROGRESS CONTROLLER
// Save/update reading progress
exports.saveProgress = async (req, res, next) => {
  try {
    const {
      book_id,
      position,
      total_pages,
      progress_percentage,
      last_read_at,
    } = req.body;

    // const progress_percentage =
    //   total_pages > 0 ? Math.min(100, (position / total_pages) * 100) : 0;

    // Calculate percentage from position/total_pages if percentage not provided
    const percentage =
      progress_percentage !== undefined
        ? progress_percentage
        : position && total_pages
          ? Math.round((position / total_pages) * 100)
          : 0;

    const result = await query(
      `
      INSERT INTO reading_progress (user_id, book_id, position, total_pages, progress_percentage, last_read_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, book_id) DO UPDATE SET
        position = $3,
        total_pages = $4,
        progress_percentage = $5,
        last_read_at = NOW()
      RETURNING *
    `,
      [
        req.user.id,
        book_id,
        position,
        total_pages,
        percentage.toFixed(2),
        last_read_at || new Date(),
      ],
    );

    // If book is completed (>95%), auto-update shelf status to 'completed'
    if (percentage >= 95) {
      await query(
        `
        UPDATE shelves SET status = 'completed'
        WHERE user_id = $1 AND book_id = $2 AND status = 'reading'
      `,
        [req.user.id, book_id],
      );
    } else if (percentage > 0) {
      // Auto-mark as 'reading' if they've started
      await query(
        `
        INSERT INTO shelves (user_id, book_id, status)
        VALUES ($1, $2, 'reading')
        ON CONFLICT (user_id, book_id) DO UPDATE SET status = 'reading'
        WHERE shelves.status = 'want_to_read'
      `,
        [req.user.id, book_id],
      );
    }

    res.json({
      success: true,
      message: "Progress saved!",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Get progress for a specific book
exports.getProgress = async (req, res, next) => {
  try {
    const { bookId } = req.params;
    const result = await query(
      `
      SELECT * FROM reading_progress WHERE user_id = $1 AND book_id = $2
    `,
      [req.user.id, bookId],
    );

    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    next(error);
  }
};

// Get reading history (recently read books)
exports.getReadingHistory = async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT
        rp.book_id, rp.position, rp.percentage, rp.last_read_at,
        b.title, b.author, b.cover_url, b.pages, b.file_type
      FROM reading_progress rp
      JOIN books b ON rp.book_id = b.id
      WHERE rp.user_id = $1 AND rp.percentage < 100
      ORDER BY rp.last_read_at DESC
      LIMIT 20
    `,
      [req.user.id],
    );

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

    const result = await query(
      `
      SELECT
        r.id, r.rating, r.body, r.created_at,
        u.id AS user_id, u.name AS user_name, u.avatar_url
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.book_id = $1 AND r.is_flagged = false
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [bookId, parseInt(limit), offset],
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM reviews WHERE book_id = $1`,
      [bookId],
    );

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
      return res
        .status(400)
        .json({ success: false, message: "Rating must be between 1 and 5." });
    }

    const result = await query(
      `
      INSERT INTO reviews (user_id, book_id, rating, body)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, book_id) DO UPDATE SET rating = $3, body = $4
      RETURNING *
    `,
      [req.user.id, bookId, rating, body],
    );

    // Recalculate the book's average rating
    await query(
      `
      UPDATE books SET
        avg_rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE book_id = $1),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE book_id = $1)
      WHERE id = $1
    `,
      [bookId],
    );

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
    await query(`DELETE FROM reviews WHERE user_id = $1 AND book_id = $2`, [
      req.user.id,
      bookId,
    ]);

    await query(
      `
      UPDATE books SET
        avg_rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE book_id = $1), 0),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE book_id = $1)
      WHERE id = $1
    `,
      [bookId],
    );

    res.json({ success: true, message: "Review deleted." });
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
    const result = await query(
      `
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
    `,
      [req.user.id],
    );

    // If no personalization data yet, fall back to highly rated books
    if (result.rows.length === 0) {
      const fallback = await query(`
        SELECT id, title, author, cover_url, avg_rating, file_type, language
        FROM books WHERE is_public = true
        ORDER BY avg_rating DESC, total_reads DESC
        LIMIT 12
      `);
      return res.json({
        success: true,
        data: fallback.rows,
        personalized: false,
      });
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
      query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_this_month FROM users`,
      ),
      query(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_this_month FROM books`,
      ),
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

    const condition = search ? `WHERE name ILIKE $3 OR email ILIKE $3` : "";
    const params = search
      ? [parseInt(limit), offset, `%${search}%`]
      : [parseInt(limit), offset];

    const result = await query(
      `
      SELECT id, name, email, role, is_active, created_at, last_login
      FROM users ${condition}
      ORDER BY created_at DESC LIMIT $1 OFFSET $2
    `,
      params,
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await query(
      `
      UPDATE users SET is_active = NOT is_active
      WHERE id = $1 RETURNING id, name, email, is_active
    `,
      [userId],
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// exports.importBooks = async (req, res, next) => {
//   try {
//     const { subject = "fiction", limit = 50 } = req.body;

//     // Only admins can trigger imports
//     if (req.user.role !== "admin" && req.user.role !== "librarian") {
//       return res
//         .status(403)
//         .json({ success: false, message: "Access denied." });
//     }

//     const API_KEY = process.env.GOOGLE_BOOKS_KEY || "";
//     const BASE_URL = "https://www.googleapis.com/books/v1/volumes";

//     const url = new URL(BASE_URL);
//     url.searchParams.append("q", `subject:${subject}`);
//     url.searchParams.append("maxResults", Math.min(limit, 40));
//     url.searchParams.append("printType", "books");
//     url.searchParams.append("langRestrict", "en");
//     if (API_KEY) url.searchParams.append("key", API_KEY);

//     const response = await axios.get(url.toString(), { timeout: 20000 });
//     const items = response.data.items || [];

//     let imported = 0;
//     let skipped = 0;

//     for (const item of items) {
//       const info = item.volumeInfo;
//       if (!info.title || !info.authors || !info.description) {
//         skipped++;
//         continue;
//       }

//       const existing = await query(
//         `SELECT id FROM books WHERE LOWER(title) = LOWER($1) AND LOWER(author) = LOWER($2)`,
//         [info.title, info.authors[0]],
//       );

//       if (existing.rows.length > 0) {
//         skipped++;
//         continue;
//       }

//       const coverUrl =
//         info.imageLinks?.thumbnail
//           ?.replace("http://", "https://")
//           ?.replace("&edge=curl", "") || null;

//       const isbn =
//         info.industryIdentifiers?.find((i) => i.type === "ISBN_13")
//           ?.identifier || null;

//       await query(
//         `INSERT INTO books
//           (title, author, description, isbn, publisher,
//            published_year, language, pages, file_url,
//            file_type, cover_url, is_public, tags)
//          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
//         [
//           info.title,
//           info.authors[0],
//           info.description,
//           isbn,
//           info.publisher || null,
//           info.publishedDate
//             ? parseInt(info.publishedDate.substring(0, 4))
//             : null,
//           "English",
//           info.pageCount || null,
//           item.accessInfo?.webReaderLink ||
//             `https://books.google.com/books?id=${item.id}`,
//           "epub",
//           coverUrl,
//           true,
//           info.categories || [],
//         ],
//       );

//       imported++;
//     }

//     res.json({
//       success: true,
//       message: `Import complete — ${imported} imported, ${skipped} skipped.`,
//       data: { imported, skipped },
//     });
//   } catch (error) {
//     next(error);
//   }
// };

exports.importBooksFromGoogle = async (req, res, next) => {
  try {
    const { subject = "fiction", limit = 40 } = req.body;

    if (req.user.role !== "admin" && req.user.role !== "librarian") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    const API_KEY = process.env.GOOGLE_BOOKS_KEY || "";
    const BASE_URL = "https://www.googleapis.com/books/v1/volumes";
    const BATCH_SIZE = 40; // Google's maximum per request

    let imported = 0;
    let skipped = 0;
    let startIndex = 0;
    const totalNeeded = Math.min(limit, 200); // cap at 200 per import

    while (imported + skipped < totalNeeded) {
      const remaining = totalNeeded - imported - skipped;
      const fetchCount = Math.min(BATCH_SIZE, remaining + 10);

      // Build request URL
      const url = new URL(BASE_URL);
      url.searchParams.append("q", `subject:${subject}`);
      url.searchParams.append("startIndex", startIndex);
      url.searchParams.append("maxResults", fetchCount);
      url.searchParams.append("printType", "books");
      url.searchParams.append("langRestrict", "en");
      url.searchParams.append("orderBy", "relevance");
      if (API_KEY) url.searchParams.append("key", API_KEY);

      const response = await axios.get(url.toString(), { timeout: 20000 });
      const items = response.data.items || [];

      if (items.length === 0) break; // no more results

      for (const item of items) {
        if (imported >= totalNeeded) break;

        const info = item.volumeInfo;

        // Skip books missing essential fields
        if (!info.title || !info.authors || !info.description) {
          skipped++;
          continue;
        }

        // Skip duplicates
        const existing = await query(
          `SELECT id FROM books 
           WHERE LOWER(title) = LOWER($1) 
           AND LOWER(author) = LOWER($2)`,
          [info.title, info.authors[0]],
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        const coverUrl =
          info.imageLinks?.thumbnail
            ?.replace("http://", "https://")
            ?.replace("&edge=curl", "") || null;

        const isbn =
          info.industryIdentifiers?.find((i) => i.type === "ISBN_13")
            ?.identifier || null;

        const publishedYear = info.publishedDate
          ? parseInt(info.publishedDate.substring(0, 4))
          : null;

        await query(
          `INSERT INTO books
            (title, author, description, isbn, publisher,
             published_year, language, pages, file_url,
             file_type, cover_url, is_public, tags)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            info.title,
            info.authors[0],
            info.description,
            isbn,
            info.publisher || null,
            publishedYear,
            "English",
            info.pageCount || null,
            item.accessInfo?.webReaderLink ||
              `https://books.google.com/books?id=${item.id}`,
            "epub",
            coverUrl,
            true,
            info.categories || [subject],
          ],
        );

        imported++;
      }

      startIndex += BATCH_SIZE;

      // Polite delay between batches
      await new Promise((r) => setTimeout(r, 500));
    }

    res.json({
      success: true,
      message: `Import complete — ${imported} imported, ${skipped} skipped.`,
      data: { imported, skipped, subject },
    });
  } catch (error) {
    next(error);
  }
};

exports.importFromOpenLibrary = async (req, res, next) => {
  try {
    const { subject = "fiction", limit = 20 } = req.body;

    if (req.user.role !== "admin" && req.user.role !== "librarian") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    // Open Library subject search — no API key needed
    const response = await axios.get(
      `https://openlibrary.org/subjects/${subject}.json?limit=${Math.min(limit, 50)}`,
      { timeout: 15000 },
    );

    const works = response.data.works || [];
    let imported = 0;
    let skipped = 0;

    for (const work of works) {
      if (imported >= limit) break;

      const title = work.title;
      const author = work.authors?.[0]?.name || "Unknown Author";
      const coverId = work.cover_id;
      const firstPublishYear = work.first_publish_year || null;

      if (!title || !author) {
        skipped++;
        continue;
      }

      // Check for duplicates
      const existing = await query(
        `SELECT id FROM books 
         WHERE LOWER(title) = LOWER($1) 
         AND LOWER(author) = LOWER($2)`,
        [title, author],
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Fetch work details for description
      let description = null;
      try {
        const workRes = await axios.get(
          `https://openlibrary.org${work.key}.json`,
          { timeout: 20000 },
        );
        const desc = workRes.data.description;
        description = typeof desc === "string" ? desc : desc?.value || null;
      } catch {
        description = `${title} by ${author}.`;
      }

      // Build cover URL from Open Library's cover service
      const coverUrl = coverId
        ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
        : null;

      // Open Library read link
      const fileUrl = `https://openlibrary.org${work.key}`;

      await query(
        `INSERT INTO books
          (title, author, description, publisher,
           published_year, language, file_url,
           file_type, cover_url, is_public, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          title,
          author,
          description || `${title} by ${author}.`,
          "Open Library",
          firstPublishYear,
          "English",
          fileUrl,
          "epub",
          coverUrl,
          true,
          [subject],
        ],
      );

      imported++;

      // Small delay to be respectful to Open Library's servers
      await new Promise((r) => setTimeout(r, 300));
    }

    res.json({
      success: true,
      message: `Open Library import complete — ${imported} imported, ${skipped} skipped.`,
      data: { imported, skipped, subject },
    });
  } catch (error) {
    next(error);
  }
};

exports.importFromGutenberg = async (req, res, next) => {
  try {
    const { topic = "fiction", limit = 20 } = req.body;

    if (req.user.role !== "admin" && req.user.role !== "librarian") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }

    const response = await axios.get(
      `https://gutendex.com/books/?topic=${topic}&languages=en&mime_type=application%2Fepub%2Bzip`,
      { timeout: 20000 },
    );

    const books = response.data.results?.slice(0, limit) || [];
    let imported = 0;
    let skipped = 0;

    for (const book of books) {
      const title = book.title;

      // Convert "Last, First" author format to "First Last"
      const rawAuthor = book.authors?.[0]?.name || "Unknown";
      const author = rawAuthor.includes(",")
        ? rawAuthor
            .split(",")
            .map((p) => p.trim())
            .reverse()
            .join(" ")
        : rawAuthor;

      const epubUrl = book.formats?.["application/epub+zip"] || null;
      const coverUrl = book.formats?.["image/jpeg"] || null;

      if (!epubUrl) {
        skipped++;
        continue;
      }

      // Check for duplicates
      const existing = await query(
        `SELECT id FROM books 
         WHERE LOWER(title) = LOWER($1) 
         AND LOWER(author) = LOWER($2)`,
        [title, author],
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await query(
        `INSERT INTO books
          (title, author, description, publisher,
           language, file_url, file_type,
           cover_url, is_public, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          title,
          author,
          `${title} is a classic work by ${author}, available for free from Project Gutenberg.`,
          "Project Gutenberg",
          "English",
          epubUrl, // actual EPUB file URL — users can download and read
          "epub",
          coverUrl,
          true,
          [topic],
        ],
      );

      imported++;
      await new Promise((r) => setTimeout(r, 300));
    }

    res.json({
      success: true,
      message: `Gutenberg import complete — ${imported} imported, ${skipped} skipped.`,
      data: { imported, skipped, topic },
    });
  } catch (error) {
    next(error);
  }
};
