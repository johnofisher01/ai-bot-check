import { Client } from "pg";

const dbClient = new Client({
  host: process.env.PGHOST || "articles-dashboard.cr8eeq2k4s4r.eu-west-2.rds.amazonaws.com",
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "123PostGres!",
  database: process.env.PGDATABASE || "articles-dashboard",
  ssl: {
    rejectUnauthorized: false
  }
});

export async function connectDb() {
  try {
    await dbClient.connect();
    console.log("Connected to PostgreSQL database.");
  } catch (err) {
    console.error("Failed to connect to PostgreSQL:", err);
    process.exit(1);
  }
}

/**
 * Search articles by author (if author name present in the query) or by keyword (in title/content/summary).
 * Returns up to 3 matching articles formatted as a string for prompt enrichment, or null if none found.
 */
export async function searchArticles(userQuery) {
  if (!userQuery || typeof userQuery !== "string") return null;

  let articles = [];
  // Try to extract "by author" from the userQuery, e.g. "all data by Jane Holloway"
  const authorMatch = userQuery.match(/by ([\w\s]+)/i);

  if (authorMatch) {
    const author = authorMatch[1].trim();
    const res = await dbClient.query(
      "SELECT id, title, author, content, views, shares, summary FROM articles WHERE author ILIKE $1 LIMIT 3",
      [`%${author}%`]
    );
    articles = res.rows;
  } else {
    // Otherwise, search by keywords in title/content/summary
    const res = await dbClient.query(
      `SELECT id, title, author, content, views, shares, summary
       FROM articles
       WHERE title ILIKE $1 OR content ILIKE $1 OR summary ILIKE $1
       LIMIT 3`,
      [`%${userQuery}%`]
    );
    articles = res.rows;
  }

  if (articles.length > 0) {
    // Format each article for the AI prompt
    return articles.map(a =>
      `Title: ${a.title}
Author: ${a.author}
Summary: ${a.summary}
Content: ${a.content}
Views: ${a.views}
Shares: ${a.shares}`
    ).join("\n---\n");
  }
  return null;
}