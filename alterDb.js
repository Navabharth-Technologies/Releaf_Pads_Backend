require('dotenv').config();
const sql = require('mssql');
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Password123!',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'ReleafPadsDB',
  options: { encrypt: true, trustServerCertificate: true }
};

async function run() {
  try {
    const pool = await sql.connect(config);
    await pool.request().query('ALTER TABLE Address ADD latitude FLOAT, longitude FLOAT');
    console.log("Added columns");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
