let usersData = [];
let adminCoursesData = []; // Переименовано, чтобы избежать конфликта с courses.js
let userPasswords = {}; // Храним пароли только для новых пользователей
window.userPasswords = userPasswords; // Делаем доступным глобально для profile.js

// Глобальная функция для загрузки пользователей
window.loadUsers = async function() {
    // Ждем немного, чтобы убедиться, что DOM готов
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
        const container = document.getElementById('usersContent');
        if (!container) {
            console.error('Контейнер usersContent не найден! Проверьте, что страница usersPage существует в DOM.');
            // Пытаемся найти через несколько секунд
            setTimeout(() => {
                const retryContainer = document.getElementById('usersContent');
                if (retryContainer) {
                    console.log('Контейнер найден при повторной попытке');
                    loadUsers();
                } else {
                    console.error('Контейнер usersContent так и не найден');
                }
            }, 1000);
            return;
        }
        
        console.log('Загрузка пользователей...');
        console.log('Токен:', localStorage.getItem('token') ? 'Есть' : 'НЕТ!');
        console.log('Роль:', localStorage.getItem('role'));
        
        const users = await apiCall('/admin/users');
        console.log('Получены пользователи:', users);
        console.log('Тип данных:', typeof users);
        console.log('Является массивом?', Array.isArray(users));
        
        if (users === null) {
            console.warn('Пользователи вернули null - возможно проблема с авторизацией или правами доступа');
            container.innerHTML = '<div class="card" style="padding: 2rem; text-align: center;"><p class="error-message">Ошибка авторизации или нет прав доступа. Убедитесь, что вы вошли как администратор.</p></div>';
            return;
        }
        
        if (users && Array.isArray(users)) {
            usersData = users;
            console.log('Рендерим пользователей, количество:', users.length);
            // Загружаем курсы для отображения в формах
            try {
                const courses = await apiCall('/courses');
                if (courses) {
                    adminCoursesData = courses;
                }
            } catch (e) {
                console.warn('Не удалось загрузить курсы:', e);
            }
            // Сохраняем данные пользователей
            usersData = users;
            renderUsers(users);
        } else if (users === undefined) {
            console.warn('Пользователи вернули undefined');
            container.innerHTML = '<div class="card" style="padding: 2rem; text-align: center;"><p>Нет данных о пользователях</p><p style="color: #666; margin-top: 1rem;">Возможно, у вас нет прав доступа или произошла ошибка.</p></div>';
        } else {
            console.warn('Пользователи не являются массивом:', typeof users, users);
            container.innerHTML = '<div class="card" style="padding: 2rem; text-align: center;"><p class="error-message">Неверный формат данных: ' + JSON.stringify(users) + '</p></div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки пользователей:', error);
        console.error('Stack trace:', error.stack);
        const container = document.getElementById('usersContent');
        if (container) {
            container.innerHTML = '<div class="card" style="padding: 2rem; text-align: center;"><p class="error-message">Ошибка: ' + (error.message || 'Не удалось загрузить пользователей') + '</p><p style="color: #666; margin-top: 1rem;">Проверьте консоль браузера для подробностей.</p><p style="color: #666; margin-top: 0.5rem;">Статус ошибки: ' + (error.status || 'N/A') + '</p></div>';
        }
    }
};

