import sql from "mssql";
import http from "http";

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

// -------- COUNTRIES --------
const countries = [
  "india","united-states","united-kingdom","australia","germany","france",
  "singapore","netherlands","albania","algeria","antigua-and-barbuda",
  "argentina","armenia","austria","azerbaijan","the-bahamas","bahrain",
  "belgium","brazil","cambodia","cameroon","canada",
  "central-african-republic","chile","china","colombia","congo",
  "costa-rica","czech-republic","denmark","egypt","finland","greece",
  "greenland","italy--roma","hong-kong-sar","hungary","iceland",
  "indonesia","iraq","ireland","israel","italy","jamaica","japan",
  "jersey","jordan","kenya","south-korea","mauritius","mexico",
  "nepal","new-zealand","nigeria","norway","pakistan","philippines",
  "poland","portugal","qatar","russia","saudi-arabia","serbia",
  "slovakia","south-africa","spain","sri-lanka","sweden","switzerland",
  "tanzania","thailand","turkey","ukraine","united-arab-emirates",
  "uzbekistan","venezuela","vietnam","zimbabwe"
];

// -------- GET SUBCATEGORY IDS --------
async function getSubcategoryIds(pool) {
  const result = await pool.request()
    .query("SELECT id FROM subcategory_master");

  return result.recordset.map(row => String(row.id));
}

// -------- GENERATE HTML --------
async function generateLinks() {
  try {
    console.log("🔌 Connecting to DB...");
    const pool = await sql.connect(dbConfig);

    const subcategories = await getSubcategoryIds(pool);
    console.log("✅ Subcategories loaded:", subcategories.length);

    let html = `
    <html>
    <head>
      <title>Eventbrite Links</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        a { display: block; margin: 4px 0; }
      </style>
    </head>
    <body>
      <h2>Generated Eventbrite Links</h2>
    `;

    for (const subId of subcategories.slice(0, 5)) {
  for (const country of countries.slice(0, 5)) {
    for (let page = 1; page <= 5; page++) {

      const url =
        `https://www.eventbrite.com/d/${country}/all-events/?subcategories=${subId}&page=${page}`;

      html += `<a href="${url}" target="_blank">${url}</a>`;
    }
  }
}

    html += "</body></html>";

    await pool.close();

    return html;

  } catch (err) {
    console.error("❌ Error:", err.message);
    return `<h1>Error: ${err.message}</h1>`;
  }
}

// -------- HTTP SERVER --------
const PORT = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const html = await generateLinks();

  res.writeHead(200, {
    "Content-Type": "text/html"
  });

  res.end(html);

}).listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
