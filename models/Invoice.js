const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  sellerName: { type: String, required: true },
  sellerAddress: { type: String, required: true },
  sellerGSTIN: { type: String, required: true },
  sellerState: { type: String, required: true },

  buyer: {
    name: { type: String, required: true },
    address: { type: String },
    state: { type: String }
  },

  invoiceNo: { type: String, required: true, unique: true },
  invoiceDate: { type: String, required: true },
  deliveryNote: { type: String },
  deliveryNoteDate: { type: String },
  dispatchDocNo: { type: String },
  dispatchedThrough: { type: String },
  destination: { type: String },
  termsOfDelivery: { type: String },
  paymentTerms: { type: String },

  items: [{
    srNo: { type: Number, required: true },
    description: { type: String, required: true },
    bottleType: { type: String, required: true },
    hsnCode: { type: String, required: true },
    quantity: { type: Number, required: true },
    rate: { type: Number, required: true },
    amount: { type: Number, required: true }
  }],

  taxableValue: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  amountInWords: { type: String, required: true },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add a pre-save hook to generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    const lastInvoice = await this.constructor.findOne({}, {}, { sort: { 'createdAt': -1 } });
    const lastNo = lastInvoice ? parseInt(lastInvoice.invoiceNo.replace('BL', '')) || 0 : 0;
    const newNo = lastNo + 1;
    const paddedNo = newNo.toString().padStart(4, '0');
    this.invoiceNo = `BL${paddedNo}`;
    next();
  } catch (err) {
    next(err);
  }
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;