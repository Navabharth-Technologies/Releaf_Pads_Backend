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
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

config.port = parseInt(process.env.DB_PORT) || 1433;
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL Database');
    return pool;
  })
  .catch(err => {
    console.error('Database Connection Failed! Please check your MS SQL credentials in .env (DB_SERVER, DB_USER, DB_PASSWORD).', err.message);
    throw err; // Rethrow to prevent query execution
  });

const pool = {
  query: async (text, params) => {
    try {
      const p = await poolPromise;
      if (!p) throw new Error('Database connection was not established.');
      const request = p.request();
      
      let mssqlText = text;
      
      // Replace Postgres positional parameters ($1, $2) with MSSQL named parameters (@p1, @p2)
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          const paramName = `p${index + 1}`;
          // Match $1, $2 but not $10 when we want $1
          const regex = new RegExp(`\\$${index + 1}(?!\\d)`, 'g');
          mssqlText = mssqlText.replace(regex, `@${paramName}`);
          
          request.input(paramName, param);
        });
      }
      
      // Handle Postgres quoting for reserved keywords like "Order"
      mssqlText = mssqlText.replace(/"Order"/g, '[Order]');
      
      const result = await request.query(mssqlText);
      return { 
        rows: result.recordset || [], 
        rowCount: result.rowsAffected ? result.rowsAffected[0] : 0 
      };
    } catch (err) {
      console.error('SQL Error on query:', text, err);
      throw err;
    }
  },
  connect: async () => {
    return {
      query: async (text, params) => {
        if (text.trim().toUpperCase() === 'BEGIN' || text.trim().toUpperCase() === 'COMMIT' || text.trim().toUpperCase() === 'ROLLBACK') {
          return { rows: [] };
        }
        return pool.query(text, params);
      },
      release: () => {}
    };
  }
};

async function syncDatabase() {
  try {
    console.log('Auto-syncing database tables for MSSQL...');
    
    await pool.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Product' AND xtype='U')
      CREATE TABLE Product (
          id VARCHAR(50) PRIMARY KEY, 
          name VARCHAR(255) NOT NULL, 
          packSize VARCHAR(50), 
          mrp DECIMAL(10, 2),
          sellingPrice DECIMAL(10, 2), 
          discount DECIMAL(5, 2), 
          description NVARCHAR(MAX), 
          imageFallback VARCHAR(50),
          stock INT, 
          stockStatus VARCHAR(50), 
          totalSold INT, 
          active BIT
      );

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = 'imageUrl' AND Object_ID = Object_ID('Product'))
      BEGIN
          ALTER TABLE Product ADD imageUrl NVARCHAR(MAX);
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = 'stockStatus' AND Object_ID = Object_ID('Product'))
      BEGIN
          ALTER TABLE Product ADD stockStatus VARCHAR(50);
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DeliveryPartner' AND xtype='U')
      CREATE TABLE DeliveryPartner (
          id VARCHAR(50) PRIMARY KEY, 
          name VARCHAR(255) NOT NULL, 
          phone VARCHAR(20) NOT NULL,
          isActive BIT DEFAULT 1, 
          availabilityStatus VARCHAR(50) DEFAULT 'AVAILABLE',
          createdAt DATETIME DEFAULT GETDATE(), 
          updatedAt DATETIME DEFAULT GETDATE()
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Customer' AND xtype='U')
      CREATE TABLE Customer (
          id VARCHAR(50) PRIMARY KEY, 
          name VARCHAR(255) NOT NULL, 
          phone VARCHAR(20) NOT NULL, 
          pincode VARCHAR(10)
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WhatsAppMessage' AND xtype='U')
      CREATE TABLE WhatsAppMessage (
          id VARCHAR(100) PRIMARY KEY,
          phone VARCHAR(20) NOT NULL,
          sender VARCHAR(50) NOT NULL, 
          message NVARCHAR(MAX) NOT NULL,
          createdAt DATETIME DEFAULT GETDATE()
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Address' AND xtype='U')
      CREATE TABLE Address (
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

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Coupon' AND xtype='U')
      CREATE TABLE Coupon (
          id VARCHAR(50) PRIMARY KEY, 
          code VARCHAR(50) NOT NULL, 
          type VARCHAR(50), 
          discountType VARCHAR(50),
          discountValue DECIMAL(10, 2), 
          minimumOrderValue DECIMAL(10, 2), 
          maximumDiscount DECIMAL(10, 2),
          usageLimit INT, 
          usedCount INT DEFAULT 0, 
          active BIT DEFAULT 1, 
          influencerId VARCHAR(50), 
          influencerName VARCHAR(255)
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Order' AND xtype='U')
      CREATE TABLE [Order] (
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
          date DATETIME
      );

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = 'paymentMethod' AND Object_ID = Object_ID('Order'))
      BEGIN
          ALTER TABLE [Order] ADD paymentMethod VARCHAR(50);
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = 'razorpayOrderId' AND Object_ID = Object_ID('Order'))
      BEGIN
          ALTER TABLE [Order] ADD razorpayOrderId VARCHAR(100);
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = 'razorpayPaymentId' AND Object_ID = Object_ID('Order'))
      BEGIN
          ALTER TABLE [Order] ADD razorpayPaymentId VARCHAR(100);
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = 'razorpaySignature' AND Object_ID = Object_ID('Order'))
      BEGIN
          ALTER TABLE [Order] ADD razorpaySignature VARCHAR(255);
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = 'paymentVerifiedAt' AND Object_ID = Object_ID('Order'))
      BEGIN
          ALTER TABLE [Order] ADD paymentVerifiedAt DATETIME;
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OrderItem' AND xtype='U')
      CREATE TABLE OrderItem (
          id VARCHAR(50) PRIMARY KEY, 
          orderId VARCHAR(100) REFERENCES [Order](id),
          productId VARCHAR(50) REFERENCES Product(id),
          productName VARCHAR(255), 
          packSize VARCHAR(50), 
          quantity INT, 
          unitPrice DECIMAL(10, 2),
          totalPrice DECIMAL(10, 2), 
          itemStatus VARCHAR(50)
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WhatsAppSession' AND xtype='U')
      CREATE TABLE WhatsAppSession (
          phone VARCHAR(20) PRIMARY KEY,
          state VARCHAR(50) NOT NULL,
          pendingOrderId VARCHAR(100),
          updatedAt DATETIME DEFAULT GETDATE()
      );

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TrackingEvent' AND xtype='U')
      CREATE TABLE TrackingEvent (
          id VARCHAR(50) PRIMARY KEY, 
          orderId VARCHAR(100) REFERENCES [Order](id),
          status VARCHAR(50), 
          timestamp DATETIME, 
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