// Глобальная функция для рендеринга пользователей
window.renderUsers = function(users) {
    console.log('renderUsers вызвана с данными:', users);
    const container = document.getElementById('usersContent');
    if (!container) {
        console.error('Контейнер usersContent не найден в renderUsers!');
        return;
    }
    
    console.log('Контейнер найден, рендерим пользователей');

    if (!users || users.length === 0) {
        console.log('Пользователей нет, показываем сообщение');
        container.innerHTML = `
            <div class="card" style="padding: 2rem; text-align: center; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="color: #333; margin-bottom: 1rem;">👥 Нет пользователей</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">В системе пока нет зарегистрированных пользователей.</p>
                <button class="btn btn-primary" onclick="showCreateUserForm()">+ Создать первого пользователя</button>
            </div>
        `;
        return;
    }
    
    console.log('Рендерим', users.length, 'пользователей');

    let html = `
        <div style="margin-bottom: 2rem;">
            <button class="btn btn-primary" onclick="showCreateUserForm()">+ Создать нового пользователя</button>
        </div>
        
        <div style="margin-bottom: 2rem;">
            <h3>Все пользователи (${users.length})</h3>
            ${renderAllUsersTable(users)}
        </div>
        
        <h3 style="margin-top: 2rem;">История изменений ролей</h3>
        <div id="roleHistory"></div>
    `;

    container.innerHTML = html;
    loadRoleHistory();
}

function renderAllUsersTable(users) {
    if (users.length === 0) {
        return '<p>Нет пользователей</p>';
    }
    
    let html = `
        <table style="width: 100%; margin-top: 1rem;">
            <thead>
                <tr>
                    <th>ФИО</th>
                    <th>Логин</th>
                    <th>Пароль</th>
                    <th>Роль</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    users.forEach(user => {
        // Показываем пароль из хранилища или из ответа API
        const password = userPasswords[user.userId] || user.password || '';
        const fullName = user.fullName || user.username || '-';
        html += `
            <tr>
                <td>${fullName}</td>
                <td>${user.username}</td>
                <td>
                    <span id="password_${user.userId}" style="font-family: monospace; font-weight: bold; color: #2c3e50; user-select: all;">${password}</span>
                    <button class="btn btn-small" onclick="resetPassword(${user.userId})" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;">Сбросить</button>
                </td>
                <td>${user.role}</td>
                <td>
                    <button class="btn btn-small" onclick="editUser(${user.userId})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Редактировать</button>
                    <button class="btn btn-small btn-danger" onclick="deleteUser(${user.userId})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-left: 0.5rem;">Удалить</button>
                    <select id="roleSelect_${user.userId}" onchange="changeUserRole(${user.userId}, this.value)" style="margin-left: 0.5rem; padding: 0.25rem;">
                        <option value="STUDENT" ${user.role === 'STUDENT' ? 'selected' : ''}>Ученик</option>
                        <option value="TEACHER" ${user.role === 'TEACHER' ? 'selected' : ''}>Преподаватель</option>
                        <option value="REGISTRAR" ${user.role === 'REGISTRAR' ? 'selected' : ''}>Регистратура</option>
                        <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Администратор</option>
                    </select>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    return html;
}

function renderTeachersTable(teachers) {
    if (teachers.length === 0) {
        return '<p>Нет преподавателей</p>';
    }
    
    let html = `
        <table style="width: 100%; margin-top: 1rem;">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>ФИО</th>
                    <th>Логин</th>
                    <th>Пароль</th>
                    <th>Email</th>
                    <th>Специализация</th>
                    <th>Стаж</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    teachers.forEach(teacher => {
        const password = userPasswords[teacher.userId] || '******';
        html += `
            <tr>
                <td>${teacher.teacherId || teacher.userId}</td>
                <td>${teacher.fullName || '-'}</td>
                <td>${teacher.username}</td>
                <td>
                    <span id="password_${teacher.userId}">${password}</span>
                    <button class="btn btn-small" onclick="resetPassword(${teacher.userId})" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 0.8rem;">Сбросить</button>
                </td>
                <td>${teacher.email || '-'}</td>
                <td>${teacher.specialization || '-'}</td>
                <td>${teacher.experience || 0} лет</td>
                <td>
                    <button class="btn btn-small" onclick="editUser(${teacher.userId})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Редактировать</button>
                    <select id="roleSelect_${teacher.userId}" onchange="changeUserRole(${teacher.userId}, this.value)" style="margin-left: 0.5rem; padding: 0.25rem;">
                        <option value="STUDENT" ${teacher.role === 'STUDENT' ? 'selected' : ''}>Ученик</option>
                        <option value="TEACHER" ${teacher.role === 'TEACHER' ? 'selected' : ''}>Преподаватель</option>
                        <option value="ADMIN" ${teacher.role === 'ADMIN' ? 'selected' : ''}>Администратор</option>
                    </select>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    return html;
}

