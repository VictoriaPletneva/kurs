let scheduleData = [];

// Глобальная функция для загрузки расписания
window.loadSchedule = async function() {
    // Ждем немного, чтобы убедиться, что DOM готов
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
        const container = document.getElementById('scheduleContent');
        if (!container) {
            console.error('Контейнер scheduleContent не найден! Проверьте, что страница schedulePage существует в DOM.');
            // Пытаемся найти через несколько секунд
            setTimeout(() => {
                const retryContainer = document.getElementById('scheduleContent');
                if (retryContainer) {
                    console.log('Контейнер найден при повторной попытке');
                    loadSchedule();
                } else {
                    console.error('Контейнер scheduleContent так и не найден');
                }
            }, 1000);
            return;
        }
        
        console.log('Загрузка расписания...');
        console.log('Токен:', localStorage.getItem('token') ? 'Есть' : 'НЕТ!');
        
        const schedule = await apiCall('/schedule');
        console.log('Получено расписание:', schedule);
        console.log('Тип данных:', typeof schedule);
        console.log('Является массивом?', Array.isArray(schedule));
        
        if (schedule === null) {
            console.warn('Расписание вернуло null - возможно проблема с авторизацией');
            container.innerHTML = '<div class="card" style="padding: 2rem; text-align: center;"><p class="error-message">Ошибка авторизации. Попробуйте перезайти.</p></div>';
            return;
        }
        
        if (schedule && Array.isArray(schedule)) {
            scheduleData = schedule;
            console.log('Рендерим расписание, количество записей:', schedule.length);
            renderSchedule(schedule);
        } else if (schedule === undefined) {
            console.warn('Расписание вернуло undefined');
            renderSchedule([]);
        } else {
            console.warn('Расписание не является массивом:', typeof schedule, schedule);
            renderSchedule([]);
        }
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        console.error('Stack trace:', error.stack);
        const container = document.getElementById('scheduleContent');
        if (container) {
            container.innerHTML = '<div class="card" style="padding: 2rem; text-align: center;"><p class="error-message">Ошибка загрузки расписания: ' + (error.message || 'Неизвестная ошибка') + '</p><p style="color: #666; margin-top: 1rem;">Проверьте консоль браузера для подробностей.</p><p style="color: #666; margin-top: 0.5rem;">Статус ошибки: ' + (error.status || 'N/A') + '</p></div>';
        }
    }
};

// Глобальная функция для рендеринга расписания
window.renderSchedule = function(schedule) {
    console.log('renderSchedule вызвана с данными:', schedule);
    const container = document.getElementById('scheduleContent');
    if (!container) {
        console.error('Контейнер scheduleContent не найден в renderSchedule!');
        return;
    }
    
    console.log('Контейнер найден, рендерим расписание');
    const currentRole = localStorage.getItem('role');
    const canEdit = currentRole === 'ADMIN' || currentRole === 'TEACHER' || currentRole === 'REGISTRAR';

    if (!schedule || schedule.length === 0) {
        console.log('Расписание пустое, показываем сообщение');
        let emptyHtml = `
            <div class="card" style="text-align: center; padding: 3rem; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h3 style="color: #333; margin-bottom: 1rem;">📅 Расписание пусто</h3>
                <p style="color: #666; margin-top: 1rem; font-size: 1.1rem;">
                    ${currentRole === 'STUDENT' 
                        ? 'Для курсов, на которые вы записались, еще не создано расписание.<br>Расписание создается преподавателем или администратором.'
                        : 'Расписание еще не создано. Создайте новое занятие.'}
                </p>
        `;
        
        if (canEdit) {
            emptyHtml += `
                <button class="btn btn-primary" onclick="showCreateScheduleForm()" style="margin-top: 1.5rem; padding: 0.75rem 1.5rem; font-size: 1rem;">+ Создать занятие</button>
            `;
        }
        
        emptyHtml += `</div>`;
        container.innerHTML = emptyHtml;
        console.log('Сообщение о пустом расписании отображено');
        return;
    }
    
    console.log('Рендерим расписание с', schedule.length, 'записями');

    let html = '';
    
    if (canEdit) {
        html += `
            <div style="margin-bottom: 1rem;">
                <button class="btn btn-primary" onclick="showCreateScheduleForm()">+ Создать занятие</button>
            </div>
        `;
    }
    
    // Преобразуем расписание в события для календаря
    // Используем Map для удаления дубликатов по scheduleId (сохраняем последний)
    const eventsMap = new Map();
    schedule.forEach(item => {
        const id = item.scheduleId || item.id;
        if (id) {
            eventsMap.set(id, {
                scheduleId: id,
                dateTime: item.dateTime || item.datetime,
                title: item.courseName || item.course_name || 'Занятие',
                teacher: item.teacherName || item.teacher_name || 'Не назначен',
                room: item.room || '',
                notes: item.notes || '',
                canEdit: canEdit,
                courseId: item.courseId || item.course_id
            });
        }
    });
    const events = Array.from(eventsMap.values());
    
    html += `<div id="scheduleCalendar"></div>`;
    container.innerHTML = html;
    
    // Рендерим календарь после небольшой задержки, чтобы DOM обновился
    setTimeout(() => {
        renderCalendarInto('scheduleCalendar', events, 'Нет занятий', currentRole);
    }, 100);
};

