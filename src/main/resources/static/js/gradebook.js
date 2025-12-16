// Журнал оценок и посещаемости для учителя

let gradebookCourses = [];
let selectedCourseId = null;
let selectedScheduleId = null;

// Делаем selectedCourseId доступным глобально
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'selectedCourseId', {
        get: function() { return selectedCourseId; },
        set: function(value) { selectedCourseId = value; }
    });
}

async function loadGradebook() {
    try {
        const container = document.getElementById('gradebookContent');
        if (!container) {
            console.error('Контейнер gradebookContent не найден');
            return;
        }

        // Показываем индикатор загрузки
        container.innerHTML = '<div class="card" style="text-align: center; padding: 3rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div><p style="color: #666; font-size: 1.1rem;">Загрузка журнала...</p></div>';

        // Получаем информацию о текущем пользователе
        const userInfo = await apiCall('/auth/me');
        if (!userInfo || (userInfo.role !== 'TEACHER' && userInfo.role !== 'ADMIN')) {
            container.innerHTML = '<div class="card"><p class="error-message" style="text-align: center; padding: 2rem;">Доступ запрещен. Только для учителей и администраторов.</p></div>';
            return;
        }

        // Загружаем курсы (уже отфильтрованы на бэкенде для учителя)
        const allCourses = await apiCall('/courses');
        if (userInfo.role === 'TEACHER' && userInfo.teacherId) {
            gradebookCourses = allCourses ? allCourses.filter(c => {
                const courseTeacherId = c.teacherId;
                return courseTeacherId == userInfo.teacherId || courseTeacherId === userInfo.teacherId;
            }) : [];
        } else {
            gradebookCourses = allCourses || [];
        }

        if (gradebookCourses.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center; padding: 3rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">📚</div><p style="color: #666; font-size: 1.1rem;">Нет доступных курсов</p></div>';
            return;
        }

        renderGradebook();
        
        // Если был выбран курс из другого места, загружаем его
        if (selectedCourseId) {
            setTimeout(() => {
                const selectEl = document.getElementById('gradebookCourseSelect');
                if (selectEl) {
                    selectEl.value = selectedCourseId;
                }
                selectCourse(selectedCourseId);
            }, 300);
        }
    } catch (error) {
        console.error('Ошибка загрузки журнала:', error);
        const container = document.getElementById('gradebookContent');
        if (container) {
            container.innerHTML = '<div class="card"><p class="error-message" style="text-align: center; padding: 2rem;">Ошибка загрузки журнала: ' + (error.message || 'Неизвестная ошибка') + '</p></div>';
        }
    }
}

function renderGradebook() {
    console.log('renderGradebook вызвана');
    const container = document.getElementById('gradebookContent');
    if (!container) {
        console.error('Контейнер gradebookContent не найден в renderGradebook');
        return;
    }

    let html = `
        <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem;">📊 Выберите курс</h3>
            <select id="gradebookCourseSelect" onchange="selectCourse(this.value)" style="width: 100%; padding: 0.75rem; font-size: 1rem; border: 1px solid #ddd; border-radius: 4px; background: white; color: #333; cursor: pointer;">
                <option value="">-- Выберите курс --</option>
    `;

    if (gradebookCourses.length === 0) {
        html += '<option value="">Нет доступных курсов</option>';
    } else {
        gradebookCourses.forEach(course => {
            const courseId = course.id || course.courseId;
            const courseName = course.name || 'Курс';
            const isSelected = selectedCourseId && courseId == selectedCourseId;
            html += `<option value="${courseId}" ${isSelected ? 'selected' : ''}>${courseName}</option>`;
        });
    }

    html += `
            </select>
        </div>
        <div id="gradebookCourseContent" style="min-height: 200px; display: block; visibility: visible; opacity: 1;"></div>
    `;

    container.innerHTML = html;
    
    // Проверяем, что контейнер создан и видим
    setTimeout(() => {
        let courseContentDiv = document.getElementById('gradebookCourseContent');
        if (!courseContentDiv) {
            // Создаем контейнер вручную, если его нет
            courseContentDiv = document.createElement('div');
            courseContentDiv.id = 'gradebookCourseContent';
            courseContentDiv.style.minHeight = '200px';
            courseContentDiv.style.display = 'block';
            courseContentDiv.style.visibility = 'visible';
            courseContentDiv.style.opacity = '1';
            container.appendChild(courseContentDiv);
        } else {
            // Убеждаемся, что контейнер видим
            courseContentDiv.style.display = 'block';
            courseContentDiv.style.visibility = 'visible';
            courseContentDiv.style.opacity = '1';
        }
        
        // Если был выбран курс, автоматически загружаем его данные
        if (selectedCourseId) {
            setTimeout(() => {
                selectCourse(selectedCourseId);
            }, 100);
        }
    }, 100);
}