function renderOthersTable(others) {
    if (others.length === 0) {
        return '';
    }
    
    let html = `
        <table style="width: 100%; margin-top: 1rem;">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Логин</th>
                    <th>Роль</th>
                    <th>Дата создания</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    others.forEach(user => {
        html += `
            <tr>
                <td>${user.userId}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td>${formatDate(user.createdAt)}</td>
                <td>
                    <select id="roleSelect_${user.userId}" onchange="changeUserRole(${user.userId}, this.value)" style="padding: 0.25rem;">
                        <option value="STUDENT" ${user.role === 'STUDENT' ? 'selected' : ''}>Ученик</option>
                        <option value="TEACHER" ${user.role === 'TEACHER' ? 'selected' : ''}>Преподаватель</option>
                        <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Администратор</option>
                    </select>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    return html;
}

// Глобальная функция для показа формы создания пользователя
window.showCreateUserForm = function() {
    // Удаляем существующую форму, если есть
    const existingForm = document.getElementById('createUserForm');
    if (existingForm) {
        existingForm.remove();
    }
    
    const container = document.getElementById('usersContent');
    if (!container) {
        alert('Ошибка: контейнер пользователей не найден');
        return;
    }
    
    // Создаем форму как модальное окно для лучшей видимости
    const modal = document.createElement('div');
    modal.id = 'createUserFormModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
    
    const formHtml = `
        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto;">
            <h3 style="margin-top: 0;">Создание нового пользователя</h3>
            <form id="newUserForm" onsubmit="handleCreateUser(event)">
                <div class="form-group">
                    <label>Логин: <input type="text" id="newUsername" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                </div>
                <div class="form-group">
                    <label>Пароль: <input type="text" id="newPassword" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;" placeholder="Введите пароль"></label>
                </div>
                <div class="form-group">
                    <label>Роль: 
                        <select id="newRole" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;" onchange="toggleUserFields()">
                            <option value="">Выберите роль</option>
                            <option value="STUDENT">Ученик</option>
                            <option value="TEACHER">Преподаватель</option>
                            <option value="REGISTRAR">Регистратура</option>
                            <option value="ADMIN">Администратор</option>
                        </select>
                    </label>
                </div>
                <div id="studentFields" style="display: none;">
                    <div class="form-group">
                        <label>ФИО: <input type="text" id="newFullName" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;" placeholder="Обязательно для ученика"></label>
                    </div>
                    <div class="form-group">
                        <label>Email: <input type="email" id="newEmail" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;" placeholder="Обязательно для ученика"></label>
                    </div>
                    <div class="form-group">
                        <label>Возраст: <input type="number" id="newAge" min="14" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                    </div>
                    <div class="form-group">
                        <label>Контакты: <input type="text" id="newContactInfo" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                    </div>
                </div>
                <div id="teacherFields" style="display: none;">
                    <div class="form-group">
                        <label>ФИО: <input type="text" id="newTeacherFullName" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                    </div>
                    <div class="form-group">
                        <label>Email: <input type="email" id="newTeacherEmail" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                    </div>
                    <div class="form-group">
                        <label>Специализация: <input type="text" id="newSpecialization" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                    </div>
                    <div class="form-group">
                        <label>Стаж (лет): <input type="number" id="newExperience" min="0" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                    </div>
                </div>
                <div style="margin-top: 1rem;">
                    <button type="submit" class="btn btn-primary">Создать</button>
                    <button type="button" class="btn btn-secondary" onclick="hideCreateUserForm()" style="margin-left: 0.5rem;">Отмена</button>
                </div>
                <div id="createUserError" class="error-message" style="display: none; margin-top: 1rem;"></div>
            </form>
        </div>
    `;
    modal.innerHTML = formHtml;
    document.body.appendChild(modal);
}

