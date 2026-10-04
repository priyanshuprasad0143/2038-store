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
  status: { type: String, default: 'available' }, // available, pending, owned
  ownerPhone: { type: String, default: null },
  ownerName: { type: String, default: null },
  utrNumber: { type: String, default: null },
  boughtAt: { type: Date, default: null },
  batchStatus: { type: String, default: 'POOLED' }, // POOLED, IN_PRODUCTION, SETTLED
  batchProfitShare: { type: Number, default: 0 }
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

const withdrawalSchema = new mongoose.Schema({
  withdrawalId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  customerName: { type: String, required: true },
  amount: { type: Number, required: true },
  withdrawalType: { type: String, default: 'CAPITAL' }, // CAPITAL, PROFIT, FULL
  payoutMethod: { type: String, default: 'BANK' }, // BANK, UPI
  accountHolder: { type: String, default: '' },
  bankName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  ifscCode: { type: String, default: '' },
  upiId: { type: String, default: '' },
  status: { type: String, default: 'Pending' }, // Pending, Approved, Rejected
  transactionRef: { type: String, default: '' },
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null }
});
const WithdrawalRequest = mongoose.model('WithdrawalRequest', withdrawalSchema);

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

    const batchStatusExists = await Config.findOne({ key: 'production_batch_status' });
    if (!batchStatusExists) {
      await Config.create({ key: 'production_batch_status', value: 'POOLED' });
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
// 3. MULTI-PWA ROUTING & SCOPES
// ==========================================

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// 1. Customer Store
app.get(['/', '/app', '/app/', '/store'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

// 2. Rider Portal
app.get(['/rider', '/rider/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'rider.html'));
});
app.get('/manifest-rider.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.sendFile(path.join(__dirname, 'manifest-rider.json'));
});

// 3. Admin Portal
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
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
  } catch (e) { res.json({ success: true, status: 'OPEN' }); }
});

app.post('/api/admin/config/store-status', verifyAdminToken, async (req, res) => {
  try {
    const { status } = req.body;
    await Config.findOneAndUpdate({ key: 'store_status' }, { value: status }, { upsert: true });
    res.json({ success: true, status, message: `Store status changed to ${status}.` });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to update store status.' }); }
});

app.get('/api/config/support-phone', async (req, res) => {
  try {
    const cfg = await Config.findOne({ key: 'support_phone' });
    res.json({ success: true, phone: cfg ? cfg.value : '9123456789' });
  } catch (e) { res.json({ success: true, phone: '9123456789' }); }
});

app.post('/api/admin/config/support-phone', verifyAdminToken, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone required.' });
    await Config.findOneAndUpdate({ key: 'support_phone' }, { value: String(phone).trim() }, { upsert: true });
    res.json({ success: true, message: 'Store helpline number updated.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to update helpline number.' }); }
});

app.get('/api/config/upi', async (req, res) => {
  try {
    const cfg = await Config.findOne({ key: 'upi_id' });
    res.json({ success: true, upiId: cfg ? cfg.value : '2038@upi' });
  } catch (e) { res.json({ success: true, upiId: '2038@upi' }); }
});

app.post('/api/admin/config/upi', verifyAdminToken, async (req, res) => {
  try {
    const { upiId } = req.body;
    if (!upiId) return res.status(400).json({ success: false, message: 'Valid UPI identifier required.' });
    await Config.findOneAndUpdate({ key: 'upi_id' }, { value: upiId.trim() }, { upsert: true });
    res.json({ success: true, message: 'Store UPI configuration updated successfully.' });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed to update store UPI configuration.' }); }
});

// Coupons
app.post('/api/coupons/apply', async (req, res) => {
  try {
    const { code, cartTotal } = req.body;
    const cleanCode = String(code || '').trim().toUpperCase();
    const total = Number(cartTotal) || 0;

    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });
    if (!coupon) return res.status(400).json({ success: false, message: 'Invalid promo code.' });
    if (total < coupon.minOrder) return res.status(400).json({ success: false, message: `Minimum order of ₹${coupon.minOrder} required.` });

    let discount = coupon.type === 'PERCENT' ? Math.round((total * coupon.value) / 100) : coupon.value;
    discount = Math.min(discount, total);
    res.json({ success: true, code: coupon.code, discount, finalAmount: Math.max(0, total - discount) });
  } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/coupons', verifyAdminToken, async (req, res) => {
  try {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/coupons/create', verifyAdminToken, async (req, res) => {
  try {
    const { code, type, value, minOrder } = req.body;
    const cleanCode = String(code || '').trim().toUpperCase();
    const exists = await Coupon.findOne({ code: cleanCode });
    if (exists) return res.status(400).json({ success: false, message: 'Coupon already exists.' });

    const newCoupon = await Coupon.create({ code: cleanCode, type: type || 'FLAT', value: Number(value), minOrder: Number(minOrder) || 0 });
    res.status(201).json({ success: true, coupon: newCoupon });
  } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/coupons/:code', verifyAdminToken, async (req, res) => {
  try {
    await Coupon.findOneAndDelete({ code: req.params.code.toUpperCase() });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false }); }
});

