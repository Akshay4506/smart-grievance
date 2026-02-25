const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    type: { type: String, enum: ['comment', 'review'], required: true },
    message: { type: String, required: true },
    fromName: { type: String },
    complaintTitle: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
