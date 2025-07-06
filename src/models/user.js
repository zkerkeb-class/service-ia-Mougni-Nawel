const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  firstname: {
    type: String,
    required: true,
    trim: true
  },
  lastname: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    select: false
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  typeAbonnement: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  stripeCustomerId: String,
  subscriptionId: String,
  analysisCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  _id: false
});

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ stripeCustomerId: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);