async function selectCourse(courseId) {
    if (!courseId) {
        const contentDiv = document.getElementById('gradebookCourseContent');
        if (contentDiv) {
            contentDiv.innerHTML = '';
        }
        selectedCourseId = null;
        return;
    }
    
    selectedCourseId = courseId;
    
    // Обновляем выбранный курс в селекте
    const selectElement = document.getElementById('gradebookCourseSelect');
    if (selectElement) {
        selectElement.value = courseId;
    }
    
    // Получаем или создаем контейнер
    let contentDiv = document.getElementById('gradebookCourseContent');
    if (!contentDiv) {
        const mainContainer = document.getElementById('gradebookContent');
        if (mainContainer) {
            contentDiv = document.createElement('div');
            contentDiv.id = 'gradebookCourseContent';
            contentDiv.style.minHeight = '200px';
            contentDiv.style.display = 'block';
            contentDiv.style.visibility = 'visible';
            contentDiv.style.opacity = '1';
            mainContainer.appendChild(contentDiv);
        } else {
            console.error('Не удалось найти контейнер gradebookContent');
            return;
        }
    }
    
    // Убеждаемся, что контейнер видим
    contentDiv.style.display = 'block';
    contentDiv.style.visibility = 'visible';
    contentDiv.style.opacity = '1';
    contentDiv.style.opacity = '1';

    // Показываем индикатор загрузки
    contentDiv.innerHTML = '<div class="card" style="text-align: center; padding: 3rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div><p style="color: #666; font-size: 1.1rem;">Загрузка данных курса...</p></div>';

    try {
        // Загружаем учеников курса
        const enrollments = await apiCall(`/courses/${courseId}/students`);
        if (!enrollments || enrollments.length === 0) {
            contentDiv.innerHTML = '<div class="card" style="text-align: center; padding: 3rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">👥</div><p style="color: #666; font-size: 1.1rem;">На этом курсе нет учеников</p></div>';
            return;
        }

        // Загружаем расписание курса
        const schedules = await apiCall(`/schedule/course/${courseId}`);
        if (!schedules || schedules.length === 0) {
            contentDiv.innerHTML = '<div class="card" style="text-align: center; padding: 3rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">📅</div><p style="color: #666; font-size: 1.1rem;">Для этого курса не создано расписание</p></div>';
            return;
        }

        // Загружаем оценки и посещаемость
        const gradesData = {};
        const attendanceData = {};

        // Загружаем оценки для всех учеников
        for (const enrollment of enrollments) {
            try {
                console.log('Загружаем оценки для enrollment:', enrollment.enrollmentId);
                const gradesResponse = await apiCall(`/grades/enrollment/${enrollment.enrollmentId}`);
                console.log('Ответ API для оценок enrollment', enrollment.enrollmentId, ':', gradesResponse);
                console.log('Тип ответа:', typeof gradesResponse, 'isArray:', Array.isArray(gradesResponse));
                
                let gradesList = [];
                if (gradesResponse) {
                    // API может вернуть Page объект или массив
                    if (gradesResponse.content && Array.isArray(gradesResponse.content)) {
                        gradesList = gradesResponse.content;
                        console.log('Оценки из content для enrollment', enrollment.enrollmentId, ':', gradesList);
                    } else if (Array.isArray(gradesResponse)) {
                        gradesList = gradesResponse;
                        console.log('Оценки как массив для enrollment', enrollment.enrollmentId, ':', gradesList);
                    } else if (gradesResponse.content === null || gradesResponse.content === undefined) {
                        // Пустой Page
                        gradesList = [];
                        console.log('Пустой Page для enrollment', enrollment.enrollmentId);
                    }
                }
                gradesData[enrollment.enrollmentId] = gradesList;
                console.log('Сохранены оценки для enrollment', enrollment.enrollmentId, ':', gradesList.length, 'оценок');
            } catch (error) {
                console.error('Ошибка загрузки оценок для enrollment', enrollment.enrollmentId, ':', error);
                gradesData[enrollment.enrollmentId] = [];
            }
        }
        console.log('Итоговый gradesData:', gradesData);
        console.log('Количество enrollments с оценками:', Object.keys(gradesData).filter(k => gradesData[k].length > 0).length);

        // Загружаем посещаемость
        try {
            const attendance = await apiCall(`/attendance/course/${courseId}`);
            console.log('Посещаемость загружена:', attendance);
            if (attendance && Array.isArray(attendance)) {
                attendance.forEach(record => {
                    const scheduleId = record.scheduleId;
                    const enrollmentId = record.enrollmentId;
                    if (scheduleId != null && enrollmentId != null) {
                        // Используем явное преобразование в строку для ключа
                        const key = `${scheduleId}_${enrollmentId}`;
                        attendanceData[key] = record;
                        console.log('Добавлена запись посещаемости:', key, record);
                    }
                });
            }
            console.log('Итоговый attendanceData:', attendanceData);
        } catch (error) {
            console.warn('Ошибка загрузки посещаемости:', error);
        }

        // Рендерим журнал
        renderCourseGradebook(enrollments, schedules, gradesData, attendanceData);
    } catch (error) {
        console.error('Ошибка загрузки данных курса:', error);
        contentDiv.innerHTML = '<p class="error-message">Ошибка загрузки данных: ' + (error.message || 'Неизвестная ошибка') + '</p>';
    }
}

