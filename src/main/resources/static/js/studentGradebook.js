// Журнал оценок и посещаемости для студента (только просмотр)

let studentGradebookCourses = [];
let selectedStudentCourseId = null;

async function loadStudentGradebook() {
    try {
        const container = document.getElementById('studentGradebookContent');
        if (!container) {
            console.error('Контейнер studentGradebookContent не найден');
            return;
        }

        // Показываем индикатор загрузки
        container.innerHTML = '<div class="card" style="text-align: center; padding: 3rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div><p style="color: #666; font-size: 1.1rem;">Загрузка журнала...</p></div>';

        // Получаем информацию о текущем пользователе
        const userInfo = await apiCall('/auth/me');
        if (!userInfo || userInfo.role !== 'STUDENT') {
            container.innerHTML = '<div class="card"><p class="error-message" style="text-align: center; padding: 2rem;">Доступ запрещен. Только для студентов.</p></div>';
            return;
        }

        // Загружаем записи студента на курсы
        const enrollments = await apiCall('/enrollments/me');
        if (!enrollments || enrollments.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center; padding: 3rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">📚</div><p style="color: #666; font-size: 1.1rem;">Вы еще не записаны ни на один курс</p></div>';
            return;
        }

        // Получаем уникальные курсы
        const courseMap = new Map();
        enrollments.forEach(enrollment => {
            const courseId = enrollment.courseId || enrollment.course?.id || enrollment.course?.courseId;
            const courseName = enrollment.courseName || enrollment.course?.name || 'Неизвестный курс';
            if (courseId && !courseMap.has(courseId)) {
                courseMap.set(courseId, courseName);
            }
        });

        studentGradebookCourses = Array.from(courseMap.entries()).map(([id, name]) => ({ id, name }));

        if (studentGradebookCourses.length === 0) {
            container.innerHTML = '<div class="card" style="text-align: center; padding: 3rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">📚</div><p style="color: #666; font-size: 1.1rem;">Нет доступных курсов</p></div>';
            return;
        }

        renderStudentGradebook();
        
        // Если был выбран курс, загружаем его
        if (selectedStudentCourseId) {
            setTimeout(() => {
                const selectEl = document.getElementById('studentGradebookCourseSelect');
                if (selectEl) {
                    selectEl.value = selectedStudentCourseId;
                }
                selectStudentCourse(selectedStudentCourseId);
            }, 300);
        }
    } catch (error) {
        console.error('Ошибка загрузки журнала:', error);
        const container = document.getElementById('studentGradebookContent');
        if (container) {
            container.innerHTML = '<div class="card"><p class="error-message" style="text-align: center; padding: 2rem;">Ошибка загрузки журнала: ' + (error.message || 'Неизвестная ошибка') + '</p></div>';
        }
    }
}

function renderStudentGradebook() {
    const container = document.getElementById('studentGradebookContent');
    if (!container) {
        console.error('Контейнер studentGradebookContent не найден');
        return;
    }

    let html = `
        <div class="card" style="margin-bottom: 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem;">📊 Выберите курс</h3>
            <select id="studentGradebookCourseSelect" onchange="selectStudentCourse(this.value)" style="width: 100%; padding: 0.75rem; font-size: 1rem; border: 1px solid #ddd; border-radius: 4px; background: white; color: #333; cursor: pointer;">
                <option value="">-- Выберите курс --</option>
    `;

    studentGradebookCourses.forEach(course => {
        const isSelected = selectedStudentCourseId && course.id == selectedStudentCourseId;
        html += `<option value="${course.id}" ${isSelected ? 'selected' : ''}>${course.name}</option>`;
    });

    html += `
            </select>
        </div>
        <div id="studentGradebookCourseContent" style="min-height: 200px; display: block; visibility: visible; opacity: 1;"></div>
    `;

    container.innerHTML = html;
}

