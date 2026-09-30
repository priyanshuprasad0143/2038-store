const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5001;

// Helper SHA-256 Hashing
const hashSecret = (val) => {
  return crypto.createHash('sha256').update(String(val).trim().toLowerCase()).digest('hex');
};

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
// 2. SCHEMAS & MODELS
// ==========================================

// Store Config Schema
const configSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true }
});
const Config = mongoose.model('Config', configSchema);

// Admin Auth Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

// Customer User Schema
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  pin: { type: String },
  pinHash: { type: String },
  recoveryHash: { type: String },
  defaultAddress: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// 2038 Stock Grid Box Schema
const gridBoxSchema = new mongoose.Schema({
  boxNumber: { type: Number, required: true, unique: true },
  price: { type: Number, default: 100 },
  status: { type: String, default: 'available' }, // 'available', 'pending', 'owned'
  ownerPhone: { type: String, default: null },
  ownerName: { type: String, default: null },
  utrNumber: { type: String, default: null },
  boughtAt: { type: Date, default: null }
});
const GridBox = mongoose.model('GridBox', gridBoxSchema);

// Grid Stock UTR Purchase Request Schema
const gridRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  customerName: { type: String, required: true },
  boxNumbers: [{ type: Number, required: true }],
  totalAmount: { type: Number, required: true },
  utrNumber: { type: String, required: true },
  status: { type: String, default: 'Pending' }, // 'Pending', 'Approved', 'Rejected'
  createdAt: { type: Date, default: Date.now }
});
const GridRequest = mongoose.model('GridRequest', gridRequestSchema);

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
  unit: { type: String, required: true },
  badge: { type: String, default: 'FRESH' },
  image: { type: String }
});
const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: String },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  items: [{
    productId: { type: String, required: true },
    productName: { type: String },
    unit: { type: String },
    price: { type: Number },
    quantity: { type: Number, default: 1 }
  }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'COD' },
  paymentStatus: { type: String, default: 'Pending' },
  utrNumber: { type: String, default: '' },
  orderStatus: { type: String, default: 'Placed' },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// Defaults Initializer
async function initializeDefaults() {
  try {
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      await Admin.create({
        username: 'admin',
        passwordHash: hashSecret('2038@admin')
      });
      console.log('🔐 Default Admin Initialized: admin / 2038@admin');
    }

    const upiExists = await Config.findOne({ key: 'upi_id' });
    if (!upiExists) {
      await Config.create({ key: 'upi_id', value: '2038@upi' });
    }

    const boxCount = await GridBox.countDocuments();
    if (boxCount === 0) {
      const boxes = [];
      for (let i = 1; i <= 100; i++) {
        boxes.push({ boxNumber: i, price: 100, status: 'available' });
      }
      await GridBox.insertMany(boxes);
      console.log('📈 100 Grid Stock Blocks Initialized');
    }

    const pinCount = await Pincode.countDocuments();
    if (pinCount === 0) {
      await Pincode.insertMany([
        { code: '812001' }, { code: '812002' }, { code: '812003' }, { code: '827001' }
      ]);
    }
  } catch (err) {
    console.error('Initialization error:', err.message);
  }
}

// Middleware: Admin Token Verification
const verifyAdminToken = async (req, res, next) => {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized access.' });

  try {
    const [user, hash] = token.split(':::');
    const admin = await Admin.findOne({ username: user });
    if (admin && admin.passwordHash === hash) {
      req.admin = admin;
      return next();
    }
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

// ==========================================
// 3. ROUTES & APIS
// ==========================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.get('/api/config/upi', async (req, res) => {
  try {
    const cfg = await Config.findOne({ key: 'upi_id' });
    res.json({ success: true, upiId: cfg ? cfg.value : '2038@upi' });
  } catch (e) {
    res.json({ success: true, upiId: '2038@upi' });
  }
});

app.post('/api/admin/config/upi', verifyAdminToken, async (req, res) => {
  try {
    const { upiId } = req.body;
    if (!upiId) return res.status(400).json({ success: false, message: 'Valid UPI identifier required.' });
    await Config.findOneAndUpdate({ key: 'upi_id' }, { value: upiId.trim() }, { upsert: true });
    res.json({ success: true, message: 'Store UPI configuration updated successfully.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update store UPI configuration.' });
  }
});

// Admin Authentication
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username: String(username).trim() });

    if (!admin || admin.passwordHash !== hashSecret(password)) {
      return res.status(400).json({ success: false, message: 'Invalid admin username or password.' });
    }

    const token = `${admin.username}:::${admin.passwordHash}`;
    res.json({ success: true, token, username: admin.username });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Authentication process failed.' });
  }
});

