const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const TaskAttachment = require('../models/TaskAttachment');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { logActivity } = require('../utils/activityLogger');
const multer = require('multer');
const {
  makeStoragePath,
  uploadBuffer,
  toPublicUrl,
} = require('../utils/supabaseStorage');

const router = express.Router();

const allowedMime = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  }
});

function sharesDepartment(userDepartments = [], managerDepartments = []) {
  return userDepartments.some((department) => managerDepartments.includes(department));
}

async function getManagerScopedEmployee(manager, employeeId) {
  const employee = await User.findById(employeeId).select('+password');

  if (!employee) {
    throw new Error('Employee not found in database.');
  }
  if (employee.role !== 'employee') {
    throw new Error('Target user is not an employee.');
  }

  if (String(employee.managerId) !== String(manager._id)) {
    throw new Error(`Employee managerId (${employee.managerId}) does not match your ID (${manager._id}).`);
  }

  if (!sharesDepartment(employee.department || [], manager.department || [])) {
    throw new Error(`Employee departments (${(employee.department||[]).join(',')}) do not overlap with your departments (${(manager.department||[]).join(',')}).`);
  }

  return employee;

  return employee;
}

async function getManagerScopedManager(manager, managerId) {
  const targetManager = await User.findById(managerId).select('+password');

  if (!targetManager || targetManager.role !== 'manager') {
    return null;
  }

  if (!targetManager.isActive) {
    return null;
  }

  if (String(targetManager._id) === String(manager._id)) {
    return null;
  }

  return targetManager;
}

async function getManagerScopedAdmin(adminId) {
  const targetAdmin = await User.findById(adminId).select('+password');

  if (!targetAdmin || targetAdmin.role !== 'admin' || !targetAdmin.isActive) {
    return null;
  }

  return targetAdmin;
}

function sanitizeTask(task) {
  return task ? task.toObject() : null;
}

function withAttachmentUrls(req, attachments = []) {
  return attachments.map((att) => ({
    ...att,
    url: att.storedName ? toPublicUrl(att.storedName) : att.url,
    isImage: String(att.mimeType || '').startsWith('image/'),
    isPdf: att.mimeType === 'application/pdf',
    isExcel: att.mimeType === 'application/vnd.ms-excel' || att.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }));
}

async function uploadTaskFiles(files = []) {
  const uploaded = [];

  for (const file of files) {
    const storedName = makeStoragePath('tasks', file.originalname);
    const result = await uploadBuffer({
      path: storedName,
      buffer: file.buffer,
      contentType: file.mimetype,
    });

    uploaded.push({
      originalname: file.originalname,
      filename: result.path,
      mimetype: file.mimetype,
      size: file.size,
      publicUrl: result.publicUrl,
    });
  }

  return uploaded;
}

function canViewTask(user, task) {
  if (!user || !task) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager') {
    const inDept = (user.department || []).includes(task.department);
    return inDept && (String(task.assignedBy) === String(user._id) || String(task.assignedTo) === String(user._id));
  }
  return String(task.assignedTo) === String(user._id);
}

async function attachAttachments(req, tasks = []) {
  const sanitized = tasks.map(sanitizeTask);
  if (!sanitized.length) return sanitized;
  const ids = sanitized.map(t => t._id || t.id).filter(Boolean);
  const attachments = await TaskAttachment.findByTaskIds(ids);
  const byTask = attachments.reduce((acc, att) => {
    acc[att.taskId] = acc[att.taskId] || [];
    acc[att.taskId].push(att);
    return acc;
  }, {});
  return sanitized.map(t => ({
    ...t,
    attachments: withAttachmentUrls(req, byTask[t._id || t.id] || [])
  }));
}

function buildTaskNotificationPayload(task, notification, overrides = {}) {
  return {
    id: notification._id,
    taskId: task._id || notification.taskId,
    title: overrides.title || notification.title || 'Notification',
    message: overrides.message || notification.message || task.title,
    taskTitle: overrides.taskTitle || notification.taskTitle || task.title,
    description: overrides.description || notification.description || task.description || 'Open the task board to review the full assignment details.',
    dueDate: overrides.dueDate || task.dueDate,
    reminderTime: overrides.reminderTime || task.reminderTime || null,
    type: overrides.type || notification.type || 'task-assigned',
    createdAt: notification.createdAt,
    transferMeta: overrides.transferMeta || notification.transferMeta || null,
  };
}

function emitTaskNotification(io, receiverId, payload) {
  if (!io || !receiverId) {
    return;
  }

  io.to(String(receiverId)).emit('new-task', payload);
  io.to(`user_${receiverId}`).emit('new-task', payload);
}

async function resolveTaskManager(task, employeeUser) {
  if (task?.assignedBy) {
    const assigner = await User.findById(task.assignedBy);
    if (assigner && ['manager', 'admin'].includes(assigner.role) && assigner.isActive) {
      return assigner;
    }
  }

  if (employeeUser?.managerId) {
    const manager = await User.findById(employeeUser.managerId);
    if (manager && manager.role === 'manager' && manager.isActive) {
      return manager;
    }
  }

  return null;
}

async function getManagerScopedManager(manager, managerId) {
  const targetManager = await User.findById(managerId).select('+password');

  if (!targetManager || targetManager.role !== 'manager') {
    return null;
  }

  if (!targetManager.isActive) {
    return null;
  }

  if (String(targetManager._id) === String(manager._id)) {
    return null;
  }

  return targetManager;
}