function hideCreateUserForm() {
    const modal = document.getElementById('createUserFormModal');
    if (modal) {
        modal.remove();
    }
    const form = document.getElementById('newUserForm');
    if (form) {
        form.reset();
    }
    const studentFields = document.getElementById('studentFields');
    if (studentFields) {
        studentFields.style.display = 'none';
    }
    const teacherFields = document.getElementById('teacherFields');
    if (teacherFields) {
        teacherFields.style.display = 'none';
    }
    const errorDiv = document.getElementById('createUserError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function toggleUserFields() {
    const role = document.getElementById('newRole').value;
    const studentFields = document.getElementById('studentFields');
    const teacherFields = document.getElementById('teacherFields');
    
    // Убираем required у всех полей перед переключением
    const studentInputs = studentFields ? studentFields.querySelectorAll('input[required]') : [];
    const teacherInputs = teacherFields ? teacherFields.querySelectorAll('input[required]') : [];
    
    studentInputs.forEach(input => input.removeAttribute('required'));
    teacherInputs.forEach(input => input.removeAttribute('required'));
    
    if (role === 'STUDENT') {
        if (studentFields) {
            studentFields.style.display = 'block';
            // Добавляем required обратно для полей студента
            const fullNameInput = document.getElementById('newFullName');
            const emailInput = document.getElementById('newEmail');
            if (fullNameInput) fullNameInput.setAttribute('required', 'required');
            if (emailInput) emailInput.setAttribute('required', 'required');
        }
        if (teacherFields) {
            teacherFields.style.display = 'none';
        }
    } else if (role === 'TEACHER') {
        if (studentFields) {
            studentFields.style.display = 'none';
        }
        if (teacherFields) {
            teacherFields.style.display = 'block';
            // Добавляем required для полей учителя
            const teacherFullNameInput = document.getElementById('newTeacherFullName');
            const teacherEmailInput = document.getElementById('newTeacherEmail');
            if (teacherFullNameInput) teacherFullNameInput.setAttribute('required', 'required');
            if (teacherEmailInput) teacherEmailInput.setAttribute('required', 'required');
        }
    } else {
        if (studentFields) studentFields.style.display = 'none';
        if (teacherFields) teacherFields.style.display = 'none';
    }
}

async function handleCreateUser(event) {
    event.preventDefault();
    const errorDiv = document.getElementById('createUserError');
    errorDiv.style.display = 'none';

    const role = document.getElementById('newRole').value;
    
    // Валидация основных полей
    const username = document.getElementById('newUsername').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    
    if (!username || !password) {
        errorDiv.textContent = 'Логин и пароль обязательны';
        errorDiv.style.display = 'block';
        return;
    }
    
    const requestData = {
        username: username,
        password: password,
        role: role
    };

    if (role === 'STUDENT') {
        const fullName = document.getElementById('newFullName').value.trim();
        const email = document.getElementById('newEmail').value.trim();
        
        if (!fullName || !email) {
            errorDiv.textContent = 'ФИО и Email обязательны для ученика';
            errorDiv.style.display = 'block';
            return;
        }
        
        requestData.fullName = fullName;
        requestData.email = email;
        requestData.age = document.getElementById('newAge').value ? parseInt(document.getElementById('newAge').value) : null;
        requestData.contactInfo = document.getElementById('newContactInfo').value.trim();
    } else if (role === 'TEACHER') {
        const fullName = document.getElementById('newTeacherFullName').value.trim();
        const email = document.getElementById('newTeacherEmail').value.trim();
        
        if (!fullName || !email) {
            errorDiv.textContent = 'ФИО и Email обязательны для преподавателя';
            errorDiv.style.display = 'block';
            return;
        }
        
        requestData.fullName = fullName;
        requestData.email = email;
        requestData.specialization = document.getElementById('newSpecialization').value.trim();
        requestData.experience = document.getElementById('newExperience').value ? parseInt(document.getElementById('newExperience').value) : null;
    }

    try {
        const response = await apiCall('/admin/users', {
            method: 'POST',
            body: requestData
        });

        if (response) {
            // Сохраняем пароль для отображения
            if (response.userId && response.password) {
                userPasswords[response.userId] = response.password;
                // window.userPasswords уже ссылается на userPasswords, изменения синхронизируются автоматически
            }
            
            const message = `Пользователь успешно создан!\n\nЛогин: ${response.username}\nПароль: ${response.password}\n\nСохраните эти данные для передачи пользователю.`;
            alert(message);
            hideCreateUserForm();
            // Перезагружаем пользователей для отображения нового
            await loadUsers();
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'Ошибка создания пользователя';
        errorDiv.style.display = 'block';
    }
}

async function resetPassword(userId) {
    const newPassword = prompt('Введите новый пароль:');
    if (!newPassword || newPassword.length < 6) {
        alert('Пароль должен быть не менее 6 символов');
        return;
    }
    
    try {
        const user = usersData.find(u => u.userId === userId);
        if (!user) {
            alert('Пользователь не найден');
            return;
        }
        
        const updateData = {
            username: user.username,
            password: newPassword
        };
        
        if (user.role === 'STUDENT' && user.fullName) {
            updateData.fullName = user.fullName;
            updateData.email = user.email;
            updateData.age = user.age;
            updateData.contactInfo = user.contactInfo;
        } else if (user.role === 'TEACHER' && user.fullName) {
            updateData.fullName = user.fullName;
            updateData.email = user.email;
            updateData.specialization = user.specialization;
            updateData.experience = user.experience;
        }
        
        const response = await apiCall(`/admin/users/${userId}`, {
            method: 'PUT',
            body: updateData
        });
        
        if (response && response.password) {
            userPasswords[userId] = response.password;
            // window.userPasswords уже ссылается на userPasswords, изменения синхронизируются автоматически
            document.getElementById(`password_${userId}`).textContent = response.password;
            alert(`Пароль успешно изменен!\n\nНовый пароль: ${response.password}\n\nСохраните для передачи пользователю.`);
        } else {
            alert('Пароль успешно изменен');
            loadUsers();
        }
    } catch (error) {
        alert('Ошибка изменения пароля: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function editUser(userId) {
    const user = usersData.find(u => u.userId === userId);
    if (!user) {
        alert('Пользователь не найден');
        return;
    }
    
    let formHtml = `
        <h3>Редактирование пользователя</h3>
        <form id="editUserForm" onsubmit="handleEditUser(event, ${userId})">
            <div class="form-group">
                <label>Логин: <input type="text" id="editUsername" value="${user.username}" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
    `;
    
    if (user.role === 'STUDENT') {
        formHtml += `
            <div class="form-group">
                <label>ФИО: <input type="text" id="editFullName" value="${user.fullName || ''}" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
            <div class="form-group">
                <label>Email: <input type="email" id="editEmail" value="${user.email || ''}" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
            <div class="form-group">
                <label>Возраст: <input type="number" id="editAge" value="${user.age || ''}" min="14" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
            <div class="form-group">
                <label>Контакты: <input type="text" id="editContactInfo" value="${user.contactInfo || ''}" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
        `;
    } else if (user.role === 'TEACHER') {
        formHtml += `
            <div class="form-group">
                <label>ФИО: <input type="text" id="editFullName" value="${user.fullName || ''}" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
            <div class="form-group">
                <label>Email: <input type="email" id="editEmail" value="${user.email || ''}" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
            <div class="form-group">
                <label>Специализация: <input type="text" id="editSpecialization" value="${user.specialization || ''}" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
            <div class="form-group">
                <label>Стаж (лет): <input type="number" id="editExperience" value="${user.experience || 0}" min="0" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
        `;
    }
    
    formHtml += `
            <div class="form-group">
                <label>Новый пароль (оставьте пустым, чтобы не менять): <input type="text" id="editPassword" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
            </div>
            <div style="margin-top: 1rem;">
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn btn-secondary" onclick="closeEditModal()" style="margin-left: 0.5rem;">Отмена</button>
            </div>
        </form>
    `;
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.id = 'editUserModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
            ${formHtml}
        </div>
    `;
    document.body.appendChild(modal);
}

function closeEditModal() {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.remove();
    }
}

async function handleEditUser(event, userId) {
    event.preventDefault();
    const user = usersData.find(u => u.userId === userId);
    if (!user) return;
    
    const updateData = {
        username: document.getElementById('editUsername').value
    };
    
    const newPassword = document.getElementById('editPassword').value;
    if (newPassword && newPassword.length > 0) {
        updateData.password = newPassword;
    }
    
    if (user.role === 'STUDENT') {
        updateData.fullName = document.getElementById('editFullName').value;
        updateData.email = document.getElementById('editEmail').value;
        updateData.age = document.getElementById('editAge').value ? parseInt(document.getElementById('editAge').value) : null;
        updateData.contactInfo = document.getElementById('editContactInfo').value;
    } else if (user.role === 'TEACHER') {
        updateData.fullName = document.getElementById('editFullName').value;
        updateData.email = document.getElementById('editEmail').value;
        updateData.specialization = document.getElementById('editSpecialization').value;
        updateData.experience = document.getElementById('editExperience').value ? parseInt(document.getElementById('editExperience').value) : null;
    }
    
    try {
        const response = await apiCall(`/admin/users/${userId}`, {
            method: 'PUT',
            body: updateData
        });
        
        if (response && response.password) {
            userPasswords[userId] = response.password;
            // window.userPasswords уже ссылается на userPasswords, изменения синхронизируются автоматически
        }
        
        closeEditModal();
        showMessage('Пользователь успешно обновлен');
        loadUsers();
    } catch (error) {
        alert('Ошибка обновления: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function showStudentCourses(userId, studentName) {
    try {
        const enrollments = await apiCall(`/admin/users/${userId}/enrollments`);
        const allCourses = adminCoursesData.length > 0 ? adminCoursesData : await apiCall('/courses');
        
        let html = `
            <h3>Курсы ученика: ${studentName}</h3>
            <div style="margin-bottom: 1rem;">
                <select id="addCourseSelect" style="padding: 0.5rem; margin-right: 0.5rem;">
                    <option value="">Выберите курс для добавления</option>
        `;
        
        if (allCourses) {
            allCourses.forEach(course => {
                const isEnrolled = enrollments && enrollments.some(e => e.courseId === course.id || e.courseId === course.courseId);
                if (!isEnrolled) {
                    html += `<option value="${course.id || course.courseId}">${course.name}</option>`;
                }
            });
        }
        
        html += `
                </select>
                <button class="btn btn-primary" onclick="addCourseToStudent(${userId})">Добавить курс</button>
            </div>
            <table style="width: 100%;">
                <thead>
                    <tr>
                        <th>Название курса</th>
                        <th>Дата записи</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        if (enrollments && enrollments.length > 0) {
            enrollments.forEach(enrollment => {
                html += `
                    <tr>
                        <td>${enrollment.courseName || '-'}</td>
                        <td>${formatDate(enrollment.enrollmentDate)}</td>
                        <td>${enrollment.status || 'PENDING'}</td>
                        <td>
                            <button class="btn btn-small btn-danger" onclick="removeEnrollment(${enrollment.enrollmentId}, ${userId})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Удалить</button>
                        </td>
                    </tr>
                `;
            });
        } else {
            html += '<tr><td colspan="4">Нет записей на курсы</td></tr>';
        }
        
        html += `
                </tbody>
            </table>
            <div style="margin-top: 1rem;">
                <button class="btn btn-secondary" onclick="closeCoursesModal()">Закрыть</button>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'coursesModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto;">
                ${html}
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        alert('Ошибка загрузки курсов: ' + (error.message || 'Неизвестная ошибка'));
    }
}

function closeCoursesModal() {
    const modal = document.getElementById('coursesModal');
    if (modal) {
        modal.remove();
    }
}

async function addCourseToStudent(userId) {
    const courseId = document.getElementById('addCourseSelect').value;
    if (!courseId) {
        alert('Выберите курс');
        return;
    }
    
    try {
        await apiCall(`/admin/users/${userId}/enrollments`, {
            method: 'POST',
            body: { courseId: parseInt(courseId) }
        });
        showMessage('Курс успешно добавлен');
        closeCoursesModal();
        loadUsers();
    } catch (error) {
        alert('Ошибка добавления курса: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function removeEnrollment(enrollmentId, userId) {
    if (!confirm('Удалить запись на курс?')) {
        return;
    }
    
    try {
        await apiCall(`/admin/enrollments/${enrollmentId}`, {
            method: 'DELETE'
        });
        showMessage('Запись на курс удалена');
        closeCoursesModal();
        loadUsers();
    } catch (error) {
        alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function changeUserRole(userId, newRole) {
    const selectElement = document.getElementById(`roleSelect_${userId}`);
    const oldRole = selectElement ? selectElement.options[selectElement.selectedIndex].text : '';
    
    if (!confirm(`Изменить роль пользователя на ${newRole}?`)) {
        // Возвращаем выбранное значение обратно
        if (selectElement) {
            const users = usersData || [];
            const user = users.find(u => u.userId === userId);
            if (user) {
                selectElement.value = user.role;
            }
        }
        return;
    }

    try {
        const response = await apiCall(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: { newRole: newRole }
        });
        
        if (response) {
            showMessage('Роль успешно изменена');
            // Перезагружаем список пользователей
            await loadUsers();
        }
    } catch (error) {
        console.error('Ошибка изменения роли:', error);
        alert('Ошибка изменения роли: ' + (error.message || 'Неизвестная ошибка'));
        // Возвращаем выбранное значение обратно при ошибке
        if (selectElement) {
            const users = usersData || [];
            const user = users.find(u => u.userId === userId);
            if (user) {
                selectElement.value = user.role;
            }
        }
    }
}

async function deleteUser(userId) {
    const user = usersData.find(u => u.userId === userId);
    if (!user) {
        alert('Пользователь не найден');
        return;
    }
    
    const userName = user.fullName || user.username || 'пользователь';
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userName}"?\n\nЭто действие нельзя отменить!`)) {
        return;
    }
    
    try {
        const response = await apiCall(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response) {
            showMessage('Пользователь успешно удален');
            // Удаляем пароль из хранилища
            delete userPasswords[userId];
            // window.userPasswords уже ссылается на userPasswords, изменения синхронизируются автоматически
            // Перезагружаем список пользователей
            await loadUsers();
        }
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        alert('Ошибка удаления пользователя: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.deleteUser = deleteUser;

async function loadRoleHistory() {
    try {
        const history = await apiCall('/admin/role-history');
        if (history) {
            renderRoleHistory(history);
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

function renderRoleHistory(history) {
    const container = document.getElementById('roleHistory');
    if (!container) return;

    if (!history || history.length === 0) {
        container.innerHTML = '<p>История изменений пуста</p>';
        return;
    }

    let html = `
        <table style="width: 100%; margin-top: 1rem;">
            <thead>
                <tr>
                    <th>Пользователь</th>
                    <th>Старая роль</th>
                    <th>Новая роль</th>
                    <th>Изменено</th>
                    <th>Кем изменено</th>
                </tr>
            </thead>
            <tbody>
    `;

    history.forEach(item => {
        html += `
            <tr>
                <td>${item.username || '-'}</td>
                <td>${item.oldRole || '-'}</td>
                <td>${item.newRole || '-'}</td>
                <td>${formatDateTime(item.changedAt)}</td>
                <td>${item.changedByUsername || '-'}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}