// Admin Auth
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username: String(username).trim() });
    if (!admin || admin.passwordHash !== hashSecret(password)) {
      return res.status(400).json({ success: false, message: 'Invalid admin credentials.' });
    }
    res.json({ success: true, token: `${admin.username}:::${admin.passwordHash}`, username: admin.username });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/change-credentials', verifyAdminToken, async (req, res) => {
  try {
    const { newUsername, newPassword } = req.body;
    req.admin.username = String(newUsername).trim();
    req.admin.passwordHash = hashSecret(newPassword);
    await req.admin.save();
    res.json({ success: true, message: 'Credentials updated.', newToken: `${req.admin.username}:::${req.admin.passwordHash}` });
  } catch (err) { res.status(500).json({ success: false }); }
});

// Rider Auth
app.post('/api/rider/login', async (req, res) => {
  try {
    const { riderId, password } = req.body;
    const rider = await Rider.findOne({ riderId: String(riderId || '').trim() });
    if (!rider || rider.passwordHash !== hashSecret(password)) {
      return res.status(400).json({ success: false, message: 'Invalid Rider credentials.' });
    }
    res.json({ success: true, token: `${rider.riderId}:::${rider.passwordHash}`, rider: { riderId: rider.riderId, name: rider.name } });
  } catch (e) { res.status(500).json({ success: false }); }
});

// ==========================================
// 5. CROWD MANUFACTURING, 50-50 PROFIT & WITHDRAWAL ENGINE
// ==========================================

// Customer Portfolio API (Exact mapping for Total Value, Withdrawable, and 1-Week Holding)
app.get('/api/grid/my-portfolio', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    const boxes = await GridBox.find({ ownerPhone: phone, status: 'owned' }).sort({ boxNumber: 1 });

    const totalInvested = boxes.length * 100;
    const batchCfg = await Config.findOne({ key: 'production_batch_status' });
    const currentBatchStatus = batchCfg ? batchCfg.value : 'POOLED';

    let totalCustomerProfit = 0;
    let earliestPurchase = null;

    boxes.forEach(b => {
      totalCustomerProfit += (b.batchProfitShare || 0);
      if (b.boughtAt) {
        const d = new Date(b.boughtAt);
        if (!earliestPurchase || d < earliestPurchase) {
          earliestPurchase = d;
        }
      }
    });

    // Check past approved withdrawals
    const pastWithdrawals = await WithdrawalRequest.find({ phone, status: 'Approved' });
    let alreadyWithdrawn = 0;
    pastWithdrawals.forEach(w => {
      alreadyWithdrawn += (w.amount || 0);
    });

    // 1-Week (7-Day) Holding Period Calculation
    let daysHeld = 0;
    let isWeekCompleted = false;
    if (earliestPurchase) {
      const diffMs = Date.now() - earliestPurchase.getTime();
      daysHeld = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (daysHeld >= 7) {
        isWeekCompleted = true;
      }
    }

    let isWithdrawable = false;
    let availableProfitBalance = 0;
    let statusMessage = '';

    if (currentBatchStatus === 'POOLED') {
      // Stage 1: Manufacturing shuru nahi hui - Customer ka Capital 100% withdrawable hai
      isWithdrawable = totalInvested > alreadyWithdrawn;
      availableProfitBalance = Math.max(0, totalInvested - alreadyWithdrawn);
      statusMessage = 'Capital Pooled: Product manufacturing not started yet. 100% Refundable anytime.';
    } else if (currentBatchStatus === 'IN_PRODUCTION') {
      // Stage 2: Product manufacturing active - funds locked
      isWithdrawable = false;
      availableProfitBalance = 0;
      statusMessage = 'In Production / Manufacturing Active: Funds actively deployed for product batch. Payout unlocks post-sales.';
    } else if (currentBatchStatus === 'SETTLED') {
      // Stage 3: Product sold - 50-50 profit split + 7-day holding rule
      const fullPortfolioNet = (totalInvested + totalCustomerProfit) - alreadyWithdrawn;
      if (isWeekCompleted) {
        isWithdrawable = fullPortfolioNet > 0;
        availableProfitBalance = Math.max(0, fullPortfolioNet);
        statusMessage = `Batch Settled: 1-Week holding satisfied (${daysHeld} days). Full Capital + 50% Profit Share available!`;
      } else {
        isWithdrawable = false;
        availableProfitBalance = 0;
        statusMessage = `7-Day Profit Lock: ${daysHeld}/7 days completed. Payout unlocks in ${7 - daysHeld} days.`;
      }
    }

    const totalPortfolioValue = Math.max(0, (totalInvested + totalCustomerProfit) - alreadyWithdrawn);

    res.json({
      success: true,
      boxes,
      totalBlocks: boxes.length,
      totalInvested: totalInvested,
      totalDailyYield: '50% Split',
      totalCurrentEarnings: totalCustomerProfit,
      totalPortfolioValue: totalPortfolioValue,
      availableProfitBalance: availableProfitBalance,
      isWithdrawable,
      isWeekCompleted,
      daysHeld,
      batchStatus: currentBatchStatus,
      statusMessage
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      boxes: [],
      totalBlocks: 0,
      totalInvested: 0,
      totalDailyYield: '0',
      totalCurrentEarnings: 0,
      totalPortfolioValue: 0,
      availableProfitBalance: 0
    });
  }
});

