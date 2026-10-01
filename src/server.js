const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

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
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://priyanshuprasad7777_db_user:VzwM6qscOC7Tp14h@cluster0.2vvbj0t.mongodb.net/2038_store?retryWrites=true&w=majority&appName=Cluster0';

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

const configSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true }
});
const Config = mongoose.model('Config', configSchema);

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, default: 'FLAT' },
  value: { type: Number, required: true },
  minOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});
const Coupon = mongoose.model('Coupon', couponSchema);

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

const riderSchema = new mongoose.Schema({
  riderId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Rider = mongoose.model('Rider', riderSchema);

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

const gridBoxSchema = new mongoose.Schema({
  boxNumber: { type: Number, required: true, unique: true },
  price: { type: Number, default: 100 },
  status: { type: String, default: 'available' },
  ownerPhone: { type: String, default: null },
  ownerName: { type: String, default: null },
  utrNumber: { type: String, default: null },
  boughtAt: { type: Date, default: null }
});
const GridBox = mongoose.model('GridBox', gridBoxSchema);

const gridRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  customerName: { type: String, required: true },
  boxNumbers: [{ type: Number, required: true }],
  totalAmount: { type: Number, required: true },
  utrNumber: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});
const GridRequest = mongoose.model('GridRequest', gridRequestSchema);

const pincodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }
});
const Pincode = mongoose.model('Pincode', pincodeSchema);

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

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  userId: { type: String },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  pincode: { type: String, required: true },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  items: [{
    productId: { type: String, required: true },
    productName: { type: String },
    unit: { type: String },
    price: { type: Number },
    quantity: { type: Number, default: 1 }
  }],
  totalAmount: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  couponApplied: { type: String, default: '' },
  paymentMethod: { type: String, default: 'COD' },
  paymentStatus: { type: String, default: 'Pending' },
  utrNumber: { type: String, default: '' },
  orderStatus: { type: String, default: 'Placed' },
  deliveredAt: { type: Date, default: null },
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

    const riderExists = await Rider.findOne({ riderId: 'rider' });
    if (!riderExists) {
      await Rider.create({
        riderId: 'rider',
        name: 'Primary Delivery Partner',
        passwordHash: hashSecret('2038@rider')
      });
      console.log('🛵 Default Rider Initialized: rider / 2038@rider');
    }

    const upiExists = await Config.findOne({ key: 'upi_id' });
    if (!upiExists) {
      await Config.create({ key: 'upi_id', value: '2038@upi' });
    }

    const storeStatusExists = await Config.findOne({ key: 'store_status' });
    if (!storeStatusExists) {
      await Config.create({ key: 'store_status', value: 'OPEN' });
    }

    const supportPhoneExists = await Config.findOne({ key: 'support_phone' });
    if (!supportPhoneExists) {
      await Config.create({ key: 'support_phone', value: '9123456789' });
    }

    const welcomeCoupon = await Coupon.findOne({ code: 'WELCOME50' });
    if (!welcomeCoupon) {
      await Coupon.create({
        code: 'WELCOME50',
        type: 'FLAT',
        value: 50,
        minOrder: 149,
        isActive: true
      });
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

// Token Middleware
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

const verifyRiderToken = async (req, res, next) => {
  const token = req.headers['x-rider-token'];
  if (!token) return res.status(401).json({ success: false, message: 'Rider authentication required.' });

  try {
    const [id, hash] = token.split(':::');
    const rider = await Rider.findOne({ riderId: id });
    if (rider && rider.passwordHash === hash) {
      req.rider = rider;
      return next();
    }
    return res.status(401).json({ success: false, message: 'Rider session expired.' });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid rider token.' });
  }
};

// ==========================================
// 3. MULTI-PWA ROUTING & SCOPE ISOLATION
// ==========================================

// 1. Customer Store (Scoped to /app/)
app.get(['/', '/app', '/app/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/app/');
  res.sendFile(path.join(__dirname, 'sw.js'));
});
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

