// Функции для учителя

let teacherStudents = [];
let teacherCourses = [];
let teacherGrades = [];

async function loadTeacherDashboard() {
    try {
        const userInfo = await apiCall('/auth/me');
        if (!userInfo || userInfo.role !== 'TEACHER') {
            return;
        }
        
        // Загружаем курсы учителя
        const allCourses = await apiCall('/courses');
        if (allCourses && userInfo.teacherId) {
            teacherCourses = allCourses.filter(c => c.teacherId === userInfo.teacherId);
        }
        
        // Загружаем учеников для курсов учителя
        if (teacherCourses.length > 0) {
            const allStudents = await apiCall('/students');
            teacherStudents = allStudents || [];
        }
        
        renderTeacherDashboard();
    } catch (error) {
        console.error('Ошибка загрузки данных учителя:', error);
    }
}

function renderTeacherDashboard() {
    // Эта функция будет вызываться из других мест при необходимости
}

// Журнал оценок
async function loadGradesForCourse(courseId) {
    try {
        const enrollments = await apiCall(`/courses/${courseId}/students`);
        if (!enrollments) return [];
        
        const grades = [];
        for (const enrollment of enrollments) {
            const enrollmentGrades = await apiCall(`/grades/enrollment/${enrollment.enrollmentId}`);
            if (enrollmentGrades && enrollmentGrades.content) {
                grades.push(...enrollmentGrades.content.map(g => ({
                    ...g,
                    studentName: enrollment.student?.fullName || 'Ученик',
                    enrollmentId: enrollment.enrollmentId
                })));
            }
        }
        
        return grades;
    } catch (error) {
        console.error('Ошибка загрузки оценок:', error);
        return [];
    }
}

// Глобальная функция для показа журнала оценок
window.showGradesModal = async function(courseId, courseName) {
    try {
        const enrollments = await apiCall(`/courses/${courseId}/students`);
        if (!enrollments || enrollments.length === 0) {
            alert('На этом курсе нет учеников');
            return;
        }
        
        let html = `
            <h3>Журнал оценок: ${courseName}</h3>
            <table style="width: 100%; margin-top: 1rem;">
                <thead>
                    <tr>
                        <th>Ученик</th>
                        <th>Оценка</th>
                        <th>Отзыв</th>
                        <th>Дата</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        for (const enrollment of enrollments) {
            const studentName = enrollment.student?.fullName || 'Ученик';
            const grades = await apiCall(`/grades/enrollment/${enrollment.enrollmentId}`).catch(() => ({ content: [] }));
            const gradesList = grades?.content || [];
            
            if (gradesList.length === 0) {
                html += `
                    <tr>
                        <td>${studentName}</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td><button class="btn btn-small" onclick="addGrade(${enrollment.enrollmentId}, '${studentName}')">Добавить оценку</button></td>
                    </tr>
                `;
            } else {
                gradesList.forEach(grade => {
                    html += `
                        <tr>
                            <td>${studentName}</td>
                            <td>${grade.grade || '-'}</td>
                            <td>${grade.review || '-'}</td>
                            <td>${formatDate(grade.date)}</td>
                            <td>
                                <button class="btn btn-small" onclick="editGrade(${grade.id}, ${enrollment.enrollmentId})">Редактировать</button>
                                <button class="btn btn-small btn-danger" onclick="deleteGrade(${grade.id})">Удалить</button>
                            </td>
                        </tr>
                    `;
                });
            }
        }
        
        html += `
                </tbody>
            </table>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>Журнал оценок</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                ${html}
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        alert('Ошибка загрузки журнала: ' + (error.message || 'Неизвестная ошибка'));
    }
}

function addGrade(enrollmentId, studentName) {
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
                    <label>Оценка (1-5): <input type="number" id="gradeValue" min="1" max="5" required></label>
                </div>
                <div class="form-group">
                    <label>Отзыв: <textarea id="gradeReview" style="width: 100%; min-height: 80px;"></textarea></label>
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
        document.querySelector('.modal').remove();
        // Обновляем модальное окно журнала
        const currentModal = document.querySelector('.modal');
        if (currentModal) {
            currentModal.remove();
        }
    } catch (error) {
        alert('Ошибка добавления оценки: ' + (error.message || 'Неизвестная ошибка'));
    }
}

async function editGrade(gradeId, enrollmentId) {
    // Реализация редактирования оценки
    alert('Редактирование оценки будет реализовано');
}

async function deleteGrade(gradeId) {
    if (!confirm('Удалить оценку?')) return;
    
    try {
        await apiCall(`/grades/${gradeId}`, { method: 'DELETE' });
        showMessage('Оценка удалена');
        const currentModal = document.querySelector('.modal');
        if (currentModal) {
            currentModal.remove();
        }
    } catch (error) {
        alert('Ошибка удаления оценки: ' + (error.message || 'Неизвестная ошибка'));
    }
}

// Статистика посещаемости
async function loadAttendanceStats(courseId) {
    try {
        const enrollments = await apiCall(`/courses/${courseId}/students`);
        if (!enrollments) return null;
        
        // Здесь можно добавить логику подсчета посещаемости
        // Пока возвращаем базовую статистику
        return {
            totalStudents: enrollments.length,
            enrolledStudents: enrollments.length
        };
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        return null;
    }
}