// Admin Controls Batch Cycle (Start Production, Settle 50-50 Profit, Reset)
app.post('/api/admin/grid/update-batch-stage', verifyAdminToken, async (req, res) => {
  try {
    const { action, totalBatchProfit } = req.body;

    if (action === 'START_PRODUCTION') {
      await Config.findOneAndUpdate({ key: 'production_batch_status' }, { value: 'IN_PRODUCTION' }, { upsert: true });
      await GridBox.updateMany({ status: 'owned' }, { $set: { batchStatus: 'IN_PRODUCTION' } });
      return res.json({ success: true, message: 'Manufacturing batch started! Investor funds locked in production.' });
    }

    if (action === 'SETTLE_PROFIT') {
      const profitNum = Number(totalBatchProfit) || 0;
      const ownedBoxes = await GridBox.find({ status: 'owned' });
      if (ownedBoxes.length === 0) return res.status(400).json({ success: false, message: 'No active stock holders to share profit.' });

      // 50% Company, 50% Customer Split
      const customerPoolShare = profitNum / 2;
      const profitPerBox = Math.round((customerPoolShare / ownedBoxes.length) * 100) / 100;

      await GridBox.updateMany({ status: 'owned' }, { 
        $set: { 
          batchStatus: 'SETTLED',
          batchProfitShare: profitPerBox
        } 
      });

      await Config.findOneAndUpdate({ key: 'production_batch_status' }, { value: 'SETTLED' }, { upsert: true });

      return res.json({
        success: true,
        message: `Batch settled! Total Profit: ₹${profitNum}. Investor 50% share (₹${profitPerBox}/box) credited.`
      });
    }

    if (action === 'RESET_TO_POOL') {
      await Config.findOneAndUpdate({ key: 'production_batch_status' }, { value: 'POOLED' }, { upsert: true });
      await GridBox.updateMany({ status: 'owned' }, { $set: { batchStatus: 'POOLED', batchProfitShare: 0 } });
      return res.json({ success: true, message: 'Batch reset to Capital Pooled stage.' });
    }

    res.status(400).json({ success: false, message: 'Invalid action command.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to update batch cycle.' });
  }
});

