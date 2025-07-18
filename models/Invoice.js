const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  // Agency Information
  agencyName: { type: String, required: true },
  agencyAddress: { type: String, required: true },
  agencyPhone: { type: String, required: true },
  agencyEmail: { type: String, required: true },
  agencyGSTIN: { type: String, required: true },

  // Customer Information (now as an object)
  customer: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String },
    gst: { type: String }
  },

  // Invoice Details
  invoiceNo: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  dueDate: { type: String, required: true },
  salesman: { type: String },

  // Items - Updated for water technology products
items: [{
  sn: { type: Number, required: true },
  description: { type: String, required: true },
  bottleSize: { 
    type: String, 
    enum: ['500ml', '1L'], 
    required: true,
    default: '1L'
  },
  hsn: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  sgst: { type: Number, default: 9 },
  cgst: { type: Number, default: 9 },
  amount: { type: Number, required: true }
}],
  // Bank Details
  bankDetails: {
    bankName: { type: String, required: true },
    accountNo: { type: String, required: true },
    ifsc: { type: String, required: true },
    branch: { type: String }
  },

  // Totals
  totalAmount: { type: Number, required: true, min: 0 },
  totalSGST: { type: Number, required: true, min: 0 },
  totalCGST: { type: Number, required: true, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid'],
    default: 'Pending'
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp before saving
invoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add index for faster queries
invoiceSchema.index({ invoiceNo: 1 });
invoiceSchema.index({ 'customer.name': 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);