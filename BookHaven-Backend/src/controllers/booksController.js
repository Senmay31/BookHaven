const { query } = require('../config/database');
const { uploadToS3, getSignedBookUrl, deleteFromS3 } = require('../config/storage');
const { cacheGet, cacheSet, cacheInvalidatePattern } = require('../config/redis');

// ─── GET ALL BOOKS (with filtering, search, pagination) ───
exports.getBooks = async (req, res, next) => {
  try {
    const {
      search,
      category,
      language,
      year_from,
      year_to,
      file_type,
      sort = 'created_at',
      order = 'DESC',
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Cache key includes all filter params
    const cacheKey = `books:list:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, ...cached, cached: true });

    const conditions = ['b.is_public = true'];
    const params = [];
    let paramCount = 1;

    if (search) {
      conditions.push(`b.search_vector @@ plainto_tsquery('english', $${paramCount})`);
      params.push(search);
      paramCount++;
    }

    if (category) {
      conditions.push(`EXISTS (
        SELECT 1 FROM book_categories bc
        JOIN categories c ON bc.category_id = c.id
        WHERE bc.book_id = b.id AND c.slug = $${paramCount}
      )`);
      params.push(category);
      paramCount++;
    }

    if (language) {
      conditions.push(`LOWER(b.language) = LOWER($${paramCount})`);
      params.push(language);
      paramCount++;
    }

    if (year_from) {
      conditions.push(`b.published_year >= $${paramCount}`);
      params.push(parseInt(year_from));
      paramCount++;
    }

    if (year_to) {
      conditions.push(`b.published_year <= $${paramCount}`);
      params.push(parseInt(year_to));
      paramCount++;
    }

    if (file_type) {
      conditions.push(`b.file_type = $${paramCount}`);
      params.push(file_type);
      paramCount++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSorts = ['created_at', 'title', 'author', 'avg_rating', 'total_downloads', 'published_year'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Boost search-ranked results when searching
    const orderBy = search
      ? `ts_rank(b.search_vector, plainto_tsquery('english', '${search}')) DESC, b.${safeSort} ${safeOrder}`
      : `b.${safeSort} ${safeOrder}`;

    const booksQuery = `
      SELECT
        b.id, b.title, b.author, b.cover_url, b.language,
        b.published_year, b.file_type, b.avg_rating, b.total_reviews,
        b.total_downloads, b.is_featured, b.tags, b.created_at,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'color', c.color))
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS categories
      FROM books b
      LEFT JOIN book_categories bc ON b.id = bc.book_id
      LEFT JOIN categories c ON bc.category_id = c.id
      ${whereClause}
      GROUP BY b.id
      ORDER BY ${orderBy}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(parseInt(limit), offset);

    const countQuery = `SELECT COUNT(DISTINCT b.id) FROM books b ${whereClause}`;

    const [booksResult, countResult] = await Promise.all([
      query(booksQuery, params),
      query(countQuery, params.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].count);
    const responseData = {
      data: booksResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasMore: offset + parseInt(limit) < total,
      },
    };

    // Cache for 5 minutes
    await cacheSet(cacheKey, responseData, 300);

    res.json({ success: true, ...responseData });
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE BOOK ───
exports.getBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        b.*,
        u.name AS uploaded_by_name,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'color', c.color))
          FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS categories
      FROM books b
      LEFT JOIN users u ON b.uploaded_by = u.id
      LEFT JOIN book_categories bc ON b.id = bc.book_id
      LEFT JOIN categories c ON bc.category_id = c.id
      WHERE b.id = $1 AND b.is_public = true
      GROUP BY b.id, u.name
    `, [id]);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    const book = result.rows[0];
    // Never expose the raw S3 key — generate a signed URL instead
    delete book.file_url;

    res.json({ success: true, data: book });
  } catch (error) {
    next(error);
  }
};

// ─── GET SIGNED READING URL ───
exports.getReadUrl = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`SELECT file_url, title FROM books WHERE id = $1 AND is_public = true`, [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    // Generate a 1-hour signed URL — like a timed reading pass
    const signedUrl = await getSignedBookUrl(result.rows[0].file_url, 3600);

    // Increment read count
    await query(`UPDATE books SET total_reads = total_reads + 1 WHERE id = $1`, [id]);

    res.json({ success: true, data: { url: signedUrl, expiresIn: 3600 } });
  } catch (error) {
    next(error);
  }
};

// ─── UPLOAD BOOK ───
exports.uploadBook = async (req, res, next) => {
  try {
    const { title, author, description, isbn, publisher, published_year, language, pages, category_ids, tags } = req.body;

    if (!req.files?.book?.[0]) {
      return res.status(400).json({ success: false, message: 'Book file is required.' });
    }

    const bookFile = req.files.book[0];
    const coverFile = req.files?.cover?.[0];

    // Upload book file to S3 (private)
    const fileKey = await uploadToS3(bookFile.buffer, bookFile.originalname, 'books');
    const fileType = bookFile.originalname.split('.').pop().toLowerCase();

    // Upload cover image to S3 (public)
    let coverUrl = null;
    if (coverFile) {
      coverUrl = await uploadToS3(coverFile.buffer, coverFile.originalname, 'covers');
    }

    const result = await query(`
      INSERT INTO books (title, author, description, isbn, publisher, published_year, language, pages,
        file_url, file_type, file_size, cover_url, tags, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, title, author, cover_url, file_type, created_at
    `, [
      title, author, description, isbn, publisher,
      published_year ? parseInt(published_year) : null,
      language || 'English',
      pages ? parseInt(pages) : null,
      fileKey, fileType, bookFile.size, coverUrl,
      tags ? JSON.parse(tags) : [],
      req.user.id,
    ]);

    const book = result.rows[0];

    // Link categories
    if (category_ids) {
      const cats = JSON.parse(category_ids);
      for (const catId of cats) {
        await query(
          `INSERT INTO book_categories (book_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [book.id, catId]
        );
      }
    }

    // Invalidate book list cache
    await cacheInvalidatePattern('books:list:*');

    res.status(201).json({ success: true, message: 'Book uploaded successfully!', data: book });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE BOOK ───