app.get('/api/grid/boxes', async (req, res) => {
  try {
    const boxes = await GridBox.find({}).sort({ boxNumber: 1 });
    const batchCfg = await Config.findOne({ key: 'production_batch_status' });
    res.json({ success: true, total: boxes.length, boxes, currentBatchStatus: batchCfg ? batchCfg.value : 'POOLED' });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/grid/request-buy', async (req, res) => {
  try {
    const { phone, boxNumbers, utrNumber } = req.body;
    const cleanUtr = String(utrNumber || '').trim();

    if (!/^[0-9]{12}$/.test(cleanUtr)) {
      return res.status(400).json({ success: false, message: 'Exact 12-digit numeric UTR required.' });
    }

    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) return res.status(404).json({ success: false, message: 'Customer account not found.' });

    const unavailable = await GridBox.find({ boxNumber: { $in: boxNumbers }, status: { $ne: 'available' } });
    if (unavailable.length > 0) return res.status(400).json({ success: false, message: 'Selected block is unavailable.' });

    await GridBox.updateMany(
      { boxNumber: { $in: boxNumbers } },
      { $set: { status: 'pending', ownerPhone: user.phone, ownerName: user.name, utrNumber: cleanUtr } }
    );

    const requestId = `REQ-${Date.now().toString().slice(-6)}`;
    const newRequest = await GridRequest.create({
      requestId,
      phone: user.phone,
      customerName: user.name,
      boxNumbers,
      totalAmount: boxNumbers.length * 100,
      utrNumber: cleanUtr,
      status: 'Pending'
    });

    res.json({ success: true, message: 'UTR verification request submitted.', request: newRequest });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/grid/requests', verifyAdminToken, async (req, res) => {
  try {
    const requests = await GridRequest.find({}).sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/grid/requests/approve', verifyAdminToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await GridRequest.findOne({ requestId });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    await GridBox.updateMany(
      { boxNumber: { $in: request.boxNumbers } },
      { $set: { status: 'owned', ownerPhone: request.phone, ownerName: request.customerName, utrNumber: request.utrNumber, boughtAt: new Date() } }
    );

    request.status = 'Approved';
    await request.save();
    res.json({ success: true, message: `Request #${requestId} approved.` });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/grid/requests/reject', verifyAdminToken, async (req, res) => {
  try {
    const { requestId } = req.body;
    const request = await GridRequest.findOne({ requestId });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    await GridBox.updateMany(
      { boxNumber: { $in: request.boxNumbers } },
      { $set: { status: 'available', ownerPhone: null, ownerName: null, utrNumber: null, boughtAt: null } }
    );

    request.status = 'Rejected';
    await request.save();
    res.json({ success: true, message: `Request #${requestId} rejected.` });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/grid/revoke-box', verifyAdminToken, async (req, res) => {
  try {
    const { boxNumber } = req.body;
    await GridBox.findOneAndUpdate(
      { boxNumber: Number(boxNumber) },
      { status: 'available', ownerPhone: null, ownerName: null, utrNumber: null, boughtAt: null, batchProfitShare: 0 }
    );
    res.json({ success: true, message: `Block #${boxNumber} revoked.` });
  } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// 6. CUSTOMER WITHDRAWALS & ADMIN PAYOUTS
// ==========================================

app.post('/api/grid/request-withdrawal', async (req, res) => {
  try {
    const { phone, amount, payoutMethod, accountHolder, bankName, accountNumber, ifscCode, upiId } = req.body;
    const numAmount = Number(amount);

    if (!phone || !numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid withdrawal amount is required.' });
    }

    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) return res.status(404).json({ success: false, message: 'Customer account not found.' });

    const batchCfg = await Config.findOne({ key: 'production_batch_status' });
    const currentBatchStatus = batchCfg ? batchCfg.value : 'POOLED';

    if (currentBatchStatus === 'IN_PRODUCTION') {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal currently locked: Batch is currently under production. Payout opens after sales settlement.'
      });
    }

    const withdrawalId = `WTH-${Date.now().toString().slice(-6)}`;
    const newWithdrawal = await WithdrawalRequest.create({
      withdrawalId,
      phone: user.phone,
      customerName: user.name,
      amount: numAmount,
      payoutMethod: payoutMethod || 'BANK',
      accountHolder: accountHolder || '',
      bankName: bankName || '',
      accountNumber: accountNumber || '',
      ifscCode: ifscCode || '',
      upiId: upiId || '',
      status: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted! Admin will verify and transfer funds to your account.',
      withdrawal: newWithdrawal
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Withdrawal request failed.' });
  }
});

app.get('/api/admin/grid/withdrawals', verifyAdminToken, async (req, res) => {
  try {
    const withdrawals = await WithdrawalRequest.find({}).sort({ createdAt: -1 });
    res.json({ success: true, withdrawals });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to retrieve withdrawals.' });
  }
});

app.post('/api/admin/grid/approve-withdrawal', verifyAdminToken, async (req, res) => {
  try {
    const { withdrawalId, transactionRef } = req.body;
    const item = await WithdrawalRequest.findOne({ withdrawalId });
    if (!item) return res.status(404).json({ success: false, message: 'Withdrawal not found.' });

    item.status = 'Approved';
    item.transactionRef = String(transactionRef).trim();
    item.processedAt = new Date();
    await item.save();

    res.json({ success: true, message: `Withdrawal #${withdrawalId} confirmed and marked Paid.` });
  } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/admin/grid/reject-withdrawal', verifyAdminToken, async (req, res) => {
  try {
    const { withdrawalId, reason } = req.body;
    const item = await WithdrawalRequest.findOne({ withdrawalId });
    if (!item) return res.status(404).json({ success: false, message: 'Withdrawal not found.' });

    item.status = 'Rejected';
    item.reason = reason || 'Bank details mismatch';
    item.processedAt = new Date();
    await item.save();

    res.json({ success: true, message: `Withdrawal #${withdrawalId} rejected.` });
  } catch (e) { res.status(500).json({ success: false }); }
});

// Customer Auth APIs
app.post('/api/user/check-phone', async (req, res) => {
  try {
    const user = await User.findOne({ phone: String(req.body.phone).trim() });
    res.json({ success: true, exists: !!user, name: user ? user.name : null });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/user/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    const cleanPhone = String(phone).trim();
    const cleanPin = String(pin).trim();
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) return res.status(400).json({ success: false, message: 'Account not registered.' });
    const targetHash = hashSecret(cleanPin);
    if ((user.pinHash && user.pinHash !== targetHash) && (user.pin && user.pin !== cleanPin)) {
      return res.status(400).json({ success: false, message: 'Invalid mobile or PIN.' });
    }

    res.json({ success: true, user: { userId: user.userId, name: user.name, phone: user.phone, defaultAddress: user.defaultAddress } });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/user/register', async (req, res) => {
  try {
    const { name, phone, pin, recoveryWord, defaultAddress } = req.body;
    const cleanPhone = String(phone).trim();
    const cleanPin = String(pin).trim();
    const cleanRecovery = String(recoveryWord || '').trim();

    if (!name || cleanPhone.length !== 10 || cleanPin.length !== 4 || !cleanRecovery) {
      return res.status(400).json({ success: false, message: 'All registration parameters mandatory.' });
    }

    const userId = `2038-U${Date.now().toString().slice(-5)}`;
    const user = await User.create({
      userId,
      name: name.trim(),
      phone: cleanPhone,
      pinHash: hashSecret(cleanPin),
      recoveryHash: hashSecret(cleanRecovery),
      defaultAddress: defaultAddress || ''
    });

    res.status(201).json({ success: true, user: { userId: user.userId, name: user.name, phone: user.phone, defaultAddress: user.defaultAddress } });
  } catch (err) { res.status(500).json({ success: false, message: 'Registration failed.' }); }
});

app.post('/api/user/reset-pin', async (req, res) => {
  try {
    const { phone, recoveryWord, newPin } = req.body;
    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user || (user.recoveryHash && user.recoveryHash !== hashSecret(recoveryWord))) {
      return res.status(400).json({ success: false, message: 'Incorrect recovery word.' });
    }
    user.pinHash = hashSecret(newPin);
    user.pin = undefined;
    await user.save();
    res.json({ success: true, message: 'PIN reset successfully.' });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/user/update-address', async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ phone: String(req.body.phone).trim() }, { defaultAddress: req.body.address }, { new: true });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false }); }
});

// Pincodes & Products
app.get('/api/pincodes/active', async (req, res) => {
  try {
    const pins = await Pincode.find({});
    res.json({ success: true, pincodes: pins.map(p => p.code) });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/check-pincode', async (req, res) => {
  try {
    const exists = await Pincode.findOne({ code: String(req.body.pincode).trim() });
    res.json({ success: true, serviceable: !!exists });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/pincodes', verifyAdminToken, async (req, res) => {
  try {
    const pins = await Pincode.find({});
    res.json({ success: true, pincodes: pins.map(p => p.code) });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/pincodes/add', verifyAdminToken, async (req, res) => {
  try {
    await Pincode.create({ code: String(req.body.pincode).trim() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/pincodes/:code', verifyAdminToken, async (req, res) => {
  try {
    await Pincode.deleteOne({ code: String(req.params.code).trim() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/products', async (req, res) => {
  try {
    const prods = await Product.find({});
    res.json({ success: true, products: prods.map(p => ({ id: p._id.toString(), name: p.name, category: p.category, price: p.price, stock: p.stock, unit: p.unit, badge: p.badge, image: p.image })) });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/products/add', verifyAdminToken, async (req, res) => {
  try {
    const newProd = await Product.create(req.body);
    res.status(201).json({ success: true, product: newProd });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/products/:id', verifyAdminToken, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// Orders Processing
app.post('/api/orders/place', async (req, res) => {
  try {
    const { customerName, phone, address, pincode, items, paymentMethod, utrNumber, userId, couponCode, discountAmount, latitude, longitude } = req.body;
    let initialOrderStatus = paymentMethod === 'UPI_QR' ? 'Payment Review' : 'Placed';
    let initialPayStatus = paymentMethod === 'UPI_QR' ? 'Pending' : 'Pending (COD)';

    let itemsTotal = 0;
    const enriched = [];
    for (const item of items) {
      const p = await Product.findById(item.productId);
      if (!p || p.stock < (item.quantity || 1)) return res.status(400).json({ success: false, message: 'Insufficient stock.' });
      p.stock -= (item.quantity || 1);
      await p.save();
      itemsTotal += p.price * (item.quantity || 1);
      enriched.push({ productId: p._id.toString(), productName: p.name, unit: p.unit, price: p.price, quantity: item.quantity || 1 });
    }

    const finalBillTotal = Math.max(0, itemsTotal - (Number(discountAmount) || 0));
    const orderId = `2038-${Date.now().toString().slice(-6)}`;
    const newOrder = await Order.create({
      orderId,
      userId: userId || '',
      customerName,
      phone: String(phone).trim(),
      address,
      pincode,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      items: enriched,
      totalAmount: finalBillTotal,
      discountAmount: Number(discountAmount) || 0,
      couponApplied: couponCode || '',
      paymentMethod,
      paymentStatus: initialPayStatus,
      utrNumber: paymentMethod === 'UPI_QR' ? utrNumber : '',
      orderStatus: initialOrderStatus
    });

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/orders/verify-payment', verifyAdminToken, async (req, res) => {
  try {
    const { orderId, action } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ success: false });

    if (action === 'approve') {
      order.paymentStatus = 'Verified';
      order.orderStatus = 'Placed';
    } else {
      order.paymentStatus = 'Failed';
      order.orderStatus = 'Cancelled';
    }
    await order.save();
    res.json({ success: true, message: `Payment ${action}d.` });
  } catch (err) { res.status(500).json({ success: false }); }
});

// Rider APIs
app.get('/api/rider/active-orders', verifyRiderToken, async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: { $in: ['Packed', 'Out for Delivery'] } }).sort({ createdAt: 1 });
    res.json({ success: true, orders });
  } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/rider/history-orders', verifyRiderToken, async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: 'Delivered' }).sort({ deliveredAt: -1 }).limit(50);
    res.json({ success: true, orders });
  } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/rider/update-status', verifyRiderToken, async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const update = { orderStatus: status };
    if (status === 'Delivered') update.deliveredAt = new Date();
    const order = await Order.findOneAndUpdate({ orderId }, update, { new: true });
    res.json({ success: true, order });
  } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/track/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    res.json({ success: !!order, order });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/orders/my-orders', async (req, res) => {
  try {
    const orders = await Order.find({ phone: String(req.query.phone).trim() }).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/api/orders', verifyAdminToken, async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.patch('/api/orders/status', verifyAdminToken, async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const update = { orderStatus: status };
    if (status === 'Delivered') update.deliveredAt = new Date();
    const order = await Order.findOneAndUpdate({ orderId }, update, { new: true });
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/api/orders/:orderId', verifyAdminToken, async (req, res) => {
  try {
    await Order.findOneAndDelete({ orderId: req.params.orderId });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 2038 Production Engine running on port ${PORT}`));