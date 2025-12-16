async function loadProfile() {
    try {
        const container = document.getElementById('profileContent');
        if (!container) {
            console.error('Контейнер profileContent не найден');
            return;
        }

        // Получаем информацию о текущем пользователе
        const userInfo = await apiCall('/auth/me');
        if (!userInfo) {
            container.innerHTML = '<p class="error-message">Ошибка загрузки профиля</p>';
            return;
        }
        
        // Сохраняем в глобальную переменную, если она доступна
        if (typeof currentUser !== 'undefined') {
            currentUser = userInfo;
        }
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        
        const role = userInfo.role || localStorage.getItem('role');

        let html = '<div class="card">';
        html += '<h3>👤 Информация о пользователе</h3>';
        html += `<p><strong>Логин:</strong> ${userInfo.username || '-'}</p>`;
        html += `<p><strong>Роль:</strong> ${userInfo.role || '-'}</p>`;
        
        // Если это преподаватель, показываем информацию о преподавателе
        if (userInfo.role === 'TEACHER' && userInfo.fullName) {
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📋 Личные данные</h4>';
            html += `<p><strong>ФИО:</strong> ${userInfo.fullName || '-'}</p>`;
            html += `<p><strong>Email:</strong> ${userInfo.email || '-'}</p>`;
            html += `<p><strong>Специализация:</strong> ${userInfo.specialization || 'Не указано'}</p>`;
            html += `<p><strong>Опыт работы:</strong> ${userInfo.experience || 0} лет</p>`;
            
            // Кнопка редактирования профиля
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📝 Управление профилем</h4>';
            html += '<button class="btn btn-primary" onclick="showEditTeacherProfileForm()">✏️ Редактировать профиль</button>';
        } else if (userInfo.role === 'TEACHER') {
            // Если у преподавателя нет полной информации, загружаем её
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📋 Личные данные</h4>';
            html += `<p><strong>ФИО:</strong> ${userInfo.fullName || 'Не указано'}</p>`;
            html += `<p><strong>Email:</strong> ${userInfo.email || 'Не указано'}</p>`;
            html += `<p><strong>Специализация:</strong> ${userInfo.specialization || 'Не указано'}</p>`;
            html += `<p><strong>Опыт работы:</strong> ${userInfo.experience || 0} лет</p>`;
            
            // Кнопка редактирования профиля
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📝 Управление профилем</h4>';
            html += '<button class="btn btn-primary" onclick="showEditTeacherProfileForm()">✏️ Редактировать профиль</button>';
        }
        
        // Если это админ, показываем информацию об админе
        if (userInfo.role === 'ADMIN') {
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📋 Личные данные</h4>';
            html += `<p><strong>ФИО:</strong> ${userInfo.fullName || 'Не указано'}</p>`;
            html += `<p><strong>Логин:</strong> ${userInfo.username || '-'}</p>`;
            html += `<p><strong>Email:</strong> ${userInfo.email || 'Не указано'}</p>`;
            html += `<p><strong>Контакты:</strong> ${userInfo.contactInfo || 'Не указано'}</p>`;
            html += `<p><strong>Возраст:</strong> ${userInfo.age || 'Не указано'}</p>`;
            
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📝 Управление профилем</h4>';
            html += '<button class="btn btn-primary" onclick="showEditAdminProfileForm()">✏️ Редактировать профиль</button>';
        }
        
        // Если это регистратор, показываем информацию о регистраторе
        if (userInfo.role === 'REGISTRAR') {
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📋 Личные данные</h4>';
            html += `<p><strong>ФИО:</strong> ${userInfo.fullName || 'Не указано'}</p>`;
            html += `<p><strong>Логин:</strong> ${userInfo.username || '-'}</p>`;
            html += `<p><strong>Email:</strong> ${userInfo.email || 'Не указано'}</p>`;
            html += `<p><strong>Контакты:</strong> ${userInfo.contactInfo || 'Не указано'}</p>`;
            html += `<p><strong>Возраст:</strong> ${userInfo.age || 'Не указано'}</p>`;
            
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📝 Управление профилем</h4>';
            html += '<button class="btn btn-primary" onclick="showEditRegistrarProfileForm()">✏️ Редактировать профиль</button>';
        }
        
        // Если это студент, показываем дополнительную информацию
        if (userInfo.role === 'STUDENT' && userInfo.fullName) {
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📋 Личные данные</h4>';
            html += `<p><strong>ФИО:</strong> ${userInfo.fullName || '-'}</p>`;
            html += `<p><strong>Возраст:</strong> ${userInfo.age || '-'}</p>`;
            html += `<p><strong>Email:</strong> ${userInfo.email || '-'}</p>`;
            html += `<p><strong>Контакты:</strong> ${userInfo.contactInfo || 'Не указано'}</p>`;
            
            // Показываем записи на курсы
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📚 Мои записи на курсы</h4>';
            try {
                const enrollments = await apiCall('/enrollments/me');
                if (enrollments && enrollments.length > 0) {
                    html += '<ul style="list-style: none; padding: 0;">';
                    enrollments.forEach(enrollment => {
                        const courseName = enrollment.course?.name || enrollment.courseName || 'Курс';
                        html += `<li style="padding: 0.75rem; margin: 0.5rem 0; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                            <strong>${courseName}</strong>
                            ${enrollment.enrollmentDate ? `<br><small style="color: #999;">Дата записи: ${formatDate(enrollment.enrollmentDate)}</small>` : ''}
                        </li>`;
                    });
                    html += '</ul>';
                    html += '<p style="color: #666; font-size: 0.9rem; margin-top: 1rem;"><em>💡 Расписание для ваших курсов можно посмотреть в разделе "Расписание"</em></p>';
                } else {
                    html += '<p style="color: #666;">Вы еще не записались ни на один курс</p>';
                }
            } catch (error) {
                html += '<p style="color: #e74c3c;">Ошибка загрузки записей: ' + (error.message || 'Неизвестная ошибка') + '</p>';
            }
            
            // Кнопка редактирования профиля
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>📝 Управление профилем</h4>';
            html += '<button class="btn btn-primary" onclick="showEditProfileForm()" style="margin-right: 0.5rem;">✏️ Редактировать профиль</button>';
            html += '<button class="btn btn-secondary" onclick="showUploadWorkForm()">📤 Загрузить работу</button>';
            
            // Раздел загруженных работ
            html += '<hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #ddd;">';
            html += '<h4>🎨 Мои работы</h4>';
            html += '<div id="studentWorks"></div>';
            // Загружаем работы после того, как HTML будет вставлен в DOM
            setTimeout(() => {
                if (typeof loadStudentWorks === 'function') {
                    // Загружаем работы после того, как HTML будет вставлен в DOM
        setTimeout(() => {
            if (typeof loadStudentWorks === 'function') {
                loadStudentWorks();
            }
        }, 100);
                }
            }, 100);
        }
        
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        const container = document.getElementById('profileContent');
        if (container) {
            container.innerHTML = '<p class="error-message">Ошибка загрузки профиля: ' + (error.message || 'Неизвестная ошибка') + '</p>';
        }
    }
}

