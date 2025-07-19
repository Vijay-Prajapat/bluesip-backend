const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  // Seller Information
  sellerName: { type: String, required: true },
  sellerAddress: { type: String, required: true },
  sellerGSTIN: { type: String, required: true },
  sellerState: { type: String, required: true },
  sellerStateCode: { type: String, required: true },

  // Buyer Information
  buyerName: { type: String, required: true },
  buyerAddress: { type: String, required: true },
  buyerGSTIN: { type: String },
  buyerState: { type: String },
  buyerStateCode: { type: String },

  // Invoice Details
  invoiceNo: { type: String, required: true, unique: true },
  invoiceDate: { type: String, required: true },
  deliveryNote: { type: String },
  deliveryNoteDate: { type: String },
  dispatchDocNo: { type: String },
  dispatchedThrough: { type: String },
  destination: { type: String },
  termsOfDelivery: { type: String },
  paymentTerms: { type: String },

  // Items
  items: [{
    srNo: { type: Number, required: true },
    description: { type: String, required: true },
    hsnCode: { type: String, required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],

  // Tax Details
  taxableValue: { type: Number, required: true },
  cgstRate: { type: Number, required: true },
  cgstAmount: { type: Number, required: true },
  sgstRate: { type: Number, required: true },
  sgstAmount: { type: Number, required: true },
  totalTaxAmount: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  amountInWords: { type: String, required: true },

  // Additional Information
  remarks: { type: String },
  ewayBillNo: { type: String },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

invoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

invoiceSchema.index({ invoiceNo: 1 });
invoiceSchema.index({ 'buyerName': 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);