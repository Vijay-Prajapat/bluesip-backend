const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  // Seller Information
  sellerName: { type: String, required: true },
  sellerAddress: { type: String, required: true },
  sellerGSTIN: { type: String, required: true },
  sellerState: { type: String, required: true },
  sellerStateCode: { type: String, required: true },
  dealerType: { type: String, default: "Composition Dealer" },

  // Buyer Information
  buyer: {
    name: { type: String, required: true },
    address: { type: String },
    state: { type: String },
    stateCode: { type: String }
  },

  // Invoice Details
  invoiceNo: { type: String, required: true, unique: true },
  invoiceDate: { type: String, required: true },
  deliveryNote: { type: String },
  deliveryNoteDate: { type: String },
  dispatchDocNo: { type: String },
  dispatchedThrough: { type: String },
  destination: { type: String },
  termsOfDelivery: { type: String },
  paymentTerms: { type: String, default: "Prepaid" },

  // Items
  items: [{
    srNo: { type: Number, required: true },
    description: { type: String, required: true },
    bottleType: { 
      type: String,
      enum: ['250 ML', '500 ML', '1L'],
      default: '250 ML'
    },
    hsnCode: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "Case" },
    rate: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 }
  }],

  // Tax Details
  taxableValue: { type: Number, required: true, min: 0 },
  cgstRate: { type: Number, default: 9, min: 0 },
  cgstAmount: { type: Number, required: true, min: 0 },
  sgstRate: { type: Number, default: 9, min: 0 },
  sgstAmount: { type: Number, required: true, min: 0 },
  totalTaxAmount: { type: Number, required: true, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },
  amountInWords: { type: String, required: true },

  // Additional Information
  remarks: { type: String },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

invoiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Invoice", invoiceSchema);