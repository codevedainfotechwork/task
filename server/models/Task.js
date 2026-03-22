const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  startDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  reminderTime: { type: Date },
  completedAt: { type: Date },
  isTransferred: { type: Boolean, default: false },
  transferredAt: { type: Date },
  transferredFromManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transferredFromManagerName: { type: String },
  transferredToManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transferredToManagerName: { type: String },
  transferStatus: { type: String },
  isArchived: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      return ret;
    }
  }
});

taskSchema.statics.updateById = function(id, updates) {
  return this.findByIdAndUpdate(id, updates, { new: true });
};

module.exports = mongoose.model('Task', taskSchema);