router.post('/', auth, requireRole('manager', 'admin', 'employee'), async (req, res) => {
  try {
    const { title, description, assignedTo, assigneeRole, department, startDate, dueDate, priority, reminderTime } = req.body;

    if (!title || !assignedTo || !dueDate) {
      return res.status(400).json({ message: 'User, title, and due date are required.' });
    }

    let receiver;
    let resolvedDepartment;

    if (req.user.role === 'admin') {
      receiver = await User.findById(assignedTo);
      if (!receiver || !['manager', 'employee'].includes(receiver.role)) {
        return res.status(400).json({ message: 'Target user must be an active manager or employee.' });
      }
      if (!receiver.isActive) {
        return res.status(400).json({ message: 'Target user is inactive.' });
      }

      if (receiver.role === 'manager') {
        resolvedDepartment = Department.normalizeName(department || (receiver.department && receiver.department[0]));
        if (!resolvedDepartment) {
          return res.status(400).json({ message: 'A department is required for task assignment.' });
        }
      } else {
        resolvedDepartment = Department.normalizeName(department || receiver.department?.[0] || req.user.department?.[0]);
        if (!resolvedDepartment) {
          return res.status(400).json({ message: 'A department is required for task assignment.' });
        }
      }
      const deptRecord = await Department.findByName(resolvedDepartment);
      if (!deptRecord || deptRecord.isDeleted) {
        return res.status(400).json({ message: 'Selected department is not available.' });
      }
      resolvedDepartment = deptRecord.name;
    } else if (req.user.role === 'manager') {
      const normalizedAssigneeRole = String(assigneeRole || '').toLowerCase();

      if (normalizedAssigneeRole === 'manager' || normalizedAssigneeRole === 'admin') {
        try {
          receiver = normalizedAssigneeRole === 'admin'
            ? await getManagerScopedAdmin(assignedTo)
            : await getManagerScopedManager(req.user, assignedTo);
        } catch (err) {
          return res.status(403).json({ message: err.message });
        }

        if (!receiver) {
          return res.status(403).json({
            message: normalizedAssigneeRole === 'admin'
              ? 'You can assign tasks only to active admins.'
              : 'You can assign tasks only to active managers.',
          });
        }

        resolvedDepartment = Department.normalizeName(receiver.department?.[0] || department || req.user.department?.[0]);
        if (!resolvedDepartment) {
          return res.status(400).json({ message: 'A department is required for task assignment.' });
        }

        const transferredAtFormatted = Task.formatDateTime(new Date());
        const task = await Task.create({
          title: String(title).trim(),
          description: description ? String(description).trim() : '',
          assignedTo: null,
          assignedBy: req.user._id,
          department: resolvedDepartment,
          dueDate,
          startDate: startDate || new Date().toISOString().split('T')[0],
          priority,
          reminderTime: reminderTime || null,
          status: 'Pending',
          isTransferred: true,
          transferStatus: 'pending',
          transferredAt: transferredAtFormatted,
          transferredFromManagerId: req.user._id,
          transferredFromManagerName: req.user.name || 'Manager',
          transferredToManagerId: receiver._id,
          transferredToManagerName: receiver.name || 'Manager',
        });

        const notification = await Notification.create({
          userId: receiver._id,
          taskId: task._id,
          title: 'Task Transfer Request',
          message: `${req.user.name || 'Manager'} wants to assign a task to you (${task.department})`,
          type: 'transfer-request',
          taskTitle: task.title,
          description: task.description || `Transfer request from ${req.user.name || 'Manager'}.`,
          transferMeta: JSON.stringify({
            fromManagerId: req.user._id,
            fromManagerName: req.user.name || 'Manager',
            department: task.department,
            transferredAt: transferredAtFormatted,
            status: 'pending'
          })
        });

        const notificationPayload = buildTaskNotificationPayload(task, notification, {
          title: 'Task Transfer Request',
          message: `Manager ${req.user.name || 'Manager'} sent you a task request.`,
          taskTitle: task.title,
          description: task.description || `Transfer request from ${req.user.name || 'Manager'}.`,
          type: 'transfer-request',
          transferMeta: {
            fromManagerName: req.user.name || 'Manager',
            toManagerName: receiver.name || 'Manager',
            department: task.department,
            transferredAt: transferredAtFormatted,
            status: 'pending'
          }
        });

        emitTaskNotification(req.io, receiver._id, notificationPayload);
        await logActivity(req.user._id, 'TASK_CREATE_MANAGER_TRANSFER', `Created manager transfer request "${task.title}"`, req);

        return res.status(201).json({
          message: 'Task sent to manager successfully.',
          task: sanitizeTask(task)
        });
      } else {
        // Manager scoped employee assignment
        try {
          receiver = await getManagerScopedEmployee(req.user, assignedTo);
        } catch (err) {
          return res.status(403).json({ message: err.message });
        }

        if (!receiver) {
          return res.status(403).json({ message: 'You can assign tasks only to active employees in your departments.' });
        }

        const eligibleDepartments = (receiver.department || []).filter((dept) => (req.user.department || []).includes(dept));
        resolvedDepartment = Department.normalizeName(department || eligibleDepartments[0]);
        if (!resolvedDepartment || !eligibleDepartments.includes(resolvedDepartment)) {
          return res.status(400).json({ message: 'The selected task department must match the employee department scope.' });
        }
      }
    } else {
      // Employee can assign tasks only to active managers that share a department.
      if (String(assigneeRole || '').toLowerCase() !== 'manager') {
        return res.status(403).json({ message: 'Employees can only assign tasks to managers.' });
      }

      const employeeDepartments = req.user.department || [];
      const primaryEmployeeDepartment = employeeDepartments[0];
      if (!primaryEmployeeDepartment) {
        return res.status(400).json({ message: 'Your profile does not have a department assigned.' });
      }

      receiver = await getManagerScopedManager({ ...req.user, _id: req.user._id, department: [primaryEmployeeDepartment] }, assignedTo);
      if (!receiver) {
        return res.status(403).json({ message: 'You can assign tasks only to the manager of your department.' });
      }

      const managerDepartments = receiver.department || [];
      resolvedDepartment = Department.normalizeName(primaryEmployeeDepartment);
      if (!resolvedDepartment || !managerDepartments.includes(resolvedDepartment)) {
        return res.status(400).json({ message: 'The selected task department must match your department and the manager department.' });
      }
    }

    const task = await Task.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      assignedTo: receiver._id,
      assignedBy: req.user._id,
      department: resolvedDepartment,
      dueDate,
      startDate: startDate || new Date().toISOString().split('T')[0],
      priority,
      reminderTime: reminderTime || null,
      status: 'Pending',
    });

    const notification = await Notification.create({
      userId: receiver._id,
      taskId: task._id,
      title: 'New Task Assigned',
      message: `Task Assigned by ${req.user.name || 'Admin'} (${task.department})`,
      type: 'task-assigned',
      taskTitle: task.title,
      description: task.description || `New task from ${req.user.name}.`,
      transferMeta: JSON.stringify({
        fromManagerName: req.user.name || 'Admin',
        department: task.department,
        status: 'assigned'
      })
    });

    const notificationPayload = buildTaskNotificationPayload(task, notification, {
      title: 'New Task Assigned',
      message: `Manager ${req.user.name || 'Admin'} assigned a task to you for "${task.department}".`,
      type: 'task-assigned',
      transferMeta: {
        fromManagerName: req.user.name || 'Admin',
        department: task.department,
        status: 'assigned'
      }
    });
    emitTaskNotification(req.io, receiver._id, notificationPayload);

    await logActivity(req.user._id, 'TASK_CREATED', `Assigned "${task.title}" to ${receiver.name}`, req);

    res.status(201).json({
      message: 'Task assigned successfully.',
      task: sanitizeTask(task),
    });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ message: 'Server error creating task.' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const departmentFilter = req.query.department ? String(req.query.department).trim() : null;
    const assigneeFilter = req.query.assignedTo ? String(req.query.assignedTo).trim() : null;
    const statusFilter = req.query.status ? Task.normalizeStatus(req.query.status) : null;

    if (req.user.role === 'admin') {
      const tasks = await Task.find({
        department: departmentFilter || undefined,
        assignedTo: assigneeFilter || undefined,
        status: statusFilter || undefined,
      });
      const withAttachments = await attachAttachments(req, tasks);
      return res.json(withAttachments);
    }

    if (req.user.role === 'manager') {
      if (departmentFilter && !(req.user.department || []).includes(departmentFilter)) {
        return res.status(403).json({ message: 'Managers cannot read tasks outside their assigned departments.' });
      }

      if (assigneeFilter) {
        const employee = await getManagerScopedEmployee(req.user, assigneeFilter);
        if (!employee) {
          return res.status(403).json({ message: 'Managers cannot filter tasks for employees outside their scope.' });
        }
      }

      const departmentTasks = await Task.find({
        department: { $in: req.user.department || [] },
        assignedTo: assigneeFilter || undefined,
        status: statusFilter || undefined,
        isArchived: false,
      });

      const outgoingTasks = await Task.find({
        assignedBy: req.user._id,
        department: departmentFilter || undefined,
        assignedTo: assigneeFilter || undefined,
        status: statusFilter || undefined,
        isArchived: false,
      });

      const incomingTasks = assigneeFilter
        ? []
        : await Task.find({
            assignedTo: req.user._id,
            department: departmentFilter || undefined,
            status: statusFilter || undefined,
            isArchived: false,
          });

      const transferredTasks = assigneeFilter
        ? []
        : await Task.find({
            transferredFromManagerId: req.user._id,
            status: statusFilter || undefined,
            isArchived: false,
            isTransferred: true,
          });

      const incomingTransferredTasks = assigneeFilter
        ? []
        : await Task.find({
            transferredToManagerId: req.user._id,
            status: statusFilter || undefined,
            isArchived: false,
            transferStatus: 'pending',
          });

      const uniqueTasks = Array.from(
        new Map([...departmentTasks, ...outgoingTasks, ...incomingTasks, ...transferredTasks, ...incomingTransferredTasks].map((task) => [String(task._id), task])).values()
      );

      const withAttachments = await attachAttachments(req, uniqueTasks);
      return res.json(withAttachments);
    }

    const tasks = await Task.find({
      assignedTo: req.user._id,
      status: statusFilter || undefined,
      isArchived: false,
    });

    const withAttachments = await attachAttachments(req, tasks);
    return res.json(withAttachments);
  } catch (error) {
    console.error('Task fetch error:', error);
    res.status(500).json({ message: 'Server error fetching tasks.' });
  }
});

