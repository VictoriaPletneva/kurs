let studentsData = [];

async function loadStudents() {
    try {
        const students = await apiCall('/students');
        if (students) {
            studentsData = students;
            renderStudents(students);
        }
    } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
    }
}

function renderStudents(students) {
    const container = document.getElementById('studentsContent');
    if (!container) return;
    
    const currentRole = localStorage.getItem('role');
    const isRegistrar = currentRole === 'REGISTRAR';

    if (!students || students.length === 0) {
        container.innerHTML = '<p>Нет данных об учениках</p>';
        return;
    }

    let html = '';
    if (isRegistrar) {
        html += '<div style="margin-bottom: 1.5rem;">';
        html += '<button class="btn btn-primary" onclick="showCreateUserForm()" style="padding: 0.75rem 1.5rem; font-size: 1rem;">➕ Создать пользователя</button>';
        html += '</div>';
    }
    
    html += `
        <table>
            <thead>
                <tr>
                    <th>ФИО</th>
                    <th>Возраст</th>
                    <th>Контакты</th>
                    <th>Email</th>
                    <th>Дата регистрации</th>
                    ${!isRegistrar ? '<th>Расписание</th><th>Действия</th>' : '<th>Действия</th>'}
                </tr>
            </thead>
            <tbody>
    `;

    students.forEach(student => {
        html += `
            <tr>
                <td>${student.fullName || '-'}</td>
                <td>${student.age || '-'}</td>
                <td>${student.contactInfo || '-'}</td>
                <td>${student.email || '-'}</td>
                <td>${formatDate(student.registrationDate)}</td>
                ${!isRegistrar ? `
                <td>
                    <button class="btn btn-secondary" onclick="showStudentSchedule(${student.studentId})">Календарь</button>
                </td>
                <td>
                    <button class="btn btn-primary" onclick="viewStudentGrades(${student.studentId}, '${(student.fullName || '').replace(/'/g, "\\'")}')">Оценки</button>
                    <button class="btn btn-primary" onclick="viewStudentWorks(${student.studentId}, '${(student.fullName || '').replace(/'/g, "\\'")}')" style="margin-left: 0.5rem;">Работы</button>
                    ${currentRole === 'ADMIN' ? `
                        <button class="btn btn-secondary" onclick="editStudent(${student.studentId})" style="margin-left: 0.5rem;">Редактировать</button>
                        <button class="btn btn-danger" onclick="deleteStudent(${student.studentId})" style="margin-left: 0.5rem;">Удалить</button>
                    ` : ''}
                </td>
                ` : `
                <td>
                    <button class="btn btn-secondary" onclick="editStudent(${student.studentId})" style="margin-right: 0.5rem;">Редактировать</button>
                    <button class="btn btn-danger" onclick="deleteStudent(${student.studentId})">Удалить</button>
                </td>
                `}
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

async function showStudentSchedule(studentId) {
    const student = studentsData.find(s => s.studentId === studentId);
    if (!student) {
        alert('Ученик не найден');
        return;
    }
    if (!student.userId) {
        alert('У ученика нет привязанного пользователя для загрузки расписания');
        return;
    }

    try {
        const enrollments = await apiCall(`/admin/users/${student.userId}/enrollments`);
        if (!enrollments || enrollments.length === 0) {
            alert('У ученика нет записей на курсы');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Расписание ученика: ${student.fullName || 'Неизвестно'}</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div style="padding: 1.5rem;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 0.75rem; border: 1px solid #ddd;">Курс</th>
                                <th style="padding: 0.75rem; border: 1px solid #ddd;">Дата и время</th>
                                <th style="padding: 0.75rem; border: 1px solid #ddd;">Аудитория</th>
                                <th style="padding: 0.75rem; border: 1px solid #ddd;">Преподаватель</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${enrollments.map(e => `
                                <tr>
                                    <td style="padding: 0.75rem; border: 1px solid #ddd;">${e.courseName || 'Не указан'}</td>
                                    <td style="padding: 0.75rem; border: 1px solid #ddd;">${e.dateTime ? formatDateTime(e.dateTime) : '-'}</td>
                                    <td style="padding: 0.75rem; border: 1px solid #ddd;">${e.room || '-'}</td>
                                    <td style="padding: 0.75rem; border: 1px solid #ddd;">${e.teacherName || 'Не назначен'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        alert('Ошибка загрузки расписания: ' + (error.message || 'Неизвестная ошибка'));
    }
}

