const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { query } = require("./database");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatar = profile.photos?.[0]?.value || null;
        const googleId = profile.id;

        if (!email) {
          return done(new Error("No email provided by Google"), null);
        }

        // Check if user already exists with this email
        const existing = await query(
          `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`,
          [email],
        );

        if (existing.rows.length > 0) {
          const user = existing.rows[0];

          // If user exists but registered with password, link Google to their account
          if (user.provider === "local") {
            await query(
              `UPDATE users 
               SET provider = 'google', 
                   google_id = $1, 
                   avatar_url = COALESCE(avatar_url, $2),
                   is_active = true
               WHERE id = $3`,
              [googleId, avatar, user.id],
            );
          }

          // Update last login
          await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [
            user.id,
          ]);

          return done(null, { ...user, avatar_url: avatar || user.avatar_url });
        }

        // Create new user from Google profile
        const result = await query(
          `INSERT INTO users 
            (name, email, password, role, provider, google_id, avatar_url, is_active)
           VALUES ($1, $2, $3, 'reader', 'google', $4, $5, true)
           RETURNING *`,
          [
            name,
            email.toLowerCase(),
            "", // no password for OAuth users
            googleId,
            avatar,
          ],
        );

        return done(null, result.rows[0]);
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

// Minimal serialization — we use JWT so we don't need full session storage
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await query(`SELECT * FROM users WHERE id = $1`, [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