router.get('/:id/attachments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    if (!canViewTask(req.user, task)) return res.status(403).json({ message: 'Unauthorized' });
    const attachments = await TaskAttachment.findByTaskId(task._id || task.id);
    return res.json(withAttachmentUrls(req, attachments));
  } catch (error) {
    console.error('Attachment fetch error:', error);
    res.status(500).json({ message: 'Server error fetching attachments.' });
  }
});

router.post('/:id/attachments', auth, requireRole('manager', 'admin'), upload.array('files', 5), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    if (!canViewTask(req.user, task)) return res.status(403).json({ message: 'Unauthorized' });

    const files = req.files || [];
    if (!files.length) {
      console.warn('No files uploaded. Content-Type:', req.headers['content-type']);
      return res.status(400).json({ message: 'No files uploaded.' });
    }

    const uploadedFiles = await uploadTaskFiles(files);
    const saved = await TaskAttachment.createMany(task._id || task.id, uploadedFiles, req.user._id);
    return res.status(201).json({ attachments: withAttachmentUrls(req, saved) });
  } catch (error) {
    console.error('Attachment upload error:', error);
    res.status(500).json({ message: 'Server error uploading attachments.' });
  }
});

router.post('/:id/completion-submit', auth, requireRole('employee', 'manager', 'admin'), upload.array('files', 5), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const currentUserId = String(req.user._id);
    const taskAssignedTo = String(task.assignedTo || '');
    const taskAssignedBy = String(task.assignedBy || '');
    const taskTransferredTo = String(task.transferredToManagerId || '');
    const taskTransferredFrom = String(task.transferredFromManagerId || '');
    const userDepartments = req.user.department || [];

    const canSubmitCompletion =
      taskAssignedTo === currentUserId ||
      (req.user.role === 'manager' && (
        userDepartments.includes(task.department) ||
        taskAssignedBy === currentUserId ||
        taskTransferredTo === currentUserId ||
        taskTransferredFrom === currentUserId
      )) ||
      req.user.role === 'admin';

    if (!canSubmitCompletion) {
      return res.status(403).json({ message: 'You can only submit completion for tasks assigned to you or within your scope.' });
    }

    const completionNote = req.body?.description ? String(req.body.description).trim() : '';
    const files = req.files || [];
    if (files.length) {
      const uploadedFiles = await uploadTaskFiles(files);
      await TaskAttachment.createMany(task._id || task.id, uploadedFiles, req.user._id);
    }

    const updatedTask = await Task.updateById(task._id, {
      status: 'Completed',
      completedAt: new Date(),
    });

    const assigner = await resolveTaskManager(task, req.user);
    if (assigner) {
      const managerNotification = await Notification.create({
        userId: assigner._id,
        taskId: task._id,
        title: 'Completed Task',
        message: `${req.user.name || req.user.role || 'User'} completed task "${task.title}".`,
        type: 'task-completion-submitted',
        taskTitle: task.title,
        description: completionNote || `${req.user.name || req.user.role || 'User'} marked this task as completed.`,
        transferMeta: JSON.stringify({
          status: 'completed-submitted',
          submittedByName: req.user.name || req.user.role || 'User',
          employeeId: req.user._id,
          attachmentsCount: files.length,
          completionNote,
        }),
      });

      emitTaskNotification(
        req.io,
        assigner._id,
        buildTaskNotificationPayload(updatedTask, managerNotification, {
          title: 'Completed Task',
          message: `${req.user.name || req.user.role || 'User'} completed task "${task.title}".`,
          taskTitle: task.title,
          description: completionNote || `${req.user.name || req.user.role || 'User'} marked this task as completed.`,
          type: 'task-completion-submitted',
          transferMeta: {
            status: 'completed-submitted',
            submittedByName: req.user.name || req.user.role || 'User',
            employeeId: req.user._id,
            attachmentsCount: files.length,
            completionNote,
          },
        })
      );
    }

    await logActivity(req.user._id, 'TASK_COMPLETION_SUBMITTED', `Submitted completion for "${task.title}"`, req);

    res.json({ message: 'Task completion submitted for manager review.', task: sanitizeTask(updatedTask) });
  } catch (error) {
    console.error('Task completion submit error:', error);
    res.status(500).json({ message: 'Server error submitting task completion.' });
  }
});