async function selectStudentCourse(courseId) {
    if (!courseId) {
        const contentContainer = document.getElementById('studentGradebookCourseContent');
        if (contentContainer) {
            contentContainer.innerHTML = '';
        }
        return;
    }

    selectedStudentCourseId = courseId;
    const contentContainer = document.getElementById('studentGradebookCourseContent');
    if (!contentContainer) {
        console.error('Контейнер studentGradebookCourseContent не найден');
        return;
    }

    contentContainer.innerHTML = '<div style="text-align: center; padding: 2rem;"><div style="font-size: 2rem; margin-bottom: 1rem;">⏳</div><p style="color: #666;">Загрузка данных...</p></div>';

    try {
        // Загружаем записи студента на этот курс
        const enrollments = await apiCall('/enrollments/me');
        const courseEnrollments = enrollments.filter(e => {
            const eCourseId = e.courseId || e.course?.id || e.course?.courseId;
            return eCourseId == courseId;
        });

        if (courseEnrollments.length === 0) {
            contentContainer.innerHTML = '<div class="card"><p style="text-align: center; padding: 2rem; color: #666;">Нет записей на этот курс</p></div>';
            return;
        }

        // Загружаем расписание для курса
        const schedules = await apiCall(`/schedule/course/${courseId}`).catch(() => []);

        // Загружаем оценки для всех записей
        const gradesData = {};
        for (const enrollment of courseEnrollments) {
            try {
                const gradesResponse = await apiCall(`/grades/enrollment/${enrollment.enrollmentId}`);
                let gradesList = [];
                if (gradesResponse) {
                    if (gradesResponse.content && Array.isArray(gradesResponse.content)) {
                        gradesList = gradesResponse.content;
                    } else if (Array.isArray(gradesResponse)) {
                        gradesList = gradesResponse;
                    }
                }
                gradesData[enrollment.enrollmentId] = gradesList;
            } catch (error) {
                console.error('Ошибка загрузки оценок для enrollment', enrollment.enrollmentId, ':', error);
                gradesData[enrollment.enrollmentId] = [];
            }
        }

        // Загружаем посещаемость для курса
        const attendanceData = {};
        try {
            const attendanceResponse = await apiCall(`/attendance/course/${courseId}`);
            console.log('Посещаемость загружена для студента:', attendanceResponse);
            if (attendanceResponse && Array.isArray(attendanceResponse)) {
                // Получаем список enrollmentId студента для фильтрации (приводим к числу для сравнения)
                const studentEnrollmentIds = courseEnrollments.map(e => Number(e.enrollmentId));
                console.log('Enrollment IDs студента:', studentEnrollmentIds);
                console.log('Все записи посещаемости:', attendanceResponse);
                
                attendanceResponse.forEach(record => {
                    const scheduleId = Number(record.scheduleId);
                    const enrollmentId = Number(record.enrollmentId);
                    // Фильтруем только записи посещаемости для этого студента
                    if (scheduleId != null && !isNaN(scheduleId) && enrollmentId != null && !isNaN(enrollmentId) && studentEnrollmentIds.includes(enrollmentId)) {
                        // Используем явное преобразование в строку для ключа (как в gradebook.js)
                        const key = `${scheduleId}_${enrollmentId}`;
                        attendanceData[key] = record;
                        console.log('Добавлена запись посещаемости для студента:', key, record);
                    } else {
                        console.log('Пропущена запись посещаемости:', { scheduleId, enrollmentId, studentEnrollmentIds });
                    }
                });
            }
            console.log('Итоговый attendanceData для студента:', attendanceData);
        } catch (error) {
            console.error('Ошибка загрузки посещаемости:', error);
        }

        renderStudentCourseGradebook(courseEnrollments, schedules, gradesData, attendanceData);
    } catch (error) {
        console.error('Ошибка загрузки данных курса:', error);
        contentContainer.innerHTML = '<div class="card"><p class="error-message" style="text-align: center; padding: 2rem;">Ошибка загрузки данных: ' + (error.message || 'Неизвестная ошибка') + '</p></div>';
    }
}

