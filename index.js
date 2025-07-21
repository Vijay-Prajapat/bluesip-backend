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


app.get('/api/bottle-stocks', async (req, res) => {
  try {
    const stocks = await BottleStock.find();
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
});

app.post('/api/bottle-stocks', async (req, res) => {
  try {
    const stockData = {
      ...req.body,
      currentStock: Number(req.body.currentStock) || 0,
      minStockLevel: Number(req.body.minStockLevel) || 10,
      sellingPrice: Number(req.body.sellingPrice) || 0
    };

    const stock = new BottleStock(stockData);
    await stock.save();
    res.status(201).json(stock);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = {};
      Object.keys(err.errors).forEach(key => {
        errors[key] = err.errors[key].message;
      });
      return res.status(400).json({ errors });
    }
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/bottle-stocks/:id', async (req, res) => {
  try {
    const updatedStock = await BottleStock.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedStock);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/bottle-stocks/:id', async (req, res) => {
  try {
    const stock = await BottleStock.findByIdAndDelete(req.params.id);
    if (!stock) return res.status(404).json({ error: 'Stock not found' });
    res.json({ message: 'Stock deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Raw Material APIs
app.get('/api/raw-materials', async (req, res) => {
  try {
    const materials = await RawMaterial.find();
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch raw materials' });
  }
});

app.post('/api/raw-materials', async (req, res) => {
  try {
    const material = new RawMaterial(req.body);
    await material.save();
    res.status(201).json(material);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/raw-materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, changeType, notes, userId, userName } = req.body;

    const material = await RawMaterial.findById(id);
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const previousValue = material.currentStock;
    let newValue;

    if (changeType === 'Stock Update') {
      newValue = quantity;
    } else if (changeType === 'Restock') {
      newValue = previousValue + quantity;
    } else if (changeType === 'Consumption') {
      newValue = previousValue - quantity;
      if (newValue < 0) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid change type' });
    }

    material.currentStock = newValue;
    material.lastUpdated = new Date();
    material.updatedBy = userId;
    await material.save();

    // Record history
    const history = new RawMaterialHistory({
      materialId: id,
      changedBy: userId,
      changedByName: userName,
      previousValue,
      newValue,
      changeType,
      notes
    });
    await history.save();

    res.json(material);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/raw-materials/:id/history', async (req, res) => {
  try {
    const history = await RawMaterialHistory.find({ materialId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('changedBy', 'name');
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Purchase Calendar APIs
app.post('/api/purchases', async (req, res) => {
  try {
    const { materialType, quantity, costPerUnit, companyName, purchasedBy, purchasedByName, notes } = req.body;
    
    const purchase = new PurchaseCalendar({
      purchaseDate: new Date(),
      materialType,
      quantity,
      costPerUnit,
      totalCost: quantity * costPerUnit,
      companyName: materialType === 'Company Label' ? companyName : undefined,
      purchasedBy,
      purchasedByName,
      notes
    });
    
    await purchase.save();
    
    // Update raw material stock
    const material = await RawMaterial.findOne({ materialType });
    if (material) {
      material.currentStock += quantity;
      material.lastUpdated = new Date();
      material.updatedBy = purchasedBy;
      await material.save();
      
      // Record history
      const history = new RawMaterialHistory({
        materialId: material._id,
        changedBy: purchasedBy,
        changedByName: purchasedByName,
        previousValue: material.currentStock - quantity,
        newValue: material.currentStock,
        changeType: 'Restock',
        notes: `Purchased ${quantity} units via calendar`
      });
      await history.save();
    }
    
    res.status(201).json(purchase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/purchases', async (req, res) => {
  try {
    const { startDate, endDate, view } = req.query;
    let query = {};
    
    if (startDate && endDate) {
      query.purchaseDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const purchases = await PurchaseCalendar.find(query).sort({ purchaseDate: -1 });
    
    if (view === 'summary') {
      const summary = purchases.reduce((acc, purchase) => {
        if (!acc[purchase.materialType]) {
          acc[purchase.materialType] = {
            totalQuantity: 0,
            totalCost: 0
          };
        }
        acc[purchase.materialType].totalQuantity += purchase.quantity;
        acc[purchase.materialType].totalCost += purchase.totalCost;
        return acc;
      }, {});
      
      res.json({ purchases, summary });
    } else {
      res.json(purchases);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