app.post('/api/admin/change-credentials', verifyAdminToken, async (req, res) => {
  try {
    const { newUsername, newPassword } = req.body;
    if (!newUsername || !newPassword) {
      return res.status(400).json({ success: false, message: 'New credentials required.' });
    }

    req.admin.username = String(newUsername).trim();
    req.admin.passwordHash = hashSecret(newPassword);
    await req.admin.save();

    const newToken = `${req.admin.username}:::${req.admin.passwordHash}`;
    res.json({ success: true, message: 'Administrative credentials updated successfully.', newToken });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update credentials.' });
  }
});

// Grid Stock APIs
app.get('/api/grid/boxes', async (req, res) => {
  try {
    const boxes = await GridBox.find({}).sort({ boxNumber: 1 });
    res.json({ success: true, total: boxes.length, boxes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database query error.' });
  }
});

app.post('/api/grid/request-buy', async (req, res) => {
  try {
    const { phone, boxNumbers, utrNumber } = req.body;
    const cleanUtr = String(utrNumber || '').trim();

    const utrRegex = /^[0-9]{12}$/;
    if (!utrRegex.test(cleanUtr)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UTR Number. Please input the exact 12-digit numeric reference.'
      });
    }

    if (!phone || !boxNumbers || !boxNumbers.length) {
      return res.status(400).json({ success: false, message: 'Phone number and block selection are mandatory.' });
    }

    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer account not found. Please register or sign in.' });
    }

    const unavailable = await GridBox.find({ boxNumber: { $in: boxNumbers }, status: { $ne: 'available' } });
    if (unavailable.length > 0) {
      const takenNums = unavailable.map(b => `#${b.boxNumber}`).join(', ');
      return res.status(400).json({ success: false, message: `Block(s) ${takenNums} are currently unavailable.` });
    }

    await GridBox.updateMany(
      { boxNumber: { $in: boxNumbers } },
      {
        $set: {
          status: 'pending',
          ownerPhone: user.phone,
          ownerName: user.name,
          utrNumber: cleanUtr
        }
      }
    );

    const totalAmount = boxNumbers.length * 100;
    const requestId = `REQ-${Date.now().toString().slice(-6)}`;

    const newRequest = await GridRequest.create({
      requestId,
      phone: user.phone,
      customerName: user.name,
      boxNumbers,
      totalAmount,
      utrNumber: cleanUtr,
      status: 'Pending'
    });

    res.json({
      success: true,
      message: 'UTR verification request submitted. The administration will reconcile and confirm ownership.',
      request: newRequest
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Request submission failed.' });
  }
});

app.get('/api/grid/requests', verifyAdminToken, async (req, res) => {
  try {
    const requests = await GridRequest.find({}).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/grid/requests/approve', verifyAdminToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await GridRequest.findOne({ requestId });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    await GridBox.updateMany(
      { boxNumber: { $in: request.boxNumbers } },
      {
        $set: {
          status: 'owned',
          ownerPhone: request.phone,
          ownerName: request.customerName,
          utrNumber: request.utrNumber,
          boughtAt: new Date()
        }
      }
    );

    request.status = 'Approved';
    await request.save();

    res.json({ success: true, message: `Request #${requestId} approved successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Approval failed.' });
  }
});

app.post('/api/grid/requests/reject', verifyAdminToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await GridRequest.findOne({ requestId });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    await GridBox.updateMany(
      { boxNumber: { $in: request.boxNumbers } },
      {
        $set: {
          status: 'available',
          ownerPhone: null,
          ownerName: null,
          utrNumber: null,
          boughtAt: null
        }
      }
    );

    request.status = 'Rejected';
    await request.save();

    res.json({ success: true, message: `Request #${requestId} rejected. Blocks returned to inventory.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Rejection failed.' });
  }
});

app.post('/api/grid/revoke-box', verifyAdminToken, async (req, res) => {
  try {
    const { boxNumber } = req.body;
    const box = await GridBox.findOne({ boxNumber: Number(boxNumber) });
    if (!box) return res.status(404).json({ success: false, message: 'Block not found.' });

    box.status = 'available';
    box.ownerPhone = null;
    box.ownerName = null;
    box.utrNumber = null;
    box.boughtAt = null;
    await box.save();

    res.json({ success: true, message: `Block #${boxNumber} ownership revoked successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Revocation failed.' });
  }
});

// Customer Authentication
app.post('/api/user/check-phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: String(req.body.phone).trim() });
    res.json({ success: true, exists: !!user, name: user ? user.name : null });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/user/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    const cleanPhone = String(phone).trim();
    const cleanPin = String(pin).trim();
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) return res.status(400).json({ success: false, message: 'Account not registered.' });

    const targetHash = hashSecret(cleanPin);
    const isHashMatch = user.pinHash && user.pinHash === targetHash;
    const isPlainMatch = user.pin && user.pin === cleanPin;

    if (!isHashMatch && !isPlainMatch) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number or security PIN.' });
    }

    if (!user.pinHash) {
      user.pinHash = targetHash;
      await user.save();
    }

    res.json({
      success: true,
      user: { userId: user.userId, name: user.name, phone: user.phone, defaultAddress: user.defaultAddress }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Sign in process encountered an error.' });
  }
});

app.post('/api/user/register', async (req, res) => {
  try {
    const { name, phone, pin, recoveryWord, defaultAddress } = req.body;
    const cleanPhone = String(phone).trim();
    const cleanPin = String(pin).trim();
    const cleanRecovery = String(recoveryWord || '').trim();

    if (!name || cleanPhone.length !== 10 || cleanPin.length !== 4 || !cleanRecovery) {
      return res.status(400).json({ success: false, message: 'All registration parameters are mandatory.' });
    }

    let user = await User.findOne({ phone: cleanPhone });
    const pHash = hashSecret(cleanPin);
    const rHash = hashSecret(cleanRecovery);

    if (user) {
      user.name = name.trim();
      user.pinHash = pHash;
      user.recoveryHash = rHash;
      if (defaultAddress) user.defaultAddress = defaultAddress;
      await user.save();
    } else {
      const userId = `2038-U${Date.now().toString().slice(-5)}`;
      user = await User.create({
        userId,
        name: name.trim(),
        phone: cleanPhone,
        pinHash: pHash,
        recoveryHash: rHash,
        defaultAddress: defaultAddress || ''
      });
    }

    res.status(201).json({
      success: true,
      user: { userId: user.userId, name: user.name, phone: user.phone, defaultAddress: user.defaultAddress }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Customer registration failed.' });
  }
});

app.post('/api/user/reset-pin', async (req, res) => {
  try {
    const { phone, recoveryWord, newPin } = req.body;
    const cleanPhone = String(phone).trim();
    const cleanPin = String(newPin).trim();
    const cleanRecovery = String(recoveryWord || '').trim();

    if (!cleanPhone || cleanPin.length !== 4 || !cleanRecovery) {
      return res.status(400).json({ success: false, message: 'Mobile number, new 4-digit PIN, and recovery key are required.' });
    }

    const user = await User.findOne({ phone: cleanPhone });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });

    if (user.recoveryHash && user.recoveryHash !== hashSecret(cleanRecovery)) {
      return res.status(400).json({ success: false, message: 'Incorrect recovery key provided.' });
    }

    user.pinHash = hashSecret(cleanPin);
    user.recoveryHash = hashSecret(cleanRecovery);
    user.pin = undefined;
    await user.save();

    res.json({ success: true, message: 'Security PIN reset successfully. Please sign in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'PIN reset procedure failed.' });
  }
});

app.post('/api/user/update-address', async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ phone: String(req.body.phone).trim() }, { defaultAddress: req.body.address }, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Pincodes
app.get('/api/pincodes/active', async (req, res) => {
  try {
    const pins = await Pincode.find({});
    res.json({ success: true, pincodes: pins.map(p => p.code) });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/check-pincode', async (req, res) => {
  try {
    const exists = await Pincode.findOne({ code: String(req.body.pincode).trim() });
    res.json({
      success: true,
      serviceable: !!exists,
      message: exists ? 'Instant 10-12 minute delivery available.' : 'Currently not serviceable.'
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/pincodes', verifyAdminToken, async (req, res) => {
  try {
    const pins = await Pincode.find({});
    res.json({ success: true, pincodes: pins.map(p => p.code) });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/pincodes/add', verifyAdminToken, async (req, res) => {
  try {
    const cleanPin = String(req.body.pincode).trim();
    if (!cleanPin || cleanPin.length !== 6) return res.status(400).json({ success: false, message: 'Valid 6-digit postal code required.' });

    const exists = await Pincode.findOne({ code: cleanPin });
    if (exists) return res.status(400).json({ success: false, message: 'Postal code already configured.' });

    await Pincode.create({ code: cleanPin });
    res.json({ success: true, message: `Postal area ${cleanPin} activated.` });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.delete('/api/pincodes/:code', verifyAdminToken, async (req, res) => {
  try {
    const code = String(req.params.code).trim();
    await Pincode.deleteOne({ code });
    res.json({ success: true, message: `Postal area ${code} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const prods = await Product.find({});
    res.json({
      success: true,
      products: prods.map(p => ({
        id: p._id.toString(),
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        unit: p.unit,
        badge: p.badge,
        image: p.image
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/products/add', verifyAdminToken, async (req, res) => {
  try {
    const { name, category, price, stock, unit, badge, image } = req.body;
    if (!name || !price || !stock || !unit) {
      return res.status(400).json({ success: false, message: 'All product specifications are required.' });
    }

    const newProd = await Product.create({
      name,
      category: category || 'Snacks',
      price: Number(price),
      stock: Number(stock),
      unit,
      badge: badge || 'FRESH',
      image: image || ''
    });

    res.status(201).json({ success: true, message: 'Product added to catalog.', product: newProd });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

app.delete('/api/products/:id', verifyAdminToken, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted from catalog.' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Order Processing
app.post('/api/orders/place', async (req, res) => {
  try {
    const { customerName, phone, address, pincode, items, paymentMethod, utrNumber, userId } = req.body;
    const cleanPin = String(pincode).trim();

    const isServiceable = await Pincode.findOne({ code: cleanPin });
    if (!isServiceable) {
      return res.status(400).json({
        success: false,
        message: `Area ${cleanPin} is currently outside our delivery boundary.`
      });
    }

    const method = paymentMethod || 'COD';
    let cleanUtr = String(utrNumber || '').trim();

    let initialOrderStatus = 'Placed';
    let initialPayStatus = 'Pending';

    if (method === 'UPI_QR') {
      const utrRegex = /^[0-9]{12}$/;
      if (!utrRegex.test(cleanUtr)) {
        return res.status(400).json({
          success: false,
          message: 'Valid 12-digit numeric UTR/Reference number is mandatory for UPI payments.'
        });
      }
      initialOrderStatus = 'Payment Review';
      initialPayStatus = 'Pending';
    } else {
      cleanUtr = '';
      initialOrderStatus = 'Placed';
      initialPayStatus = 'Pending (COD)';
    }

    let totalAmount = 0;
    const enriched = [];

    for (const item of items) {
      const p = await Product.findById(item.productId);
      if (!p || p.stock < (item.quantity || 1)) return res.status(400).json({ success: false, message: 'Insufficient product inventory.' });
      p.stock -= (item.quantity || 1);
      await p.save();
      totalAmount += p.price * (item.quantity || 1);
      enriched.push({ productId: p._id.toString(), productName: p.name, unit: p.unit, price: p.price, quantity: item.quantity || 1 });
    }

    const orderId = `2038-${Date.now().toString().slice(-6)}`;
    const newOrder = await Order.create({
      orderId,
      userId: userId || '',
      customerName,
      phone: String(phone).trim(),
      address,
      pincode: cleanPin,
      items: enriched,
      totalAmount,
      paymentMethod: method,
      paymentStatus: initialPayStatus,
      utrNumber: cleanUtr,
      orderStatus: initialOrderStatus
    });

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Order placement failed.' });
  }
});

app.post('/api/orders/verify-payment', verifyAdminToken, async (req, res) => {
  try {
    const { orderId, action } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    if (action === 'approve') {
      order.paymentStatus = 'Verified';
      order.orderStatus = 'Placed';
      await order.save();
      return res.json({ success: true, message: `Payment for Order #${orderId} verified. Ready for packing.` });
    } else {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
      }
      order.paymentStatus = 'Failed';
      order.orderStatus = 'Cancelled';
      await order.save();
      return res.json({ success: true, message: `Order #${orderId} payment rejected and order cancelled.` });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Payment verification failed.' });
  }
});

app.get('/api/orders/track/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/orders/my-orders', async (req, res) => {
  try {
    const orders = await Order.find({ phone: String(req.query.phone).trim() }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.get('/api/orders', verifyAdminToken, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.patch('/api/orders/status', verifyAdminToken, async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findOneAndUpdate({ orderId }, { orderStatus: status }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.delete('/api/orders/:orderId', verifyAdminToken, async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, message: 'Order permanently deleted.' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 2038 Server running on port ${PORT}`));