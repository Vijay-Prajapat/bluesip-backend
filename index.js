const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();
require("dotenv").config({ path: "../.env" });
const User = require("./models/User");
const Invoice = require("./models/Invoice");
const InvoiceHistory = require('./models/InvoiceHistory');
const BottleStock  = require('./models/BottleStock'); 
const {  
  RawMaterial, 
  MaterialPurchase, 
  MaterialHistory 
} = require('./models/Schemas');

const PORT = process.env.PORT||5000;
// 
const app = express();

mongoose.connect(process.env.MONGO_URI);



const allowedOrigins = [
  "http://localhost:3000",
  "https://bluesip.netlify.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // for legacy browsers
};

app.use(cors(corsOptions));



app.use(express.json());
app.use(session({ secret: "invoice_secret", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    const user = await User.findOne({ email });
    if (!user || !user.password) return done(null, false);
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? done(null, user) : done(null, false);
  })
);

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: "/auth/google/callback",
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       const user = await User.findOneAndUpdate(
//         { googleId: profile.id },
//         { name: profile.displayName, email: profile.emails[0].value },
//         { upsert: true, new: true }
//       );
//       done(null, user);
//     }
//   )
// );

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id, (err, user) => done(err, user)));

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword });
  await user.save();
  res.send({ success: true });
});

// app.post("/login", passport.authenticate("local"), (req, res) => {
//   const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });
//   res.send({ token });
// });

app.post("/login", passport.authenticate("local", { session: false }), (req, res) => {
  const token = jwt.sign(
    { 
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );

  res.send({ token });
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.redirect(`http://localhost:3000/dashboard?token=${token}`);
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name email");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});


app.post("/api/invoice", async (req, res) => {
  const invoice = new Invoice(req.body);
  await invoice.save();
  await InvoiceHistory.create({
      invoiceId: invoice._id,
      invoiceNo: invoice.invoiceNo,
      action: 'created',
      newStatus: invoice.invoiceStatus,
      notes: 'Invoice created',
      timestamp: new Date()
    });
  
  res.send(invoice);
});



app.get("/api/invoices", async (req, res) => {
  const invoices = await Invoice.find();
  res.send(invoices);
});


// app.get('/api/bottle-stocks', async (req, res) => {
//   try {
//     const stocks = await BottleStock.find();
//     res.json(stocks);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch stocks' });
//   }
// });
// // Remove the duplicate route and keep only this one:
// app.post('/api/StockCreate', async (req, res) => {
//   try {
//     // Add default values if needed
//     const stockData = {
//       ...req.body,
//       currentStock: Number(req.body.currentStock) || 0,
//       minStockLevel: Number(req.body.minStockLevel) || 10,
//       sellingPrice: Number(req.body.sellingPrice) || 0
//     };

//     const stock = new BottleStock(stockData);
//     await stock.save();
//     res.status(201).json(stock);
//   } catch (err) {
//     console.error('Error details:', err);
//     if (err.name === 'ValidationError') {
//       const errors = {};
//       Object.keys(err.errors).forEach(key => {
//         errors[key] = err.errors[key].message;
//       });
//       return res.status(400).json({ errors });
//     }
//     res.status(400).json({ 
//       error: err.message,
//       stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
//     });
//   }
// });


// app.post('/api/StockRestock/:id/restock', async (req, res) => {
//   try {
//     const stock = await BottleStock.findById(req.params.id);
//     if (!stock) return res.status(404).json({ error: 'Stock not found' });

//     const { quantity } = req.body;
//     if (!quantity || quantity <= 0) {
//       return res.status(400).json({ error: 'Invalid quantity' });
//     }

//     stock.currentStock += quantity;
//     stock.lastRestockDate = new Date();
//     await stock.save();

//     res.json(stock);
//   } catch (err) {
//     res.status(500).json({ error: 'Restock failed' });
//   }
// });
// app.put('/api/StockUpdate/:id', async (req, res) => {
//   try {
//     const updatedStock = await BottleStock.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );
//     res.json(updatedStock);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// app.delete('/api/StockDelete/:id', async (req, res) => {
//   try {
//     const stock = await BottleStock.findByIdAndDelete(req.params.id);
//     if (!stock) return res.status(404).json({ error: 'Stock not found' });
//     res.json({ message: 'Stock deleted' });
//   } catch (err) {
//     res.status(500).json({ error: 'Delete failed' });
//   }
// });


app.get('/invoices/calendar', async (req, res) => {
  try {
    const { startDate, endDate, viewType } = req.query;
    
    // Validate query parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Query invoices within the date range
    const invoices = await Invoice.find({
      createdAt: {
        $gte: start,
        $lte: end
      }
    }).sort({ createdAt: 1 });

    // Format response
    const formattedData = invoices.map(invoice => ({
      id: invoice._id,
      title: `Sale: ₹${invoice.grandTotal}`,
      date: invoice.createdAt,
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.qty,
        amount: item.amount
      })),
      totalAmount: invoice.totalAmount,
      grandTotal: invoice.grandTotal,
      paymentStatus: invoice.paymentStatus,
      customer: invoice.customer.name
    }));

    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get("/GetInvoices", async(req,res)=>{
  const invoices = await Invoice.find();
  return res.json(invoices);
})


app.get('/api/invoices/last', async (req, res) => {
  try {
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    res.json(lastInvoice ? { invoiceNo: lastInvoice.invoiceNo } : null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/***************Invoices*********************/

app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching invoices' });
  }
});

// In your backend (server.js or wherever your routes are defined)
// Add this middleware to verify JWT and attach user to request
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('_id name email');
    } catch (err) {
      console.error('Token verification failed:', err);
    }
  }
  next();
});

