const { Pool } = require('pg');
require('dotenv').config();

const config = {
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_SERVER}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: {
    rejectUnauthorized: false
  }
};

// If we detect an internal Render URL (which doesn't support SSL), remove the SSL config
if (config.connectionString && !config.connectionString.includes('render.com') && config.connectionString.includes('dpg-')) {
  delete config.ssl;
} else if (process.env.DB_SERVER && !process.env.DB_SERVER.includes('render.com') && process.env.DB_SERVER.includes('dpg-')) {
  delete config.ssl;
}

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function syncDatabase() {
  try {
    console.log('Auto-syncing database tables...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS Product (
          id VARCHAR(50) PRIMARY KEY, 
          name VARCHAR(255) NOT NULL, 
          packSize VARCHAR(50), 
          mrp DECIMAL(10, 2),
          sellingPrice DECIMAL(10, 2), 
          discount DECIMAL(5, 2), 
          description TEXT, 
          imageFallback VARCHAR(50),
          stock INT, 
          stockStatus VARCHAR(50), 
          totalSold INT, 
          active BOOLEAN
      );

      CREATE TABLE IF NOT EXISTS DeliveryPartner (
          id VARCHAR(50) PRIMARY KEY, 
          name VARCHAR(255) NOT NULL, 
          phone VARCHAR(20) NOT NULL,
          isActive BOOLEAN DEFAULT true, 
          availabilityStatus VARCHAR(50) DEFAULT 'AVAILABLE',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Customer (
          id VARCHAR(50) PRIMARY KEY, 
          name VARCHAR(255) NOT NULL, 
          phone VARCHAR(20) NOT NULL, 
          pincode VARCHAR(10)
      );

      CREATE TABLE IF NOT EXISTS Address (
          id VARCHAR(50) PRIMARY KEY, 
          customerId VARCHAR(50) REFERENCES Customer(id),
          name VARCHAR(255) NOT NULL, 
          phone VARCHAR(20) NOT NULL, 
          houseNumber VARCHAR(50), 
          buildingName VARCHAR(255),
          street VARCHAR(255), 
          area VARCHAR(255), 
          landmark VARCHAR(255), 
          city VARCHAR(100), 
          state VARCHAR(100),
          pincode VARCHAR(10), 
          addressType VARCHAR(50), 
          latitude FLOAT, 
          longitude FLOAT
      );

      CREATE TABLE IF NOT EXISTS Coupon (
          id VARCHAR(50) PRIMARY KEY, 
          code VARCHAR(50) NOT NULL, 
          type VARCHAR(50), 
          discountType VARCHAR(50),
          discountValue DECIMAL(10, 2), 
          minimumOrderValue DECIMAL(10, 2), 
          maximumDiscount DECIMAL(10, 2),
          usageLimit INT, 
          usedCount INT DEFAULT 0, 
          active BOOLEAN DEFAULT true, 
          influencerId VARCHAR(50), 
          influencerName VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS "Order" (
          id VARCHAR(100) PRIMARY KEY, 
          customerId VARCHAR(50) REFERENCES Customer(id),
          addressId VARCHAR(50) REFERENCES Address(id),
          deliveryPartnerId VARCHAR(50) REFERENCES DeliveryPartner(id),
          couponId VARCHAR(50) REFERENCES Coupon(id),
          subtotal DECIMAL(10, 2), 
          delivery DECIMAL(10, 2), 
          total DECIMAL(10, 2),
          paymentStatus VARCHAR(50), 
          status VARCHAR(50), 
          date TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS OrderItem (
          id VARCHAR(50) PRIMARY KEY, 
          orderId VARCHAR(100) REFERENCES "Order"(id),
          productId VARCHAR(50) REFERENCES Product(id),
          productName VARCHAR(255), 
          packSize VARCHAR(50), 
          quantity INT, 
          unitPrice DECIMAL(10, 2),
          totalPrice DECIMAL(10, 2), 
          itemStatus VARCHAR(50)
      );

      CREATE TABLE IF NOT EXISTS TrackingEvent (
          id VARCHAR(50) PRIMARY KEY, 
          orderId VARCHAR(100) REFERENCES "Order"(id),
          status VARCHAR(50), 
          timestamp TIMESTAMP, 
          message VARCHAR(255)
      );
    `);

    // Check if Products exist, if not, insert them
    const productCheck = await pool.query("SELECT COUNT(*) as count FROM Product");
    if (parseInt(productCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO Product (id, name, packSize, mrp, sellingPrice, discount, description, imageFallback, stock, stockStatus, totalSold, active)
        VALUES 
        ('p1', 'Releaf Cotton Sanitary Pads – 30 Pads', '30 Pads', 414.00, 359.00, 13.00, 'Our most popular pack. Super soft, breathable cotton pads with wings. Ideal for regular to heavy flow.', '#A390E4', 50, 'IN_STOCK', 120, true),
        ('p2', 'Releaf Cotton Sanitary Pads – 20 Pads', '20 Pads', 278.00, 249.00, 10.00, 'Perfect for your monthly cycle. Comfortable and rash-free experience.', '#A390E4', 35, 'IN_STOCK', 85, true),
        ('p3', 'Releaf Cotton Sanitary Pads – 10 Pads Pack', '10 Pads', 155.00, 139.00, 10.00, 'Travel-friendly pack. Experience the comfort of pure cotton.', '#A390E4', 0, 'OUT_OF_STOCK', 30, true),
        ('p4', 'Releaf Cotton Sanitary Pads – 6 Pads Pack', '6 Pads', 85.00, 77.00, 9.00, 'A trial pack to experience true comfort and care.', '#A390E4', 7, 'LOW_STOCK', 15, true);
      `);
    }

    // Check if Coupons exist, if not, insert them
    const couponCheck = await pool.query("SELECT COUNT(*) as count FROM Coupon");
    if (parseInt(couponCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO Coupon (id, code, type, discountType, discountValue, active)
        VALUES 
        ('c1', 'WELCOME10', 'GENERAL', 'PERCENTAGE', 10.00, true),
        ('c2', 'FREEDEL', 'GENERAL', 'FIXED_AMOUNT', 50.00, true);
      `);
    }

    console.log('Database tables verified/created successfully!');
  } catch (err) {
    console.error('Database auto-sync failed:', err);
  }
}

module.exports = {
  pool, syncDatabase
};
