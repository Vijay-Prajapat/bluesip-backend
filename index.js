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
  MaterialHistory,
  CompanyLabelHistory,
  CompanyLabel 
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
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ 
        success: false,
        message: "All fields are required" 
      });
    }

    // Validate role
    if (!['admin', 'staffhead', 'staff'].includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid role specified" 
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: "Email already in use" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = new User({ 
      name, 
      email, 
      password: hashedPassword,
      role 
    });
    
    await user.save();
    
    res.status(201).json({ 
      success: true,
      message: "User registered successfully"
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
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
    const user = await User.findById(req.params.id).select("name email role");
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

// // Material Purchase APIs
// app.get('/api/material-purchases', authMiddleware, async (req, res) => {
//   try {
//     const { startDate, endDate, view } = req.query;
    
//     let query = {};
//     if (startDate && endDate) {
//       query.purchaseDate = {
//         $gte: new Date(startDate),
//         $lte: new Date(endDate)
//       };
//     }
    
//     if (view === 'summary') {
//       const purchases = await MaterialPurchase.find(query);
      
//       // Calculate summary
//       const summary = {
//         totalPurchases: purchases.length,
//         totalCost: purchases.reduce((sum, p) => sum + p.cost, 0),
//         materials: {}
//       };
      
//       purchases.forEach(purchase => {
//         if (!summary.materials[purchase.materialType]) {
//           summary.materials[purchase.materialType] = {
//             count: 0,
//             quantity: 0,
//             cost: 0
//           };
//         }
        
//         summary.materials[purchase.materialType].count += 1;
//         summary.materials[purchase.materialType].quantity += purchase.quantity;
//         summary.materials[purchase.materialType].cost += purchase.cost;
//       });
      
//       return res.json({ purchases, summary });
//     }
    
//     const purchases = await MaterialPurchase.find(query).sort({ purchaseDate: -1 });
//     res.json({ purchases });
//   } catch (error) {
//     handleError(res, error, 'Failed to fetch material purchases');
//   }
// });

// Material Purchase APIs
app.get('/api/material-purchases', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, view } = req.query;
    
    let query = {};
    
 if (startDate && endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // include the whole end day

  query.purchaseDate = {
    $gte: start,
    $lte: end
  };
} else {
      console.log("No date filter applied. Fetching all data.");
    }

    // Handle summary view
    if (view === 'summary') {
      const purchases = await MaterialPurchase.find(query);
      
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

    // Return all purchases (normal list)
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

    const { materialType, quantity, notes = 'Material purchased' } = req.body;

    const updateQuery = {
      materialType,
      ...(materialType === 'Company Label' ? { companyName: req.body.companyName } : {})
    };

    const existingMaterial = await RawMaterial.findOne(updateQuery);

    let previousValue = 0;
    if (existingMaterial) {
      previousValue = existingMaterial.currentStock;
    }

    // Create history record before updating stock
    await MaterialHistory.create({
      materialId: existingMaterial?._id,
      changedBy: req.user.name,
      previousValue,
      newValue: previousValue + quantity,
      notes
    });

    const updateData = {
      $inc: { currentStock: quantity },
      $setOnInsert: {
        costPerUnit: 0,
        unit: 'pieces',
        minStockLevel: 500,
        lastUpdatedBy: req.user.name
      }
    };

    await RawMaterial.findOneAndUpdate(updateQuery, updateData, { new: true, upsert: true });

    res.status(201).json(newPurchase);
  } catch (error) {
    console.error(error);
    handleError(res, error, 'Failed to record material purchase');
  }
});



// Returns the 50 most recent material updates
app.get('/api/material-history/recent', authMiddleware, async (req, res) => {
  try {
    const updates = await MaterialHistory.find()
      .sort({ changeDate: -1 })
      .limit(50)
      .populate('materialId', 'materialType companyName');
    
    // Format the response to include material type and company name
    const formattedUpdates = updates.map(update => ({
      ...update.toObject(),
      materialType: update.materialId.materialType,
      companyName: update.materialId.companyName
    }));

    res.json(formattedUpdates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch recent updates' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

/**************comapny label*************** */


const createLabelHistory = async (labelId, action, userName, stockData = {}) => {
  try {
    await CompanyLabelHistory.create({
      labelId,
      action,
      userName,
      ...stockData
    });
  } catch (error) {
    console.error('Failed to create label history:', error);
  }
};

// GET all labels with filtering
app.get('/api/company-labels', authMiddleware, async (req, res) => {
  try {
    const { search, stockFilter } = req.query;
    let query = {};

    if (search) {
      query.labelName = { $regex: search, $options: 'i' };
    }

    if (stockFilter) {
      switch (stockFilter) {
        case 'low':
          query.$expr = { $lt: ['$stock', '$minStockLevel'] };
          break;
        case 'out':
          query.stock = 0;
          break;
        case 'healthy':
          query.$expr = { $gte: ['$stock', '$minStockLevel'] };
          break;
      }
    }

    const labels = await CompanyLabel.find(query).sort({ createdAt: -1 });
    res.json(labels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

// POST create new label
app.post('/api/company-labels', authMiddleware, async (req, res) => {
  try {
    const { labelName, stock, minStockLevel } = req.body;
    
    const newLabel = await CompanyLabel.create({
      labelName,
      stock: stock || 0,
      minStockLevel: minStockLevel || 100,
      lastUpdatedBy: req.user.name
    });

    await createLabelHistory(
      newLabel._id,
      'create',
      req.user.name,
      {
        previousStock: 0,
        newStock: stock || 0
      }
    );

    res.status(201).json(newLabel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT update label
app.put('/api/company-labels/:id', authMiddleware, async (req, res) => {
  try {
    const { labelName, stock, minStockLevel } = req.body;
    const oldLabel = await CompanyLabel.findById(req.params.id);

    if (!oldLabel) {
      return res.status(404).json({ error: 'Label not found' });
    }

    const updatedLabel = await CompanyLabel.findByIdAndUpdate(
      req.params.id,
      {
        labelName,
        stock,
        minStockLevel,
        lastUpdatedBy: req.user.name
      },
      { new: true }
    );

    await createLabelHistory(
      updatedLabel._id,
      'update',
      req.user.name,
      {
        previousStock: oldLabel.stock,
        newStock: stock
      }
    );

    res.json(updatedLabel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE label
app.delete('/api/company-labels/:id', authMiddleware, async (req, res) => {
  try {
    const label = await CompanyLabel.findByIdAndDelete(req.params.id);

    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }

    await createLabelHistory(
      req.params.id,
      'delete',
      req.user.name,
      {
        previousStock: label.stock,
        newStock: 0
      }
    );

    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET label history
app.get('/api/company-labels/:id/history', authMiddleware, async (req, res) => {
  try {
    const history = await CompanyLabelHistory.find({ labelId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(history.map(record => ({
      ...record.toObject(),
      stockChange: record.newStock - record.previousStock
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch label history' });
  }
});

/*****************************Register user */
// Get all users (admin only)
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await User.find({}, '-password -__v');
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Register new user (admin only)
app.post('/api/register', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role
    });

    await newUser.save();

    // Return user without password
    const userToReturn = newUser.toObject();
    delete userToReturn.password;
    delete userToReturn.__v;

    res.status(201).json({ 
      message: 'User registered successfully',
      user: userToReturn
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});
// Update user (admin only)
app.put('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, email, role } = req.body;

    // Validate input
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user
    user.name = name;
    user.email = email;
    user.role = role;

    await user.save();

    // Return updated user without password
    const userToReturn = user.toObject();
    delete userToReturn.password;
    delete userToReturn.__v;

    res.json({ 
      message: 'User updated successfully',
      user: userToReturn
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Change user password (admin only)
app.put('/api/users/:id/password', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    // Validate input
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Prevent deletion of self
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deletion of other admins
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin accounts' });
    }

    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    // res.status(500).json({ error: 'Deletion failed' });
  }
});


/************************************Calendar *******************/

// In your invoice routes file
app.get('/calendar', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Convert DD-MM-YYYY to Date objects for comparison
    const parseCustomDate = (dateStr) => {
      const [day, month, year] = dateStr.split('-');
      return new Date(`${year}-${month}-${day}`);
    };

    const start = parseCustomDate(startDate);
    const end = parseCustomDate(endDate);

    const invoices = await Invoice.find({
      $expr: {
        $and: [
          { $gte: [{ $toDate: { $dateFromString: { dateString: "$invoiceDate", format: "%d-%m-%Y" } } }, start] },
          { $lte: [{ $toDate: { $dateFromString: { dateString: "$invoiceDate", format: "%d-%m-%Y" } } }, end] }
        ]
      }
    }).lean();
    // Calculate summary
    const summary = {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
      paidAmount: invoices.filter(i => i.invoiceStatus === 'paid')
                         .reduce((sum, inv) => sum + inv.grandTotal, 0),
      pendingAmount: invoices.filter(i => i.invoiceStatus === 'pending')
                           .reduce((sum, inv) => sum + inv.grandTotal, 0),
      statusCounts: invoices.reduce((acc, inv) => {
        const status = inv.invoiceStatus;
        if (!acc[status]) {
          acc[status] = { count: 0, amount: 0 };
        }
        acc[status].count += 1;
        acc[status].amount += inv.grandTotal;
        return acc;
      }, {})
    };

    res.json({ invoices, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
