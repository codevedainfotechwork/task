const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const { logActivity } = require('../utils/activityLogger');

const router = express.Router();

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

function sanitizeTask(task) {
  return task ? task.toObject() : null;
}

function buildTaskNotificationPayload(task, notification, overrides = {}) {
  return {
    id: notification._id,
    taskId: task._id || notification.taskId,
    title: overrides.title || 'New Task Assigned',
    message: overrides.message || task.title,
    taskTitle: overrides.taskTitle || task.title,
    description: overrides.description || task.description || 'No description provided.',
    dueDate: overrides.dueDate || task.dueDate,
    type: overrides.type || 'task-assigned',
    createdAt: notification.createdAt,
    transferMeta: overrides.transferMeta || null,
  };
}

function emitTaskNotification(io, receiverId, payload) {
  if (!io || !receiverId) {
    return;
  }

  io.to(String(receiverId)).emit('new-task', payload);
  io.to(`user_${receiverId}`).emit('new-task', payload);
}

router.post('/', auth, requireRole('manager', 'admin'), async (req, res) => {
  try {
    const { title, description, assignedTo, department, dueDate, priority, reminderTime } = req.body;

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
        // employee: department must match employee departments
        const employeeDepartments = receiver.department || [];
        resolvedDepartment = Department.normalizeName(department || employeeDepartments[0]);
        if (!resolvedDepartment || !employeeDepartments.includes(resolvedDepartment)) {
          return res.status(400).json({ message: 'Select a department the employee belongs to.' });
        }
      }
      const deptRecord = await Department.findByName(resolvedDepartment);
      if (!deptRecord || deptRecord.isDeleted) {
        return res.status(400).json({ message: 'Selected department is not available.' });
      }
      resolvedDepartment = deptRecord.name;
    } else {
      // Manager scoped check
      try {
        receiver = await getManagerScopedEmployee(req.user, assignedTo);
      } catch (err) {
        return res.status(403).json({ message: err.message });
      }
      
      const eligibleDepartments = (receiver.department || []).filter((dept) => (req.user.department || []).includes(dept));
      resolvedDepartment = department || eligibleDepartments[0];
      if (!resolvedDepartment || !eligibleDepartments.includes(resolvedDepartment)) {
        return res.status(400).json({ message: 'The selected task department does not match the employee department scope.' });
      }
    }

    const task = await Task.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      assignedTo: receiver._id,
      assignedBy: req.user._id,
      department: resolvedDepartment,
      dueDate,
      startDate: new Date().toISOString().split('T')[0],
      priority,
      reminderTime: reminderTime || null,
      status: 'Pending',
    });

    const notification = await Notification.create({
      userId: receiver._id,
      taskId: task._id,
      message: `New task assigned: ${task.title}`,
    });

    const notificationPayload = buildTaskNotificationPayload(task, notification);
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
      return res.json(tasks.map(sanitizeTask));
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

      const uniqueTasks = Array.from(
        new Map([...departmentTasks, ...outgoingTasks, ...incomingTasks, ...transferredTasks].map((task) => [String(task._id), task])).values()
      );

      return res.json(uniqueTasks.map(sanitizeTask));
    }

    const tasks = await Task.find({
      assignedTo: req.user._id,
      status: statusFilter || undefined,
      isArchived: false,
    });

    return res.json(tasks.map(sanitizeTask));
  } catch (error) {
    console.error('Task fetch error:', error);
    res.status(500).json({ message: 'Server error fetching tasks.' });
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

    if (!(targetManager.department || []).includes(normalizedDepartment)) {
      return res.status(400).json({ message: 'Selected manager does not manage that department.' });
    }

    const transferredAtFormatted = Task.formatDateTime(new Date());
    const updatedTask = await Task.updateById(task._id, {
      transferStatus: 'pending',
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

    console.log('Task updated successfully. Deleting old notifications...');
    await Notification.deleteMany({ taskId: task._id });
    
    console.log('Creating new notification for manager:', targetManager._id);
    const notification = await Notification.create({
      userId: targetManager._id,
      taskId: task._id,
      message: `${req.user.name || 'Admin'} wants to transfer task: ${updatedTask.title}`,
    });

    const notificationPayload = buildTaskNotificationPayload(updatedTask, notification, {
      title: 'Task Transfer Request',
      message: `${req.user.name || 'Admin'} wants to transfer a task to you.`,
      taskTitle: updatedTask.title,
      description: updatedTask.description || `Transferred by ${req.user.name}.`,
      type: 'transfer-request',
      transferMeta: {
        fromManagerName: req.user.name,
        toManagerName: targetManager.name,
        department: normalizedDepartment,
        transferredAt: transferredAtFormatted,
      },
    });

    emitTaskNotification(req.io, targetManager._id, notificationPayload);

    await logActivity(req.user._id, 'TASK_TRANSFER_REQUEST', `Requested transfer of "${updatedTask.title}" to ${targetManager.name}`, req);

    res.json({ message: 'Transfer request sent successfully.', task: sanitizeTask(updatedTask) });
  } catch (error) {
    console.error('Task transfer to manager error:', error);
    res.status(500).json({ message: 'Server error transferring task to manager.' });
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
        assignedBy: task.transferredToManagerId,
        department: req.user.department ? req.user.department[0] : null, // Default to their first department
        transferStatus: 'accepted',
        isTransferred: true
      });

      // 2. Notify original sender
      const notification = await Notification.create({
        userId: task.transferredFromManagerId,
        taskId: task._id,
        message: `${req.user.name} accepted your task transfer: ${updatedTask.title}`
      });

      emitTaskNotification(req.io, task.transferredFromManagerId, buildTaskNotificationPayload(updatedTask, notification, {
        title: 'Transfer Accepted',
        message: `${req.user.name} accepted your task transfer.`,
        type: 'transfer-response'
      }));

      await logActivity(req.user._id, 'TASK_TRANSFER_ACCEPT', `Accepted transfer of "${updatedTask.title}"`, req);

      res.json({ message: 'Transfer accepted successfully.', task: sanitizeTask(updatedTask) });

    } else if (action === 'reject') {
      // 1. Revert transfer status
      const updatedTask = await Task.updateById(task._id, {
        transferStatus: 'rejected',
        transferredToManagerId: null,
        transferredToManagerName: null
      });

      // 2. Notify original sender
      const notification = await Notification.create({
        userId: task.transferredFromManagerId,
        taskId: task._id,
        message: `${req.user.name} rejected your task transfer: ${updatedTask.title}`
      });

      emitTaskNotification(req.io, task.transferredFromManagerId, buildTaskNotificationPayload(updatedTask, notification, {
        title: 'Transfer Rejected',
        message: `${req.user.name} rejected your task transfer.`,
        type: 'transfer-response'
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
        message: `Task Updated: ${updatedTask.title}. Please review the changes.`,
        taskId: updatedTask._id
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
      if (String(task.assignedBy) !== String(req.user._id) || !(req.user.department || []).includes(task.department)) {
        return res.status(403).json({ message: 'Managers can only update tasks they assigned inside their own departments.' });
      }

      // 'status' removed to prevent managers from updating task status
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

        if (!(req.user.department || []).includes(nextDepartment) || !(employee.department || []).includes(nextDepartment)) {
          return res.status(400).json({ message: 'Task department must match both the manager scope and the employee department.' });
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

    // Create real-time notification for the assigned user (unless it's the user updating their own task status)
    if (req.user.role !== 'employee') {
      try {
        const notification = await Notification.create({
          userId: updatedTask.assignedTo,
          message: `Task Updated: ${updatedTask.title}. Please review the changes.`,
          taskId: updatedTask._id
        });

        emitTaskNotification(req.io, updatedTask.assignedTo, buildTaskNotificationPayload(updatedTask, notification, {
          title: 'Task Modified',
          message: `Your task "${updatedTask.title}" has been updated.`,
          type: 'task-assigned'
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

router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    await Notification.deleteMany({ taskId: req.params.id });

    await logActivity(req.user._id, 'TASK_DELETED', `Deleted task "${task.title}"`, req);

    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Task delete error:', error);
    res.status(500).json({ message: 'Server error deleting task.' });
  }
});

module.exports = router;
