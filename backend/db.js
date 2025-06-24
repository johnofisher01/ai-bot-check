import { Client } from "pg";

// Set up the Postgres client with your connection info
const dbClient = new Client({
  host: "articles-dashboard.cr8eeq2k4s4r.eu-west-1.rds.amazonaws.com",
  port: 5432,
  user: "postgres",
  password: "123PostGres!",
  database: "articles-dashboard",
});

// Connect to the database
export async function connectDb() {
  try {
    await dbClient.connect();
    console.log("Connected to PostgreSQL database.");
  } catch (err) {
    console.error("Failed to connect to PostgreSQL:", err);
    process.exit(1);
  }
}

// Search for an article related to the user's query
export async function searchArticles(userQuery) {
  // Simple keyword search in title or content
  const sql = `
    SELECT title, author, content
    FROM articles
    WHERE title ILIKE $1 OR content ILIKE $1
    ORDER BY views DESC
    LIMIT 1
  `;
  const values = [`%${userQuery}%`];
  const result = await dbClient.query(sql, values);
  if (result.rows.length > 0) {
    const { title, author, content } = result.rows[0];
    // Shorten content if too long for the prompt
    const shortContent = content && content.length > 500 ? content.slice(0, 500) + "..." : content;
    return `Article found:\nTitle: "${title}"\nAuthor: ${author}\nContent: ${shortContent}`;
  }
  return null;
}