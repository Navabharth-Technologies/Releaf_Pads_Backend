const { Pool } = require('pg');
require('dotenv').config();
const connString = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_SERVER}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;

const pool = new Pool({ connectionString: connString, ssl: { rejectUnauthorized: false } });

async function insertCoupons() {
  try {
    await pool.query("INSERT INTO Coupon (id, code, type, discountType, discountValue, minimumOrderValue, maximumDiscount, usageLimit, active) VALUES ('c1', 'WELCOME10', 'PUBLIC', 'PERCENTAGE', 10, 0, 100, 1000, true) ON CONFLICT (id) DO NOTHING");
    await pool.query("INSERT INTO Coupon (id, code, type, discountType, discountValue, minimumOrderValue, maximumDiscount, usageLimit, active) VALUES ('c2', 'FLAT50', 'PUBLIC', 'FLAT', 50, 100, 50, 1000, true) ON CONFLICT (id) DO NOTHING");
    console.log("Coupons inserted");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
insertCoupons();
