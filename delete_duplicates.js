const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, 
  database: process.env.DB_NAME || 'Releaf_Pads',
  options: {
    encrypt: true, 
    trustServerCertificate: false 
  }
};

async function run() {
  try {
    const pool = await sql.connect(config);
    console.log('Connected to Azure SQL');
    const tablesToDrop = ['Orders', 'Coupons', 'Customers', 'DeliveryPartners', 'Influencers'];
    for (const table of tablesToDrop) {
      try {
        await pool.request().query(`DROP TABLE IF EXISTS ${table};`);
        console.log(`Dropped ${table}`);
      } catch(e) {
        console.error(`Could not drop ${table}: ` + e.message);
      }
    }
    console.log('Done!');
    process.exit(0);
  } catch(e) {
    console.error(e);
  }
}
run();
