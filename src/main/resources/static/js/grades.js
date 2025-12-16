// Функции для электронного журнала оценок студента (по примеру скрина 7)

async function loadGrades() {
    try {
        const container = document.getElementById('gradesContent');
        if (!container) {
            console.error('Контейнер gradesContent не найден');
            return;
        }

        const userInfo = await apiCall('/auth/me');
        const studentId = userInfo.studentId;
        
        if (!studentId) {
            container.innerHTML = '<div class="card"><p class="error-message">ID студента не найден</p></div>';
            return;
        }
        
        const enrollments = await apiCall('/enrollments/me');
        const grades = await apiCall('/grades/me');
        const attendanceRecords = await apiCall('/enrollments/me/attendance-records') || [];
        
        if (!enrollments || !Array.isArray(enrollments)) {
            container.innerHTML = '<div class="card"><p style="color: #666; text-align: center; padding: 2rem;">Нет записей на курсы</p></div>';
            return;
        }
        
        const byCourse = {};
        enrollments.forEach(enrollment => {
            const courseName = enrollment.courseName || 'Неизвестный курс';
            if (!byCourse[courseName]) {
                byCourse[courseName] = {
                    enrollments: [],
                    grades: [],
                    schedules: []
                };
            }
            byCourse[courseName].enrollments.push(enrollment);
            if (enrollment.scheduleId) {
                byCourse[courseName].schedules.push({
                    scheduleId: enrollment.scheduleId,
                    dateTime: enrollment.dateTime,
                    room: enrollment.room
                });
            }
        });
        
        if (grades && Array.isArray(grades)) {
            grades.forEach(grade => {
                const courseName = grade.courseName || 'Неизвестный курс';
                if (!byCourse[courseName]) {
                    byCourse[courseName] = {
                        enrollments: [],
                        grades: [],
                        schedules: []
                    };
                }
                byCourse[courseName].grades.push(grade);
            });
        }
        
        let html = '<div class="card">';
        html += '<h3>📊 Электронный журнал оценок</h3>';
        html += '<div style="overflow-x: auto; margin-top: 1rem;">';
        html += '<table style="width: 100%; border-collapse: collapse; min-width: 800px; background: white;">';
        html += '<thead>';
        html += '<tr style="background: #f8f9fa;">';
        html += '<th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd; position: sticky; left: 0; background: #f8f9fa; z-index: 10;">№</th>';
        html += '<th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd; position: sticky; left: 50px; background: #f8f9fa; z-index: 10; min-width: 200px;">Предметы</th>';
        html += '<th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd; min-width: 300px;">Оценки</th>';
        html += '<th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd; min-width: 80px;">Опоздания</th>';
        html += '<th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd; min-width: 100px;" colspan="2">Пропуски</th>';
        html += '<th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd; min-width: 100px;">Средний балл</th>';
        html += '</tr>';
        html += '<tr style="background: #f8f9fa;">';
        html += '<th colspan="3" style="border: 1px solid #ddd;"></th>';
        html += '<th style="padding: 0.5rem; text-align: center; border: 1px solid #ddd; font-size: 0.85em;">Всего</th>';
        html += '<th style="padding: 0.5rem; text-align: center; border: 1px solid #ddd; font-size: 0.85em;">По болезни</th>';
        html += '<th style="border: 1px solid #ddd;"></th>';
        html += '</tr>';
        html += '</thead>';
        html += '<tbody>';
        
        let courseIdx = 0;
        Object.keys(byCourse).forEach(courseName => {
            const courseData = byCourse[courseName];
            const courseGrades = courseData.grades || [];
            const gradesStr = courseGrades.map(g => g.grade).join('');
            
            let lateCount = 0;
            let absentCount = 0;
            let excusedCount = 0;
            
            if (attendanceRecords && Array.isArray(attendanceRecords)) {
                courseData.enrollments.forEach(enrollment => {
                    attendanceRecords.forEach(record => {
                        if (record.enrollmentId === enrollment.enrollmentId) {
                            if (record.status === 'LATE') lateCount++;
                            else if (record.status === 'ABSENT') absentCount++;
                            else if (record.status === 'EXCUSED') excusedCount++;
                        }
                    });
                });
            }
            
            const numericGrades = courseGrades.filter(g => {
                const grade = parseFloat(g.grade);
                return !isNaN(grade) && grade > 0;
            }).map(g => parseFloat(g.grade));
            const avgGrade = numericGrades.length > 0 
                ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(2)
                : '-';
            
            let gradesDisplay = gradesStr;
            if (absentCount > 0 || excusedCount > 0) {
                gradesDisplay = gradesStr + (absentCount > 0 ? ' п'.repeat(Math.min(absentCount, 5)) : '');
            }
            
            html += `<tr style="border-bottom: 1px solid #eee;">`;
            html += `<td style="padding: 0.5rem; border: 1px solid #ddd; position: sticky; left: 0; background: white; z-index: 5; text-align: center;">${++courseIdx}</td>`;
            html += `<td style="padding: 0.5rem; border: 1px solid #ddd; position: sticky; left: 50px; background: white; z-index: 5;">
                <strong>${courseName}</strong>
            </td>`;
            html += `<td style="padding: 0.5rem; text-align: center; border: 1px solid #ddd; background: #e8f5e9; font-family: monospace; font-size: 1.1em;">
                ${gradesDisplay || '-'}
            </td>`;
            html += `<td style="padding: 0.5rem; text-align: center; border: 1px solid #ddd;">${lateCount}</td>`;
            html += `<td style="padding: 0.5rem; text-align: center; border: 1px solid #ddd;">${absentCount + excusedCount}</td>`;
            html += `<td style="padding: 0.5rem; text-align: center; border: 1px solid #ddd;">${excusedCount}</td>`;
            html += `<td style="padding: 0.5rem; text-align: center; border: 1px solid #ddd; background: #e8f5e9; font-weight: bold;">${avgGrade}</td>`;
            html += `</tr>`;
        });
        
        html += '</tbody>';
        html += '</table>';
        html += '</div>';
        html += '<div style="margin-top: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">';
        html += '<strong>Легенда:</strong> ';
        html += '<span style="margin-left: 1rem;">Числа - оценки</span>';
        html += '<span style="margin-left: 1rem;">п - пропуск</span>';
        html += '</div>';
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки оценок:', error);
        const container = document.getElementById('gradesContent');
        if (container) {
            container.innerHTML = '<div class="card"><p class="error-message">Ошибка загрузки оценок: ' + (error.message || 'Неизвестная ошибка') + '</p></div>';
        }
    }
}

window.loadGrades = loadGrades;