// 2. Rider Portal (Scoped to /rider/)
app.get(['/rider', '/rider/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'rider.html'));
});
app.get('/sw-rider.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/rider/');
  res.sendFile(path.join(__dirname, 'sw-rider.js'));
});
app.get('/manifest-rider.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'manifest-rider.json'));
});

// 3. Admin Portal (Scoped to /admin/)
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/sw-admin.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/admin/');
  res.sendFile(path.join(__dirname, 'sw-admin.js'));
});
app.get('/manifest-admin.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'manifest-admin.json'));
});

// ==========================================
// 4. API ROUTES
// ==========================================

app.get('/api/config/store-status', async (req, res) => {
  try {
    const cfg = await Config.findOne({ key: 'store_status' });
    res.json({ success: true, status: cfg ? cfg.value : 'OPEN' });
  } catch (e) {
    res.json({ success: true, status: 'OPEN' });
  }
});

app.post('/api/admin/config/store-status', verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.body;
    await Config.findOneAndUpdate({ key: 'store_status' }, { value: status }, { upsert: true });
    res.json({ success: true, status, message: `Store status changed to ${status}.` });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update store status.' });
  }
});

app.get('/api/config/support-phone', async (req, res) => {
  try {
    const cfg = await Config.findOne({ key: 'support_phone' });
    res.json({ success: true, phone: cfg ? cfg.value : '9123456789' });
  } catch (e) {
    res.json({ success: true, phone: '9123456789' });
  }
});

app.post('/api/admin/config/support-phone', verifyAdminToken, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required.' });
    await Config.findOneAndUpdate({ key: 'support_phone' }, { value: String(phone).trim() }, { upsert: true });
    res.json({ success: true, message: 'Store helpline number updated.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update helpline number.' });
  }
});

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

// Coupons
app.post('/api/coupons/apply', async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    const cleanCode = String(code || '').trim().toUpperCase();
    const total = Number(cartTotal) || 0;

    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });
    if (!coupon) {
      return res.status(400).json({ success: false, message: 'Invalid or expired promo code.' });
    }

    if (total < coupon.minOrder) {
      return res.status(400).json({
        success: false,
        message: `Code requires a minimum order of ₹${coupon.minOrder}. Add more items!`
      });
    }

    let discount = 0;
    if (coupon.type === 'PERCENT') {
      discount = Math.round((total * coupon.value) / 100);
    } else {
      discount = coupon.value;
    }

    discount = Math.min(discount, total);
    const finalAmount = Math.max(0, total - discount);

    res.json({
      success: true,
      code: coupon.code,
      discount,
      finalAmount,
      message: `Coupon '${coupon.code}' applied! Saved ₹${discount}.`
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to validate coupon.' });
  }
});

