// 任务数据管理
class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.render();
    }

    // 添加任务
    addTask(text, isImportant, isUrgent) {
        const task = {
            id: Date.now(),
            text,
            isImportant,
            isUrgent,
            createdAt: new Date().toISOString()
        };
        this.tasks.push(task);
        this.saveTasks();
        this.render();
    }

    // 删除任务
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.saveTasks();
        this.render();
    }

    // 更新任务状态
    updateTaskStatus(taskId, isImportant, isUrgent) {
        this.tasks = this.tasks.map(task => {
            if (task.id === taskId) {
                return { ...task, isImportant, isUrgent };
            }
            return task;
        });
        this.saveTasks();
        this.render();
    }

    // 保存到localStorage
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    // 获取特定象限的任务
    getQuadrantTasks(quadrant) {
        switch (quadrant) {
            case 1: // 重要 & 紧急
                return this.tasks.filter(task => task.isImportant && task.isUrgent);
            case 2: // 重要 & 不紧急
                return this.tasks.filter(task => task.isImportant && !task.isUrgent);
            case 3: // 不重要 & 紧急
                return this.tasks.filter(task => !task.isImportant && task.isUrgent);
            case 4: // 不重要 & 不紧急
                return this.tasks.filter(task => !task.isImportant && !task.isUrgent);
            default:
                return [];
        }
    }

    // 渲染任务列表
    render() {
        for (let i = 1; i <= 4; i++) {
            const quadrantTasks = this.getQuadrantTasks(i);
            const taskList = document.querySelector(`[data-quadrant="${i}"]`);
            taskList.innerHTML = quadrantTasks.map(task => this.createTaskElement(task)).join('');
        }

        // 添加事件监听器
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = parseInt(e.target.dataset.taskId);
                this.deleteTask(taskId);
            });
        });

        document.querySelectorAll('.move-task').forEach(select => {
            select.addEventListener('change', (e) => {
                const taskId = parseInt(e.target.dataset.taskId);
                const [isImportant, isUrgent] = e.target.value.split('-').map(v => v === 'true');
                this.updateTaskStatus(taskId, isImportant, isUrgent);
            });
        });
    }

    // 创建任务元素HTML
    createTaskElement(task) {
        const quadrantValue = `${task.isImportant}-${task.isUrgent}`;
        return `
            <div class="task-item">
                <span>${task.text}</span>
                <div class="task-actions">
                    <select class="move-task" data-task-id="${task.id}">
                        <option value="true-true" ${quadrantValue === 'true-true' ? 'selected' : ''}>重要&紧急</option>
                        <option value="true-false" ${quadrantValue === 'true-false' ? 'selected' : ''}>重要&不紧急</option>
                        <option value="false-true" ${quadrantValue === 'false-true' ? 'selected' : ''}>不重要&紧急</option>
                        <option value="false-false" ${quadrantValue === 'false-false' ? 'selected' : ''}>不重要&不紧急</option>
                    </select>
                    <button class="delete-btn" data-task-id="${task.id}">删除</button>
                </div>
            </div>
        `;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    const taskInput = document.getElementById('taskInput');
    const isImportantCheckbox = document.getElementById('isImportant');
    const isUrgentCheckbox = document.getElementById('isUrgent');
    const addTaskButton = document.getElementById('addTask');

    // 添加任务事件处理
    addTaskButton.addEventListener('click', () => {
        const text = taskInput.value.trim();
        if (text) {
            taskManager.addTask(
                text,
                isImportantCheckbox.checked,
                isUrgentCheckbox.checked
            );
            taskInput.value = '';
            isImportantCheckbox.checked = false;
            isUrgentCheckbox.checked = false;
        }
    });

    // 回车添加任务
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTaskButton.click();
        }
    });
});