router.post('/:id/employee-comment', auth, requireRole('employee', 'manager', 'admin'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const isDirectAssignee = String(task.assignedTo) === String(req.user._id);
    const isPendingTransferRecipient =
      String(task.transferStatus || '').toLowerCase() === 'pending' &&
      String(task.transferredToManagerId || '') === String(req.user._id);

    if (!isDirectAssignee && !isPendingTransferRecipient) {
      return res.status(403).json({ message: 'You can only comment on tasks assigned to you or pending transfers sent to you.' });
    }

    const isPendingDirectTask = String(task.status || '').toLowerCase() === 'pending';
    if (!isPendingDirectTask && !isPendingTransferRecipient) {
      return res.status(400).json({ message: 'Comments are only allowed for pending tasks.' });
    }

    const comment = String(req.body?.comment || '').trim();
    if (!comment) {
      return res.status(400).json({ message: 'Comment is required.' });
    }

    const updatedTask = await Task.updateById(task._id, {
      employeeComment: comment,
      employeeCommentAt: new Date(),
    });

    const assigner = await resolveTaskManager(task, req.user);
    if (assigner) {
      const managerNotification = await Notification.create({
        userId: assigner._id,
        taskId: task._id,
        title: 'Employee Comment',
        message: `${req.user.name || req.user.role || 'User'} commented on task "${task.title}".`,
        type: 'task-employee-comment',
        taskTitle: task.title,
        description: comment,
        transferMeta: JSON.stringify({
          status: 'commented',
          employeeName: req.user.name || req.user.role || 'User',
          employeeId: req.user._id,
          comment,
        }),
      });

      emitTaskNotification(
        req.io,
        assigner._id,
        buildTaskNotificationPayload(updatedTask, managerNotification, {
          title: 'Employee Comment',
          message: `${req.user.name || req.user.role || 'User'} commented on task "${task.title}".`,
          taskTitle: task.title,
          description: comment,
          type: 'task-employee-comment',
          transferMeta: {
            status: 'commented',
            employeeName: req.user.name || req.user.role || 'User',
            employeeId: req.user._id,
            comment,
          },
        })
      );
    }

    await logActivity(req.user._id, 'TASK_COMMENTED', `Commented on "${task.title}"`, req);

    res.json({ message: 'Comment sent to manager. Task remains pending.', task: sanitizeTask(updatedTask) });
  } catch (error) {
    console.error('Task comment error:', error);
    res.status(500).json({ message: 'Server error sending task comment.' });
  }
});