// Функция для редактирования профиля преподавателя
window.showEditTeacherProfileForm = function() {
    const userInfo = (typeof currentUser !== 'undefined' && currentUser) || JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo || userInfo.role !== 'TEACHER') {
        alert('Редактирование доступно только для преподавателей');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Редактировать профиль преподавателя</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleUpdateTeacherProfile(event)">
                <div class="form-group">
                    <label>ФИО: <input type="text" id="editTeacherFullName" value="${userInfo.fullName || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Email: <input type="email" id="editTeacherEmail" value="${userInfo.email || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Специализация: <input type="text" id="editTeacherSpecialization" value="${userInfo.specialization || ''}"></label>
                </div>
                <div class="form-group">
                    <label>Опыт работы (лет): <input type="number" id="editTeacherExperience" value="${userInfo.experience || 0}" min="0"></label>
                </div>
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleUpdateTeacherProfile(event) {
    event.preventDefault();
    const userInfo = currentUser || JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.teacherId) {
        alert('ID преподавателя не найден');
        return;
    }
    
    const data = {
        fullName: document.getElementById('editTeacherFullName').value,
        email: document.getElementById('editTeacherEmail').value,
        specialization: document.getElementById('editTeacherSpecialization').value,
        experience: document.getElementById('editTeacherExperience').value ? parseInt(document.getElementById('editTeacherExperience').value) : 0
    };
    
    try {
        await apiCall(`/teachers/${userInfo.teacherId}`, {
            method: 'PUT',
            body: data
        });
        if (typeof showMessage === 'function') {
            showMessage('Профиль успешно обновлен');
        } else {
            alert('Профиль успешно обновлен');
        }
        document.querySelector('.modal').remove();
        // Обновляем информацию о пользователе
        const updatedUserInfo = await apiCall('/auth/me');
        if (updatedUserInfo) {
            if (typeof currentUser !== 'undefined') {
                currentUser = updatedUserInfo;
            }
            localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        }
        loadProfile();
    } catch (error) {
        alert('Ошибка обновления профиля: ' + (error.message || 'Неизвестная ошибка'));
    }
}

function showEditProfileForm() {
    const userInfo = (typeof currentUser !== 'undefined' && currentUser) || JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo || userInfo.role !== 'STUDENT') {
        alert('Редактирование доступно только для учеников');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Редактировать профиль</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleUpdateProfile(event)">
                <div class="form-group">
                    <label>ФИО: <input type="text" id="editProfileFullName" value="${userInfo.fullName || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Возраст: <input type="number" id="editProfileAge" value="${userInfo.age || ''}" min="14"></label>
                </div>
                <div class="form-group">
                    <label>Email: <input type="email" id="editProfileEmail" value="${userInfo.email || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Контакты: <input type="text" id="editProfileContactInfo" value="${userInfo.contactInfo || ''}"></label>
                </div>
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleUpdateProfile(event) {
    event.preventDefault();
    const userInfo = currentUser || JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.studentId) {
        alert('ID ученика не найден');
        return;
    }
    
    const data = {
        fullName: document.getElementById('editProfileFullName').value,
        age: document.getElementById('editProfileAge').value ? parseInt(document.getElementById('editProfileAge').value) : null,
        email: document.getElementById('editProfileEmail').value,
        contactInfo: document.getElementById('editProfileContactInfo').value
    };
    
    try {
        await apiCall(`/students/${userInfo.studentId}`, {
            method: 'PUT',
            body: data
        });
        if (typeof showMessage === 'function') {
            showMessage('Профиль успешно обновлен');
        } else {
            alert('Профиль успешно обновлен');
        }
        document.querySelector('.modal').remove();
        loadProfile();
    } catch (error) {
        alert('Ошибка обновления профиля: ' + (error.message || 'Неизвестная ошибка'));
    }
}

function showUploadWorkForm() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Загрузить работу</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleUploadWork(event)">
                <div class="form-group">
                    <label>Название работы: <input type="text" id="workTitle" required></label>
                </div>
                <div class="form-group">
                    <label>Описание: <textarea id="workDescription" style="width: 100%; min-height: 80px;"></textarea></label>
                </div>
                <div class="form-group">
                    <label>Файл: <input type="file" id="workFile" accept="image/*,application/pdf"></label>
                </div>
                <button type="submit" class="btn btn-primary">Загрузить</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleUploadWork(event) {
    event.preventDefault();
    const title = document.getElementById('workTitle').value;
    const description = document.getElementById('workDescription').value;
    const fileInput = document.getElementById('workFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Пожалуйста, выберите файл');
        return;
    }
    
    try {
        const userInfo = currentUser || JSON.parse(localStorage.getItem('userInfo') || '{}');
        const studentId = userInfo.studentId;
        
        if (!studentId) {
            alert('ID ученика не найден');
            return;
        }
        
        // Создаем FormData для загрузки файла
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('file', file);
        
        // Отправляем на сервер
        const apiBase = window.API_BASE || '/api';
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiBase}/students/${studentId}/works`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Ошибка загрузки работы');
        }
        
        const result = await response.json();
        
        if (typeof showMessage === 'function') {
            showMessage('Работа успешно загружена');
        } else {
            alert('Работа успешно загружена');
        }
        document.querySelector('.modal').remove();
        // Загружаем работы после того, как HTML будет вставлен в DOM
        setTimeout(() => {
            if (typeof loadStudentWorks === 'function') {
                loadStudentWorks();
            }
        }, 100);
    } catch (error) {
        alert('Ошибка загрузки работы: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function loadStudentWorks() {
    const container = document.getElementById('studentWorks');
    if (!container) return;
    
    const userInfo = (typeof currentUser !== 'undefined' && currentUser) || JSON.parse(localStorage.getItem('userInfo') || '{}');
    const studentId = userInfo.studentId;
    
    if (!studentId) {
        container.innerHTML = '<p style="color: #666;">ID ученика не найден</p>';
        return;
    }
    
    try {
        // Загружаем работы с сервера
        const works = await apiCall(`/students/${studentId}/works`);
        
        if (!works || works.length === 0) {
            container.innerHTML = '<p style="color: #666;">Загруженные работы будут отображаться здесь</p>';
            return;
        }
        
        let html = '<ul style="list-style: none; padding: 0;">';
        works.forEach(work => {
            const apiBase = window.API_BASE || '/api';
            const token = localStorage.getItem('token');
            const downloadUrl = `${apiBase}/students/${studentId}/works/${work.workId}/download`;
            
            html += `
                <li style="padding: 1rem; margin: 0.5rem 0; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea; display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <strong>${work.title || 'Без названия'}</strong>
                        ${work.description ? `<p style="color: #666; margin: 0.5rem 0;">${work.description}</p>` : ''}
                        <div style="font-size: 0.9rem; color: #999;">
                            ${work.fileName ? `<span>📄 ${work.fileName}</span>` : ''}
                            ${work.uploadDate ? `<span style="margin-left: 1rem;">📅 ${formatDate(work.uploadDate)}</span>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                        <button class="btn btn-secondary" onclick="downloadWork(${studentId}, ${work.workId}, '${(work.fileName || '').replace(/'/g, "\\'")}')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">👁️ Просмотр</button>
                        <button class="btn btn-danger" onclick="deleteWork(${studentId}, ${work.workId})" style="padding: 0.5rem 1rem; font-size: 0.9rem;">🗑️ Удалить</button>
                    </div>
                </li>
            `;
        });
        html += '</ul>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки работ:', error);
        container.innerHTML = '<p style="color: #dc3545;">Ошибка загрузки работ: ' + (error.message || 'Неизвестная ошибка') + '</p>';
    }
}

