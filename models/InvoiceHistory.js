const invoiceHistorySchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  action: { type: String, required: true, enum: ['created', 'updated', 'status_changed', 'deleted'] },
  changes: { type: Object },
  previousStatus: { type: String, enum: ['paid', 'pending', 'partial'] },
  newStatus: { type: String, enum: ['paid', 'pending', 'partial'] },
  notes: String,
  timestamp: { type: Date, default: Date.now }
});
