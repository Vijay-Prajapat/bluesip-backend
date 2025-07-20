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