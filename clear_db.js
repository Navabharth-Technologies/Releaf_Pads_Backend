const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: 'postgres://releaf_db_user:A5po9SYOqeMqDHUWHO3LkkvFZPWGwxDP@dpg-da5uv1ojo6nc73dq9j6g-a.oregon-postgres.render.com:5432/releaf_db', 
  ssl: { rejectUnauthorized: false } 
});

async function clearDatabase() {
  const client = await pool.connect();
  try {
    console.log("Starting database truncation...");

    await client.query(`
      TRUNCATE TABLE 
        orderitem, 
        trackingevent, 
        "Order", 
        address, 
        whatsappmessage, 
        whatsappsession, 
        coupon, 
        deliverypartner, 
        customer 
      CASCADE;
    `);

    console.log("Database successfully cleared of all transactional data!");

  } catch (err) {
    console.error("Error clearing database:", err);
  } finally {
    client.release();
    pool.end();
  }
}

clearDatabase();
