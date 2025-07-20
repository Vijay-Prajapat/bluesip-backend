const mongoose = require('mongoose');


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


const RawMaterial = mongoose.model('RawMaterial', rawMaterialSchema);
const MaterialPurchase = mongoose.model('MaterialPurchase', materialPurchaseSchema);
const MaterialHistory = mongoose.model('MaterialHistory', materialHistorySchema);

module.exports = {
  BottleStock,
  RawMaterial,
  MaterialPurchase,
  MaterialHistory
};