const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['citizen', 'official'], default: 'citizen' },
    phone: { type: String, unique: true, sparse: true },
    
    // Official role specifics
    cadre: { 
        type: String, 
        enum: ['state', 'district', 'mandal', 'village', 'ward'] 
    },
    jurisdiction: {
        state: { type: String },
        district: { type: String },
        mandal: { type: String },
        village: { type: String },
        ward: { type: String }
    },
    locationHash: { type: String, index: true }
}, { timestamps: true });

// Optimize lookups during complaint routing
userSchema.index({ cadre: 1 });
userSchema.index({ 'jurisdiction.state': 1, 'jurisdiction.district': 1, 'jurisdiction.mandal': 1, 'jurisdiction.village': 1, 'jurisdiction.ward': 1 });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
