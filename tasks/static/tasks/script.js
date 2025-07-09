document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('#tasks-container')) {
        loadTasks();
    }

    if (document.getElementById('new-task-form')) {
        loadCategoriesForSelect();
        setupCreatePageListeners();
    }
});

function loadTasks() {
    fetch('/tasks/')
        .then(response => response.json())
        .then(tasks => {
            const container = document.querySelector('#tasks-container');
            container.innerHTML = '';

            if (tasks.length === 0) {
                container.innerHTML = '<p>No tasks yet. Add one below!</p>';
                return;
            }

            tasks.forEach(task => {
                const taskElement = createTaskElement(task);
                container.appendChild(taskElement);
            });
        });
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        fetch(`/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete task');
            }
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                taskElement.remove();
            }
        })
        .catch(error => {
            console.error('Error deleting task:', error);
            alert('Error deleting task: ' + error.message);
        });
    }
}

function loadCategories() {
    return fetch('/categories/')
        .then(response => response.json());
}

function loadCategoriesForSelect() {
    const select = document.getElementById('new-task-category');
    if (!select) return;

    while (select.options.length > 1) {
        select.remove(1);
    }

    fetch('/categories/')
        .then(response => response.json())
        .then(categories => {
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        });
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item card mb-3';
    taskDiv.dataset.taskId = task.id;

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const taskHeader = document.createElement('div');
    taskHeader.className = 'd-flex justify-content-between align-items-start mb-2';

    const title = document.createElement('h5');
    title.className = 'card-title mb-0' + (task.complete ? ' completed' : '');
    title.textContent = task.title;

    const dueDate = document.createElement('span');
    dueDate.className = 'due-date text-muted';
    if (task.due_date) {
        dueDate.textContent = formatDate(task.due_date);
    }

    taskHeader.appendChild(title);
    taskHeader.appendChild(dueDate);

    const description = document.createElement('p');
    description.className = 'card-text task-description';
    description.textContent = task.description || '';

    const footer = document.createElement('div');
    footer.className = 'd-flex justify-content-between align-items-center mt-2';

    const categoriesSpan = document.createElement('div');
    categoriesSpan.className = 'categories';
    task.categories.forEach(category => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-primary me-1';
        badge.textContent = category.name;
        categoriesSpan.appendChild(badge);
    });

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';

    const checkboxDiv = document.createElement('div');
    checkboxDiv.className = 'form-check';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'form-check-input task-checkbox';
    checkbox.id = `task-${task.id}`;
    checkbox.checked = task.complete;
    checkbox.addEventListener('change', () => toggleTaskComplete(task.id));

    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'form-check-label';
    checkboxLabel.htmlFor = `task-${task.id}`;
    checkboxLabel.textContent = task.complete ? 'Completed' : 'Mark Complete';

    checkboxDiv.appendChild(checkbox);
    checkboxDiv.appendChild(checkboxLabel);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-outline-primary me-1';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editTask(task));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-outline-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    actionsDiv.appendChild(checkboxDiv);
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    footer.appendChild(categoriesSpan);
    footer.appendChild(actionsDiv);

    cardBody.appendChild(taskHeader);
    cardBody.appendChild(description);
    cardBody.appendChild(footer);
    taskDiv.appendChild(cardBody);

    return taskDiv;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function toggleTaskComplete(taskId) {
    const checkbox = document.querySelector(`.task-item[data-task-id="${taskId}"] .task-checkbox`);
    const isComplete = checkbox.checked;
    const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
    const title = taskElement.querySelector('.card-title');
    const label = taskElement.querySelector('.form-check-label');

    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
            complete: isComplete
        })
    })
    .then(response => response.json())
    .then(data => {
        if (isComplete) {
            title.classList.add('completed');
            label.textContent = 'Completed';
        } else {
            title.classList.remove('completed');
            label.textContent = 'Mark Complete';
        }
    })
    .then(data => {
        loadTasks();
    })
    .catch(error => {
        console.error('Error updating completion status:', error);
        alert('Something went wrong updating this task.');
        checkbox.checked = !isComplete;
    });
}


function editTask(task) {
    loadCategories().then(categories => {
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '1050';

        const modalDialog = document.createElement('div');
        modalDialog.className = 'modal-dialog modal-dialog-centered';
        modalDialog.style.maxWidth = '600px';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';

        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        modalHeader.innerHTML = `
            <h5 class="modal-title">Edit Task</h5>
        `;

        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';

        const form = document.createElement('form');
        form.id = 'edit-task-form';

        form.innerHTML += `
            <div class="mb-3">
                <label for="edit-task-title" class="form-label">Title</label>
                <input type="text" class="form-control" id="edit-task-title" value="${task.title || ''}" required>
            </div>
        `;

        form.innerHTML += `
            <div class="mb-3">
                <label for="edit-task-description" class="form-label">Description</label>
                <textarea class="form-control" id="edit-task-description" rows="3">${task.description || ''}</textarea>
            </div>
        `;

        let dueDateValue = '';
        if (task.due_date) {
            const date = new Date(task.due_date);
            const offset = date.getTimezoneOffset() * 60000;
            const localISOTime = new Date(date - offset).toISOString().slice(0, 16);
            dueDateValue = localISOTime;
        }

        form.innerHTML += `
            <div class="mb-3">
                <label for="edit-task-due-date" class="form-label">Due Date</label>
                <input type="datetime-local" class="form-control" id="edit-task-due-date" value="${dueDateValue}">
            </div>
        `;

        form.innerHTML += `
            <div class="mb-3">
                <label for="edit-task-category" class="form-label">Category</label>
                <select class="form-select" id="edit-task-category">
                    <option value="">-- No Category --</option>
                </select>
            </div>
        `;

        const categorySelect = form.querySelector('#edit-task-category');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            if (task.categories.some(c => c.id === category.id)) {
                option.selected = true;
            }
            categorySelect.appendChild(option);
        });

        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" id="edit-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="edit-save-btn">Save Changes</button>
        `;
        modalFooter.querySelector('#edit-cancel-btn').addEventListener('click', () => modal.remove());

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const saveBtn = modalFooter.querySelector('#edit-save-btn');
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
                const title = document.getElementById('edit-task-title').value.trim();
                const description = document.getElementById('edit-task-description').value.trim();
                const dueDate = document.getElementById('edit-task-due-date').value;
                const categoryId = document.getElementById('edit-task-category').value;

                if (!title) {
                    throw new Error('Title is required');
                }

                const response = await fetch(`/tasks/${task.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                        due_date: dueDate || null,
                        categories: categoryId ? [parseInt(categoryId)] : [],
                        complete: task.complete
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to update task');
                }

                modal.remove();
                loadTasks();
            } catch (error) {
                console.error('Error:', error);
                alert('Error updating task: ' + error.message);
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
        });

        form.appendChild(modalFooter);
        modalBody.appendChild(form);
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        modalDialog.appendChild(modalContent);
        modal.appendChild(modalDialog);
        document.body.appendChild(modal);
    });
}

function setupCreatePageListeners() {
    const newTaskForm = document.getElementById('new-task-form');
    if (newTaskForm) {
        newTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = newTaskForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';

            try {
                const formData = {
                    title: newTaskForm.querySelector('#new-task-title').value.trim(),
                    description: newTaskForm.querySelector('#new-task-desc').value.trim(),
                    due_date: newTaskForm.querySelector('#new-task-date').value || null,
                    categories: []
                };

                const categorySelect = newTaskForm.querySelector('#new-task-category');
                if (categorySelect.value) {
                    formData.categories.push(parseInt(categorySelect.value));
                }

                if (!formData.title) {
                    throw new Error('Title is required');
                }

                const response = await fetch('/tasks/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: JSON.stringify(formData),
                    credentials: 'include'
                });

                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    throw new Error(`Unexpected response: ${text.substring(0, 100)}`);
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to create task');
                }

                newTaskForm.reset();
                alert('Task created successfully!');
                window.location.href = '/';

            } catch (error) {
                console.error('Error:', error);
                alert(`Error: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Task';
            }
        });
    }

    const newCategoryForm = document.getElementById('new-category-form');
    if (newCategoryForm) {
        newCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameInput = newCategoryForm.querySelector('#new-category-name');
            const name = nameInput.value.trim();

            if (!name) {
                alert('Category name cannot be empty');
                return;
            }

            try {
                const response = await fetch('/categories/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: JSON.stringify({
                        name: name
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to create category');
                }

                nameInput.value = '';
                await loadCategoriesForSelect();
                alert('Category created successfully!');
            } catch (error) {
                console.error('Error:', error);
                alert('Error: ' + error.message);
            }
        });
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