exports.updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, author, description, publisher, published_year, language, pages, tags, is_featured, is_public } = req.body;

    const result = await query(`
      UPDATE books SET
        title = COALESCE($1, title),
        author = COALESCE($2, author),
        description = COALESCE($3, description),
        publisher = COALESCE($4, publisher),
        published_year = COALESCE($5, published_year),
        language = COALESCE($6, language),
        pages = COALESCE($7, pages),
        tags = COALESCE($8, tags),
        is_featured = COALESCE($9, is_featured),
        is_public = COALESCE($10, is_public)
      WHERE id = $11
      RETURNING id, title, author, is_featured, is_public, updated_at
    `, [title, author, description, publisher, published_year, language, pages, tags, is_featured, is_public, id]);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    await cacheInvalidatePattern('books:*');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE BOOK ───
exports.deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(`DELETE FROM books WHERE id = $1 RETURNING file_url, cover_url`, [id]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    // Delete from S3
    const { file_url, cover_url } = result.rows[0];
    await deleteFromS3(file_url).catch(console.error);

    await cacheInvalidatePattern('books:*');
    res.json({ success: true, message: 'Book deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── GET FEATURED BOOKS ───
exports.getFeatured = async (req, res, next) => {
  try {
    const cacheKey = 'books:featured';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const result = await query(`
      SELECT id, title, author, cover_url, avg_rating, total_reviews, file_type, language
      FROM books WHERE is_featured = true AND is_public = true
      ORDER BY avg_rating DESC LIMIT 10
    `);

    await cacheSet(cacheKey, result.rows, 600); // cache 10 min
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

// ─── GET CATEGORIES ───
exports.getCategories = async (req, res, next) => {
  try {
    const cached = await cacheGet('categories:all');
    if (cached) return res.json({ success: true, data: cached });

    const result = await query(`
      SELECT c.*, COUNT(bc.book_id)::int AS book_count
      FROM categories c
      LEFT JOIN book_categories bc ON c.id = bc.category_id
      GROUP BY c.id ORDER BY c.name
    `);

    await cacheSet('categories:all', result.rows, 900);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};
