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

app.post("/login", passport.authenticate("local"), (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "24h" });
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
// Get all bottle stocks
app.get('/api/bottle-stocks', async (req, res) => {
  try {
    const stocks = await BottleStock.find()
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

// Create new bottle stock
app.post('/api/bottle-stocks/create', async (req, res) => {
  try {
    const stock = new BottleStock({
      ...req.body,
      createdBy: req.user?._id // Add if using authentication
    });
    await stock.save();
    res.status(201).json(stock);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update bottle stock
app.put('/api/bottle-stocks/:id', async (req, res) => {
  try {
    const updatedStock = await BottleStock.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.user?._id // Add if using authentication
      },
      { new: true }
    );
    res.json(updatedStock);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete bottle stock
app.delete('/api/bottle-stocks/:id', async (req, res) => {
  try {
    await BottleStock.findByIdAndDelete(req.params.id);
    res.json({ message: 'Stock deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});
// Get all raw materials
app.get('/api/raw-materials', async (req, res) => {
  try {
    const materials = await RawMaterial.find()
      .populate('lastUpdatedBy', 'name email');
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// Update raw material
app.put('/api/raw-materials/:id', async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id);
    
    // Record history
    const history = new MaterialHistory({
      materialId: material._id,
      changedBy: req.user?._id,
      previousValue: material.currentStock,
      newValue: req.body.currentStock,
      notes: req.body.notes || 'Stock updated'
    });
    await history.save();

    // Update material
    const updatedMaterial = await RawMaterial.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        lastUpdatedBy: req.user?._id
      },
      { new: true }
    );
    
    res.json(updatedMaterial);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update material' });
  }
});

// Get material history
app.get('/api/raw-materials/:materialId/history', async (req, res) => {
  try {
    const history = await MaterialHistory.find({ 
      materialId: req.params.materialId 
    })
      .populate('changedBy', 'name email')
      .sort({ changeDate: -1 });
    
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});
// Create new purchase
app.post('/api/material-purchases', async (req, res) => {
  try {
    const purchase = new MaterialPurchase({
      ...req.body,
      purchasedBy: req.user?._id
    });
    await purchase.save();

    // Update material stock
    const material = await RawMaterial.findOne({ 
      materialType: req.body.materialType 
    });
    if (material) {
      material.currentStock += req.body.quantity;
      material.lastUpdatedBy = req.user?._id;
      await material.save();
    }
    
    res.status(201).json(purchase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get purchases with date filtering
app.get('/api/material-purchases', async (req, res) => {
  try {
    let query = {};
    
    if (req.query.startDate && req.query.endDate) {
      query.purchaseDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    const purchases = await MaterialPurchase.find(query)
      .populate('purchasedBy', 'name')
      .sort({ purchaseDate: -1 });
    
    res.json(purchases);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
