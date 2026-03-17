require("dotenv").config();
const axios = require("axios");
const { query } = require("./src/config/database");

const API_KEY = process.env.GOOGLE_BOOKS_KEY || "";
const BASE_URL = "https://www.googleapis.com/books/v1/volumes";

// ─── HELPERS ───

// Build the API URL with optional key
const buildUrl = (params) => {
  const url = new URL(BASE_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  if (API_KEY) url.searchParams.append("key", API_KEY);
  return url.toString();
};

/**
 * Extract the best available cover image
 * Google provides several sizes — we prefer the largest
 */
const extractCoverUrl = (imageLinks) => {
  if (!imageLinks) return null;

  // Order of preference: large → medium → small → thumbnail
  const url =
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.small ||
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail ||
    null;

  if (!url) return null;

  // Google returns http — upgrade to https
  // Also remove the edge=curl zoom parameter that adds a page-curl effect
  return url
    .replace("http://", "https://")
    .replace("&edge=curl", "")
    .replace("zoom=1", "zoom=0");
};

/**
 * Extract ISBN from the identifiers array
 * Prefer ISBN-13 over ISBN-10
 */
const extractISBN = (identifiers) => {
  if (!identifiers || identifiers.length === 0) return null;
  const isbn13 = identifiers.find((i) => i.type === "ISBN_13");
  const isbn10 = identifiers.find((i) => i.type === "ISBN_10");
  return isbn13?.identifier || isbn10?.identifier || null;
};

/**
 * Extract published year from various date formats
 * Google returns dates as "2005", "2005-06", or "2005-06-15"
 */
const extractYear = (publishedDate) => {
  if (!publishedDate) return null;
  const year = parseInt(publishedDate.substring(0, 4));
  return isNaN(year) ? null : year;
};

/**
 * Map Google Books categories to your app's category slugs
 * so books get linked to the right category in your database
 */
const mapToCategory = (googleCategories) => {
  if (!googleCategories || googleCategories.length === 0) return null;

  const categoryMap = {
    fiction: "fiction",
    "science fiction": "fiction",
    fantasy: "fiction",
    novel: "fiction",
    history: "history",
    historical: "history",
    science: "science",
    biology: "science",
    physics: "science",
    chemistry: "science",
    philosophy: "philosophy",
    technology: "technology",
    computers: "technology",
    programming: "technology",
    engineering: "technology",
    biography: "biography",
    autobiography: "biography",
    memoir: "biography",
    mathematics: "mathematics",
    math: "mathematics",
    economics: "economics",
    business: "economics",
    finance: "economics",
    art: "art-design",
    design: "art-design",
    literature: "literature",
    poetry: "literature",
    drama: "literature",
    classics: "literature",
  };

  const combined = googleCategories.join(" ").toLowerCase();

  for (const [keyword, slug] of Object.entries(categoryMap)) {
    if (combined.includes(keyword)) return slug;
  }

  return null;
};

// Fetch the category ID from your database by slug
const getCategoryId = async (slug) => {
  if (!slug) return null;
  try {
    const result = await query(`SELECT id FROM categories WHERE slug = $1`, [
      slug,
    ]);
    return result.rows[0]?.id || null;
  } catch {
    return null;
  }
};

// Link a book to a category in book_categories table
const linkBookToCategory = async (bookId, categoryId) => {
  if (!bookId || !categoryId) return;
  try {
    await query(
      `INSERT INTO book_categories (book_id, category_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [bookId, categoryId],
    );
  } catch {
    // Silently skip if link fails
  }
};

// Fetch a page of books from Google Books API
const fetchGoogleBooks = async (
  searchQuery,
  startIndex = 0,
  maxResults = 40,
) => {
  try {
    const url = buildUrl({
      q: searchQuery,
      startIndex,
      maxResults,
      printType: "books",
      langRestrict: "en",
      orderBy: "relevance",
    });

    const response = await axios.get(url, { timeout: 50000 });
    return response.data.items || [];
  } catch (error) {
    console.error(`   ⚠️  API fetch error: ${error.message}`);
    return [];
  }
};

// ─── MAIN IMPORT FUNCTION ───
const importFromGoogle = async (subject = "fiction", limit = 20) => {
  console.log("");
  console.log("━".repeat(52));
  console.log(`  📚 BookHaven — Google Books Importer`);
  console.log("━".repeat(52));
  console.log(`  Subject : ${subject}`);
  console.log(`  Limit   : ${limit} books`);
  console.log(
    `  API Key : ${API_KEY ? "✅ Configured" : "⚠️  Not set (rate limited)"}`,
  );
  console.log("━".repeat(52));
  console.log("");

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let startIndex = 0;
  const batchSize = 40; // Google's max per request

  try {
    while (imported + skipped < limit) {
      // Calculate how many more we need
      const remaining = limit - imported - skipped;
      const fetchCount = Math.min(batchSize, remaining + 10);

      console.log(
        `  🌐 Fetching batch from Google Books API (offset: ${startIndex})...`,
      );

      const items = await fetchGoogleBooks(
        `subject:${subject}`,
        startIndex,
        fetchCount,
      );

      if (items.length === 0) {
        console.log("  ℹ️  No more results available from Google Books.");
        break;
      }

      console.log(`  ✅ Got ${items.length} results — processing...`);
      console.log("");

      for (const item of items) {
        // Stop if we've hit our limit
        if (imported >= limit) break;

        const info = item.volumeInfo;

        try {
          // Skip books without essential fields
          if (!info.title || !info.authors) {
            skipped++;
            continue;
          }

          const title = info.title.trim();
          const author = info.authors[0].trim();
          const description = info.description || null;
          const isbn = extractISBN(info.industryIdentifiers);
          const publisher = info.publisher || null;
          const publishedYear = extractYear(info.publishedDate);
          const language =
            info.language === "en" ? "English" : info.language || "English";
          const pages = info.pageCount || null;
          const coverUrl = extractCoverUrl(info.imageLinks);
          const tags = info.categories || [];
          const avgRating = info.averageRating || null;
          const ratingsCount = info.ratingsCount || 0;

          // Google Books preview link — this is what users click to read
          const fileUrl =
            item.accessInfo?.webReaderLink ||
            `https://books.google.com/books?id=${item.id}`;

          // Determine file type based on access info
          const fileType = item.accessInfo?.epub?.isAvailable
            ? "epub"
            : item.accessInfo?.pdf?.isAvailable
              ? "pdf"
              : "epub"; // default to epub as the display type

          console.log(`  📖 "${title}" by ${author}`);

          // Check if book already exists
          const existing = await query(
            `SELECT id FROM books 
             WHERE LOWER(title) = LOWER($1) 
             AND LOWER(author) = LOWER($2)`,
            [title, author],
          );

          if (existing.rows.length > 0) {
            console.log(`     ⏭️  Skipped — already in database`);
            skipped++;
            continue;
          }

          // Skip books without a description — they're usually poor quality entries
          if (!description) {
            console.log(`     ⏭️  Skipped — no description available`);
            skipped++;
            continue;
          }

          // Insert the book
          const result = await query(
            `INSERT INTO books
              (title, author, description, isbn, publisher,
               published_year, language, pages, file_url,
               file_type, cover_url, is_public, tags,
               avg_rating, total_reviews)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
             RETURNING id`,
            [
              title,
              author,
              description,
              isbn,
              publisher,
              publishedYear,
              language,
              pages,
              fileUrl,
              fileType,
              coverUrl,
              true,
              tags,
              avgRating,
              ratingsCount,
            ],
          );

          const bookId = result.rows[0].id;

          // Link to the correct category in your database
          const categorySlug = mapToCategory(info.categories);
          const categoryId = await getCategoryId(categorySlug);
          await linkBookToCategory(bookId, categoryId);

          console.log(
            `     ✅ Imported — category: ${categorySlug || "uncategorized"}`,
          );
          if (coverUrl) console.log(`     🖼️  Cover: found`);
          if (avgRating)
            console.log(
              `     ⭐ Rating: ${avgRating} (${ratingsCount} reviews)`,
            );

          imported++;

          // Polite delay — respect Google's rate limits
          await new Promise((r) => setTimeout(r, 200));
        } catch (bookError) {
          console.log(`     ❌ Failed: ${bookError.message}`);
          failed++;
        }
      }

      startIndex += batchSize;

      // Avoid hammering the API between batches
      if (imported < limit) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    console.log("");
    console.log("━".repeat(52));
    console.log("  📊 Import Summary");
    console.log("━".repeat(52));
    console.log(`  ✅ Imported : ${imported} books`);
    console.log(`  ⏭️  Skipped  : ${skipped} books`);
    console.log(`  ❌ Failed   : ${failed} books`);
    console.log("━".repeat(52));
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  }
};

// Usage: node importBooksGoogle.js <subject> <limit>
const subject = process.argv[2] || "fiction";
const limit = parseInt(process.argv[3]) || 80;

importFromGoogle(subject, limit);
