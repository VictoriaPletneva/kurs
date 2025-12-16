let coursesData = [];
let teachersData = [];

async function loadCourses() {
    try {
        const courses = await apiCall('/courses');
        if (courses) {
            const role = localStorage.getItem('role');
            
            // Для преподавателя фильтруем только его курсы
            let filteredCourses = courses;
            if (role === 'TEACHER') {
                const userInfo = await apiCall('/auth/me');
                if (userInfo && userInfo.teacherId) {
                    filteredCourses = courses.filter(c => c.teacherId === userInfo.teacherId);
                }
            }
            
            coursesData = filteredCourses;
            if (role === 'ADMIN') {
                // получаем преподавателей для назначения на курсы
                teachersData = await apiCall('/teachers');
            }
            renderCourses(filteredCourses);
        }
    } catch (error) {
        console.error('Ошибка загрузки курсов:', error);
    }
}

function renderCourses(courses) {
    const container = document.getElementById('coursesContent');
    if (!container) return;

    if (!courses || courses.length === 0) {
        container.innerHTML = '<p>Нет доступных курсов</p>';
        return;
    }

    const role = localStorage.getItem('role');
    const isAdmin = role === 'ADMIN';

    let adminToolbar = '';
    if (isAdmin) {
        adminToolbar = `
            <div style="margin-bottom: 1rem; display: flex; gap: .5rem; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="showCreateCourseModal()">+ Создать курс</button>
                <small style="color:#555;">Назначайте преподавателя сразу при создании, чтобы расписание и список студентов синхронизировались.</small>
            </div>
        `;
    }

    let html = `
        ${adminToolbar}
        <table>
            <thead>
                <tr>
                    <th>Название</th>
                    <th>Описание</th>
                    <th>Преподаватель</th>
                    <th>Макс. учеников</th>
                    <th>Статус</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;

    courses.forEach(course => {
        const role = localStorage.getItem('role');
        const isTeacher = role === 'TEACHER';
        const userInfo = currentUser || JSON.parse(localStorage.getItem('userInfo') || '{}');
        const isMyCourse = isTeacher && course.teacherId === userInfo.teacherId;
        
        html += `
            <tr>
                <td>${course.name || '-'}</td>
                <td>${course.description || '-'}</td>
                <td>${course.teacherName || '-'}</td>
                <td>${course.maxStudents || '-'}</td>
                <td>${course.status || '-'}</td>
                <td>
                    ${isAdmin ? `
                        <button class="btn btn-secondary" onclick="editCourse(${course.id || course.courseId})" style="margin-right:.25rem;">Редактировать</button>
                        <button class="btn btn-danger" onclick="deleteCourse(${course.id || course.courseId})">Удалить</button>
                    ` : isTeacher && isMyCourse ? `
                        <button class="btn btn-secondary" onclick="showCourseStudents(${course.id || course.courseId}, '${course.name || 'Курс'}')">Ученики</button>
                    ` : role === 'STUDENT' ? `
                        <button class="btn btn-success" onclick="enrollInCourse(${course.id || course.courseId})">Записаться</button>
                    ` : ''}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

async function enrollInCourse(courseId) {
    try {
        // Получаем расписание для этого курса
        const schedules = await apiCall(`/schedule/course/${courseId}`);
        
        if (!schedules || schedules.length === 0) {
            alert('Для этого курса еще не создано расписание. Обратитесь к администратору.');
            return;
        }
        
        // Показываем модальное окно с выбором даты
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        let scheduleOptions = '';
        schedules.forEach(schedule => {
            const dateStr = formatDateTime(schedule.dateTime);
            scheduleOptions += `<option value="${schedule.scheduleId}">${dateStr}${schedule.room ? ' - ' + schedule.room : ''}</option>`;
        });
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Запись на курс</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <form onsubmit="handleEnrollWithSchedule(event, ${courseId})">
                    <div class="form-group">
                        <label>Выберите дату и время занятия: 
                            <select id="enrollmentScheduleId" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;">
                                <option value="">Выберите дату</option>
                                ${scheduleOptions}
                            </select>
                        </label>
                    </div>
                    <button type="submit" class="btn btn-primary">Записаться</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Ошибка записи на курс:', error);
        showMessage('Ошибка записи на курс: ' + (error.message || 'Неизвестная ошибка'), 'error');
    }
}

async function handleEnrollWithSchedule(event, courseId) {
    event.preventDefault();
    const scheduleId = document.getElementById('enrollmentScheduleId').value;
    
    if (!scheduleId) {
        alert('Пожалуйста, выберите дату и время занятия');
        return;
    }
    
    try {
        console.log('Запись на занятие, scheduleId:', scheduleId);
        const result = await apiCall('/enrollments', {
            method: 'POST',
            body: { 
                scheduleId: parseInt(scheduleId)
            }
        });
        console.log('Результат записи:', result);
        if (typeof showMessage === 'function') {
            showMessage('Вы успешно записались на занятие');
        } else {
            alert('Вы успешно записались на занятие');
        }
        document.querySelector('.modal').remove();
        loadCourses();
        if (document.getElementById('profilePage') && document.getElementById('profilePage').style.display !== 'none') {
            loadProfile();
        }
        if (document.getElementById('schedulePage') && document.getElementById('schedulePage').style.display !== 'none') {
            loadSchedule();
        }
    } catch (error) {
        console.error('Ошибка записи на занятие:', error);
        showMessage(error.message || 'Ошибка записи на курс', 'error');
    }
}

// --------------------- Админ: управление курсами -----------------------

function buildTeachersOptions(selectedId) {
    if (!teachersData || teachersData.length === 0) {
        return '<option value="">Преподаватели не найдены</option>';
    }
    return teachersData.map(t => {
        const id = t.id || t.teacherId;
        const name = t.fullName || t.username || `Преподаватель ${id}`;
        const selected = selectedId && id === selectedId ? 'selected' : '';
        return `<option value="${id}" ${selected}>${name}</option>`;
    }).join('');
}

function showCreateCourseModal() {
    const modal = document.createElement('div');
    modal.id = 'courseModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
    modal.innerHTML = `
        <div style="background: white; padding: 1.5rem; border-radius: 8px; width: 90%; max-width: 520px;">
            <h3>Новый курс</h3>
            <form onsubmit="handleCreateCourse(event)">
                <div class="form-group">
                    <label>Название: <input type="text" id="courseName" required style="width:100%; padding:.5rem; margin-top:.25rem;"></label>
                </div>
                <div class="form-group">
                    <label>Описание: <textarea id="courseDescription" style="width:100%; padding:.5rem; margin-top:.25rem; min-height:70px;"></textarea></label>
                </div>
                <div class="form-group">
                    <label>Преподаватель:
                        <select id="courseTeacherId" required style="width:100%; padding:.5rem; margin-top:.25rem;">
                            <option value="">Выберите преподавателя</option>
                            ${buildTeachersOptions()}
                        </select>
                    </label>
                </div>
                <div class="form-group">
                    <label>Макс. учеников: <input type="number" id="courseMax" min="1" style="width:100%; padding:.5rem; margin-top:.25rem;" placeholder="например 15"></label>
                </div>
                <div class="form-group">
                    <label>Статус:
                        <select id="courseStatus" style="width:100%; padding:.5rem; margin-top:.25rem;">
                            <option value="ACTIVE" selected>ACTIVE</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                        </select>
                    </label>
                </div>
                <div style="margin-top:1rem;">
                    <button type="submit" class="btn btn-primary">Создать</button>
                    <button type="button" class="btn btn-secondary" onclick="closeCourseModal()" style="margin-left:.5rem;">Отмена</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeCourseModal() {
    const modal = document.getElementById('courseModal');
    if (modal) modal.remove();
}

async function handleCreateCourse(event) {
    event.preventDefault();
    try {
        await apiCall('/courses', {
            method: 'POST',
            body: {
                name: document.getElementById('courseName').value,
                description: document.getElementById('courseDescription').value,
                teacherId: parseInt(document.getElementById('courseTeacherId').value),
                maxStudents: document.getElementById('courseMax').value ? parseInt(document.getElementById('courseMax').value) : null,
                status: document.getElementById('courseStatus').value
            }
        });
        showMessage('Курс создан и преподаватель назначен');
        closeCourseModal();
        loadCourses();
    } catch (error) {
        showMessage(error.message || 'Ошибка создания курса', 'error');
    }
}

function editCourse(courseId) {
    const course = coursesData.find(c => (c.id || c.courseId) === courseId);
    if (!course) return;

    const modal = document.createElement('div');
    modal.id = 'courseModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';

    const teacherId = course.teacherId || course.teacher?.id || course.teacher?.teacherId || null;

    modal.innerHTML = `
        <div style="background: white; padding: 1.5rem; border-radius: 8px; width: 90%; max-width: 520px;">
            <h3>Редактирование курса</h3>
            <form onsubmit="handleEditCourse(event, ${courseId})">
                <div class="form-group">
                    <label>Название: <input type="text" id="editCourseName" value="${course.name || ''}" required style="width:100%; padding:.5rem; margin-top:.25rem;"></label>
                </div>
                <div class="form-group">
                    <label>Описание: <textarea id="editCourseDescription" style="width:100%; padding:.5rem; margin-top:.25rem; min-height:70px;">${course.description || ''}</textarea></label>
                </div>
                <div class="form-group">
                    <label>Преподаватель:
                        <select id="editCourseTeacherId" required style="width:100%; padding:.5rem; margin-top:.25rem;">
                            <option value="">Выберите преподавателя</option>
                            ${buildTeachersOptions(teacherId)}
                        </select>
                    </label>
                </div>
                <div class="form-group">
                    <label>Макс. учеников: <input type="number" id="editCourseMax" min="1" value="${course.maxStudents || ''}" style="width:100%; padding:.5rem; margin-top:.25rem;"></label>
                </div>
                <div class="form-group">
                    <label>Статус:
                        <select id="editCourseStatus" style="width:100%; padding:.5rem; margin-top:.25rem;">
                            <option value="ACTIVE" ${course.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                            <option value="COMPLETED" ${course.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
                            <option value="CANCELLED" ${course.status === 'CANCELLED' ? 'selected' : ''}>CANCELLED</option>
                        </select>
                    </label>
                </div>
                <div style="margin-top:1rem;">
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                    <button type="button" class="btn btn-secondary" onclick="closeCourseModal()" style="margin-left:.5rem;">Отмена</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleEditCourse(event, courseId) {
    event.preventDefault();
    try {
        await apiCall(`/courses/${courseId}`, {
            method: 'PUT',
            body: {
                name: document.getElementById('editCourseName').value,
                description: document.getElementById('editCourseDescription').value,
                teacherId: parseInt(document.getElementById('editCourseTeacherId').value),
                maxStudents: document.getElementById('editCourseMax').value ? parseInt(document.getElementById('editCourseMax').value) : null,
                status: document.getElementById('editCourseStatus').value
            }
        });
        showMessage('Данные курса обновлены');
        closeCourseModal();
        loadCourses();
    } catch (error) {
        showMessage(error.message || 'Ошибка сохранения курса', 'error');
    }
}

async function deleteCourse(courseId) {
    if (!confirm('Удалить курс? Будут удалены связанные записи в расписании.')) {
        return;
    }
    try {
        await apiCall(`/courses/${courseId}`, { method: 'DELETE' });
        showMessage('Курс удален');
        loadCourses();
    } catch (error) {
        showMessage(error.message || 'Ошибка удаления курса', 'error');
    }
}

async function showCourseStudents(courseId, courseName) {
    try {
        const students = await apiCall(`/courses/${courseId}/students`);
        if (!students || students.length === 0) {
            alert('На этом курсе нет учеников');
            return;
        }
        
        let html = `
            <h3>Ученики курса: ${courseName}</h3>
            <table style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr>
                        <th>ФИО</th>
                        <th>Email</th>
                        <th>Возраст</th>
                        <th>Дата записи</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        students.forEach(enrollment => {
            const student = enrollment.student;
            if (student) {
                html += `
                    <tr>
                        <td>${student.fullName || '-'}</td>
                        <td>${student.email || '-'}</td>
                        <td>${student.age || '-'}</td>
                        <td>${formatDate(enrollment.enrollmentDate)}</td>
                    </tr>
                `;
            }
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>Список учеников</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                ${html}
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        alert('Ошибка загрузки учеников: ' + (error.message || 'Неизвестная ошибка'));
    }
}

// Функция для перехода в журнал оценок (теперь используется отдельный раздел)
function showGradesModalFromCourses(courseId, courseName) {
    // Сохраняем выбранный курс в глобальной переменной перед переходом
    if (typeof window !== 'undefined') {
        if (typeof selectedCourseId !== 'undefined') {
            window.selectedCourseId = courseId;
        } else {
            // Создаем глобальную переменную, если её нет
            window.selectedCourseId = courseId;
        }
    }
    
    // Переходим в раздел журнала оценок
    showPage('gradebook');
    
    // Ждем загрузки страницы и затем выбираем курс
    // Используем более длинную задержку, чтобы loadGradebook успел выполниться
    setTimeout(() => {
        if (typeof selectCourse === 'function') {
            selectCourse(courseId);
        }
    }, 1000);
}

