const { sql, poolPromise } = require('./db');

async function initializeDatabase() {
  try {
    const pool = await poolPromise;
    console.log('Creating tables if they do not exist...');

    // Drop in correct order to avoid foreign key constraints
    await pool.request().query(`
      IF OBJECT_ID('TrackingEvent', 'U') IS NOT NULL DROP TABLE TrackingEvent;
      IF OBJECT_ID('OrderItem', 'U') IS NOT NULL DROP TABLE OrderItem;
      IF OBJECT_ID('Order', 'U') IS NOT NULL DROP TABLE [Order];
      IF OBJECT_ID('Address', 'U') IS NOT NULL DROP TABLE Address;
      IF OBJECT_ID('Coupon', 'U') IS NOT NULL DROP TABLE Coupon;
      IF OBJECT_ID('Customer', 'U') IS NOT NULL DROP TABLE Customer;
      IF OBJECT_ID('DeliveryPartner', 'U') IS NOT NULL DROP TABLE DeliveryPartner;
      IF OBJECT_ID('Product', 'U') IS NOT NULL DROP TABLE Product;
    `);

    // 1. Create Products
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Product' and xtype='U')
      CREATE TABLE Product (
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
          active BIT
      );
    `);

    // 2. Create DeliveryPartners
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DeliveryPartner' and xtype='U')
      CREATE TABLE DeliveryPartner (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          isActive BIT DEFAULT 1,
          availabilityStatus VARCHAR(50) DEFAULT 'AVAILABLE',
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE()
      );
    `);

    // 3. Create Customers
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Customer' and xtype='U')
      CREATE TABLE Customer (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          pincode VARCHAR(10)
      );
    `);

    // 3.1 Create Address
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Address' and xtype='U')
      CREATE TABLE Address (
          id VARCHAR(50) PRIMARY KEY,
          customerId VARCHAR(50) FOREIGN KEY REFERENCES Customer(id),
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
    `);

    // 3.2 Create Coupon
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Coupon' and xtype='U')
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
    `);

    // 4. Create Order
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Order' and xtype='U')
      CREATE TABLE [Order] (
          id VARCHAR(100) PRIMARY KEY,
          customerId VARCHAR(50) FOREIGN KEY REFERENCES Customer(id),
          addressId VARCHAR(50) FOREIGN KEY REFERENCES Address(id),
          deliveryPartnerId VARCHAR(50) FOREIGN KEY REFERENCES DeliveryPartner(id) NULL,
          couponId VARCHAR(50) FOREIGN KEY REFERENCES Coupon(id) NULL,
          subtotal DECIMAL(10, 2),
          delivery DECIMAL(10, 2),
          total DECIMAL(10, 2),
          paymentStatus VARCHAR(50),
          status VARCHAR(50),
          date DATETIME
      );
    `);

    // 5. Create OrderItem
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OrderItem' and xtype='U')
      CREATE TABLE OrderItem (
          id VARCHAR(50) PRIMARY KEY,
          orderId VARCHAR(100) FOREIGN KEY REFERENCES [Order](id),
          productId VARCHAR(50) FOREIGN KEY REFERENCES Product(id),
          productName VARCHAR(255),
          packSize VARCHAR(50),
          quantity INT,
          unitPrice DECIMAL(10, 2),
          totalPrice DECIMAL(10, 2),
          itemStatus VARCHAR(50)
      );
    `);

    // 6. Create TrackingEvent
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TrackingEvent' and xtype='U')
      CREATE TABLE TrackingEvent (
          id VARCHAR(50) PRIMARY KEY,
          orderId VARCHAR(100) FOREIGN KEY REFERENCES [Order](id),
          status VARCHAR(50),
          timestamp DATETIME,
          message VARCHAR(255)
      );
    `);

    console.log('Tables created successfully!');

    // Check if Products exist, if not, insert them
    const productCheck = await pool.request().query("SELECT COUNT(*) as count FROM Product");
    if (productCheck.recordset[0].count === 0) {
      console.log('Inserting mock products...');
      await pool.request().query(`
        INSERT INTO Product (id, name, packSize, mrp, sellingPrice, discount, description, imageFallback, stock, stockStatus, totalSold, active)
        VALUES 
        ('p1', 'Releaf Cotton Sanitary Pads – 30 Pads', '30 Pads', 414.00, 359.00, 13.00, 'Our most popular pack. Super soft, breathable cotton pads with wings. Ideal for regular to heavy flow.', '#A390E4', 50, 'IN_STOCK', 120, 1),
        ('p2', 'Releaf Cotton Sanitary Pads – 20 Pads', '20 Pads', 278.00, 249.00, 10.00, 'Perfect for your monthly cycle. Comfortable and rash-free experience.', '#A390E4', 35, 'IN_STOCK', 85, 1),
        ('p3', 'Releaf Cotton Sanitary Pads – 10 Pads Pack', '10 Pads', 155.00, 139.00, 10.00, 'Travel-friendly pack. Experience the comfort of pure cotton.', '#A390E4', 0, 'OUT_OF_STOCK', 30, 1),
        ('p4', 'Releaf Cotton Sanitary Pads – 6 Pads Pack', '6 Pads', 85.00, 77.00, 9.00, 'A trial pack to experience true comfort and care.', '#A390E4', 7, 'LOW_STOCK', 15, 1);
      `);
      console.log('Products inserted!');
    }

    // Check if Coupons exist, if not, insert them
    const couponCheck = await pool.request().query("SELECT COUNT(*) as count FROM Coupon");
    if (couponCheck.recordset[0].count === 0) {
      console.log('Inserting mock coupons...');
      await pool.request().query(`
        INSERT INTO Coupon (id, code, type, discountType, discountValue, active)
        VALUES 
        ('c1', 'WELCOME10', 'GENERAL', 'PERCENTAGE', 10.00, 1),
        ('c2', 'FREEDEL', 'GENERAL', 'FIXED_AMOUNT', 50.00, 1);
      `);
      console.log('Coupons inserted!');
    }

    console.log('Database Initialization Complete!');
    process.exit(0);
  } catch (err) {
    console.error('Initialization Failed:', err);
    process.exit(1);
  }
}

initializeDatabase();
