const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    middleName: { type: String, required: true },
    lastName: { type: String, required: true },
    fatherOrHusbandName: { type: String },
    mobileNumber: { type: String, required: true },
    email: { type: String },
    gender: { type: String, required: true },
    dob: { type: Date, required: true },
    caste: { type: String, required: true },
    income: { type: Number, required: true },
    aadharNumber: { type: String, required: true },
    panNumber: { type: String, required: true },
    password: { type: String, required: true, minlength: 6 }, // ✅ New password field
    address: {
        state: { type: String, required: true },
        district: { type: String, required: true },
        pincode: { type: String, required: true },
        addressLine: { type: String, required: true }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
