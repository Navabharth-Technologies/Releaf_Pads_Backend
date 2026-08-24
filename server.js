const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sql, poolPromise, syncDatabase } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Product');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create an order
app.post('/api/orders', async (req, res) => {
  try {
    const { id: reqId, customerId, addressId, subtotal, total, status, date } = req.body;
    const pool = await poolPromise;
    const orderId = reqId || 'NEWID()';
    const result = await pool.request()
      .input('id', sql.VarChar, reqId) // Pass it directly
      .input('customerId', sql.VarChar, customerId)
      .input('addressId', sql.VarChar, addressId)
      .input('subtotal', sql.Decimal(10,2), subtotal)
      .input('total', sql.Decimal(10,2), total)
      .input('status', sql.VarChar, status)
      .input('date', sql.DateTime, new Date(date))
      .query(`
        INSERT INTO [Order] (id, customerId, addressId, subtotal, total, paymentStatus, status, date)
        OUTPUT inserted.id
        VALUES (${reqId ? '@id' : 'NEWID()'}, @customerId, @addressId, @subtotal, @total, 'PAID', @status, @date)
      `);
    res.json({ id: result.recordset[0].id });
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update order status
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliveryPartnerId } = req.body;
    const pool = await poolPromise;
    
    let query = 'UPDATE [Order] SET status = @status';
    if (deliveryPartnerId !== undefined) {
      query += ', deliveryPartnerId = @deliveryPartnerId';
    }
    query += ' WHERE id = @id';
    
    const request = pool.request()
      .input('id', sql.VarChar, id)
      .input('status', sql.VarChar, status);
      
    if (deliveryPartnerId !== undefined) {
      request.input('deliveryPartnerId', sql.VarChar, deliveryPartnerId);
    }
    
    await request.query(query);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Delivery Partners
app.get('/api/delivery-partners', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM DeliveryPartner');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Delivery Partner
app.post('/api/delivery-partners', async (req, res) => {
  try {
    const { id: reqId, name, phone } = req.body;
    const pool = await poolPromise;
    const id = reqId || `dp_${Date.now()}`;
    const result = await pool.request()
      .input('id', sql.VarChar, id)
      .input('name', sql.VarChar, name)
      .input('phone', sql.VarChar, phone)
      .input('isActive', sql.Bit, 1)
      .input('availabilityStatus', sql.VarChar, 'AVAILABLE')
      .input('createdAt', sql.DateTime, new Date())
      .input('updatedAt', sql.DateTime, new Date())
      .query(`
        INSERT INTO DeliveryPartner (id, name, phone, isActive, availabilityStatus, createdAt, updatedAt)
        VALUES (@id, @name, @phone, @isActive, @availabilityStatus, @createdAt, @updatedAt)
      `);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Customers
app.get('/api/customers', async (req, res) => {
  try {
    const pool = await poolPromise;
    const customersResult = await pool.request().query('SELECT * FROM Customer');
    const addressesResult = await pool.request().query('SELECT * FROM Address');
    
    const customers = customersResult.recordset.map(c => ({
      ...c,
      addresses: addressesResult.recordset.filter(a => a.customerId === c.id)
    }));
    
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Customer
app.post('/api/customers', async (req, res) => {
  try {
    const { id: reqId, name, phone, pincode } = req.body;
    const pool = await poolPromise;
    
    // First check if the phone already exists
    const existing = await pool.request()
      .input('phone', sql.VarChar, phone)
      .query('SELECT * FROM Customer WHERE phone = @phone');
      
    if (existing.recordset.length > 0) {
      return res.json({ success: true, id: existing.recordset[0].id });
    }

    const id = reqId || `c_${Date.now()}`;
    await pool.request()
      .input('id', sql.VarChar, id)
      .input('name', sql.VarChar, name)
      .input('phone', sql.VarChar, phone)
      .input('pincode', sql.VarChar, pincode || null)
      .query(`
        INSERT INTO Customer (id, name, phone, pincode)
        VALUES (@id, @name, @phone, @pincode)
      `);
    res.json({ success: true, id });
  } catch (err) {
    console.error("Error creating customer:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create Customer Address
app.post('/api/customers/:id/addresses', async (req, res) => {
  try {
    const { id } = req.params;
    const { id: reqId, name, phone, houseNumber, buildingName, street, area, landmark, city, state, pincode, addressType, latitude, longitude } = req.body;
    const pool = await poolPromise;
    const addressId = reqId || `a_${Date.now()}`;
    await pool.request()
      .input('id', sql.VarChar, addressId)
      .input('customerId', sql.VarChar, id)
      .input('name', sql.VarChar, name)
      .input('phone', sql.VarChar, phone)
      .input('houseNumber', sql.VarChar, houseNumber || null)
      .input('buildingName', sql.VarChar, buildingName || null)
      .input('street', sql.VarChar, street || null)
      .input('area', sql.VarChar, area || null)
      .input('landmark', sql.VarChar, landmark || null)
      .input('city', sql.VarChar, city || null)
      .input('state', sql.VarChar, state || null)
      .input('pincode', sql.VarChar, pincode || null)
      .input('addressType', sql.VarChar, addressType || null)
      .input('latitude', sql.Float, latitude || null)
      .input('longitude', sql.Float, longitude || null)
      .query(`
        INSERT INTO Address (id, customerId, name, phone, houseNumber, buildingName, street, area, landmark, city, state, pincode, addressType, latitude, longitude)
        VALUES (@id, @customerId, @name, @phone, @houseNumber, @buildingName, @street, @area, @landmark, @city, @state, @pincode, @addressType, @latitude, @longitude)
      `);
    res.json({ success: true, id: addressId });
  } catch (err) {
    console.error("Error creating address:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get Coupons
app.get('/api/coupons', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM Coupon');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Coupon
app.post('/api/coupons', async (req, res) => {
  try {
    const { id: reqId, code, type, discountType, discountValue, minimumOrderValue, maximumDiscount, usageLimit, active, influencerId, influencerName } = req.body;
    const pool = await poolPromise;
    const id = reqId || `c_${Date.now()}`;
    await pool.request()
      .input('id', sql.VarChar, id)
      .input('code', sql.VarChar, code)
      .input('type', sql.VarChar, type || 'GENERAL')
      .input('discountType', sql.VarChar, discountType || 'PERCENTAGE')
      .input('discountValue', sql.Decimal(10, 2), discountValue || 0)
      .input('minimumOrderValue', sql.Decimal(10, 2), minimumOrderValue || null)
      .input('maximumDiscount', sql.Decimal(10, 2), maximumDiscount || null)
      .input('usageLimit', sql.Int, usageLimit || null)
      .input('active', sql.Bit, active !== undefined ? active : 1)
      .input('influencerId', sql.VarChar, influencerId || null)
      .input('influencerName', sql.VarChar, influencerName || null)
      .query(`
        INSERT INTO Coupon (id, code, type, discountType, discountValue, minimumOrderValue, maximumDiscount, usageLimit, active, influencerId, influencerName)
        VALUES (@id, @code, @type, @discountType, @discountValue, @minimumOrderValue, @maximumDiscount, @usageLimit, @active, @influencerId, @influencerName)
      `);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Orders (with items and events)
app.get('/api/orders', async (req, res) => {
  try {
    const pool = await poolPromise;
    const ordersResult = await pool.request().query('SELECT * FROM [Order]');
    const itemsResult = await pool.request().query('SELECT * FROM OrderItem');
    const eventsResult = await pool.request().query('SELECT * FROM TrackingEvent');
    
    const orders = ordersResult.recordset.map(order => {
      return {
        ...order,
        items: itemsResult.recordset.filter(i => i.orderId === order.id),
        trackingEvents: eventsResult.recordset.filter(e => e.orderId === order.id)
      };
    });
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Order (Full)
app.post('/api/orders/full', async (req, res) => {
  try {
    const { id: reqId, customerId, addressId, couponId, subtotal, delivery, total, paymentStatus, status, items, trackingEvents } = req.body;
    const pool = await poolPromise;
    const id = reqId || `#RL${Date.now()}`;
    
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      const request = new sql.Request(transaction);
      
      // 1. Insert Order
      await request
        .input('id', sql.VarChar, id)
        .input('customerId', sql.VarChar, customerId)
        .input('addressId', sql.VarChar, addressId || null)
        .input('couponId', sql.VarChar, couponId || null)
        .input('subtotal', sql.Decimal(10, 2), subtotal)
        .input('delivery', sql.Decimal(10, 2), delivery)
        .input('total', sql.Decimal(10, 2), total)
        .input('paymentStatus', sql.VarChar, paymentStatus)
        .input('status', sql.VarChar, status)
        .input('date', sql.DateTime, new Date())
        .query(`
          INSERT INTO [Order] (id, customerId, addressId, couponId, subtotal, delivery, total, paymentStatus, status, date)
          VALUES (@id, @customerId, @addressId, @couponId, @subtotal, @delivery, @total, @paymentStatus, @status, @date)
        `);
        
      // 2. Insert Items
      if (items && items.length > 0) {
        for (const item of items) {
          const itemReq = new sql.Request(transaction);
          await itemReq
            .input('id', sql.VarChar, `oi_${Date.now()}_${Math.floor(Math.random()*1000)}`)
            .input('orderId', sql.VarChar, id)
            .input('productId', sql.VarChar, item.productId)
            .input('productName', sql.VarChar, item.productName)
            .input('packSize', sql.VarChar, item.packSize)
            .input('quantity', sql.Int, item.quantity)
            .input('unitPrice', sql.Decimal(10, 2), item.unitPrice)
            .input('totalPrice', sql.Decimal(10, 2), item.totalPrice)
            .input('itemStatus', sql.VarChar, item.itemStatus)
            .query(`
              INSERT INTO OrderItem (id, orderId, productId, productName, packSize, quantity, unitPrice, totalPrice, itemStatus)
              VALUES (@id, @orderId, @productId, @productName, @packSize, @quantity, @unitPrice, @totalPrice, @itemStatus)
            `);
        }
      }
      
      // 3. Insert Tracking Events
      if (trackingEvents && trackingEvents.length > 0) {
        for (const event of trackingEvents) {
          const eventReq = new sql.Request(transaction);
          await eventReq
            .input('id', sql.VarChar, event.id || `te_${Date.now()}_${Math.floor(Math.random()*1000)}`)
            .input('orderId', sql.VarChar, id)
            .input('status', sql.VarChar, event.status)
            .input('timestamp', sql.DateTime, event.timestamp ? new Date(event.timestamp) : new Date())
            .input('message', sql.VarChar, event.message)
            .query(`
              INSERT INTO TrackingEvent (id, orderId, status, timestamp, message)
              VALUES (@id, @orderId, @status, @timestamp, @message)
            `);
        }
      }
      
      await transaction.commit();
      res.json({ success: true, id });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync database on startup
syncDatabase().then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Backend API running on port ${port}`));
});
