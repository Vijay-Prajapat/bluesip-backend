const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);


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
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Raw Material History Schema
const rawMaterialHistorySchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterial',
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedByName: {
    type: String,
    required: true
  },
  previousValue: {
    type: Number,
    required: true
  },
  newValue: {
    type: Number,
    required: true
  },
  changeType: {
    type: String,
    enum: ['Stock Update', 'Restock', 'Consumption'],
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });

// Purchase Calendar Schema
const purchaseCalendarSchema = new mongoose.Schema({
  purchaseDate: {
    type: Date,
    required: true
  },
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
  costPerUnit: {
    type: Number,
    required: true,
    min: 0
  },
  totalCost: {
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
  purchasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  purchasedByName: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { timestamps: true });


const RawMaterial = mongoose.model('RawMaterial', rawMaterialSchema);
const RawMaterialHistory = mongoose.model('RawMaterialHistory', rawMaterialHistorySchema);
const PurchaseCalendar = mongoose.model('PurchaseCalendar', purchaseCalendarSchema);

module.exports = {

  RawMaterial,
  RawMaterialHistory,
  PurchaseCalendar
};