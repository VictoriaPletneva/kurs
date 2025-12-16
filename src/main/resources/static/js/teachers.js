let teachersListData = []; // Переименовано, чтобы избежать конфликта

// Глобальная функция для загрузки преподавателей
window.loadTeachers = async function() {
    try {
        const teachers = await apiCall('/teachers');
        if (teachers) {
            teachersListData = teachers;
            renderTeachersList(teachers);
        }
    } catch (error) {
        console.error('Ошибка загрузки преподавателей:', error);
        const container = document.getElementById('teachersContent');
        if (container) container.innerHTML = '<p class="error-message">Нет доступа или ошибка загрузки</p>';
    }
}

function renderTeachersList(teachers) {
    const container = document.getElementById('teachersContent');
    if (!container) return;

    const role = localStorage.getItem('role');
    const isAdmin = role === 'ADMIN';

    let html = '';
    if (isAdmin) {
        html += `
            <div style="margin-bottom: 1rem;">
                <button class="btn btn-primary" onclick="showCreateTeacherForm()">+ Добавить преподавателя</button>
            </div>
        `;
    }

    if (!teachers || teachers.length === 0) {
        html += '<p>Нет данных о преподавателях</p>';
        container.innerHTML = html;
        return;
    }

    html += `
        <table>
            <thead>
                <tr>
                    <th>ФИО</th>
                    <th>Email</th>
                    <th>Специализация</th>
                    <th>Стаж</th>
                    ${isAdmin ? '<th>Действия</th>' : ''}
                </tr>
            </thead>
            <tbody>
    `;

    teachers.forEach(t => {
        html += `
            <tr>
                <td>${t.fullName || '-'}</td>
                <td>${t.email || '-'}</td>
                <td>${t.specialization || '-'}</td>
                <td>${t.experience != null ? t.experience + ' лет' : '-'}</td>
                ${isAdmin ? `
                <td>
                    <button class="btn btn-secondary" onclick="editTeacher(${t.id || t.teacherId})">Редактировать</button>
                    <button class="btn btn-danger" onclick="deleteTeacher(${t.id || t.teacherId})">Удалить</button>
                </td>
                ` : ''}
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function showCreateTeacherForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Добавить преподавателя</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleCreateTeacher(event)">
                <div class="form-group">
                    <label>ФИО: <input type="text" id="newTeacherFullName" required></label>
                </div>
                <div class="form-group">
                    <label>Email: <input type="email" id="newTeacherEmail" required></label>
                </div>
                <div class="form-group">
                    <label>Специализация: <input type="text" id="newTeacherSpecialization"></label>
                </div>
                <div class="form-group">
                    <label>Стаж (лет): <input type="number" id="newTeacherExperience" min="0"></label>
                </div>
                <div class="form-group">
                    <label>Логин: <input type="text" id="newTeacherUsername" required></label>
                </div>
                <div class="form-group">
                    <label>Пароль: <input type="text" id="newTeacherPassword" required minlength="6"></label>
                </div>
                <button type="submit" class="btn btn-primary">Создать</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleCreateTeacher(event) {
    event.preventDefault();
    const data = {
        fullName: document.getElementById('newTeacherFullName').value,
        email: document.getElementById('newTeacherEmail').value,
        specialization: document.getElementById('newTeacherSpecialization').value,
        experience: document.getElementById('newTeacherExperience').value ? parseInt(document.getElementById('newTeacherExperience').value) : null,
        username: document.getElementById('newTeacherUsername').value,
        password: document.getElementById('newTeacherPassword').value
    };

    try {
        const result = await apiCall('/teachers', {
            method: 'POST',
            body: data
        });
        showMessage('Преподаватель успешно создан. Пользователь создан автоматически.');
        document.querySelector('.modal').remove();
        loadTeachers();
    } catch (error) {
        alert('Ошибка создания преподавателя: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function editTeacher(id) {
    const teacher = teachersListData.find(t => (t.id || t.teacherId) === id);
    if (!teacher) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Редактировать преподавателя</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleEditTeacher(event, ${id})">
                <div class="form-group">
                    <label>ФИО: <input type="text" id="editTeacherFullName" value="${teacher.fullName || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Email: <input type="email" id="editTeacherEmail" value="${teacher.email || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Специализация: <input type="text" id="editTeacherSpecialization" value="${teacher.specialization || ''}"></label>
                </div>
                <div class="form-group">
                    <label>Стаж (лет): <input type="number" id="editTeacherExperience" value="${teacher.experience || 0}" min="0"></label>
                </div>
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleEditTeacher(event, id) {
    event.preventDefault();
    const data = {
        fullName: document.getElementById('editTeacherFullName').value,
        email: document.getElementById('editTeacherEmail').value,
        specialization: document.getElementById('editTeacherSpecialization').value,
        experience: document.getElementById('editTeacherExperience').value ? parseInt(document.getElementById('editTeacherExperience').value) : null
    };
    
    try {
        await apiCall(`/teachers/${id}`, {
            method: 'PUT',
            body: data
        });
        showMessage('Преподаватель успешно обновлен');
        document.querySelector('.modal').remove();
        loadTeachers();
    } catch (error) {
        alert('Ошибка обновления преподавателя: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function deleteTeacher(id) {
    if (!confirm('Вы уверены, что хотите удалить этого преподавателя?')) {
        return;
    }
    try {
        await apiCall(`/teachers/${id}`, { method: 'DELETE' });
        showMessage('Преподаватель удален');
        loadTeachers();
    } catch (error) {
        alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'));
    }
}

