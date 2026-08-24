require('dotenv').config();
const { sql, poolPromise } = require('./db');

async function deleteData() {
  try {
    const pool = await poolPromise;
    await pool.request().query('DELETE FROM DeliveryPartner');
    console.log('Deleted all Delivery Partners from the database.');
    
    await pool.request().query('DELETE FROM Coupon');
    console.log('Deleted all Coupons from the database.');
    
    process.exit(0);
  } catch (err) {
    console.error('Error deleting data:', err);
    process.exit(1);
  }
}

deleteData();