function renderStudentCourseGradebook(enrollments, schedules, gradesData, attendanceData) {
    const contentContainer = document.getElementById('studentGradebookCourseContent');
    if (!contentContainer) {
        console.error('Контейнер studentGradebookCourseContent не найден');
        return;
    }

    // Сортируем расписание по дате
    const sortedSchedules = [...schedules].sort((a, b) => {
        const dateA = a.dateTime ? new Date(a.dateTime).getTime() : 0;
        const dateB = b.dateTime ? new Date(b.dateTime).getTime() : 0;
        return dateA - dateB;
    });

    if (sortedSchedules.length === 0) {
        contentContainer.innerHTML = '<div class="card"><p style="text-align: center; padding: 2rem; color: #666;">Нет расписания для этого курса</p></div>';
        return;
    }

    const courseName = enrollments[0]?.courseName || enrollments[0]?.course?.name || 'Курс';

    let html = `
        <div class="card" style="margin-bottom: 1.5rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 1.5rem;">
            <h3 style="margin: 0 0 1rem 0; color: #333; font-size: 1.5rem; border-bottom: 3px solid #667eea; padding-bottom: 0.5rem;">📚 ${courseName}</h3>
            <div style="overflow-x: auto; margin-top: 1rem;">
                <table style="width: 100%; border-collapse: collapse; min-width: 600px; background: white;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <th style="padding: 1rem; text-align: left; border: 1px solid #ddd; position: sticky; left: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); z-index: 10; min-width: 200px;">ДАТА / УЧЕНИК</th>
    `;

    // Добавляем заголовок для студента (только один столбец, т.к. это его журнал)
    html += `
                            <th style="padding: 1rem; text-align: center; border: 1px solid #ddd; min-width: 150px;">ВАШИ ОЦЕНКИ И ПОСЕЩАЕМОСТЬ</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Проходим по каждому занятию - показываем только те, на которые студент записан
    sortedSchedules.forEach(schedule => {
        const date = schedule.dateTime;
        const dateStr = date ? formatDate(date) : 'Дата не указана';
        const time = date ? new Date(date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
        const room = schedule.room || '';

        // Находим enrollment для этого занятия
        const scheduleId = schedule.scheduleId || schedule.id;
        const enrollment = enrollments.find(e => {
            const eScheduleId = e.scheduleId || e.schedule?.scheduleId || e.schedule?.id;
            return eScheduleId == scheduleId;
        });

        // Пропускаем занятия, на которые студент не записан
        if (!enrollment) {
            console.log('Пропущено занятие', scheduleId, '- студент не записан');
            return;
        }

        const enrollmentId = enrollment.enrollmentId;

        // Получаем оценку для этого занятия
        const gradesForEnrollment = gradesData[enrollmentId] || [];
        let gradeForSchedule = null;
        
        if (date && gradesForEnrollment.length > 0) {
            gradeForSchedule = gradesForEnrollment.find(g => {
                if (g.date) {
                    try {
                        const gradeDate = new Date(g.date);
                        const scheduleDate = new Date(date);
                        return gradeDate.getFullYear() === scheduleDate.getFullYear() &&
                               gradeDate.getMonth() === scheduleDate.getMonth() &&
                               gradeDate.getDate() === scheduleDate.getDate();
                    } catch (e) {
                        return false;
                    }
                }
                return false;
            });
        }

        const gradeValue = gradeForSchedule ? gradeForSchedule.grade : null;
        const gradeColor = gradeValue ? (gradeValue >= 4 ? '#28a745' : gradeValue >= 3 ? '#ffc107' : '#dc3545') : '#999';

        // Получаем посещаемость (используем уже вычисленный scheduleId, приводим к числу для консистентности)
        const scheduleIdNum = Number(scheduleId);
        const enrollmentIdNum = Number(enrollmentId);
        const attendanceKey = `${scheduleIdNum}_${enrollmentIdNum}`;
        const attendanceRecord = attendanceData[attendanceKey];
        console.log('Поиск посещаемости для ключа:', attendanceKey, 'найден:', attendanceRecord, 'для занятия:', dateStr, 'enrollmentId:', enrollmentId);
        const attendanceStatus = attendanceRecord?.status || null;
        const isPresent = attendanceStatus === 'PRESENT';
        const isAbsent = attendanceStatus === 'ABSENT';
        const isLate = attendanceStatus === 'LATE';
        const isExcused = attendanceStatus === 'EXCUSED';

        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 1rem; border: 1px solid #ddd; position: sticky; left: 0; background: white; z-index: 5;">
                    <div style="font-weight: 600; color: #333;">${dateStr}</div>
                    ${time ? `<div style="font-size: 0.9rem; color: #666; margin-top: 0.25rem;">${time}</div>` : ''}
                    ${room ? `<div style="font-size: 0.9rem; color: #666; margin-top: 0.25rem;">${room}</div>` : ''}
                </td>
                <td style="padding: 1rem; text-align: center; border: 1px solid #ddd; vertical-align: middle;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                        ${gradeValue ? `
                            <div style="font-size: 2rem; font-weight: bold; color: ${gradeColor};">
                                ${gradeValue}
                            </div>
                        ` : '<div style="font-size: 1.2rem; color: #999;">-</div>'}
                        <div style="font-size: 1.5rem;">
                            ${isPresent ? '✅' : isAbsent ? '❌' : isLate ? '⏰' : isExcused ? '🏥' : '○'}
                        </div>
                        <div style="font-size: 0.85rem; color: #666;">
                            ${isPresent ? 'Присутствовал' : isAbsent ? 'Отсутствовал' : isLate ? 'Опоздал' : isExcused ? 'По уважительной причине' : 'Не отмечено'}
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    contentContainer.innerHTML = html;
}

// Делаем функции доступными глобально
window.loadStudentGradebook = loadStudentGradebook;
window.selectStudentCourse = selectStudentCourse;

