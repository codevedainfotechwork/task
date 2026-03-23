const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee' },
  department: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret.password;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret.password;
      return ret;
    }
  }
});

// For compatibility with existing route logic that expects certain static methods
userSchema.statics.updateById = function(id, updates) {
  return this.findByIdAndUpdate(id, updates, { new: true });
};

userSchema.statics.toggleActive = function(id, currentStatus) {
  return this.findByIdAndUpdate(id, { isActive: !currentStatus }, { new: true });
};

userSchema.statics.normalizeDepartments = function(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(d => String(d).trim()).filter(Boolean);
  if (typeof input === 'string') return input.split(',').map(d => d.trim()).filter(Boolean);
  return [];
};

module.exports = mongoose.model('User', userSchema);
