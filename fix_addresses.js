require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function fixAddresses() {
  try {
    await sql.connect(dbConfig);
    console.log('Connected to database.');

    // Any address with latitude > 12.5 is likely in Bangalore (due to the old geocoding bug).
    // Set latitude and longitude to NULL so the app falls back to text-based Google Maps search.
    const result = await sql.query(`
      UPDATE Address 
      SET latitude = NULL, longitude = NULL 
      WHERE latitude > 12.5
    `);
    
    console.log(`Fixed ${result.rowsAffected[0]} old addresses that had Bangalore coordinates.`);
  } catch (err) {
    console.error('Error fixing addresses:', err);
  } finally {
    process.exit();
  }
}

fixAddresses();
