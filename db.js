const { Pool, types } = require('pg');
require('dotenv').config();

// Tell pg to return numeric/decimal values as floats instead of strings
types.setTypeParser(1700, function (val) {
  return parseFloat(val);
});

const connString = process.env.DATABASE_URL ||
  process.env.Internal_Database_URL ||
  process.env.External_Database_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_SERVER}:${process.env.DB_PORT || process.env.DB_Port || 5432}/${process.env.DB_NAME}`;

const config = {
  connectionString: connString,
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

      CREATE TABLE IF NOT EXISTS WhatsAppMessage (
          id VARCHAR(100) PRIMARY KEY,
          phone VARCHAR(20) NOT NULL,
          sender VARCHAR(50) NOT NULL, -- 'user', 'ai', 'admin'
          message TEXT NOT NULL,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      
      ALTER TABLE "Order" 
      ADD COLUMN IF NOT EXISTS paymentMethod VARCHAR(50),
      ADD COLUMN IF NOT EXISTS razorpayOrderId VARCHAR(100),
      ADD COLUMN IF NOT EXISTS razorpayPaymentId VARCHAR(100),
      ADD COLUMN IF NOT EXISTS razorpaySignature VARCHAR(255),
      ADD COLUMN IF NOT EXISTS paymentVerifiedAt TIMESTAMP;

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

      CREATE TABLE IF NOT EXISTS WhatsAppSession (
          phone VARCHAR(20) PRIMARY KEY,
          state VARCHAR(50) NOT NULL,
          pendingOrderId VARCHAR(100),
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS TrackingEvent (
          id VARCHAR(50) PRIMARY KEY, 
          orderId VARCHAR(100) REFERENCES "Order"(id),
          status VARCHAR(50), 
          timestamp TIMESTAMP, 
          message VARCHAR(255)
      );
    `);

    console.log('Database tables verified/created successfully!');
  } catch (err) {
    console.error('Database auto-sync failed:', err);
  }
}

module.exports = {
  pool, syncDatabase
};
