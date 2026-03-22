const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      return ret;
    }
  }
});

notificationSchema.statics.updateById = function(id, updates) {
  return this.findByIdAndUpdate(id, updates, { new: true });
};

module.exports = mongoose.model('Notification', notificationSchema);