app.get('/api/coupons', verifyAdminToken, async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

app.post('/api/coupons/create', verifyAdminToken, async (req, res) => {
  try {
    const { code, type, value, minOrder } = req.body;
    const cleanCode = String(code || '').trim().toUpperCase();

    if (!cleanCode || !value) {
      return res.status(400).json({ success: false, message: 'Code and discount value are required.' });
    }

    const exists = await Coupon.findOne({ code: cleanCode });
    if (exists) {
      return res.status(400).json({ success: false, message: 'A coupon with this code already exists.' });
    }

    const newCoupon = await Coupon.create({
      code: cleanCode,
      type: type || 'FLAT',
      value: Number(value),
      minOrder: Number(minOrder) || 0,
      isActive: true
    });

    res.status(201).json({ success: true, message: 'Coupon created successfully!', coupon: newCoupon });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to create coupon.' });
  }
});

app.delete('/api/coupons/:code', verifyAdminToken, async (req, res) => {
  try {
    await Coupon.findOneAndDelete({ code: req.params.code.toUpperCase() });
    res.json({ success: true, message: 'Coupon removed successfully.' });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// Admin Auth
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

// Rider Auth
app.post('/api/rider/login', async (req, res) => {
  try {
    const { riderId, password } = req.body;
    const cleanId = String(riderId || '').trim();
    const rider = await Rider.findOne({ riderId: cleanId });

    if (!rider || rider.passwordHash !== hashSecret(password)) {
      return res.status(400).json({ success: false, message: 'Invalid Rider ID or Password.' });
    }

    const token = `${rider.riderId}:::${rider.passwordHash}`;
    res.json({ success: true, token, rider: { riderId: rider.riderId, name: rider.name } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Login failed.' });
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

app.get('/api/grid/my-portfolio', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    const boxes = await GridBox.find({ ownerPhone: phone, status: 'owned' }).sort({ boxNumber: 1 });
    res.json({ success: true, boxes });
  } catch (e) {
    res.status(500).json({ success: false });
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

    const unavailable = await GridBox.find({ boxNumber: { $in: boxNumbers }, status: {$ne: 'available' } });
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
    const storeStatusCfg = await Config.findOne({ key: 'store_status' });
    if (storeStatusCfg && storeStatusCfg.value === 'CLOSED') {
      return res.status(400).json({
        success: false,
        message: 'The store is currently closed and not accepting new orders.'
      });
    }

    const { customerName, phone, address, pincode, items, paymentMethod, utrNumber, userId, couponCode, discountAmount, latitude, longitude } = req.body;
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

    let itemsTotal = 0;
    const enriched = [];

    for (const item of items) {
      const p = await Product.findById(item.productId);
      if (!p || p.stock < (item.quantity || 1)) return res.status(400).json({ success: false, message: 'Insufficient product inventory.' });
      p.stock -= (item.quantity || 1);
      await p.save();
      itemsTotal += p.price * (item.quantity || 1);
      enriched.push({ productId: p._id.toString(), productName: p.name, unit: p.unit, price: p.price, quantity: item.quantity || 1 });
    }

    const discount = Math.min(Number(discountAmount) || 0, itemsTotal);
    const finalBillTotal = Math.max(0, itemsTotal - discount);

    const orderId = `2038-${Date.now().toString().slice(-6)}`;
    const newOrder = await Order.create({
      orderId,
      userId: userId || '',
      customerName,
      phone: String(phone).trim(),
      address,
      pincode: cleanPin,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      items: enriched,
      totalAmount: finalBillTotal,
      discountAmount: discount,
      couponApplied: couponCode || '',
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

// Rider APIs
app.get('/api/rider/active-orders', verifyRiderToken, async (req, res) => {
  try {
    const orders = await Order.find({
      orderStatus: { $in: ['Packed', 'Out for Delivery'] }
    }).sort({ createdAt: 1 });
    res.json({ success: true, orders });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error fetching rider deliveries.' });
  }
});

app.get('/api/rider/history-orders', verifyRiderToken, async (req, res) => {
  try {
    const orders = await Order.find({
      orderStatus: 'Delivered'
    }).sort({ deliveredAt: -1, createdAt: -1 }).limit(50);
    res.json({ success: true, orders });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error fetching delivery history.' });
  }
});

app.post('/api/rider/update-status', verifyRiderToken, async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!['Out for Delivery', 'Delivered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery status.' });
    }

    const updateFields = { orderStatus: status };
    if (status === 'Delivered') {
      updateFields.deliveredAt = new Date();
    }

    const order = await Order.findOneAndUpdate({ orderId }, updateFields, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    res.json({ success: true, order, message: `Order #${orderId} marked as ${status}!` });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update order status.' });
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
    const updateFields = { orderStatus: status };
    if (status === 'Delivered') updateFields.deliveredAt = new Date();

    const order = await Order.findOneAndUpdate({ orderId }, updateFields, { new: true });
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

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 2038 Multi-PWA Engine running on port ${PORT}`));