function searchStudents() {
    const searchTerm = document.getElementById('searchStudents').value.toLowerCase();
    const filtered = studentsData.filter(s => 
        (s.fullName && s.fullName.toLowerCase().includes(searchTerm)) ||
        (s.email && s.email.toLowerCase().includes(searchTerm))
    );
    renderStudents(filtered);
}

function sortStudents() {
    const sortBy = document.getElementById('sortStudents').value;
    let sorted = [...studentsData];
    
    switch(sortBy) {
        case 'fullName':
            sorted.sort((a, b) => {
                const nameA = (a.fullName || '').toLowerCase();
                const nameB = (b.fullName || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;
        case 'age':
            sorted.sort((a, b) => {
                const ageA = a.age || 0;
                const ageB = b.age || 0;
                return ageA - ageB;
            });
            break;
        case 'registrationDate':
            sorted.sort((a, b) => {
                const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
                const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
                return dateB - dateA; // Новые сначала
            });
            break;
    }
    
    renderStudents(sorted);
}

async function deleteStudent(id) {
    if (!confirm('Вы уверены, что хотите удалить этого ученика?')) {
        return;
    }

    try {
        await apiCall(`/students/${id}`, { method: 'DELETE' });
        if (typeof showMessage === 'function') {
            showMessage('Ученик удален');
        } else {
            alert('Ученик удален');
        }
        loadStudents();
    } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка удаления: ' + (error.message || 'Неизвестная ошибка'));
    }
}

function editStudent(id) {
    const student = studentsData.find(s => s.studentId === id);
    if (!student) {
        alert('Ученик не найден');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Редактировать ученика</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleUpdateStudent(event, ${id})">
                <div class="form-group">
                    <label>ФИО: <input type="text" id="editStudentFullName" value="${(student.fullName || '').replace(/"/g, '&quot;')}" required></label>
                </div>
                <div class="form-group">
                    <label>Возраст: <input type="number" id="editStudentAge" value="${student.age || ''}" min="14"></label>
                </div>
                <div class="form-group">
                    <label>Email: <input type="email" id="editStudentEmail" value="${(student.email || '').replace(/"/g, '&quot;')}" required></label>
                </div>
                <div class="form-group">
                    <label>Контакты: <input type="text" id="editStudentContactInfo" value="${(student.contactInfo || '').replace(/"/g, '&quot;')}"></label>
                </div>
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleUpdateStudent(event, id) {
    event.preventDefault();
    const data = {
        fullName: document.getElementById('editStudentFullName').value,
        age: document.getElementById('editStudentAge').value ? parseInt(document.getElementById('editStudentAge').value) : null,
        email: document.getElementById('editStudentEmail').value,
        contactInfo: document.getElementById('editStudentContactInfo').value
    };

    try {
        await apiCall(`/students/${id}`, {
            method: 'PUT',
            body: data
        });
        if (typeof showMessage === 'function') {
            showMessage('Ученик успешно обновлен');
        } else {
            alert('Ученик успешно обновлен');
        }
        document.querySelector('.modal').remove();
        loadStudents();
    } catch (error) {
        alert('Ошибка обновления: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function viewStudentGrades(studentId, studentName) {
    try {
        const grades = await apiCall(`/students/${studentId}/grades`);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        let html = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px 8px 0 0;">
                    <h3 style="margin: 0; font-size: 1.5rem;">📊 Оценки студента: ${studentName}</h3>
                    <span class="close" onclick="this.closest('.modal').remove()" style="color: white; font-size: 1.5rem;">&times;</span>
                </div>
                <div style="padding: 1.5rem; background: #f8f9fa;">
        `;
        
        if (!grades || grades.length === 0) {
            html += '<p style="text-align: center; color: #666; padding: 2rem;">Нет оценок</p>';
        } else {
            html += '<table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">';
            html += '<thead><tr style="background: #667eea; color: white;"><th style="padding: 1rem;">Курс</th><th style="padding: 1rem;">Оценка</th><th style="padding: 1rem;">Дата</th><th style="padding: 1rem;">Комментарий</th></tr></thead>';
            html += '<tbody>';
            grades.forEach(grade => {
                html += `<tr>
                    <td style="padding: 0.75rem; border-bottom: 1px solid #eee;">${grade.courseName || '-'}</td>
                    <td style="padding: 0.75rem; border-bottom: 1px solid #eee; text-align: center; font-weight: bold; font-size: 1.2rem; color: ${grade.grade >= 4 ? '#28a745' : grade.grade >= 3 ? '#ffc107' : '#dc3545'};">${grade.grade}</td>
                    <td style="padding: 0.75rem; border-bottom: 1px solid #eee;">${grade.date ? formatDate(grade.date) : '-'}</td>
                    <td style="padding: 0.75rem; border-bottom: 1px solid #eee;">${grade.review || '-'}</td>
                </tr>`;
            });
            html += '</tbody></table>';
        }
        
        html += `
                </div>
            </div>
        `;
        
        modal.innerHTML = html;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Ошибка загрузки оценок:', error);
        alert('Ошибка загрузки оценок: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function viewStudentWorks(studentId, studentName) {
    try {
        const works = await apiCall(`/students/${studentId}/works`);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        let html = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px 8px 0 0;">
                    <h3 style="margin: 0; font-size: 1.5rem;">📁 Работы студента: ${studentName}</h3>
                    <span class="close" onclick="this.closest('.modal').remove()" style="color: white; font-size: 1.5rem;">&times;</span>
                </div>
                <div style="padding: 1.5rem; background: #f8f9fa;">
        `;
        
        if (!works || works.length === 0) {
            html += '<p style="text-align: center; color: #666; padding: 2rem;">Нет загруженных работ</p>';
        } else {
            html += '<div style="display: grid; gap: 1rem;">';
            works.forEach(work => {
                const apiBase = window.API_BASE || '/api';
                const token = localStorage.getItem('token');
                const downloadUrl = `${apiBase}/students/${studentId}/works/${work.workId}/download`;
                
                html += `
                    <div style="padding: 1rem; background: white; border-radius: 8px; border-left: 4px solid #667eea; display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1;">
                            <strong style="font-size: 1.1rem;">${work.title || 'Без названия'}</strong>
                            ${work.description ? `<p style="color: #666; margin: 0.5rem 0;">${work.description}</p>` : ''}
                            <div style="font-size: 0.9rem; color: #999; margin-top: 0.5rem;">
                                ${work.fileName ? `<span>📄 ${work.fileName}</span>` : ''}
                                ${work.uploadDate ? `<span style="margin-left: 1rem;">📅 ${formatDate(work.uploadDate)}</span>` : ''}
                                ${work.fileSize ? `<span style="margin-left: 1rem;">💾 ${(work.fileSize / 1024).toFixed(2)} KB</span>` : ''}
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                            <button class="btn btn-secondary" onclick="downloadStudentWork(${studentId}, ${work.workId}, '${(work.fileName || '').replace(/'/g, "\\'")}')" style="padding: 0.5rem 1rem; font-size: 0.9rem;">👁️ Просмотр</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += `
                </div>
            </div>
        `;
        
        modal.innerHTML = html;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Ошибка загрузки работ:', error);
        alert('Ошибка загрузки работ: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function downloadStudentWork(studentId, workId, fileName) {
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

window.searchStudents = searchStudents;
window.sortStudents = sortStudents;
window.deleteStudent = deleteStudent;
window.editStudent = editStudent;
window.handleUpdateStudent = handleUpdateStudent;
window.viewStudentGrades = viewStudentGrades;
window.viewStudentWorks = viewStudentWorks;
window.showStudentSchedule = showStudentSchedule;
window.downloadStudentWork = downloadStudentWork;
