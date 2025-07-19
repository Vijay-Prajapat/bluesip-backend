// models/InvoiceHistory.js
const mongoose = require('mongoose');

const InvoiceHistorySchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  action: { type: String, required: true }, // 'created', 'updated', 'status_changed', etc.
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changes: { type: Object }, // Detailed changes
  previousStatus: String,
  newStatus: String,
  notes: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InvoiceHistory', InvoiceHistorySchema);

