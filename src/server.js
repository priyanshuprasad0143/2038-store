const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==========================================
// 1. MONGODB ATLAS CONNECTION
// ==========================================
const MONGO_URI = 'mongodb+srv://priyanshuprasad7777_db_user:VzwM6qscOC7Tp14h@cluster0.2vvbj0t.mongodb.net/2038_store?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  tls: true
})
  .then(async () => {
    console.log('✅ MongoDB Atlas Connected Successfully!');
    await initializeDefaults();
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// ==========================================
// 2. MONGOOSE SCHEMAS & MODELS
// ==========================================

// Pincode Schema
const pincodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }
});
const Pincode = mongoose.model('Pincode', pincodeSchema);

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'General' },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  unit: { type: String, required: true }
});
const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  items: [{
    productId: { type: String, required: true },
    quantity: { type: Number, default: 1 }
  }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'COD' },
  orderStatus: { type: String, default: 'Placed' },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Seed Default Data if empty
async function initializeDefaults() {
  try {
    const pinCount = await Pincode.countDocuments();
    if (pinCount === 0) {
      await Pincode.insertMany([
        { code: '812001' },
        { code: '812002' },
        { code: '812003' },
        { code: '827001' }
      ]);
      console.log('📦 Default Pincodes Seeded');
    }

    const prodCount = await Product.countDocuments();
    if (prodCount === 0) {
      await Product.insertMany([
        { name: '2038 Signature Blend Coffee', category: 'Beverages', price: 249, stock: 50, unit: '250g' },
        { name: '2038 Organic Honey', category: 'Pantry', price: 399, stock: 25, unit: '500g' },
        { name: '2038 Roasted Almonds', category: 'Snacks', price: 199, stock: 40, unit: '200g' }
      ]);
      console.log('📦 Default Products Seeded');
    }
  } catch (seedErr) {
    console.error('Seeding error:', seedErr.message);
  }
}

// ==========================================
// 3. ROUTES
// ==========================================

// Storefront Home Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Dashboard Page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Pincode Availability Check API
app.post('/api/check-pincode', async (req, res) => {
  try {
    const { pincode } = req.body;
    if (!pincode) {
      return res.status(400).json({ success: false, message: 'Pin code provide karna zaroori hai!' });
    }

    const exists = await Pincode.findOne({ code: String(pincode).trim() });

    if (exists) {
      return res.json({
        success: true,
        serviceable: true,
        message: 'Delivery is available in your area for 2038 products!'
      });
    } else {
      return res.json({
        success: true,
        serviceable: false,
        message: 'Sorry! Currently 2038 is not delivering in this area.'
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Get Active Pincodes List
app.get('/api/pincodes', async (req, res) => {
  try {
    const pins = await Pincode.find({});
    res.json({ success: true, pincodes: pins.map(p => p.code) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Add New Serviceable Pincode API
app.post('/api/pincodes/add', async (req, res) => {
  try {
    const { pincode } = req.body;
    const cleanPin = String(pincode).trim();

    if (!cleanPin || cleanPin.length !== 6) {
      return res.status(400).json({ success: false, message: 'Valid 6-digit pin code hona chahiye!' });
    }

    const exists = await Pincode.findOne({ code: cleanPin });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Ye pin code pehle se active hai!' });
    }

    await Pincode.create({ code: cleanPin });
    return res.json({ success: true, message: `Pincode ${cleanPin} activated successfully!` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error adding pincode' });
  }
});

// Get Products Catalog API
app.get('/api/products', async (req, res) => {
  try {
    const prods = await Product.find({});
    const formatted = prods.map(p => ({
      id: p._id.toString(),
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      unit: p.unit
    }));

    res.json({ success: true, totalProducts: formatted.length, products: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Add New Product API
app.post('/api/products/add', async (req, res) => {
  try {
    const { name, category, price, stock, unit } = req.body;

    if (!name || !price || !stock || !unit) {
      return res.status(400).json({ success: false, message: 'Sabhi fields bharna zaroori hai!' });
    }

    const newProd = await Product.create({
      name,
      category: category || 'General',
      price: Number(price),
      stock: Number(stock),
      unit
    });

    return res.status(201).json({
      success: true,
      message: 'Product added successfully!',
      product: { id: newProd._id.toString(), ...newProd._doc }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating product' });
  }
});

// Place Final Order API
app.post('/api/orders/place', async (req, res) => {
  try {
    const { customerName, phone, address, pincode, items, paymentMethod } = req.body;

    if (!customerName || !phone || !address || !pincode || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Sabhi fields zaroori hain!' });
    }

    const serviceable = await Pincode.findOne({ code: String(pincode).trim() });
    if (!serviceable) {
      return res.status(400).json({ success: false, message: 'Delivery area se bahar hai.' });
    }

    let totalAmount = 0;
    const itemsToUpdate = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product ID ${item.productId} nahi mila!` });
      }

      const orderQty = item.quantity || 1;
      if (product.stock < orderQty) {
        return res.status(400).json({ success: false, message: `Stock khatam! ${product.name} sirf ${product.stock} bache hain.` });
      }

      totalAmount += product.price * orderQty;
      itemsToUpdate.push({ product, deduct: orderQty });
    }

    // Deduct stock in DB
    for (const entry of itemsToUpdate) {
      entry.product.stock -= entry.deduct;
      await entry.product.save();
    }

    const orderId = `ORD-${Date.now()}`;
    const newOrder = await Order.create({
      orderId,
      customerName,
      phone,
      address,
      pincode,
      items,
      totalAmount,
      paymentMethod: paymentMethod || 'COD',
      orderStatus: 'Placed'
    });

    console.log(`[NEW DB ORDER] ID: ${orderId} | Name: ${customerName} | Total: ₹${totalAmount}`);

    return res.status(201).json({
      success: true,
      message: 'Order successfully placed!',
      order: newOrder
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error processing order' });
  }
});

// Update Order Status API
app.patch('/api/orders/status', async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const validStatuses = ['Placed', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status!' });
    }

    const order = await Order.findOneAndUpdate({ orderId }, { orderStatus: status }, { new: true });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order nahi mila!' });
    }

    return res.json({ success: true, message: `Status updated to '${status}'`, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error updating status' });
  }
});

// Get All Orders API (Admin)
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json({ success: true, totalOrders: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 2038 Server running on port ${PORT}`);
});

setInterval(() => {}, 1000000);