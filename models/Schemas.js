const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Bottle Stock Schema
const bottleStockSchema = new mongoose.Schema({
  organization: { 
    type: String, 
    required: [true, 'Organization is required'],
    trim: true,
    maxlength: [100, 'Organization name cannot exceed 100 characters']
  },
  size: { 
    type: String, 
    required: [true, 'Bottle size is required'],
    enum: {
      values: ['500ml', '1L'],
      message: 'Please select either 500ml or 1L'
    }
  },
  currentStock: { 
    type: Number, 
    required: [true, 'Current stock is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  minStockLevel: { 
    type: Number, 
    required: [true, 'Minimum stock level is required'],
    min: [1, 'Minimum stock level must be at least 1'],
    default: 10
  },
  lastRestockDate: { type: Date },
  nextRestockDate: { type: Date },
  sellingPrice: { 
    type: Number, 
    required: [true, 'Selling price is required'],
    min: [0, 'Price cannot be negative']
  },
  supplier: { 
    type: String, 
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters']
  },
  notes: { 
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

bottleStockSchema.plugin(AutoIncrement, {
  id: 'batch_seq',
  inc_field: 'batchNumber',
  start_seq: 1000,
  prefix: 'BATCH-'
});

// Raw Material Schema
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
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Material Purchase Schema
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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
});

// Material Update History Schema
const materialHistorySchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'RawMaterial'
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
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

const BottleStock = mongoose.model('BottleStock', bottleStockSchema);
const RawMaterial = mongoose.model('RawMaterial', rawMaterialSchema);
const MaterialPurchase = mongoose.model('MaterialPurchase', materialPurchaseSchema);
const MaterialHistory = mongoose.model('MaterialHistory', materialHistorySchema);

module.exports = {
  BottleStock,
  RawMaterial,
  MaterialPurchase,
  MaterialHistory
};