// Глобальная функция для рендеринга календаря
window.renderCalendarInto = function(containerId, events, emptyText = 'Нет событий', currentRole = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!currentRole) {
        currentRole = localStorage.getItem('role');
    }

    if (!events || events.length === 0) {
        container.innerHTML = `<p>${emptyText}</p>`;
        return;
    }

    // Группируем по дате, убирая дубликаты по scheduleId
    const groups = {};
    const seenScheduleIds = new Set();
    events.forEach(ev => {
        if (!ev.dateTime) return;
        const scheduleId = ev.scheduleId;
        // Пропускаем дубликаты
        if (scheduleId && seenScheduleIds.has(scheduleId)) {
            return;
        }
        if (scheduleId) {
            seenScheduleIds.add(scheduleId);
        }
        const date = new Date(ev.dateTime);
        const key = date.toISOString().split('T')[0];
        if (!groups[key]) groups[key] = [];
        groups[key].push(ev);
    });

    const sortedKeys = Object.keys(groups).sort();
    let html = '<div style="display:flex;flex-wrap:wrap;gap:1rem;">';
    sortedKeys.forEach(key => {
        const dayEvents = groups[key];
        const dateObj = new Date(key);
        const dayLabel = formatDate(dateObj);
        html += `
            <div style="flex:1 1 280px; min-width:280px; background:#fff; border:1px solid #e5e5e5; border-radius:8px; padding:1rem; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                <div style="font-weight:700; margin-bottom:0.75rem; font-size:1.1rem; color:#333;">${dayLabel}</div>
                ${dayEvents.map(ev => `
                    <div style="padding:0.75rem; margin-bottom:0.5rem; background:#f8f9fa; border-radius:6px; border-left:4px solid #667eea;">
                        <div style="font-weight:600; margin-bottom:0.25rem;">${ev.title || 'Занятие'}</div>
                        <div style="color:#555; font-size:0.9rem; margin-bottom:0.15rem;">👨‍🏫 ${ev.teacher || 'Не назначен'}</div>
                        ${ev.room ? `<div style="color:#555; font-size:0.9rem; margin-bottom:0.15rem;">🏢 ${ev.room}</div>` : ''}
                        <div style="color:#777; font-size:0.85rem;">🕐 ${formatDateTime(ev.dateTime)}</div>
                        ${ev.notes ? `<div style="color:#666; font-size:0.85rem; margin-top:0.25rem; font-style:italic;">${ev.notes}</div>` : ''}
                        ${ev.canEdit ? `
                            <div style="margin-top:0.5rem;">
                                <button class="btn btn-small" onclick="editSchedule(${ev.scheduleId})" style="padding:0.25rem 0.5rem; font-size:0.8rem; margin-right:0.25rem;">Редактировать</button>
                                <button class="btn btn-small btn-danger" onclick="deleteSchedule(${ev.scheduleId})" style="padding:0.25rem 0.5rem; font-size:0.8rem;">Удалить</button>
                            </div>
                        ` : ''}
                        ${currentRole === 'STUDENT' ? `
                            <div style="margin-top:0.5rem;">
                                <button class="btn btn-small btn-danger" onclick="cancelEnrollmentBySchedule(${ev.scheduleId})" style="padding:0.25rem 0.5rem; font-size:0.8rem;">Отменить запись</button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
};

// Глобальная функция для показа формы создания расписания
window.showCreateScheduleForm = async function() {
    try {
        const role = localStorage.getItem('role');
        const isAdmin = role === 'ADMIN';
        const isTeacher = role === 'TEACHER';
        const isRegistrar = role === 'REGISTRAR';
        
        // Для учителя получаем только его курсы
        let courses;
        let currentTeacherId = null;
        
        if (isTeacher) {
            // Получаем информацию о текущем пользователе
            const userInfo = await apiCall('/auth/me');
            if (userInfo && userInfo.teacherId) {
                currentTeacherId = userInfo.teacherId;
            }
            // Получаем все курсы и фильтруем только те, где учитель является преподавателем
            const allCourses = await apiCall('/courses');
            courses = allCourses ? allCourses.filter(c => c.teacherId === currentTeacherId) : [];
        } else {
            courses = await apiCall('/courses');
        }
        
        if (!courses || courses.length === 0) {
            alert(isTeacher ? 'У вас нет назначенных курсов.' : (isRegistrar ? 'Нет доступных курсов. Сначала создайте курс.' : 'Нет доступных курсов. Сначала создайте курс.'));
            return;
        }
        
        let html = `
            <h3>Создание занятия</h3>
            <form id="createScheduleForm" onsubmit="handleCreateSchedule(event)">
                <div class="form-group">
                    <label>Курс: 
                        <select id="scheduleCourseId" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;">
                            <option value="">Выберите курс</option>
        `;
        
        courses.forEach(course => {
            html += `<option value="${course.id || course.courseId}">${course.name}</option>`;
        });
        
        html += `
                        </select>
                    </label>
                </div>
        `;
        
        // Для админа и регистратора показываем выбор преподавателя
        if (isAdmin || isRegistrar) {
            const teachers = await apiCall('/teachers');
            html += `
                <div class="form-group">
                    <label>Преподаватель: 
                        <select id="scheduleTeacherId" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;">
                            <option value="">Выберите преподавателя (необязательно)</option>
            `;
            
            if (teachers && teachers.length > 0) {
                teachers.forEach(teacher => {
                    html += `<option value="${teacher.id || teacher.teacherId}">${teacher.fullName || teacher.username}</option>`;
                });
            }
            
            html += `
                        </select>
                    </label>
                    <small style="color:#666;">Если не выбран, будет использован преподаватель курса</small>
                </div>
            `;
        } else if (isTeacher && currentTeacherId) {
            // Для учителя скрыто устанавливаем его ID
            html += `<input type="hidden" id="scheduleTeacherId" value="${currentTeacherId}">`;
        }
        
        html += `
                <div class="form-group">
                    <label>Дата и время: <input type="datetime-local" id="scheduleDateTime" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                </div>
                <div class="form-group">
                    <label>Помещение: <input type="text" id="scheduleRoom" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                </div>
                <div class="form-group">
                    <label>Примечания: <textarea id="scheduleNotes" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem; min-height: 80px;"></textarea></label>
                </div>
                <div style="margin-top: 1rem;">
                    <button type="submit" class="btn btn-primary">Создать</button>
                    <button type="button" class="btn btn-secondary" onclick="closeScheduleModal()" style="margin-left: 0.5rem;">Отмена</button>
                </div>
            </form>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'scheduleModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%;">
                ${html}
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        alert('Ошибка загрузки данных: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.closeScheduleModal = function() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.remove();
    }
}

window.handleCreateSchedule = async function(event) {
    event.preventDefault();
    
    const dateTime = document.getElementById('scheduleDateTime').value;
    const dateTimeISO = new Date(dateTime).toISOString();
    const teacherId = document.getElementById('scheduleTeacherId').value;
    
    const body = {
        courseId: parseInt(document.getElementById('scheduleCourseId').value),
        dateTime: dateTimeISO,
        room: document.getElementById('scheduleRoom').value,
        notes: document.getElementById('scheduleNotes').value
    };
    
    if (teacherId) {
        body.teacherId = parseInt(teacherId);
    }
    
    try {
        await apiCall('/schedule', {
            method: 'POST',
            body: body
        });
        
        showMessage('Занятие успешно создано');
        closeScheduleModal();
        loadSchedule();
    } catch (error) {
        alert('Ошибка создания занятия: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.editSchedule = async function(scheduleId) {
    const schedule = scheduleData.find(s => s.scheduleId === scheduleId);
    if (!schedule) {
        alert('Занятие не найдено');
        return;
    }
    
    try {
        const [courses, teachers] = await Promise.all([
            apiCall('/courses'),
            apiCall('/teachers')
        ]);
        
        // Преобразуем дату в формат для input datetime-local
        const date = new Date(schedule.dateTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const dateTimeLocal = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        let html = `
            <h3>Редактирование занятия</h3>
            <form id="editScheduleForm" onsubmit="handleEditSchedule(event, ${scheduleId})">
                <div class="form-group">
                    <label>Курс: 
                        <select id="editScheduleCourseId" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;">
        `;
        
        courses.forEach(course => {
            const selected = (course.id || course.courseId) === schedule.courseId ? 'selected' : '';
            html += `<option value="${course.id || course.courseId}" ${selected}>${course.name}</option>`;
        });
        
        html += `
                        </select>
                    </label>
                </div>
                <div class="form-group">
                    <label>Преподаватель: 
                        <select id="editScheduleTeacherId" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;">
                            <option value="">Выберите преподавателя (необязательно)</option>
        `;
        
        if (teachers && teachers.length > 0) {
            teachers.forEach(teacher => {
                const selected = (teacher.id || teacher.teacherId) === schedule.teacherId ? 'selected' : '';
                html += `<option value="${teacher.id || teacher.teacherId}" ${selected}>${teacher.fullName || teacher.username}</option>`;
            });
        }
        
        html += `
                        </select>
                    </label>
                    <small style="color:#666;">Можно заменить преподавателя независимо от курса</small>
                </div>
                <div class="form-group">
                    <label>Дата и время: <input type="datetime-local" id="editScheduleDateTime" value="${dateTimeLocal}" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                </div>
                <div class="form-group">
                    <label>Помещение: <input type="text" id="editScheduleRoom" value="${schedule.room || ''}" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                </div>
                <div class="form-group">
                    <label>Примечания: <textarea id="editScheduleNotes" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem; min-height: 80px;">${schedule.notes || ''}</textarea></label>
                </div>
                <div style="margin-top: 1rem;">
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                    <button type="button" class="btn btn-secondary" onclick="closeScheduleModal()" style="margin-left: 0.5rem;">Отмена</button>
                </div>
            </form>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'scheduleModal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 500px; width: 90%;">
                ${html}
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        alert('Ошибка загрузки данных: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.handleEditSchedule = async function(event, scheduleId) {
    event.preventDefault();
    
    const dateTime = document.getElementById('editScheduleDateTime').value;
    const dateTimeISO = new Date(dateTime).toISOString();
    const teacherId = document.getElementById('editScheduleTeacherId').value;
    
    const body = {
        courseId: parseInt(document.getElementById('editScheduleCourseId').value),
        dateTime: dateTimeISO,
        room: document.getElementById('editScheduleRoom').value,
        notes: document.getElementById('editScheduleNotes').value
    };
    
    if (teacherId) {
        body.teacherId = parseInt(teacherId);
    }
    
    try {
        await apiCall(`/schedule/${scheduleId}`, {
            method: 'PUT',
            body: body
        });
        
        showMessage('Занятие успешно обновлено');
        closeScheduleModal();
        loadSchedule();
    } catch (error) {
        alert('Ошибка обновления занятия: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.deleteSchedule = async function(scheduleId) {
    if (!confirm('Удалить это занятие? Изменения будут видны всем пользователям.')) {
        return;
    }
    
    try {
        await apiCall(`/schedule/${scheduleId}`, {
            method: 'DELETE'
        });
        
        showMessage('Занятие успешно удалено');
        loadSchedule();
    } catch (error) {
        alert('Ошибка удаления занятия: ' + (error.message || 'Неизвестная ошибка'));
    }
}

// Функция для отмены записи на курс по scheduleId
window.cancelEnrollmentBySchedule = async function(scheduleId) {
    if (!confirm('Вы уверены, что хотите отменить запись на это занятие?')) {
        return;
    }
    
    try {
        console.log('Отмена записи, scheduleId:', scheduleId);
        // Получаем записи студента
        const enrollments = await apiCall('/enrollments/me');
        console.log('Все записи студента:', enrollments);
        if (!enrollments || enrollments.length === 0) {
            alert('Записи не найдены');
            return;
        }
        
        // Находим запись для этого расписания
        // Проверяем как scheduleId (число) так и возможные варианты
        const enrollment = enrollments.find(e => {
            const eScheduleId = e.scheduleId || e.schedule?.scheduleId || e.schedule?.id;
            const match = eScheduleId == scheduleId || eScheduleId === scheduleId;
            console.log('Сравнение:', eScheduleId, 'с', scheduleId, '=', match);
            return match;
        });
        if (!enrollment) {
            console.error('Запись не найдена. Все записи:', enrollments);
            alert('Запись на это занятие не найдена. Возможно, вы записаны на весь курс, а не на конкретное занятие.');
            return;
        }
        console.log('Найдена запись для отмены:', enrollment);
        
        // Удаляем запись
        await apiCall(`/enrollments/${enrollment.enrollmentId}`, {
            method: 'DELETE'
        });
        
        showMessage('Запись успешно отменена');
        loadSchedule();
        if (document.getElementById('profilePage') && document.getElementById('profilePage').style.display !== 'none') {
            loadProfile();
        }
        if (document.getElementById('coursesPage') && document.getElementById('coursesPage').style.display !== 'none') {
            loadCourses();
        }
    } catch (error) {
        alert('Ошибка отмены записи: ' + (error.message || 'Неизвестная ошибка'));
    }
}



