const express = require('express');
const HelpRequest = require('../models/HelpRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

function firstValue(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function normalizeDepartments(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

function departmentsOverlap(source = [], target = []) {
  const sourceList = normalizeDepartments(source);
  const targetList = normalizeDepartments(target);
  return sourceList.some((department) => targetList.includes(department));
}

function emitHelpNotification(io, receiverId, payload) {
  if (!io || !receiverId) return;
  io.to(String(receiverId)).emit('new-task', payload);
  io.to(`user_${receiverId}`).emit('new-task', payload);
}

function buildHelpNotificationPayload(request, notification, overrides = {}) {
  return {
    id: notification._id,
    helpRequestId: request._id,
    title: overrides.title || notification.title || 'Help Request',
    message: overrides.message || notification.message || request.subject,
    taskTitle: overrides.taskTitle || request.subject,
    description: overrides.description || notification.description || request.description,
    type: overrides.type || notification.type || 'help-request',
    createdAt: notification.createdAt,
    transferMeta: overrides.transferMeta || notification.transferMeta || null,
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status).trim() : null;
    const query = {};

    if (req.user.role === 'admin') {
      if (status) query.status = status;
    } else if (req.user.role === 'manager') {
      query.managerId = req.user._id;
      if (status) query.status = status;
    } else {
      query.requesterId = req.user._id;
      if (status) query.status = status;
    }

    const requests = await HelpRequest.find(query);
    res.json(requests);
  } catch (error) {
    console.error('Help request fetch error:', error);
    res.status(500).json({ message: 'Server error fetching help requests.' });
  }
});

router.post('/', auth, requireRole('employee'), async (req, res) => {
  try {
    const { subject, description } = req.body || {};

    if (!String(subject || '').trim() || !String(description || '').trim()) {
      return res.status(400).json({ message: 'Subject and description are required.' });
    }

    const requesterDepartment = firstValue(req.user.department);
    let manager = null;
    const directManagerId = firstValue(req.user.managerId);

    if (directManagerId) {
      manager = await User.findById(directManagerId);
    }

    if (!manager || manager.role !== 'manager' || !manager.isActive) {
      const departments = normalizeDepartments(requesterDepartment || req.user.department);
      const activeManagers = await User.find({ role: 'manager', isActive: true });
      manager = activeManagers.find((candidate) => departmentsOverlap(candidate.department || [], departments));
    }

    if (!manager) {
      return res.status(400).json({ message: 'No active manager is assigned to your department.' });
    }

    const helpDepartment = firstValue(req.user.department) || firstValue(manager.department) || null;
    const request = await HelpRequest.create({
      requesterId: req.user._id,
      requesterName: req.user.name || 'Employee',
      requesterRole: req.user.role || 'employee',
      managerId: manager._id,
      managerName: manager.name || 'Manager',
      department: helpDepartment,
      subject: String(subject).trim(),
      description: String(description).trim(),
      status: 'Open',
    });

    let notification = null;
    try {
      notification = await Notification.create({
        userId: manager._id,
        taskId: null,
        title: 'Help Request',
        message: `${req.user.name || 'Employee'} sent a help request: ${request.subject}`,
        type: 'help-request',
        description: request.description,
        taskTitle: request.subject,
        transferMeta: JSON.stringify({
          requestId: request._id,
          requesterId: req.user._id,
          requesterName: req.user.name || 'Employee',
          managerId: manager._id,
          managerName: manager.name || 'Manager',
          department: helpDepartment,
          subject: request.subject,
          description: request.description,
          status: request.status,
        }),
      });
    } catch (notificationError) {
      console.error('Help request notification create failed:', notificationError);
    }

    if (notification) {
      emitHelpNotification(req.io, manager._id, buildHelpNotificationPayload(request, notification, {
        title: 'Help Request',
        message: `${req.user.name || 'Employee'} sent a help request: ${request.subject}`,
        type: 'help-request',
        transferMeta: {
          requestId: request._id,
          requesterId: req.user._id,
          requesterName: req.user.name || 'Employee',
          managerId: manager._id,
          managerName: manager.name || 'Manager',
          department: helpDepartment,
          subject: request.subject,
          description: request.description,
          status: request.status,
        },
      }));
    }

    await logActivity(req.user._id, 'HELP_REQUEST_CREATED', `Sent help request "${request.subject}"`, req);

    res.status(201).json({ message: 'Help request sent successfully.', request });
  } catch (error) {
    console.error('Help request create error:', error);
    res.status(500).json({ message: 'Server error creating help request.' });
  }
});

router.post('/:id/reply', auth, requireRole('manager'), async (req, res) => {
  try {
    const { reply } = req.body || {};
    if (!String(reply || '').trim()) {
      return res.status(400).json({ message: 'Reply message is required.' });
    }

    const request = await HelpRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Help request not found.' });
    }

    if (String(request.managerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You are not allowed to reply to this request.' });
    }

    const updatedRequest = await HelpRequest.updateById(request._id, {
      reply: String(reply).trim(),
      status: 'Replied',
      repliedBy: req.user._id,
      repliedByName: req.user.name || 'Manager',
      repliedAt: new Date(),
    });

    let notification = null;
    try {
      notification = await Notification.create({
        userId: updatedRequest.requesterId,
        taskId: null,
        title: 'Help Reply Received',
        message: `${req.user.name || 'Manager'} replied to your help request "${updatedRequest.subject}".`,
        type: 'help-response',
        description: updatedRequest.reply,
        taskTitle: updatedRequest.subject,
        transferMeta: JSON.stringify({
          requestId: updatedRequest._id,
          requesterId: updatedRequest.requesterId,
          requesterName: updatedRequest.requesterName,
          managerId: req.user._id,
          managerName: req.user.name || 'Manager',
          department: updatedRequest.department,
          subject: updatedRequest.subject,
          reply: updatedRequest.reply,
          status: updatedRequest.status,
          repliedAt: updatedRequest.repliedAt,
        }),
      });
    } catch (notificationError) {
      console.error('Help reply notification create failed:', notificationError);
    }

    if (notification) {
      emitHelpNotification(req.io, updatedRequest.requesterId, buildHelpNotificationPayload(updatedRequest, notification, {
        title: 'Help Reply Received',
        message: `${req.user.name || 'Manager'} replied to your help request.`,
        type: 'help-response',
        description: updatedRequest.reply,
        transferMeta: {
          requestId: updatedRequest._id,
          requesterId: updatedRequest.requesterId,
          requesterName: updatedRequest.requesterName,
          managerId: req.user._id,
          managerName: req.user.name || 'Manager',
          department: updatedRequest.department,
          subject: updatedRequest.subject,
          reply: updatedRequest.reply,
          status: updatedRequest.status,
          repliedAt: updatedRequest.repliedAt,
        },
      }));
    }

    await logActivity(req.user._id, 'HELP_REQUEST_REPLIED', `Replied to help request "${updatedRequest.subject}"`, req);

    res.json({ message: 'Reply sent successfully.', request: updatedRequest });
  } catch (error) {
    console.error('Help request reply error:', error);
    res.status(500).json({ message: 'Server error replying to help request.' });
  }
});

module.exports = router;