router.post('/:id/completion-review', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { action, feedback } = req.body || {};
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (req.user.role === 'manager') {
      const managerDepartments = req.user.department || [];
      const inManagedDepartment = managerDepartments.includes(task.department);
      if (!inManagedDepartment) {
        return res.status(403).json({ message: 'You can only review tasks in your managed departments.' });
      }
    }

    const normalizedAction = String(action || '').toLowerCase();
    if (!['accept', 'reject'].includes(normalizedAction)) {
      return res.status(400).json({ message: 'Invalid review action.' });
    }

    if (normalizedAction === 'accept') {
      await logActivity(req.user._id, 'TASK_COMPLETION_ACCEPTED', `Accepted completion of "${task.title}"`, req);
      return res.json({ message: 'Task completion accepted successfully.' });
    }

    const rejectionReason = String(feedback || '').trim();
    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    const updatedTask = await Task.updateById(task._id, {
      status: 'In Progress',
      completedAt: null,
    });

    const employeeNotification = await Notification.create({
      userId: task.assignedTo,
      taskId: task._id,
      title: 'Your Task Rejected',
      message: `Your completed task "${task.title}" was rejected.`,
      type: 'task-completion-review',
      taskTitle: task.title,
      description: rejectionReason,
      transferMeta: JSON.stringify({
        status: 'rejected',
        reviewedByName: req.user.name || 'Manager',
        feedback: rejectionReason,
      }),
    });

    emitTaskNotification(
      req.io,
      task.assignedTo,
      buildTaskNotificationPayload(updatedTask, employeeNotification, {
        title: 'Your Task Rejected',
        message: `Your completed task "${task.title}" was rejected.`,
        taskTitle: task.title,
        description: rejectionReason,
        type: 'task-completion-review',
        transferMeta: {
          status: 'rejected',
          reviewedByName: req.user.name || 'Manager',
          feedback: rejectionReason,
        },
      })
    );

    await logActivity(req.user._id, 'TASK_COMPLETION_REJECTED', `Rejected completion of "${task.title}"`, req);

    res.json({ message: 'Task completion rejected and employee notified.', task: sanitizeTask(updatedTask) });
  } catch (error) {
    console.error('Task completion review error:', error);
    res.status(500).json({ message: 'Server error reviewing task completion.' });
  }
});

