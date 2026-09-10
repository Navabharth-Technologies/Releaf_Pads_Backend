require('dotenv').config();
const { pool } = require('./db');

async function checkDb() {
  try {
    const res = await pool.query("SELECT * FROM product");
    console.log("Products in DB:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkDb();
