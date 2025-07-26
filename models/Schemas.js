const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
  materialType: {
    type: String,
    required: true,
    enum: ['PET Bottle', 'Cap White', 'Cap Black', 'Shrink Roll', 'Company Label']
  },
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minStockLevel: {
    type: Number,
    required: true,
    min: 1,
    default: 500
  },
  unit: {
    type: String,
    required: true,
    default: 'pieces'
  },
  costPerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  companyName: {
    type: String,
    required: function() {
      return this.materialType === 'Company Label';
    },
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  lastUpdatedBy: {
    type: String,
    required: true
  }
}, { timestamps: true });

const materialPurchaseSchema = new mongoose.Schema({
  materialType: {
    type: String,
    required: true,
    enum: ['PET Bottle', 'Cap White', 'Cap Black', 'Shrink Roll', 'Company Label']
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  supplier: {
    type: String,
    trim: true
  },
  companyName: {
    type: String,
    required: function() {
      return this.materialType === 'Company Label';
    },
    trim: true
  },
  purchasedBy: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
});

const materialHistorySchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'RawMaterial'
  },
  changedBy: {
    type: String,
    required: true
  },
  changeDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  previousValue: {
    type: Number,
    required: true
  },
  newValue: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
});
const transportExpenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0 },
  expenseDate: { type: Date, required: true, default: Date.now },
  description: { type: String, required: true },
  notes: String,
  recordedBy: String,
  createdAt: { type: Date, default: Date.now }
});


const companyLabelHistorySchema = new mongoose.Schema({
  labelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompanyLabel',
    required: true
  },
  action: {
    type: String,
    enum: ['create', 'update', 'delete'],
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  previousStock: Number,
  newStock: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const companyLabelSchema = new mongoose.Schema({
  labelName: {
    type: String,
    required: true,
    unique: true
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  minStockLevel: {
    type: Number,
    default: 100,
    min: 0
  },
  lastUpdatedBy: {
    type: String,
    required: true
  }
}, { timestamps: true });

const CompanyLabel = mongoose.model('CompanyLabel', companyLabelSchema);
const CompanyLabelHistory = mongoose.model('CompanyLabelHistory', companyLabelHistorySchema);
const RawMaterial = mongoose.model('RawMaterial', rawMaterialSchema);
const MaterialPurchase = mongoose.model('MaterialPurchase', materialPurchaseSchema);
const MaterialHistory = mongoose.model('MaterialHistory', materialHistorySchema);
const  TransportExpense=  mongoose.model('TransportExpense', transportExpenseSchema);
module.exports = {
  RawMaterial,
  MaterialPurchase,
  MaterialHistory,
  TransportExpense,
  CompanyLabelHistory,
  CompanyLabel
  

};