router.patch('/:id/transfer-manager', auth, async (req, res) => {
  try {
    console.log("User Role:", req.user.role);
    if (!["manager", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    const { targetManagerId, targetDepartment } = req.body;
    const normalizedDepartment = Department.normalizeName(targetDepartment);

    if (!targetManagerId || !normalizedDepartment) {
      return res.status(400).json({ message: 'Target manager and department are required.' });
    }

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const managerDepartments = req.user.department || [];
    const canManageTask =
      req.user.role === 'admin' ||
      (managerDepartments.includes(task.department) &&
      (String(task.assignedBy) === String(req.user._id) || String(task.assignedTo) === String(req.user._id)));

    if (!canManageTask) {
      return res.status(403).json({ message: 'You can only transfer tasks currently under your control.' });
    }

    if (req.user.role === 'manager') {
      if (String(task.assignedBy) !== String(req.user._id) && String(task.assignedTo) !== String(req.user._id) || !(req.user.department || []).includes(task.department)) {
        return res.status(403).json({ message: 'Managers can only transfer tasks they assigned or are assigned to, inside their own departments.' });
      }
    }

    const department = await Department.findByName(normalizedDepartment);
    if (!department || department.isDeleted) {
      return res.status(400).json({ message: 'Selected department was not found.' });
    }

    const targetManager = await User.findById(targetManagerId).select('+password');
    if (!targetManager || targetManager.role !== 'manager' || !targetManager.isActive) {
      return res.status(400).json({ message: 'Selected manager was not found or is inactive.' });
    }

    if (String(targetManager._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'Select a different manager for transfer.' });
    }

    const transferredAtFormatted = Task.formatDateTime(new Date());
    const updatedTask = await Task.updateById(task._id, {
      isTransferred: true,
      transferStatus: 'pending',
      assignedTo: null,
      transferredAt: transferredAtFormatted,
      transferredFromManagerId: req.user._id,
      transferredFromManagerName: req.user.name || 'Admin',
      transferredToManagerId: targetManager._id,
      transferredToManagerName: targetManager.name || 'Manager',
    });

    if (!updatedTask) {
      console.error('Failed to retrieve task after update! ID:', task._id);
      throw new Error('Database update succeeded but task retrieval failed.');
    }

    await Notification.deleteMany({ taskId: task._id });
    
    const notification = await Notification.create({
      userId: targetManager._id,
      taskId: task._id,
      title: 'Task Transfer Request',
      message: `${req.user.name || 'Admin'} wants to transfer a task to you (${updatedTask.department})`,
      type: 'transfer-request',
      taskTitle: updatedTask.title,
      description: updatedTask.description || `Transfer request from ${req.user.name} for department ${updatedTask.department}.`,
      transferMeta: JSON.stringify({
        fromManagerId: req.user._id,
        fromManagerName: req.user.name || 'Admin',
        department: updatedTask.department,
        transferredAt: transferredAtFormatted,
        status: 'pending'
      })
    });

    const notificationPayload = buildTaskNotificationPayload(updatedTask, notification, {
      title: 'Task Transfer Request',
      message: `Manager ${req.user.name || 'Admin'} requested a task transfer to your department (${updatedTask.department}).`,
      taskTitle: updatedTask.title,
      description: updatedTask.description || `Transferred by ${req.user.name}.`,
      type: 'transfer-request',
      transferMeta: {
        fromManagerName: req.user.name,
        toManagerName: targetManager.name,
        department: normalizedDepartment,
        transferredAt: transferredAtFormatted,
        status: 'pending'
      },
    });

    emitTaskNotification(req.io, targetManager._id, notificationPayload);

    await logActivity(req.user._id, 'TASK_TRANSFER_REQUEST', `Requested transfer of "${updatedTask.title}" to ${targetManager.name}`, req);

    res.json({ message: 'Transfer request sent successfully.', task: sanitizeTask(updatedTask) });
  } catch (error) {
    console.error('Task transfer to manager error:', error);
    res.status(500).json({ message: 'Server error transferring task to manager.', error: error.message });
  }
});

// Cancel/Withdraw a transfer request (for the sender)
router.post('/:id/cancel-transfer', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.transferStatus !== 'pending') {
      return res.status(400).json({ message: 'Task is not pending a transfer.' });
    }

    // Identify if the user is the sender (they might not have the ID if it's task 57, so we'll be more lenient for task 57 or allow it if they are the original sender)
    // Actually, if transferredFromManagerId is null (like task 57), we might need another check or just allow it if the user is a manager of that department.
    const isSender = String(task.transferredFromManagerId) === String(req.user._id);
    const isOriginalAssignee = String(task.assignedTo) === String(req.user._id) || (!task.assignedTo && task.isTransferred);

    if (!isSender && !isOriginalAssignee) {
      // If metadata is null (task 57), let the manager of that department cancel it
      const userDepts = req.user.department || [];
      const isDeptManager = userDepts.includes(task.department);
      if (!isDeptManager) {
        return res.status(403).json({ message: 'You do not have permission to cancel this transfer.' });
      }
    }

    const updatedTask = await Task.updateById(task._id, {
      assignedTo: task.transferredFromManagerId || req.user._id, // Return to sender
      transferStatus: 'none',
      isTransferred: false,
      transferredToManagerId: null,
      transferredToManagerName: null,
      transferredFromManagerId: null,
      transferredFromManagerName: null
    });

    await Notification.deleteMany({ taskId: task._id });

    await logActivity(req.user._id, 'TASK_TRANSFER_CANCEL', `Withdrew transfer of "${task.title}"`, req);

    res.json({ message: 'Transfer withdrawn successfully.', task: sanitizeTask(updatedTask) });
  } catch (error) {
    console.error('Task transfer cancel error:', error);
    res.status(500).json({ message: 'Server error withdrawing transfer.', error: error.message });
  }
});