async function downloadWork(studentId, workId, fileName) {
    try {
        const apiBase = window.API_BASE || '/api';
        const token = localStorage.getItem('token');
        const url = `${apiBase}/students/${studentId}/works/${workId}/download`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки файла');
        }
        
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName || 'work';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        alert('Ошибка загрузки работы: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function deleteWork(studentId, workId) {
    if (!confirm('Вы уверены, что хотите удалить эту работу?')) {
        return;
    }
    
    try {
        await apiCall(`/students/${studentId}/works/${workId}`, {
            method: 'DELETE'
        });
        if (typeof showMessage === 'function') {
            showMessage('Работа успешно удалена');
        } else {
            alert('Работа успешно удалена');
        }
        // Загружаем работы после того, как HTML будет вставлен в DOM
        setTimeout(() => {
            if (typeof loadStudentWorks === 'function') {
                loadStudentWorks();
            }
        }, 100);
    } catch (error) {
        alert('Ошибка удаления работы: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.downloadWork = downloadWork;
window.deleteWork = deleteWork;

// Функции для админа (showAdminPassword больше не нужна, так как пароль не отображается)

function showEditAdminProfileForm() {
    const userInfo = currentUser || JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo || userInfo.role !== 'ADMIN') {
        alert('Редактирование доступно только для администраторов');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Редактировать профиль администратора</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleUpdateAdminProfile(event)">
                <div class="form-group">
                    <label>ФИО: <input type="text" id="editAdminFullName" value="${userInfo.fullName || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Логин: <input type="text" id="editAdminUsername" value="${userInfo.username || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Email: <input type="email" id="editAdminEmail" value="${userInfo.email || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Контакты: <input type="text" id="editAdminContactInfo" value="${userInfo.contactInfo || ''}"></label>
                </div>
                <div class="form-group">
                    <label>Возраст: <input type="number" id="editAdminAge" value="${userInfo.age || ''}" min="18"></label>
                </div>
                <div class="form-group">
                    <label>Новый пароль (оставьте пустым, чтобы не менять): <input type="password" id="editAdminPassword"></label>
                </div>
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

window.showEditAdminProfileForm = showEditAdminProfileForm;

async function handleUpdateAdminProfile(event) {
    event.preventDefault();
    const userInfo = (typeof currentUser !== 'undefined' && currentUser) || JSON.parse(localStorage.getItem('userInfo') || '{}');
    const data = {
        fullName: document.getElementById('editAdminFullName').value,
        username: document.getElementById('editAdminUsername').value,
        email: document.getElementById('editAdminEmail').value,
        contactInfo: document.getElementById('editAdminContactInfo').value,
        age: document.getElementById('editAdminAge').value ? parseInt(document.getElementById('editAdminAge').value) : null
    };
    
    const password = document.getElementById('editAdminPassword').value;
    if (password && password.trim() !== '') {
        data.password = password;
    }
    
    try {
        await apiCall('/admin/profile', {
            method: 'PUT',
            body: data
        });
        showMessage('Профиль успешно обновлен');
        document.querySelector('.modal').remove();
        const updatedUserInfo = await apiCall('/auth/me');
        if (updatedUserInfo) {
            currentUser = updatedUserInfo;
            localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        }
        loadProfile();
    } catch (error) {
        alert('Ошибка обновления профиля: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.handleUpdateAdminProfile = handleUpdateAdminProfile;

function showEditRegistrarProfileForm() {
    const userInfo = (typeof currentUser !== 'undefined' && currentUser) || JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo || userInfo.role !== 'REGISTRAR') {
        alert('Редактирование доступно только для регистраторов');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Редактировать профиль регистратора</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleUpdateRegistrarProfile(event)">
                <div class="form-group">
                    <label>ФИО: <input type="text" id="editRegistrarFullName" value="${userInfo.fullName || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Email: <input type="email" id="editRegistrarEmail" value="${userInfo.email || ''}" required></label>
                </div>
                <div class="form-group">
                    <label>Контакты: <input type="text" id="editRegistrarContactInfo" value="${userInfo.contactInfo || ''}"></label>
                </div>
                <div class="form-group">
                    <label>Возраст: <input type="number" id="editRegistrarAge" value="${userInfo.age || ''}" min="18"></label>
                </div>
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleUpdateRegistrarProfile(event) {
    event.preventDefault();
    const userInfo = (typeof currentUser !== 'undefined' && currentUser) || JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.userId && !userInfo.registrarId) {
        alert('ID регистратора не найден');
        return;
    }
    
    const data = {
        fullName: document.getElementById('editRegistrarFullName').value,
        email: document.getElementById('editRegistrarEmail').value,
        contactInfo: document.getElementById('editRegistrarContactInfo').value,
        age: document.getElementById('editRegistrarAge').value ? parseInt(document.getElementById('editRegistrarAge').value) : null
    };
    
    try {
        // Используем userId, так как endpoint принимает userId
        const registrarId = userInfo.userId || userInfo.registrarId;
        await apiCall(`/registrars/${registrarId}`, {
            method: 'PUT',
            body: data
        });
        if (typeof showMessage === 'function') {
            showMessage('Профиль успешно обновлен');
        } else {
            alert('Профиль успешно обновлен');
        }
        document.querySelector('.modal').remove();
        const updatedUserInfo = await apiCall('/auth/me');
        if (updatedUserInfo) {
            if (typeof currentUser !== 'undefined') {
                currentUser = updatedUserInfo;
            }
            localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
        }
        loadProfile();
    } catch (error) {
        alert('Ошибка обновления профиля: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.showEditRegistrarProfileForm = showEditRegistrarProfileForm;
window.handleUpdateRegistrarProfile = handleUpdateRegistrarProfile;


