const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool, syncDatabase } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Basic health check route for the root URL
app.get('/', (req, res) => {
  res.send('ReLeaf Pads Backend is successfully running with PostgreSQL!');
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Product');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create an order
app.post('/api/orders', async (req, res) => {
  try {
    const { id: reqId, customerId, addressId, subtotal, total, status, date } = req.body;
    const orderId = reqId || \`o_\${Date.now()}\`;
    const result = await pool.query(\`
        INSERT INTO "Order" (id, customerId, addressId, subtotal, total, paymentStatus, status, date)
        VALUES ($1, $2, $3, $4, $5, 'PAID', $6, $7)
        RETURNING id
      \`, [orderId, customerId, addressId, subtotal, total, status, new Date(date)]);
    res.json({ id: result.rows[0].id });
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
    
    let query = 'UPDATE "Order" SET status = $1';
    const params = [status];
    
    if (deliveryPartnerId !== undefined) {
      query += ', deliveryPartnerId = $2';
      params.push(deliveryPartnerId);
    }
    query += \` WHERE id = $\${params.length + 1}\`;
    params.push(id);
    
    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Delivery Partners
app.get('/api/delivery-partners', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM DeliveryPartner');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Delivery Partner
app.post('/api/delivery-partners', async (req, res) => {
  try {
    const { id: reqId, name, phone } = req.body;
    const id = reqId || \`dp_\${Date.now()}\`;
    await pool.query(\`
        INSERT INTO DeliveryPartner (id, name, phone, isActive, availabilityStatus, createdAt, updatedAt)
        VALUES ($1, $2, $3, true, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      \`, [id, name, phone]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Customers
app.get('/api/customers', async (req, res) => {
  try {
    const customersResult = await pool.query('SELECT * FROM Customer');
    const addressesResult = await pool.query('SELECT * FROM Address');
    
    const customers = customersResult.rows.map(c => ({
      ...c,
      addresses: addressesResult.rows.filter(a => a.customerId === c.id)
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
    
    const existing = await pool.query('SELECT * FROM Customer WHERE phone = $1', [phone]);
      
    if (existing.rows.length > 0) {
      return res.json({ success: true, id: existing.rows[0].id });
    }

    const id = reqId || \`c_\${Date.now()}\`;
    await pool.query(\`
        INSERT INTO Customer (id, name, phone, pincode)
        VALUES ($1, $2, $3, $4)
      \`, [id, name, phone, pincode || null]);
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
    const addressId = reqId || \`a_\${Date.now()}\`;
    await pool.query(\`
        INSERT INTO Address (id, customerId, name, phone, houseNumber, buildingName, street, area, landmark, city, state, pincode, addressType, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      \`, [addressId, id, name, phone, houseNumber || null, buildingName || null, street || null, area || null, landmark || null, city || null, state || null, pincode || null, addressType || null, latitude || null, longitude || null]);
    res.json({ success: true, id: addressId });
  } catch (err) {
    console.error("Error creating address:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get Coupons
app.get('/api/coupons', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Coupon');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Coupon
app.post('/api/coupons', async (req, res) => {
  try {
    const { id: reqId, code, type, discountType, discountValue, minimumOrderValue, maximumDiscount, usageLimit, active, influencerId, influencerName } = req.body;
    const id = reqId || \`c_\${Date.now()}\`;
    await pool.query(\`
        INSERT INTO Coupon (id, code, type, discountType, discountValue, minimumOrderValue, maximumDiscount, usageLimit, active, influencerId, influencerName)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      \`, [id, code, type || 'GENERAL', discountType || 'PERCENTAGE', discountValue || 0, minimumOrderValue || null, maximumDiscount || null, usageLimit || null, active !== undefined ? active : true, influencerId || null, influencerName || null]);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Orders (with items and events)
app.get('/api/orders', async (req, res) => {
  try {
    const ordersResult = await pool.query('SELECT * FROM "Order"');
    const itemsResult = await pool.query('SELECT * FROM OrderItem');
    const eventsResult = await pool.query('SELECT * FROM TrackingEvent');
    
    const orders = ordersResult.rows.map(order => {
      return {
        ...order,
        items: itemsResult.rows.filter(i => i.orderId === order.id),
        trackingEvents: eventsResult.rows.filter(e => e.orderId === order.id)
      };
    });
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Order (Full)
app.post('/api/orders/full', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id: reqId, customerId, addressId, couponId, subtotal, delivery, total, paymentStatus, status, items, trackingEvents } = req.body;
    const id = reqId || \`#RL\${Date.now()}\`;
    
    await client.query('BEGIN');
    
    // 1. Insert Order
    await client.query(\`
        INSERT INTO "Order" (id, customerId, addressId, couponId, subtotal, delivery, total, paymentStatus, status, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      \`, [id, customerId, addressId || null, couponId || null, subtotal, delivery, total, paymentStatus, status, new Date()]);
      
    // 2. Insert Items
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(\`
            INSERT INTO OrderItem (id, orderId, productId, productName, packSize, quantity, unitPrice, totalPrice, itemStatus)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          \`, [\`oi_\${Date.now()}_\${Math.floor(Math.random()*1000)}\`, id, item.productId, item.productName, item.packSize, item.quantity, item.unitPrice, item.totalPrice, item.itemStatus]);
      }
    }
    
    // 3. Insert Tracking Events
    if (trackingEvents && trackingEvents.length > 0) {
      for (const event of trackingEvents) {
        await client.query(\`
            INSERT INTO TrackingEvent (id, orderId, status, timestamp, message)
            VALUES ($1, $2, $3, $4, $5)
          \`, [event.id || \`te_\${Date.now()}_\${Math.floor(Math.random()*1000)}\`, id, event.status, event.timestamp ? new Date(event.timestamp) : new Date(), event.message]);
      }
    }
    
    await client.query('COMMIT');
    res.json({ success: true, id });
    
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Sync database on startup
syncDatabase().then(() => {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(\`Backend API running on port \${port}\`));
});
