const mongoose = require('mongoose');

const InvoiceHistorySchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  invoiceNo: { type: String, required: true },
  action: { type: String, required: true, enum: ['created', 'updated', 'status_changed', 'deleted'] },
  changes: { type: Object },
  previousStatus: { type: String, enum: ['paid', 'pending', 'partial'] },
  newStatus: { type: String, enum: ['paid', 'pending', 'partial'] },
  notes: String,
  user: { 
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    email: { type: String }
  },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InvoiceHistory', InvoiceHistorySchema);