// Update the PUT /api/invoices/:id endpoint
app.put('/api/invoices/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { invoiceStatus, paymentDate, notes } = req.body;
    const oldInvoice = await Invoice.findById(req.params.id);

    if (!oldInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        invoiceStatus,
        paymentDate,
        notes,
        updatedAt: new Date(),
        updatedBy: req.user._id
      },
      { new: true }
    );

    // Record history
    const changes = {};
    if (oldInvoice.invoiceStatus !== invoiceStatus) {
      changes.status = { from: oldInvoice.invoiceStatus, to: invoiceStatus };
    }
    if (oldInvoice.notes !== notes) {
      changes.notes = { from: oldInvoice.notes, to: notes };
    }

    if (Object.keys(changes).length > 0) {
      await InvoiceHistory.create({
        invoiceId: req.params.id,
        invoiceNo: oldInvoice.invoiceNo,
        action: changes.status ? 'status_changed' : 'updated',
        changes,
        previousStatus: oldInvoice.invoiceStatus,
        newStatus: invoiceStatus,
        notes: notes || 'Invoice updated',
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email
        },
        timestamp: new Date()
      });
    }

    res.json(updatedInvoice);
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({ message: 'Error updating invoice' });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    await InvoiceHistory.create({
      invoiceId: req.params.id,
      invoiceNo: invoice.invoiceNo,
      action: 'deleted',
      previousStatus: invoice.invoiceStatus,
      notes: 'Invoice deleted',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      },
      timestamp: new Date()
    });

    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting invoice' });
  }
});



app.post('/api/invoices/:id/history', async (req, res) => {
  try {
    const { action, notes } = req.body;

    await InvoiceHistory.create({
      invoiceId: req.params.id,
      action,
      notes,
      timestamp: new Date()
    });

    res.json({ message: 'History entry recorded' });
  } catch (err) {
    res.status(500).json({ message: 'Error recording history' });
  }
});



// GET /api/invoice-history/:invoiceNo - Get invoice history
app.get('/api/invoice-history/:invoiceNo', async (req, res) => {
  try {
    const history = await InvoiceHistory.find({ invoiceNo: req.params.invoiceNo })
      .sort({ timestamp: -1 })
      .populate('user.id', 'name email'); // Populate user details if needed
    
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching invoice history' });
  }
});

/**************************Stock-Management*********************/
// Bottle Stock APIs

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Authentication Middleware
const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      name: decoded.name || 'System'
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper function for error handling
const handleError = (res, error, defaultMessage = 'An error occurred') => {
  console.error(error);
  res.status(500).json({ 
    error: error.message || defaultMessage,
    ...(error.errors && { errors: error.errors }) 
  });
};

// Bottle Stock APIs
app.get('/api/bottle-stocks', authMiddleware, async (req, res) => {
  try {
    const stocks = await BottleStock.find().sort({ createdAt: -1 });
    res.json(stocks);
  } catch (error) {
    handleError(res, error, 'Failed to fetch bottle stocks');
  }
});

app.post('/api/bottle-stocks/create', authMiddleware, async (req, res) => {
  try {
    const stockData = {
      ...req.body,
      createdBy: req.user.name
    };
    const newStock = await BottleStock.create(stockData);
    res.status(201).json(newStock);
  } catch (error) {
    handleError(res, error, 'Failed to create bottle stock');
  }
});

app.put('/api/bottle-stocks/:id', authMiddleware, async (req, res) => {
  try {
    const updatedStock = await BottleStock.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        updatedBy: req.user.name
      },
      { new: true, runValidators: true }
    );
    if (!updatedStock) {
      return res.status(404).json({ error: 'Bottle stock not found' });
    }
    res.json(updatedStock);
  } catch (error) {
    handleError(res, error, 'Failed to update bottle stock');
  }
});

