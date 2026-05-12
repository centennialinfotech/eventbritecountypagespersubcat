import sql from "mssql";
import http from "http";
import axios from "axios";
import * as cheerio from "cheerio";

// -------- DB CONFIG --------
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// -------- COUNTRIES (LIMITED for safety) --------
const countries = ["india", "united-states", "united-kingdom", "australia", "germany", "france", "singapore", "netherlands", "albania", "algeria","antigua-and-barbuda", "argentina", "armenia", "austria", "azerbaijan", "the-bahamas", "bahrain", "belgium","brazil", "cambodia", "cameroon", "canada", "central-african-republic", "chile", "china", "colombia", "congo", "costa-rica","czech-republic", "denmark","egypt","finland", "greece", "greenland", "italy--roma", "hong-kong-sar", "hungary", "iceland", "indonesia", "iraq", "ireland", "israel", "italy", "jamaica", "japan", "jersey", "jordan", "kenya", "south-korea", "mauritius", "mexico",  "nepal", "new-zealand", "nigeria", "norway","pakistan","philippines", "poland", "portugal", "qatar", "russia", "saudi-arabia", "serbia","slovakia","south-africa", "spain", "sri-lanka","sweden", "switzerland","tanzania", "thailand", "turkey", "ukraine", "united-arab-emirates", "uzbekistan", "venezuela", "vietnam","zimbabwe"];

// -------- DB CONNECTION (REUSE) --------
let pool;

async function getPool() {
  if (!pool) {
    console.log("🔌 Connecting to DB...");
    pool = await sql.connect(dbConfig);
  }
  return pool;
}

// -------- GET SUBCATEGORY IDS --------
async function getSubcategoryIds() {
  const pool = await getPool();

  const result = await pool.request()
    .query("SELECT TOP 5 id FROM subcategory_master"); // LIMIT for safety

  return result.recordset.map(row => String(row.id));
}

// -------- DETECT TOTAL PAGES --------
async function getTotalPages(country, subId) {
  let page = 1;
  let lastValidPage = 0;

  while (page <= 50) { // safety cap
    const url =
      `https://www.eventbrite.com/d/${country}/all-events/?subcategories=${subId}&page=${page}`;

    try {
      const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const $ = cheerio.load(data);

      const events = $(".event-card, .search-event-card-wrapper");

      if (events.length === 0) break;

      lastValidPage = page;
      page++;

    } catch (err) {
      console.log(`❌ Error at ${country} | sub ${subId} | page ${page}`);
      break;
    }
  }

  return lastValidPage;
}

// -------- MAIN HANDLER --------
async function handleRequest(req, res) {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);

    const country = urlObj.searchParams.get("country");
    const subId = urlObj.searchParams.get("sub");

    // ✅ MODE 1: Single query (BEST)
    if (country && subId) {
      const totalPages = await getTotalPages(country, subId);

      return res.end(JSON.stringify({
        country,
        subcategory: subId,
        totalPages
      }, null, 2));
    }

    // ⚠️ MODE 2: Bulk (LIMITED)
    const subcategories = await getSubcategoryIds();

    let result = [];

    for (const sub of subcategories) {
      for (const c of countries) {

        const totalPages = await getTotalPages(c, sub);

        result.push({
          country: c,
          subcategory: sub,
          totalPages
        });
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result, null, 2));

  } catch (err) {
    console.error("❌ Error:", err.message);

    res.writeHead(500);
    res.end(JSON.stringify({ error: err.message }));
  }
}

// -------- SERVER --------
const PORT = process.env.PORT || 3000;

http.createServer(handleRequest).listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
