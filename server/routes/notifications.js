const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// Get all notifications for current user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id });
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const raw = notification.toObject ? notification.toObject() : notification;
        if (!notification.taskId) {
          return raw;
        }

        const task = await Task.findById(notification.taskId);
        const isTransferNotification = /^Task transferred to you:/i.test(raw.message || '');
        const fallbackType = isTransferNotification ? 'task-transferred' : 'task-assigned';

          return {
          ...raw,
          title: raw.title || (isTransferNotification ? 'Task Transferred To You' : 'New Task Assigned'),
          taskTitle: raw.taskTitle || task?.title || raw.message,
          description: raw.description || task?.description || '',
          dueDate: raw.dueDate || task?.dueDate || null,
          reminderTime: raw.reminderTime || task?.reminderTime || null,
          type: raw.type || fallbackType,
          transferMeta: raw.transferMeta || (isTransferNotification
            ? {
                fromManagerName: task?.transferredFromManagerName || null,
                toManagerName: task?.transferredToManagerName || null,
                department: task?.department || null,
                transferredAt: task?.transferredAt || null,
              }
            : null),
        };
      })
    );

    res.json(enrichedNotifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Mark a single notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await Notification.updateById(notification._id, { isRead: true });
    const updatedNotif = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    res.json(updatedNotif);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating notification' });
  }
});

// Mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating notifications' });
  }
});

module.exports = router;