app.delete('/api/bottle-stocks/:id', authMiddleware, async (req, res) => {
  try {
    const deletedStock = await BottleStock.findByIdAndDelete(req.params.id);
    if (!deletedStock) {
      return res.status(404).json({ error: 'Bottle stock not found' });
    }
    res.json({ message: 'Bottle stock deleted successfully' });
  } catch (error) {
    handleError(res, error, 'Failed to delete bottle stock');
  }
});

// Raw Material APIs
app.get('/api/raw-materials', authMiddleware, async (req, res) => {
  try {
    const materials = await RawMaterial.find().sort({ materialType: 1 });
    res.json(materials);
  } catch (error) {
    handleError(res, error, 'Failed to fetch raw materials');
  }
});

app.put('/api/raw-materials/:id', authMiddleware, async (req, res) => {
  try {
    const { currentStock, notes } = req.body;

    const material = await RawMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: 'Raw material not found' });
    }

    // Create history record before updating
    await MaterialHistory.create({
      materialId: req.params.id,
      changedBy: req.user.name,
      previousValue: material.currentStock,
      newValue: currentStock,
      notes: notes || 'Stock updated'
    });

    const updatedMaterial = await RawMaterial.findByIdAndUpdate(
      req.params.id,
      {
        currentStock,
        notes,
        lastUpdatedBy: req.user.name
      },
      { new: true, runValidators: true }
    );

    res.json(updatedMaterial);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/raw-materials/:id/history', authMiddleware, async (req, res) => {
  try {
    const history = await MaterialHistory.find({ materialId: req.params.id })
      .sort({ changeDate: -1 })
      .limit(50);
    res.json(history);
  } catch (error) {
    handleError(res, error, 'Failed to fetch material history');
  }
});

// Material Purchase APIs
app.get('/api/material-purchases', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, view } = req.query;
    
    let query = {};
    if (startDate && endDate) {
      query.purchaseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (view === 'summary') {
      const purchases = await MaterialPurchase.find(query);
      
      // Calculate summary
      const summary = {
        totalPurchases: purchases.length,
        totalCost: purchases.reduce((sum, p) => sum + p.cost, 0),
        materials: {}
      };
      
      purchases.forEach(purchase => {
        if (!summary.materials[purchase.materialType]) {
          summary.materials[purchase.materialType] = {
            count: 0,
            quantity: 0,
            cost: 0
          };
        }
        
        summary.materials[purchase.materialType].count += 1;
        summary.materials[purchase.materialType].quantity += purchase.quantity;
        summary.materials[purchase.materialType].cost += purchase.cost;
      });
      
      return res.json({ purchases, summary });
    }
    
    const purchases = await MaterialPurchase.find(query).sort({ purchaseDate: -1 });
    res.json({ purchases });
  } catch (error) {
    handleError(res, error, 'Failed to fetch material purchases');
  }
});

app.post('/api/material-purchases', authMiddleware, async (req, res) => {
  try {
    const purchaseData = {
      ...req.body,
      purchasedBy: req.user.name
    };
    
    const newPurchase = await MaterialPurchase.create(purchaseData);
    
    // Update the raw material stock
    const materialType = req.body.materialType;
    const quantity = req.body.quantity;
    
    await RawMaterial.findOneAndUpdate(
      { materialType, ...(materialType === 'Company Label' ? { companyName: req.body.companyName } : {}) },
      { $inc: { currentStock: quantity } },
      { new: true }
    );
    
    res.status(201).json(newPurchase);
  } catch (error) {
    handleError(res, error, 'Failed to record material purchase');
  }
});
/* 1. Top-50 recent purchases (new) */
app.get('/api/material-purchases/recent', authMiddleware, async (req, res) => {
  try {
    const purchases = await MaterialPurchase.find()
      .sort({ purchaseDate: -1 })
      .limit(50);
    res.json(purchases);
  } catch (err) {
    handleError(res, err, 'Failed to fetch recent purchases');
  }
});

/* 2. Transport-expense CRUD */
app.get('/api/transport-expenses', authMiddleware, async (req, res) => {
  try {
    const expenses = await TransportExpense.find()
      .sort({ expenseDate: -1 })
      .limit(50);
    res.json(expenses);
  } catch (err) {
    handleError(res, err, 'Failed to fetch transport expenses');
  }
});

app.post('/api/transport-expenses', authMiddleware, async (req, res) => {
  try {
    const expense = await TransportExpense.create({
      ...req.body,
      recordedBy: req.user.name
    });
    res.status(201).json(expense);
  } catch (err) {
    handleError(res, err, 'Failed to record transport expense');
  }
// });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
