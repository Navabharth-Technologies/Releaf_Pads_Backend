const { pool } = require('./db.js');
async function cleanupTables() {
  const tablesToDrop = [
    'Coupons', 'DeliveryPartners', 'Influencers', 'WhatsAppConversations', 'Customers'
  ];

  for (const table of tablesToDrop) {
    try {
      await pool.query(`DROP TABLE IF EXISTS ${table}`);
      console.log(`Dropped table: ${table}`);
    } catch (err) {
      console.error(`Failed to drop table ${table}: ${err.message}`);
    }
  }
  process.exit(0);
}
cleanupTables();
