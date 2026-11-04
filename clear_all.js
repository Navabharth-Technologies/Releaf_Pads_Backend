const { pool } = require('./db.js');

async function clearAllData() {
  const tablesToDrop = [
    'TrackingEvent',
    'WhatsAppSession',
    'OrderItem',
    '[Order]',
    'Address',
    'WhatsAppMessage',
    'Coupon',
    'Customer',
    'DeliveryPartner',
    'Product'
  ];

  try {
    console.log('Starting full database wipe...');
    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table}`);
        console.log(`Dropped table: ${table}`);
      } catch (err) {
        console.error(`Failed to drop table ${table}: ${err.message}`);
      }
    }
    console.log('Database wiped successfully! Tables will be automatically recreated upon server start.');
  } catch (err) {
    console.error('Error during database wipe:', err);
  } finally {
    process.exit(0);
  }
}

clearAllData();
