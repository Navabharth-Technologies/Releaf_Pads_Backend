const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: 'postgres://releaf_db_user:A5po9SYOqeMqDHUWHO3LkkvFZPWGwxDP@dpg-da5uv1ojo6nc73dq9j6g-a.oregon-postgres.render.com:5432/releaf_db', 
  ssl: { rejectUnauthorized: false } 
});

async function clear() {
  const client = await pool.connect();
  try {
    console.log("Truncating product and coupon tables...");
    await client.query(`TRUNCATE TABLE product, coupon CASCADE;`);
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    pool.end();
  }
}

clear();