// Approve or reject a task transfer
router.post('/:id/transfer-response', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'accept' or 'reject'
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.transferStatus !== 'pending') {
      return res.status(400).json({ message: 'Task is not pending a transfer response.' });
    }

    if (String(task.transferredToManagerId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You are not the requested recipient of this transfer.' });
    }

    if (action === 'accept') {
      // 1. Assign to new manager
      const updatedTask = await Task.updateById(task._id, {
        assignedTo: task.transferredToManagerId,
        status: 'In Progress',
        department: task.department || (req.user.department ? req.user.department[0] : null),
        transferStatus: 'none',
        isTransferred: false,
        transferredAt: null,
        transferredFromManagerId: null,
        transferredFromManagerName: null,
        transferredToManagerId: null,
        transferredToManagerName: null,
      });
 
      // 2. Notify original sender
      const notification = await Notification.create({
        userId: task.transferredFromManagerId,
        taskId: task._id,
        title: 'Transfer Accepted',
        message: `${req.user.name} accepted your task transfer for "${updatedTask.title}".`,
        type: 'transfer-response',
        taskTitle: updatedTask.title,
        description: `The task transfer for "${updatedTask.title}" has been accepted by ${req.user.name}.`,
        transferMeta: JSON.stringify({
          fromManagerName: req.user.name,
          department: updatedTask.department,
          transferredAt: updatedTask.transferredAt,
          status: 'accepted'
        })
      });
 
      emitTaskNotification(req.io, task.transferredFromManagerId, buildTaskNotificationPayload(updatedTask, notification, {
        title: 'Transfer Accepted',
        message: `${req.user.name} accepted your task transfer.`,
        type: 'transfer-response',
        transferMeta: {
          fromManagerName: req.user.name,
          department: updatedTask.department,
          transferredAt: updatedTask.transferredAt,
          status: 'accepted'
        }
      }));
 
      await logActivity(req.user._id, 'TASK_TRANSFER_ACCEPT', `Accepted transfer of "${updatedTask.title}"`, req);
 
      res.json({ message: 'Transfer accepted successfully.', task: sanitizeTask(updatedTask) });
 
    } else if (action === 'reject') {
      // 1. Revert transfer status
      const updatedTask = await Task.updateById(task._id, {
        assignedTo: task.transferredFromManagerId,
        transferStatus: 'rejected',
        transferredToManagerId: null,
        transferredToManagerName: null
      });
 
      // 2. Notify original sender
      const notification = await Notification.create({
        userId: task.transferredFromManagerId,
        taskId: task._id,
        title: 'Transfer Rejected',
        message: `${req.user.name} rejected your task transfer for "${updatedTask.title}".`,
        type: 'transfer-response',
        taskTitle: updatedTask.title,
        description: `The task transfer for "${updatedTask.title}" was rejected by ${req.user.name}. The task has been returned to your queue.`,
        transferMeta: JSON.stringify({
          fromManagerName: req.user.name,
          department: updatedTask.department,
          transferredAt: updatedTask.transferredAt,
          status: 'rejected'
        })
      });
 
      emitTaskNotification(req.io, task.transferredFromManagerId, buildTaskNotificationPayload(updatedTask, notification, {
        title: 'Transfer Rejected',
        message: `${req.user.name} rejected your task transfer.`,
        type: 'transfer-response',
        transferMeta: {
          fromManagerName: req.user.name,
          department: updatedTask.department,
          transferredAt: updatedTask.transferredAt,
          status: 'rejected'
        }
      }));

      await logActivity(req.user._id, 'TASK_TRANSFER_REJECT', `Rejected transfer of "${updatedTask.title}"`, req);

      res.json({ message: 'Transfer rejected successfully.', task: sanitizeTask(updatedTask) });

    } else {
      return res.status(400).json({ message: 'Invalid action.' });
    }
  } catch (error) {
    console.error('Task transfer response error:', error);
    res.status(500).json({ message: 'Server error handling transfer response.' });
  }
});

router.put('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    console.log("PUT /tasks/:id - User:", req.user._id, "Role:", req.user.role);
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Role-based access control
    if (req.user.role === 'manager') {
      const isAuthor = String(task.assignedBy) === String(req.user._id);
      const isManagedDept = (req.user.department || []).includes(task.department);
      
      if (!isAuthor && !isManagedDept) {
        return res.status(403).json({ message: 'Managers can only edit tasks they assigned or tasks in their managed departments.' });
      }
    }

    const { title, description, dueDate, priority, department, assignedTo } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: 'Title and Due Date are required.' });
    }

    const updates = {
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      dueDate: Task.formatDateOnly(dueDate),
      priority: Task.normalizePriority(priority),
      department: department || task.department,
      assignedTo: assignedTo || task.assignedTo
    };

    // If changing assignee or department, validate the relationship
    if (updates.assignedTo !== task.assignedTo || updates.department !== task.department) {
      const targetUser = await User.findById(updates.assignedTo);
      if (!targetUser || !targetUser.isActive) {
        return res.status(400).json({ message: 'Target assignee not found or inactive.' });
      }

      if (!(targetUser.department || []).includes(updates.department)) {
        return res.status(400).json({ message: `Target assignee does not belong to the ${updates.department} department.` });
      }
    }

    console.log('Final updates for task:', task._id, updates);
    const updatedTask = await Task.updateById(task._id, updates);

    // Create real-time notification for the assigned user
    try {
      const notification = await Notification.create({
        userId: updatedTask.assignedTo,
        title: 'Task Modified',
        message: `Task Updated: ${updatedTask.title}. Please review the changes.`,
        taskId: updatedTask._id,
        type: 'task-assigned',
      });

      emitTaskNotification(req.io, updatedTask.assignedTo, buildTaskNotificationPayload(updatedTask, notification, {
        title: 'Task Modified',
        message: `Your task "${updatedTask.title}" has been updated.`,
        type: 'task-assigned'
      }));
    } catch (notifErr) {
      console.error('Failed to send update notification:', notifErr);
    }

    res.json({ message: 'Task updated successfully.', task: sanitizeTask(updatedTask) });
  } catch (error) {
    console.error('Task put error:', error);
    res.status(500).json({ message: error.message || 'Server error updating task.' });
  }
});

