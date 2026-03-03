require("dotenv").config();
const bcrypt = require("bcryptjs");
const { query } = require("./database");

const seed = async () => {
  console.log("🌱 Seeding database...");

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASSWORD;

  try {
    // ─── SEED ADMIN USER ───
    const hashedPass = await bcrypt.hash(adminPass, 12);
    await query(
      `
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `,
      ["BookHaven Admin", adminEmail, hashedPass, "admin"],
    );

    // ─── SEED CATEGORIES ───
    const categories = [
      {
        name: "Literature",
        slug: "literature",
        color: "#922B21",
        icon: "feather",
      },
      { name: "History", slug: "history", color: "#7D6608", icon: "landmark" },
      { name: "Fiction", slug: "fiction", color: "#8B4513", icon: "book-open" },
      { name: "Science", slug: "science", color: "#1A5276", icon: "flask" },
      {
        name: "Philosophy",
        slug: "philosophy",
        color: "#4A235A",
        icon: "brain",
      },
      { name: "Technology", slug: "technology", color: "#1B4F72", icon: "cpu" },
      { name: "Biography", slug: "biography", color: "#1E8449", icon: "user" },
      {
        name: "Mathematics",
        slug: "mathematics",
        color: "#154360",
        icon: "calculator",
      },
      {
        name: "Economics",
        slug: "economics",
        color: "#1F618D",
        icon: "trending-up",
      },
      {
        name: "Art & Design",
        slug: "art-design",
        color: "#7D3C98",
        icon: "palette",
      },
    ];

    for (const cat of categories) {
      await query(
        `
        INSERT INTO categories (name, slug, color, icon)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO NOTHING
      `,
        [cat.name, cat.slug, cat.color, cat.icon],
      );
    }

    console.log("✅ Seed completed successfully!");
    console.log("📧 Admin email: ", adminEmail);
    console.log("🔑 Admin password: ", adminPass);
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
};

seed();
