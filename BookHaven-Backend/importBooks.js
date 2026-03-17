require("dotenv").config();
const axios = require("axios");
const { query } = require("./src/config/database");

const GOOGLE_BOOKS_KEY = process.env.GOOGLE_BOOKS_KEY || "";

// ─── FETCH METADATA FROM GOOGLE BOOKS ───
const getGoogleMetadata = async (title, author) => {
  try {
    const searchQuery = encodeURIComponent(`${title} ${author}`);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${searchQuery}${GOOGLE_BOOKS_KEY ? `&key=${GOOGLE_BOOKS_KEY}` : ""}`;
    const response = await axios.get(url, { timeout: 5000 });
    const item = response.data.items?.[0]?.volumeInfo;

    if (!item) return {};

    return {
      description: item.description || null,
      isbn:
        item.industryIdentifiers?.find((i) => i.type === "ISBN_13")
          ?.identifier || null,
      publisher: item.publisher || null,
      pages: item.pageCount || null,
    };
  } catch {
    return {}; // Google Books is optional — don't fail if it's unavailable
  }
};

// ─── IMPORT BOOKS FROM GUTENDEX ───
const importBooks = async (topic = "science", limit = 30) => {
  console.log(`📚 Importing ${limit} books on topic: "${topic}"...`);
  console.log("");

  try {
    // Fetch from Gutendex
    const response = await axios.get(
      `https://gutendex.com/books/?topic=${topic}&languages=en&mime_type=application%2Fepub%2Bzip`,
      { timeout: 50000 },
    );

    const books = response.data.results.slice(0, limit);
    console.log(`✅ Found ${books.length} books from Gutendex`);
    console.log("");

    let imported = 0;
    let skipped = 0;

    for (const book of books) {
      try {
        // Extract fields from Gutendex
        const title = book.title;
        const author =
          book.authors?.[0]?.name?.split(", ").reverse().join(" ") || "Unknown";
        const language = book.languages?.[0] || "en";
        const coverUrl = book.formats?.["image/jpeg"] || null;
        const fileUrl = book.formats?.["application/epub+zip"] || null;
        const publishedYear = book.authors?.[0]?.birth_year
          ? book.authors[0].birth_year + 30 // rough estimate for classic works
          : null;

        if (!fileUrl) {
          console.log(`   ⏭️  Skipped "${title}" — no EPUB file available`);
          skipped++;
          continue;
        }

        // Enrich with Google Books metadata
        const googleMeta = await getGoogleMetadata(title, author);

        // Check if book already exists
        const existing = await query(
          `SELECT id FROM books WHERE title = $1 AND author = $2`,
          [title, author],
        );

        if (existing.rows.length > 0) {
          console.log(`   ⏭️  Skipped "${title}" — already in database`);
          skipped++;
          continue;
        }

        // Insert into database
        const result = await query(
          `INSERT INTO books 
            (title, author, description, isbn, publisher, published_year,
             language, pages, file_url, file_type, cover_url, is_public)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id`,
          [
            title,
            author,
            googleMeta.description || `A classic work by ${author}.`,
            googleMeta.isbn || null,
            googleMeta.publisher || "Project Gutenberg",
            googleMeta.pages ? null : publishedYear,
            language === "en" ? "English" : language,
            googleMeta.pages || null,
            fileUrl,
            "epub",
            coverUrl,
            true,
          ],
        );

        console.log(`   ✅ Imported: "${title}" by ${author}`);
        imported++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (bookError) {
        console.log(
          `   ❌ Failed to import "${book.title}":`,
          bookError.message,
        );
      }
    }

    console.log("");
    console.log("─────────────────────────────────────");
    console.log(`📊 Import complete:`);
    console.log(`   ✅ Imported: ${imported} books`);
    console.log(`   ⏭️  Skipped:  ${skipped} books`);
    console.log("─────────────────────────────────────");
    process.exit(0);
  } catch (error) {
    console.error("❌ Import failed:", error.message);
    process.exit(1);
  }
};

// Get topic and limit from command line args
// Usage: node importBooks.js fiction 20
const topic = process.argv[2] || "economics";
const limit = parseInt(process.argv[3]) || 50;

importBooks(topic, limit);
