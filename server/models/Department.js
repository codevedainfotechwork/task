const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

departmentSchema.statics.findActive = function() {
  return this.find({ isDeleted: false }).sort({ name: 1 });
};

departmentSchema.statics.deleteSafe = function(id) {
  return this.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
};

module.exports = mongoose.model('Department', departmentSchema);
