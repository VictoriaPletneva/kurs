// Функции для регистратора

async function showCreateUserForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>Создать пользователя</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleCreateUser(event)">
                <div class="form-group">
                    <label>Логин: <input type="text" id="createUserUsername" required></label>
                </div>
                <div class="form-group">
                    <label>Пароль: <input type="password" id="createUserPassword" required></label>
                </div>
                <div class="form-group">
                    <label>Роль: 
                        <select id="createUserRole" required onchange="toggleUserFields()">
                            <option value="">-- Выберите роль --</option>
                            <option value="STUDENT">Ученик</option>
                            <option value="TEACHER">Преподаватель</option>
                        </select>
                    </label>
                </div>
                <div id="studentFields" style="display: none;">
                    <div class="form-group">
                        <label>ФИО: <input type="text" id="createUserFullName"></label>
                    </div>
                    <div class="form-group">
                        <label>Email: <input type="email" id="createUserEmail"></label>
                    </div>
                    <div class="form-group">
                        <label>Возраст: <input type="number" id="createUserAge" min="14"></label>
                    </div>
                    <div class="form-group">
                        <label>Контакты: <input type="text" id="createUserContactInfo"></label>
                    </div>
                </div>
                <div id="teacherFields" style="display: none;">
                    <div class="form-group">
                        <label>ФИО: <input type="text" id="createTeacherFullName"></label>
                    </div>
                    <div class="form-group">
                        <label>Email: <input type="email" id="createTeacherEmail"></label>
                    </div>
                    <div class="form-group">
                        <label>Специализация: <input type="text" id="createTeacherSpecialization"></label>
                    </div>
                    <div class="form-group">
                        <label>Опыт работы (лет): <input type="number" id="createTeacherExperience" min="0"></label>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Создать</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function toggleUserFields() {
    const role = document.getElementById('createUserRole').value;
    const studentFields = document.getElementById('studentFields');
    const teacherFields = document.getElementById('teacherFields');
    
    if (role === 'STUDENT') {
        studentFields.style.display = 'block';
        teacherFields.style.display = 'none';
        // Делаем поля обязательными
        document.getElementById('createUserFullName').required = true;
        document.getElementById('createUserEmail').required = true;
        document.getElementById('createUserAge').required = true;
        document.getElementById('createUserContactInfo').required = false;
    } else if (role === 'TEACHER') {
        studentFields.style.display = 'none';
        teacherFields.style.display = 'block';
        // Убираем обязательность с полей студента
        document.getElementById('createUserFullName').required = false;
        document.getElementById('createUserEmail').required = false;
        document.getElementById('createUserAge').required = false;
        document.getElementById('createUserContactInfo').required = false;
        // Делаем поля обязательными для преподавателя
        document.getElementById('createTeacherFullName').required = true;
        document.getElementById('createTeacherEmail').required = true;
        document.getElementById('createTeacherSpecialization').required = false;
        document.getElementById('createTeacherExperience').required = false;
    } else {
        studentFields.style.display = 'none';
        teacherFields.style.display = 'none';
    }
}

async function handleCreateUser(event) {
    event.preventDefault();
    
    const username = document.getElementById('createUserUsername').value.trim();
    const password = document.getElementById('createUserPassword').value;
    const role = document.getElementById('createUserRole').value;
    
    if (!username || !password || !role) {
        alert('Заполните все обязательные поля');
        return;
    }
    
    // Проверка на существующего пользователя
    try {
        const existingUsers = await apiCall('/registrars/users');
        const userExists = existingUsers && existingUsers.some(u => 
            (u.username || '').toLowerCase() === username.toLowerCase()
        );
        if (userExists) {
            alert('Пользователь с таким логином уже существует');
            return;
        }
    } catch (error) {
        console.warn('Не удалось проверить существующих пользователей:', error);
    }
    
    const requestData = {
        username: username,
        password: password,
        role: role
    };
    
    if (role === 'STUDENT') {
        requestData.fullName = document.getElementById('createUserFullName').value.trim();
        requestData.email = document.getElementById('createUserEmail').value.trim();
        const age = document.getElementById('createUserAge').value;
        requestData.age = age ? parseInt(age) : null;
        requestData.contactInfo = document.getElementById('createUserContactInfo').value.trim();
        
        if (!requestData.fullName || !requestData.email) {
            alert('Для ученика необходимо указать ФИО и Email');
            return;
        }
    } else if (role === 'TEACHER') {
        requestData.fullName = document.getElementById('createTeacherFullName').value.trim();
        requestData.email = document.getElementById('createTeacherEmail').value.trim();
        requestData.specialization = document.getElementById('createTeacherSpecialization').value.trim();
        const experience = document.getElementById('createTeacherExperience').value;
        requestData.experience = experience ? parseInt(experience) : null;
        
        if (!requestData.fullName || !requestData.email) {
            alert('Для преподавателя необходимо указать ФИО и Email');
            return;
        }
    }
    
    try {
        await apiCall('/registrars/register-user', {
            method: 'POST',
            body: requestData
        });
        
        showMessage('Пользователь успешно создан');
        document.querySelector('.modal').remove();
        
        // Обновляем список студентов, если открыта страница регистратуры
        if (typeof loadStudents === 'function') {
            loadStudents();
        }
    } catch (error) {
        alert('Ошибка создания пользователя: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function deleteUserForRegistrar(userId) {
    const user = await apiCall(`/registrars/users`).then(users => 
        users ? users.find(u => u.userId === userId) : null
    ).catch(() => null);
    
    if (!user) {
        alert('Пользователь не найден');
        return;
    }
    
    const userName = user.fullName || user.username || 'пользователь';
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userName}"?\n\nЭто действие нельзя отменить!`)) {
        return;
    }
    
    try {
        await apiCall(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (typeof showMessage === 'function') {
            showMessage('Пользователь успешно удален');
        } else {
            alert('Пользователь успешно удален');
        }
        
        // Обновляем список студентов, если открыта страница регистратуры
        if (typeof loadStudents === 'function') {
            loadStudents();
        }
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        alert('Ошибка удаления пользователя: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.showCreateUserForm = showCreateUserForm;
window.toggleUserFields = toggleUserFields;
window.handleCreateUser = handleCreateUser;
window.deleteUserForRegistrar = deleteUserForRegistrar;
