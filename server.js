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

const whatsappService = require('./services/whatsappService');
const aiService = require('./services/aiService');

// WhatsApp Webhook Verification
app.get('/api/webhook', (req, res) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;

  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.status(400).send('Missing parameters');
  }
});

// WhatsApp Incoming Messages
app.post('/api/webhook', async (req, res) => {
  let body = req.body;

  if (body.object) {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
      let from = body.entry[0].changes[0].value.messages[0].from; 
      let msg_body = body.entry[0].changes[0].value.messages[0].text.body;

      console.log(`Received message from ${from}: ${msg_body}`);
      
      try {
        // 1. Save incoming message to DB
        await pool.query(
          `INSERT INTO WhatsAppMessage (id, phone, sender, message) VALUES ($1, $2, $3, $4)`,
          [`msg_${Date.now()}_u`, from, 'user', msg_body]
        );

        // 2. Generate AI Reply
        const aiReply = await aiService.generateReply(msg_body);

        // 3. Send WhatsApp Message
        await whatsappService.sendTextMessage(from, aiReply);

        // 4. Save outgoing AI message to DB
        await pool.query(
          `INSERT INTO WhatsAppMessage (id, phone, sender, message) VALUES ($1, $2, $3, $4)`,
          [`msg_${Date.now()}_ai`, from, 'ai', aiReply]
        );
      } catch (err) {
        console.error("Error processing incoming WhatsApp message:", err);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// --- Admin Dashboard APIs for WhatsApp ---
app.get('/api/admin/conversations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM WhatsAppMessage ORDER BY createdAt ASC');
    
    // Group by phone number
    const grouped = result.rows.reduce((acc, msg) => {
      if (!acc[msg.phone]) acc[msg.phone] = [];
      acc[msg.phone].push(msg);
      return acc;
    }, {});
    
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reply', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    // Send via WhatsApp
    await whatsappService.sendTextMessage(phone, message);
    
    // Save to DB
    const id = `msg_${Date.now()}_admin`;
    await pool.query(
      `INSERT INTO WhatsAppMessage (id, phone, sender, message) VALUES ($1, $2, $3, $4)`,
      [id, phone, 'admin', message]
    );
    
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ----------------------------------------

// --- In-App Mobile Chat API ---
app.post('/api/chat', async (req, res) => {
  try {
    const { message, customerId = 'mobile_user' } = req.body;
    
    // Save user's message to DB (using customerId as "phone")
    await pool.query(
      `INSERT INTO WhatsAppMessage (id, phone, sender, message) VALUES ($1, $2, $3, $4)`,
      [`msg_${Date.now()}_u`, customerId, 'user', message]
    );

    // Generate AI Reply
    const aiReply = await aiService.generateReply(message);

    // Save AI reply to DB
    await pool.query(
      `INSERT INTO WhatsAppMessage (id, phone, sender, message) VALUES ($1, $2, $3, $4)`,
      [`msg_${Date.now()}_ai`, customerId, 'ai', aiReply]
    );

    res.json({ success: true, reply: aiReply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ----------------------------------------

// Get Products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Product');
    const mapped = result.rows.map(p => ({
      ...p,
      packSize: p.packsize,
      sellingPrice: p.sellingprice,
      imageFallback: p.imagefallback,
      stockStatus: p.stockstatus,
      totalSold: p.totalsold
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create an order
app.post('/api/orders', async (req, res) => {
  try {
    const { id: reqId, customerId, addressId, subtotal, total, status, date } = req.body;
    const orderId = reqId || `o_${Date.now()}`;
    const result = await pool.query(`
        INSERT INTO "Order" (id, customerId, addressId, subtotal, total, paymentStatus, status, date)
        VALUES ($1, $2, $3, $4, $5, 'PAID', $6, $7)
        RETURNING id
      `, [orderId, customerId, addressId, subtotal, total, status, new Date(date)]);
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
    query += ` WHERE id = $${params.length + 1}`;
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
    const mapped = result.rows.map(dp => ({
      ...dp,
      isActive: dp.isactive,
      availabilityStatus: dp.availabilitystatus,
      createdAt: dp.createdat,
      updatedAt: dp.updatedat
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Delivery Partner
app.post('/api/delivery-partners', async (req, res) => {
  try {
    const { id: reqId, name, phone } = req.body;
    const id = reqId || `dp_${Date.now()}`;
    await pool.query(`
        INSERT INTO DeliveryPartner (id, name, phone, isActive, availabilityStatus, createdAt, updatedAt)
        VALUES ($1, $2, $3, true, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [id, name, phone]);
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
      addresses: addressesResult.rows.filter(a => a.customerid === c.id).map(a => ({
        ...a,
        customerId: a.customerid,
        houseNumber: a.housenumber,
        buildingName: a.buildingname,
        addressType: a.addresstype
      }))
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

    const id = reqId || `c_${Date.now()}`;
    await pool.query(`
        INSERT INTO Customer (id, name, phone, pincode)
        VALUES ($1, $2, $3, $4)
      `, [id, name, phone, pincode || null]);
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
    const addressId = reqId || `a_${Date.now()}`;
    await pool.query(`
        INSERT INTO Address (id, customerId, name, phone, houseNumber, buildingName, street, area, landmark, city, state, pincode, addressType, latitude, longitude)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [addressId, id, name, phone, houseNumber || null, buildingName || null, street || null, area || null, landmark || null, city || null, state || null, pincode || null, addressType || null, latitude || null, longitude || null]);
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
    const mapped = result.rows.map(c => ({
      ...c,
      discountType: c.discounttype,
      discountValue: c.discountvalue,
      minimumOrderValue: c.minimumordervalue,
      maximumDiscount: c.maximumdiscount,
      usageLimit: c.usagelimit,
      usedCount: c.usedcount,
      influencerId: c.influencerid,
      influencerName: c.influencername
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Coupon
app.post('/api/coupons', async (req, res) => {
  try {
    const { id: reqId, code, type, discountType, discountValue, minimumOrderValue, maximumDiscount, usageLimit, active, influencerId, influencerName } = req.body;
    const id = reqId || `c_${Date.now()}`;
    await pool.query(`
        INSERT INTO Coupon (id, code, type, discountType, discountValue, minimumOrderValue, maximumDiscount, usageLimit, active, influencerId, influencerName)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [id, code, type || 'GENERAL', discountType || 'PERCENTAGE', discountValue || 0, minimumOrderValue || null, maximumDiscount || null, usageLimit || null, active !== undefined ? active : true, influencerId || null, influencerName || null]);
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
        customerId: order.customerid,
        addressId: order.addressid,
        deliveryPartnerId: order.deliverypartnerid,
        couponId: order.couponid,
        paymentStatus: order.paymentstatus,
        items: itemsResult.rows.filter(i => i.orderid === order.id).map(i => ({
          ...i,
          orderId: i.orderid,
          productId: i.productid,
          productName: i.productname,
          packSize: i.packsize,
          unitPrice: i.unitprice,
          totalPrice: i.totalprice,
          itemStatus: i.itemstatus
        })),
        trackingEvents: eventsResult.rows.filter(e => e.orderid === order.id).map(e => ({
          ...e,
          orderId: e.orderid
        }))
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
    const id = reqId || `#RL${Date.now()}`;
    
    await client.query('BEGIN');
    
    // 1. Ensure Customer Exists (Upsert to prevent foreign key errors from mock data)
    await client.query(`
      INSERT INTO Customer (id, name, phone) 
      VALUES ($1, 'Guest Customer', '0000000000') 
      ON CONFLICT (id) DO NOTHING
    `, [customerId]);

    // 2. Ensure Address Exists if provided
    if (addressId) {
      await client.query(`
        INSERT INTO Address (id, customerid, name, phone, street, area, city, state, pincode) 
        VALUES ($1, $2, 'Guest', '0000000000', 'Unknown Street', 'Unknown Area', 'Mysuru', 'Karnataka', '570001') 
        ON CONFLICT (id) DO NOTHING
      `, [addressId, customerId]);
    }
    
    // 3. Insert Order
    await client.query(`
        INSERT INTO "Order" (id, customerId, addressId, couponId, subtotal, delivery, total, paymentStatus, status, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [id, customerId, addressId || null, couponId || null, subtotal, delivery, total, paymentStatus, status, new Date()]);
      
    // 2. Insert Items
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(`
            INSERT INTO OrderItem (id, orderId, productId, productName, packSize, quantity, unitPrice, totalPrice, itemStatus)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [`oi_${Date.now()}_${Math.floor(Math.random()*1000)}`, id, item.productId, item.productName, item.packSize, item.quantity, item.unitPrice, item.totalPrice, item.itemStatus]);
      }
    }
    
    // 3. Insert Tracking Events
    if (trackingEvents && trackingEvents.length > 0) {
      for (const event of trackingEvents) {
        await client.query(`
            INSERT INTO TrackingEvent (id, orderId, status, timestamp, message)
            VALUES ($1, $2, $3, $4, $5)
          `, [event.id || `te_${Date.now()}_${Math.floor(Math.random()*1000)}`, id, event.status, event.timestamp ? new Date(event.timestamp) : new Date(), event.message]);
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

// Removed duplicate webhook logic

// --- Razorpay Payment Integration ---
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: "ReLeaf Pads API",
    status: "healthy"
  });
});

app.post('/api/payments/create-order', async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId } = req.body;
    console.log('CREATE-ORDER Webhook hit! Received orderId:', orderId);
    
    // 1. Fetch order from DB
    const orderResult = await client.query('SELECT * FROM "Order" WHERE id = $1', [orderId]);
    console.log('Query Result count:', orderResult.rows.length);
    if (orderResult.rows.length === 0) {
      console.log('All Orders inside DB:', (await client.query('SELECT id FROM "Order" ORDER BY date DESC LIMIT 5')).rows);
      return res.status(404).json({ success: false, message: 'Order not found' });
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const order = orderResult.rows[0];
    
    // 2. Prevent paying an already paid order
    if (order.paymentstatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Order is already paid' });
    }
    
    // In a full production app, you would recalculate the order.total here based on product prices.
    // Assuming order.total in DB is verified and trusted.
    const amountInPaise = Math.round(parseFloat(order.total) * 100);
    
    // 3. Initialize Razorpay
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: 'Razorpay credentials not configured on server' });
    }
    
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    // 4. Create Razorpay Order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: orderId
    };
    
    const razorpayOrder = await razorpay.orders.create(options);
    
    // 5. Save Razorpay Order ID to our DB
    await client.query(
      'UPDATE "Order" SET razorpayOrderId = $1, paymentStatus = $2 WHERE id = $3',
      [razorpayOrder.id, 'PENDING', orderId]
    );
    
    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID
    });
    
  } catch (err) {
    console.error("Razorpay order creation error:", err);
    res.status(500).json({ success: false, message: "Payment could not be initiated" });
  } finally {
    client.release();
  }
});

app.post('/api/payments/razorpay/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  if (!secret) {
    return res.status(500).json({ success: false, message: "Webhook secret not configured" });
  }

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest !== req.headers['x-razorpay-signature']) {
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }

  const event = req.body.event;
  const payload = req.body.payload;
  const client = await pool.connect();
  
  try {
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      
      // Update order to PAID
      await client.query(`
        UPDATE "Order" 
        SET paymentStatus = 'PAID', 
            razorpayPaymentId = $1,
            paymentVerifiedAt = NOW()
        WHERE razorpayOrderId = $2 AND paymentStatus != 'PAID'
      `, [razorpayPaymentId, razorpayOrderId]);
      
      console.log(`Order with Razorpay ID ${razorpayOrderId} marked as PAID via Webhook.`);
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      
      // Update order to FAILED
      await client.query(`
        UPDATE "Order" 
        SET paymentStatus = 'FAILED'
        WHERE razorpayOrderId = $1 AND paymentStatus = 'PENDING'
      `, [razorpayOrderId]);
      
      console.log(`Order with Razorpay ID ${razorpayOrderId} marked as FAILED via Webhook.`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/payments/verify', async (req, res) => {
  const client = await pool.connect();
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto.createHmac('sha256', secret).update(body.toString()).digest('hex');
    
    if (expectedSignature === razorpaySignature) {
      await client.query(`
        UPDATE "Order" 
        SET paymentStatus = 'PAID', 
            razorpayPaymentId = $1,
            razorpaySignature = $2,
            paymentVerifiedAt = NOW()
        WHERE id = $3
      `, [razorpayPaymentId, razorpaySignature, orderId]);
      
      // Fetch customer details to send WhatsApp confirmation
      try {
        const orderRes = await client.query(`
          SELECT o.total, c.name, c.phone 
          FROM "Order" o 
          JOIN Customer c ON o.customerid = c.id 
          WHERE o.id = $1
        `, [orderId]);
        
        if (orderRes.rows.length > 0) {
          const { total, name, phone } = orderRes.rows[0];
          await whatsappService.sendOrderConfirmation(phone, orderId, name, total);
        }
      } catch (waErr) {
        console.error("Failed to send WhatsApp confirmation:", waErr);
      }
      
      res.json({ success: true });
    } else {
      await client.query(`UPDATE "Order" SET paymentStatus = 'FAILED' WHERE id = $1`, [orderId]);
      res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ success: false, message: "Payment verification failed" });
  } finally {
    client.release();
  }
});

app.get('/api/payments/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await pool.query('SELECT paymentStatus, paymentMethod FROM "Order" WHERE id = $1', [orderId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    
    res.json({ 
      success: true, 
      paymentStatus: result.rows[0].paymentstatus,
      paymentMethod: result.rows[0].paymentmethod
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sync database on startup
syncDatabase().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend API running on port ${PORT}`);
  });
});
