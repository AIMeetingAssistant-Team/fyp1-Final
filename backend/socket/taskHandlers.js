class TaskHandlers {
  constructor(socket, io) {
    this.socket = socket;
    this.io = io;
    this.setupHandlers();
  }

  setupHandlers() {
    // Task created
    this.socket.on('task:created', (data) => {
      const { task, assignedTo } = data;
      
      // Notify assigned users
      if (assignedTo && Array.isArray(assignedTo)) {
        assignedTo.forEach(userId => {
          this.io.emit(`user:${userId}:task-assigned`, {
            task,
            assignedBy: {
              id: this.socket.userId,
              name: this.socket.user.name
            },
            assignedAt: new Date()
          });
        });
      }

      console.log(`✅ Task created by ${this.socket.user.name}`);
    });

    // Task updated
    this.socket.on('task:updated', (data) => {
      const { task, changes } = data;
      
      // Notify relevant users
      this.io.emit('task:updated', {
        task,
        changes,
        updatedBy: {
          id: this.socket.userId,
          name: this.socket.user.name
        },
        updatedAt: new Date()
      });
    });

    // Task assigned
    this.socket.on('task:assigned', (data) => {
      const { task, assignedTo } = data;
      
      // Notify the assigned user
      this.io.emit(`user:${assignedTo}:task-assigned`, {
        task,
        assignedBy: {
          id: this.socket.userId,
          name: this.socket.user.name
        },
        assignedAt: new Date()
      });
    });
  }
}

export default TaskHandlers;