router.patch('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const updates = {};

    if (req.user.role === 'employee') {
      if (String(task.assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Employees can only update their own tasks.' });
      }

      const allowedFields = Object.keys(req.body);
      if (allowedFields.length !== 1 || allowedFields[0] !== 'status') {
        return res.status(400).json({ message: 'Employees can only update task status.' });
      }

      const newStatus = Task.normalizeStatus(req.body.status);
      if (!['Pending', 'In Progress', 'Completed'].includes(newStatus)) {
        return res.status(400).json({ message: 'Invalid status value.' });
      }

      updates.status = newStatus;

    } else if (req.user.role === 'manager') {
      const managerDepartments = req.user.department || [];
      const canUpdateManagedTask =
        managerDepartments.includes(task.department) ||
        String(task.assignedTo) === String(req.user._id) ||
        String(task.assignedBy) === String(req.user._id) ||
        String(task.transferredToManagerId || '') === String(req.user._id) ||
        String(task.transferredFromManagerId || '') === String(req.user._id);

      const incomingKeys = Object.keys(req.body || {});
      const isStatusOnlyUpdate = incomingKeys.length === 1 && incomingKeys[0] === 'status';

      if (isStatusOnlyUpdate) {
        updates.status = Task.normalizeStatus(req.body.status);
      } else {
        if (String(task.assignedBy) !== String(req.user._id) || !managerDepartments.includes(task.department)) {
          return res.status(403).json({ message: 'Managers can only update tasks they assigned inside their own departments.' });
        }

        const editableFields = ['title', 'description', 'dueDate', 'priority', 'assignedTo', 'department'];
        editableFields.forEach((field) => {
          if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
          }
        });

        const nextAssigneeId = updates.assignedTo !== undefined ? updates.assignedTo : task.assignedTo;
        const nextDepartment = updates.department !== undefined ? updates.department : task.department;

        if (updates.assignedTo !== undefined || updates.department !== undefined) {
          let employee;
          try {
            employee = await getManagerScopedEmployee(req.user, nextAssigneeId);
          } catch (err) {
            return res.status(403).json({ message: err.message });
          }

          if (!managerDepartments.includes(nextDepartment) || !(employee.department || []).includes(nextDepartment)) {
            return res.status(400).json({ message: 'Task department must match both the manager scope and the employee department.' });
          }
        }
      }
    } else if (req.user.role === 'admin') {
      // 'status' removed to prevent admins from updating task status
      const editableFields = ['title', 'description', 'dueDate', 'priority', 'assignedTo', 'assignedBy', 'department'];
      editableFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
    }

    if (updates.status !== undefined) {
      updates.status = Task.normalizeStatus(updates.status);
      updates.completedAt = updates.status === 'Completed' ? new Date() : null;
    }

    if (updates.priority !== undefined) {
      updates.priority = Task.normalizePriority(updates.priority);
    }

    const updatedTask = await Task.updateById(task._id, updates);

    if (req.user.role === 'employee' && updates.status !== undefined && String(task.status) !== String(updates.status)) {
      const manager = await resolveTaskManager(task, req.user);
      if (manager) {
        const statusLabel = String(updates.status);
        const statusNotification = await Notification.create({
          userId: manager._id,
          taskId: task._id,
          title: 'Task Status Updated',
          message: `${req.user.name || 'Employee'} moved task "${task.title}" to ${statusLabel}.`,
          type: 'task-status-updated',
          taskTitle: task.title,
          description: `Current status: ${statusLabel}.`,
          transferMeta: JSON.stringify({
            status: 'status-updated',
            newStatus: statusLabel,
            employeeName: req.user.name || 'Employee',
            employeeId: req.user._id,
          }),
        });

        emitTaskNotification(
          req.io,
          manager._id,
          buildTaskNotificationPayload(updatedTask, statusNotification, {
            title: 'Task Status Updated',
            message: `${req.user.name || 'Employee'} moved task "${task.title}" to ${statusLabel}.`,
            taskTitle: task.title,
            description: `Current status: ${statusLabel}.`,
            type: 'task-status-updated',
            transferMeta: {
              status: 'status-updated',
              newStatus: statusLabel,
              employeeName: req.user.name || 'Employee',
              employeeId: req.user._id,
            },
          })
        );
      }
    }

    // Create real-time notification for the assigned user unless they are updating their own task.
    if (req.user.role !== 'employee' && String(updatedTask.assignedTo) !== String(req.user._id)) {
      try {
        const notification = await Notification.create({
          userId: updatedTask.assignedTo,
          title: 'Task Updated',
          message: `Task updated by ${req.user.name || 'Admin'} (${updatedTask.department})`,
          taskId: updatedTask._id,
          type: 'task-assigned',
          taskTitle: updatedTask.title,
          description: updatedTask.description || `Task details updated by ${req.user.name}.`,
          transferMeta: JSON.stringify({
            fromManagerName: req.user.name || 'Admin',
            department: updatedTask.department,
            status: 'updated'
          })
        });

        emitTaskNotification(req.io, updatedTask.assignedTo, buildTaskNotificationPayload(updatedTask, notification, {
          title: 'Task Updated',
          message: `Your manager ${req.user.name || 'Admin'} updated task "${updatedTask.title}" (${updatedTask.department}).`,
          type: 'task-assigned',
          transferMeta: {
            fromManagerName: req.user.name || 'Admin',
            department: updatedTask.department,
            status: 'updated'
          }
        }));
      } catch (notifErr) {
        console.error('Failed to send update notification:', notifErr);
      }
    }

    res.json({ message: 'Task updated successfully.', task: sanitizeTask(updatedTask) });
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ message: 'Server error updating task.' });
  }
});

router.delete('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (req.user.role === 'manager') {
      const managerDepartments = req.user.department || [];
      const inManagedDepartment = managerDepartments.includes(task.department);
      if (!inManagedDepartment) {
        return res.status(403).json({ message: 'Managers can only delete tasks in their managed departments.' });
      }
    }

    await Task.findByIdAndDelete(req.params.id);

    await Notification.deleteMany({ taskId: req.params.id });

    if (req.io) {
      req.io.emit('task-deleted', {
        taskId: task._id,
        department: task.department,
        assignedTo: task.assignedTo,
        deletedBy: req.user._id,
      });
    }

    await logActivity(req.user._id, 'TASK_DELETED', `Deleted task "${task.title}"`, req);

    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Task delete error:', error);
    res.status(500).json({ message: 'Server error deleting task.' });
  }
});

module.exports = router;