function renderCourseGradebook(enrollments, schedules, gradesData, attendanceData) {
    let contentDiv = document.getElementById('gradebookCourseContent');
    if (!contentDiv) {
        // Создаем контейнер, если его нет
        const mainContainer = document.getElementById('gradebookContent');
        if (mainContainer) {
            contentDiv = document.createElement('div');
            contentDiv.id = 'gradebookCourseContent';
            contentDiv.style.minHeight = '200px';
            contentDiv.style.display = 'block';
            contentDiv.style.visibility = 'visible';
            contentDiv.style.opacity = '1';
            mainContainer.appendChild(contentDiv);
        } else {
            console.error('Не удалось найти контейнер gradebookContent');
            return;
        }
    }
    
    // Убеждаемся, что контейнер видим
    contentDiv.style.display = 'block';
    contentDiv.style.visibility = 'visible';
    contentDiv.style.opacity = '1';
    contentDiv.style.opacity = '1';

    const course = gradebookCourses.find(c => (c.id || c.courseId) == selectedCourseId);
    const courseName = course ? course.name : 'Курс';

    let html = `
        <div class="card" style="margin-bottom: 1.5rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: #333; font-size: 1.5rem; border-bottom: 3px solid #667eea; padding-bottom: 0.5rem;">📚 ${courseName}</h3>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500; color: #555;">Выберите занятие: 
                    <select id="gradebookScheduleSelect" onchange="selectSchedule(this.value)" style="width: 100%; padding: 0.5rem; margin-top: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem;">
                        <option value="">-- Все занятия --</option>
    `;

    schedules.forEach(schedule => {
        const date = schedule.dateTime ? formatDate(schedule.dateTime) : 'Дата не указана';
        const time = schedule.dateTime ? new Date(schedule.dateTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
        html += `<option value="${schedule.scheduleId || schedule.id}">${date} ${time ? ` ${time}` : ''} ${schedule.room ? `- ${schedule.room}` : ''}</option>`;
    });

    html += `
                    </select>
                </label>
            </div>
        </div>
    `;

    // Сортируем расписание по дате
    const sortedSchedules = [...schedules].sort((a, b) => {
        const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
        const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
        return dateA - dateB;
    });

    // Группируем enrollments по ученику, чтобы убрать дубликаты
    const uniqueStudents = new Map();
    enrollments.forEach(enrollment => {
        const studentId = enrollment.student?.studentId || enrollment.studentId;
        const studentName = enrollment.student?.fullName || enrollment.studentName || 'Ученик';
        if (studentId && !uniqueStudents.has(studentId)) {
            uniqueStudents.set(studentId, {
                studentId: studentId,
                studentName: studentName,
                enrollments: []
            });
        }
        if (studentId) {
            uniqueStudents.get(studentId).enrollments.push(enrollment);
        }
    });
    
    const studentsList = Array.from(uniqueStudents.values());
    console.log('Уникальные ученики:', studentsList);

    // Таблица с датами и учениками (как в школьном журнале)
    html += `
        <div class="card" style="overflow-x: auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 1rem 0; padding: 1rem 1rem 0.5rem 1rem; color: #333; font-size: 1.3rem;">📅 Журнал по датам</h3>
            <div style="padding: 0 1rem 1rem 1rem;">
                <table style="width: 100%; border-collapse: collapse; min-width: 800px; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <th style="padding: 0.75rem; text-align: left; border: 1px solid rgba(255,255,255,0.3); font-weight: 600; position: sticky; left: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); z-index: 10;">Дата / Ученик</th>
    `;
    
    studentsList.forEach(student => {
        html += `<th style="padding: 0.75rem; text-align: center; border: 1px solid rgba(255,255,255,0.3); font-weight: 600; min-width: 150px;">${student.studentName}</th>`;
    });
    
    html += `
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Строки с датами
    sortedSchedules.forEach((schedule, scheduleIdx) => {
        const scheduleId = schedule.scheduleId || schedule.id;
        const date = schedule.dateTime ? new Date(schedule.dateTime) : null;
        const dateStr = date ? formatDate(schedule.dateTime) : '-';
        const timeStr = date ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
        const room = schedule.room || '';
        const rowColor = scheduleIdx % 2 === 0 ? '#ffffff' : '#f8f9fa';
        
        html += `
            <tr style="background: ${rowColor};">
                <td style="padding: 0.75rem; border: 1px solid #e0e0e0; font-weight: 500; position: sticky; left: 0; background: ${rowColor}; z-index: 5;">
                    <div style="font-weight: 600; color: #333;">${dateStr}</div>
                    <div style="font-size: 0.85em; color: #666;">${timeStr} ${room ? `· ${room}` : ''}</div>
                </td>
        `;
        
        studentsList.forEach(student => {
            // Находим enrollment для этого ученика и этого занятия
            let enrollment = student.enrollments.find(e => {
                const eScheduleId = e.schedule?.scheduleId || e.scheduleId;
                return eScheduleId == scheduleId;
            });
            
            // Если не найдено, берем первый enrollment этого ученика
            if (!enrollment) {
                enrollment = student.enrollments[0];
            }
            
            if (!enrollment) return;
            
            const enrollmentId = enrollment.enrollmentId;
            // Используем явное преобразование в строку для ключа
            const key = `${scheduleId}_${enrollmentId}`;
            const attendanceRecord = attendanceData[key];
            const attendanceStatus = attendanceRecord ? attendanceRecord.status : null;
            
            // Получаем оценку ТОЛЬКО для этого конкретного занятия (по дате)
            const gradesForEnrollment = gradesData[enrollmentId] || [];
            let gradeForSchedule = null;
            
            // Ищем оценку ТОЛЬКО по точной дате занятия - не показываем оценки для других дат!
            if (date && gradesForEnrollment.length > 0) {
                gradeForSchedule = gradesForEnrollment.find(g => {
                    if (g.date) {
                        try {
                            const gradeDate = new Date(g.date);
                            const scheduleDate = new Date(date);
                            // ТОЧНОЕ совпадение даты (год, месяц, день) - без времени
                            const match = gradeDate.getFullYear() === scheduleDate.getFullYear() &&
                                   gradeDate.getMonth() === scheduleDate.getMonth() &&
                                   gradeDate.getDate() === scheduleDate.getDate();
                            return match;
                        } catch (e) {
                            return false;
                        }
                    }
                    return false;
                });
            }
            
            // НЕ показываем оценку, если она не соответствует этой конкретной дате!
            
            // Получаем ID оценки (может быть id или gradeId)
            let gradeIdValue = 'null';
            if (gradeForSchedule) {
                gradeIdValue = gradeForSchedule.id || gradeForSchedule.gradeId || 'null';
            }
            const gradeValue = gradeForSchedule ? gradeForSchedule.grade : null;
            const gradeColor = gradeValue ? (gradeValue >= 4 ? '#28a745' : gradeValue >= 3 ? '#ffc107' : '#dc3545') : '#999';
            
            // Формируем строку для отображения оценки
            const gradeDisplay = gradeValue ? String(gradeValue) : '-';
            
            html += `
                <td style="padding: 0.5rem; border: 1px solid #e0e0e0; text-align: center; vertical-align: middle; cursor: pointer; transition: background 0.2s; min-width: 80px;" 
                    onclick="quickMarkAttendance(${scheduleId}, ${enrollmentId}, '${student.studentName.replace(/'/g, "\\'")}', ${gradeIdValue}, '${attendanceStatus || ''}', ${gradeValue || 'null'})"
                    onmouseover="this.style.background='#f0f0f0'"
                    onmouseout="this.style.background='${rowColor}'"
                    title="Кликните для редактирования посещаемости и оценки">
                    <div style="display: flex; flex-direction: column; gap: 0.3rem; align-items: center; justify-content: center; min-height: 60px;">
                        <div style="font-weight: bold; font-size: 1.5em; color: ${gradeColor}; line-height: 1.2; min-height: 1.5em; display: flex; align-items: center; justify-content: center;">
                            ${gradeDisplay}
                        </div>
                        <div style="font-size: 1.2em; color: ${attendanceStatus === 'PRESENT' ? '#28a745' : attendanceStatus === 'ABSENT' ? '#dc3545' : attendanceStatus === 'LATE' ? '#ffc107' : attendanceStatus === 'EXCUSED' ? '#17a2b8' : '#999'}; line-height: 1.2;">
                            ${attendanceStatus === 'PRESENT' ? '✅' : attendanceStatus === 'ABSENT' ? '❌' : attendanceStatus === 'LATE' ? '⏰' : attendanceStatus === 'EXCUSED' ? '📝' : '○'}
                        </div>
                    </div>
                </td>
            `;
        });
        
        html += `</tr>`;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Устанавливаем HTML
    contentDiv.innerHTML = html;
    contentDiv.style.display = 'block';
    contentDiv.style.visibility = 'visible';
    contentDiv.style.opacity = '1';
    contentDiv.style.opacity = '1';
    
    // Прокручиваем к началу таблицы
    setTimeout(() => {
        if (contentDiv && contentDiv.parentElement) {
            contentDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

async function selectSchedule(scheduleId) {
    selectedScheduleId = scheduleId;
    if (!selectedCourseId) return;
    
    // Перезагружаем данные с учетом выбранного занятия
    await selectCourse(selectedCourseId);
}

async function showStudentGradebook(enrollmentId, studentId, studentName) {
    try {
        const grades = await apiCall(`/grades/enrollment/${enrollmentId}`).catch(() => ({ content: [] }));
        let gradesList = [];
        if (grades && grades.content) {
            gradesList = grades.content;
        } else if (Array.isArray(grades)) {
            gradesList = grades;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px 8px 0 0;">
                    <h3 style="margin: 0; font-size: 1.5rem;">📊 Оценки: ${studentName}</h3>
                    <span class="close" onclick="this.closest('.modal').remove()" style="color: white; font-size: 1.5rem;">&times;</span>
                </div>
                <div style="padding: 1.5rem; background: #f8f9fa;">
                    <button class="btn btn-primary" onclick="addGradeModal(${enrollmentId}, '${studentName.replace(/'/g, "\\'")}')" style="margin-bottom: 1rem;">+ Добавить оценку</button>
                    ${gradesList.length === 0 ? 
                        '<p style="color: #666; text-align: center; padding: 2rem;">Нет оценок</p>' :
                        `<table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                            <thead>
                                <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                                    <th style="padding: 0.75rem; text-align: left;">Оценка</th>
                                    <th style="padding: 0.75rem; text-align: left;">Отзыв</th>
                                    <th style="padding: 0.75rem; text-align: left;">Дата</th>
                                    <th style="padding: 0.75rem; text-align: center;">Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${gradesList.map((grade, idx) => {
                                    const date = grade.date ? formatDate(grade.date) : '-';
                                    const rowColor = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
                                    const gradeColor = grade.grade >= 4 ? '#28a745' : grade.grade >= 3 ? '#ffc107' : '#dc3545';
                                    return `
                                        <tr style="background: ${rowColor};">
                                            <td style="padding: 0.75rem; border: 1px solid #e0e0e0; font-weight: bold; font-size: 1.2em; color: ${gradeColor};">${grade.grade || '-'}</td>
                                            <td style="padding: 0.75rem; border: 1px solid #e0e0e0;">${grade.review || '-'}</td>
                                            <td style="padding: 0.75rem; border: 1px solid #e0e0e0;">${date}</td>
                                            <td style="padding: 0.75rem; border: 1px solid #e0e0e0; text-align: center;">
                                                <button class="btn btn-small" onclick="editGradeModal(${grade.id}, ${enrollmentId}, '${studentName.replace(/'/g, "\\'")}')" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.25rem;">Редактировать</button>
                                                <button class="btn btn-small btn-danger" onclick="deleteGradeConfirm(${grade.id})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Удалить</button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>`
                    }
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        alert('Ошибка загрузки оценок: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function showStudentAttendance(enrollmentId, studentId, studentName) {
    try {
        if (!selectedCourseId) {
            alert('Выберите курс');
            return;
        }

        const schedules = await apiCall(`/schedule/course/${selectedCourseId}`);
        if (!schedules || schedules.length === 0) {
            alert('Нет расписания для этого курса');
            return;
        }

        const attendance = await apiCall(`/attendance/course/${selectedCourseId}`).catch(() => []);
        const attendanceMap = {};
        if (attendance && Array.isArray(attendance)) {
            attendance.forEach(record => {
                if (record.enrollmentId === enrollmentId) {
                    attendanceMap[record.scheduleId] = record;
                }
            });
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px 8px 0 0;">
                    <h3 style="margin: 0; font-size: 1.5rem;">✅ Посещаемость: ${studentName}</h3>
                    <span class="close" onclick="this.closest('.modal').remove()" style="color: white; font-size: 1.5rem;">&times;</span>
                </div>
                <div style="padding: 1.5rem; background: #f8f9fa;">
                    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                        <thead>
                            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                                <th style="padding: 0.75rem; text-align: left;">Дата</th>
                                <th style="padding: 0.75rem; text-align: left;">Время</th>
                                <th style="padding: 0.75rem; text-align: center;">Статус</th>
                                <th style="padding: 0.75rem; text-align: center;">Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${schedules.map((schedule, idx) => {
                                const scheduleId = schedule.scheduleId || schedule.id;
                                const date = schedule.dateTime ? new Date(schedule.dateTime) : null;
                                const dateStr = date ? formatDate(schedule.dateTime) : '-';
                                const timeStr = date ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '-';
                                const record = attendanceMap[scheduleId];
                                const status = record ? record.status : null;
                                const statusText = status === 'PRESENT' ? '✅ Был' : status === 'ABSENT' ? '❌ Не был' : status === 'LATE' ? '⏰ Опоздал' : status === 'EXCUSED' ? '📝 Уважительная причина' : '❓ Не отмечено';
                                const statusColor = status === 'PRESENT' ? '#28a745' : status === 'ABSENT' ? '#dc3545' : status === 'LATE' ? '#ffc107' : status === 'EXCUSED' ? '#17a2b8' : '#6c757d';
                                const rowColor = idx % 2 === 0 ? '#ffffff' : '#f8f9fa';
                                return `
                                    <tr style="background: ${rowColor};">
                                        <td style="padding: 0.75rem; border: 1px solid #e0e0e0;">${dateStr}</td>
                                        <td style="padding: 0.75rem; border: 1px solid #e0e0e0;">${timeStr}</td>
                                        <td style="padding: 0.75rem; border: 1px solid #e0e0e0; text-align: center; color: ${statusColor}; font-weight: bold;">${statusText}</td>
                                        <td style="padding: 0.75rem; border: 1px solid #e0e0e0; text-align: center;">
                                            <button class="btn btn-small" onclick="markAttendanceModal(${scheduleId}, ${enrollmentId}, '${studentName.replace(/'/g, "\\'")}', ${record ? record.attendanceId : 'null'})" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;">Отметить</button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Добавляем обработчик для обновления после сохранения
        const closeButtons = modal.querySelectorAll('.close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // При закрытии модального окна обновляем данные, если посещаемость была изменена
                if (selectedCourseId) {
                    setTimeout(() => {
                        selectCourse(selectedCourseId);
                    }, 500);
                }
            });
        });
    } catch (error) {
        console.error('Ошибка загрузки посещаемости:', error);
        alert('Ошибка загрузки посещаемости: ' + (error.message || 'Неизвестная ошибка'));
    }
}

function addGradeModal(enrollmentId, studentName) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Добавить оценку: ${studentName}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleAddGrade(event, ${enrollmentId})">
                <div class="form-group">
                    <label>Оценка (1-5): <input type="number" id="gradeValue" min="1" max="5" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;"></label>
                </div>
                <div class="form-group">
                    <label>Отзыв: <textarea id="gradeReview" style="width: 100%; min-height: 80px; padding: 0.5rem; margin-top: 0.25rem;"></textarea></label>
                </div>
                <button type="submit" class="btn btn-primary">Добавить</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleAddGrade(event, enrollmentId) {
    event.preventDefault();
    try {
        await apiCall(`/grades/${enrollmentId}`, {
            method: 'POST',
            body: {
                grade: parseInt(document.getElementById('gradeValue').value),
                review: document.getElementById('gradeReview').value
            }
        });
        showMessage('Оценка добавлена');
        document.querySelectorAll('.modal').forEach(m => m.remove());
        if (selectedCourseId) {
            await selectCourse(selectedCourseId);
        }
    } catch (error) {
        alert('Ошибка добавления оценки: ' + (error.message || 'Неизвестная ошибка'));
    }
}

function editGradeModal(gradeId, enrollmentId, studentName) {
    // Реализация редактирования оценки
    alert('Редактирование оценки будет реализовано');
}

async function deleteGradeConfirm(gradeId) {
    if (!confirm('Удалить оценку?')) return;
    
    try {
        await apiCall(`/grades/${gradeId}`, { method: 'DELETE' });
        showMessage('Оценка удалена');
        document.querySelectorAll('.modal').forEach(m => m.remove());
        if (selectedCourseId) {
            await selectCourse(selectedCourseId);
        }
    } catch (error) {
        alert('Ошибка удаления оценки: ' + (error.message || 'Неизвестная ошибка'));
    }
}

function markAttendanceModal(scheduleId, enrollmentId, studentName, attendanceId) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Отметить посещаемость: ${studentName}</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <form onsubmit="handleMarkAttendance(event, ${scheduleId}, ${enrollmentId})">
                <div class="form-group">
                    <label>Статус: 
                        <select id="attendanceStatus" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;">
                            <option value="PRESENT">✅ Был</option>
                            <option value="ABSENT">❌ Не был</option>
                            <option value="LATE">⏰ Опоздал</option>
                            <option value="EXCUSED">📝 Уважительная причина</option>
                        </select>
                    </label>
                </div>
                <div class="form-group">
                    <label>Примечание: <textarea id="attendanceNotes" style="width: 100%; min-height: 60px; padding: 0.5rem; margin-top: 0.25rem;"></textarea></label>
                </div>
                <button type="submit" class="btn btn-primary">Сохранить</button>
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()">Отмена</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleMarkAttendance(event, scheduleId, enrollmentId) {
    event.preventDefault();
    try {
        const status = document.getElementById('attendanceStatus').value;
        const notes = document.getElementById('attendanceNotes').value;
        
        console.log('Отмечаем посещаемость:', { scheduleId, enrollmentId, status, notes });
        
        const response = await apiCall(`/attendance/schedule/${scheduleId}/enrollment/${enrollmentId}`, {
            method: 'POST',
            body: {
                status: status,
                notes: notes
            }
        });
        
        console.log('Посещаемость сохранена, ответ:', response);
        showMessage('Посещаемость отмечена');
        document.querySelectorAll('.modal').forEach(m => m.remove());
        
        // Небольшая задержка, чтобы сервер успел сохранить данные
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Перезагружаем данные курса для обновления таблицы
        if (selectedCourseId) {
            console.log('Перезагружаем данные курса:', selectedCourseId);
            await selectCourse(selectedCourseId);
        } else {
            console.error('selectedCourseId не установлен!');
        }
    } catch (error) {
        console.error('Ошибка отметки посещаемости:', error);
        alert('Ошибка отметки посещаемости: ' + (error.message || 'Неизвестная ошибка'));
    }
}

// Делаем функции глобальными
window.loadGradebook = loadGradebook;
window.selectCourse = selectCourse;
window.selectSchedule = selectSchedule;
window.showStudentGradebook = showStudentGradebook;
window.showStudentAttendance = showStudentAttendance;
window.addGradeModal = addGradeModal;
window.handleAddGrade = handleAddGrade;
window.editGradeModal = editGradeModal;
window.deleteGradeConfirm = deleteGradeConfirm;
window.markAttendanceModal = markAttendanceModal;
window.handleMarkAttendance = handleMarkAttendance;

// Быстрая отметка посещаемости и оценки для конкретной даты
function quickMarkAttendance(scheduleId, enrollmentId, studentName, gradeId, currentStatus, currentGrade) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px 8px 0 0;">
                <h3 style="margin: 0; font-size: 1.5rem;">✏️ Отметить: ${studentName}</h3>
                <span class="close" onclick="this.closest('.modal').remove()" style="color: white; font-size: 1.5rem; cursor: pointer;">&times;</span>
            </div>
            <div style="padding: 1.5rem; background: #f8f9fa;">
                <form onsubmit="handleQuickMark(event, ${scheduleId}, ${enrollmentId}, ${gradeId || 'null'})">
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Посещаемость: 
                            <select id="quickAttendanceStatus" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem; border: 1px solid #ddd; border-radius: 4px;">
                                <option value="PRESENT" ${currentStatus === 'PRESENT' ? 'selected' : ''}>✅ Был</option>
                                <option value="ABSENT" ${currentStatus === 'ABSENT' ? 'selected' : ''}>❌ Не был</option>
                                <option value="LATE" ${currentStatus === 'LATE' ? 'selected' : ''}>⏰ Опоздал</option>
                                <option value="EXCUSED" ${currentStatus === 'EXCUSED' ? 'selected' : ''}>📝 Уважительная причина</option>
                            </select>
                        </label>
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Оценка (1-5, необязательно): 
                            <input type="number" id="quickGrade" min="1" max="5" value="${currentGrade && currentGrade !== 'null' ? currentGrade : ''}" style="width: 100%; padding: 0.5rem; margin-top: 0.25rem; border: 1px solid #ddd; border-radius: 4px;" placeholder="Оставьте пустым, если не нужно">
                        </label>
                    </div>
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Отзыв/Примечание: 
                            <textarea id="quickNotes" style="width: 100%; min-height: 60px; padding: 0.5rem; margin-top: 0.25rem; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                        </label>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1; padding: 0.75rem; border: none; border-radius: 4px; background: #667eea; color: white; font-weight: 500; cursor: pointer;">Сохранить</button>
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="flex: 1; padding: 0.75rem; border: none; border-radius: 4px; background: #6c757d; color: white; font-weight: 500; cursor: pointer;">Отмена</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function handleQuickMark(event, scheduleId, enrollmentId, gradeId) {
    event.preventDefault();
    try {
        const status = document.getElementById('quickAttendanceStatus').value;
        const gradeValue = document.getElementById('quickGrade').value;
        const notes = document.getElementById('quickNotes').value;
        
        console.log('Быстрая отметка:', { scheduleId, enrollmentId, status, gradeValue, notes, gradeId });
        
        // Сохраняем посещаемость
        await apiCall(`/attendance/schedule/${scheduleId}/enrollment/${enrollmentId}`, {
            method: 'POST',
            body: {
                status: status,
                notes: notes
            }
        });
        
        // Получаем дату занятия для привязки оценки к конкретной дате
        const schedules = await apiCall(`/schedule/course/${selectedCourseId}`).catch(() => []);
        const currentSchedule = schedules.find(s => (s.scheduleId || s.id) == scheduleId);
        const scheduleDateTime = currentSchedule ? currentSchedule.dateTime : null;
        console.log('Дата занятия для оценки:', scheduleDateTime, 'scheduleId:', scheduleId);
        
        // Сохраняем или обновляем оценку
        if (gradeValue && gradeValue.trim() !== '') {
            try {
                const gradeNum = parseInt(gradeValue);
                console.log('Пытаемся сохранить оценку:', { gradeNum, gradeId, enrollmentId, gradeValue, scheduleDateTime });
                if (gradeNum >= 1 && gradeNum <= 5) {
                    let response;
                    // Проверяем, нужно ли обновлять или создавать
                    const shouldUpdate = gradeId && gradeId !== 'null' && gradeId !== null && gradeId !== 'undefined' && String(gradeId) !== 'null';
                    
                    const requestBody = {
                        grade: gradeNum,
                        review: notes || ''
                    };
                    
                    // ВСЕГДА добавляем дату занятия, чтобы оценка была привязана к конкретному занятию
                    if (scheduleDateTime) {
                        requestBody.date = scheduleDateTime;
                        console.log('Добавляем дату занятия в запрос:', scheduleDateTime);
                    } else {
                        console.warn('Дата занятия не найдена для scheduleId:', scheduleId);
                    }
                    
                    if (shouldUpdate) {
                        // Обновляем существующую оценку
                        console.log('Обновляем оценку с ID:', gradeId);
                        try {
                            response = await apiCall(`/grades/${gradeId}`, {
                                method: 'PUT',
                                body: requestBody
                            });
                            console.log('Оценка обновлена, ответ:', response);
                        } catch (updateError) {
                            console.warn('Не удалось обновить оценку, создаем новую:', updateError);
                            // Если обновление не удалось, создаем новую
                            response = await apiCall(`/grades/${enrollmentId}`, {
                                method: 'POST',
                                body: requestBody
                            });
                            console.log('Оценка создана (после неудачного обновления), ответ:', response);
                        }
                    } else {
                        // Создаем новую оценку
                        console.log('Создаем новую оценку для enrollment:', enrollmentId, 'для schedule:', scheduleId);
                        response = await apiCall(`/grades/${enrollmentId}`, {
                            method: 'POST',
                            body: requestBody
                        });
                        console.log('Оценка создана, ответ:', response);
                    }
                } else {
                    console.warn('Некорректная оценка:', gradeNum);
                    alert('Оценка должна быть от 1 до 5');
                }
            } catch (error) {
                console.error('Ошибка сохранения оценки:', error);
                alert('Ошибка сохранения оценки: ' + (error.message || 'Неизвестная ошибка'));
            }
        } else {
            console.log('Оценка не указана, пропускаем сохранение');
        }
        
        showMessage('Данные сохранены');
        document.querySelectorAll('.modal').forEach(m => m.remove());
        
        // Перезагружаем данные с задержкой, чтобы сервер успел сохранить
        await new Promise(resolve => setTimeout(resolve, 500));
        if (selectedCourseId) {
            console.log('Перезагружаем данные курса после сохранения');
            await selectCourse(selectedCourseId);
        }
    } catch (error) {
        console.error('Ошибка быстрой отметки:', error);
        alert('Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'));
    }
}

window.quickMarkAttendance = quickMarkAttendance;
window.handleQuickMark = handleQuickMark;

