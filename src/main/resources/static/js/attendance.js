// Функции для электронного журнала посещаемости студента

async function loadAttendance() {
    try {
        const container = document.getElementById('attendanceContent');
        if (!container) {
            console.error('Контейнер attendanceContent не найден');
            return;
        }

        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const studentId = userInfo.studentId;
        
        if (!studentId) {
            container.innerHTML = '<div class="card"><p class="error-message">ID студента не найден</p></div>';
            return;
        }
        
        const enrollments = await apiCall(`/students/${studentId}/enrollments`);
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
                    records: [],
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
        
        attendanceRecords.forEach(record => {
            const enrollment = enrollments.find(e => e.enrollmentId === record.enrollmentId);
            if (enrollment) {
                const courseName = enrollment.courseName || 'Неизвестный курс';
                if (byCourse[courseName]) {
                    byCourse[courseName].records.push(record);
                }
            }
        });
        
        let html = '<div class="card">';
        html += '<h3>📅 Электронный журнал посещаемости</h3>';
        
        // Сводка
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;
        let totalExcused = 0;
        
        attendanceRecords.forEach(record => {
            if (record.status === 'PRESENT') totalPresent++;
            else if (record.status === 'ABSENT') totalAbsent++;
            else if (record.status === 'LATE') totalLate++;
            else if (record.status === 'EXCUSED') totalExcused++;
        });
        
        const total = totalPresent + totalAbsent + totalLate + totalExcused;
        const attendancePercent = total > 0 ? ((totalPresent / total) * 100).toFixed(1) : 0;
        
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0; padding: 1rem; background: #f8f9fa; border-radius: 8px;">';
        html += `<div style="text-align: center;"><strong>${totalPresent}</strong><br><small style="color: #666;">Присутствовал</small></div>`;
        html += `<div style="text-align: center;"><strong>${totalAbsent}</strong><br><small style="color: #666;">Отсутствовал</small></div>`;
        html += `<div style="text-align: center;"><strong>${totalLate}</strong><br><small style="color: #666;">Опоздал</small></div>`;
        html += `<div style="text-align: center;"><strong>${totalExcused}</strong><br><small style="color: #666;">Уважительная причина</small></div>`;
        html += `<div style="text-align: center;"><strong>${attendancePercent}%</strong><br><small style="color: #666;">Посещаемость</small></div>`;
        html += '</div>';
        
        // Детали по курсам
        Object.keys(byCourse).forEach(courseName => {
            const courseData = byCourse[courseName];
            html += '<div style="margin-top: 2rem; padding: 1rem; background: #fff; border: 1px solid #ddd; border-radius: 8px;">';
            html += `<h4 style="margin-top: 0; color: #333;">${courseName}</h4>`;
            
            if (courseData.records.length === 0) {
                html += '<p style="color: #666;">Нет записей посещаемости</p>';
            } else {
                html += '<div style="overflow-x: auto;">';
                html += '<table style="width: 100%; border-collapse: collapse; min-width: 600px;">';
                html += '<thead>';
                html += '<tr style="background: #f8f9fa;">';
                html += '<th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Дата</th>';
                html += '<th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Время</th>';
                html += '<th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">Статус</th>';
                html += '<th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Примечания</th>';
                html += '</tr>';
                html += '</thead>';
                html += '<tbody>';
                
                courseData.records.sort((a, b) => {
                    const dateA = new Date(a.recordDate || a.dateTime || 0);
                    const dateB = new Date(b.recordDate || b.dateTime || 0);
                    return dateB - dateA;
                });
                
                courseData.records.forEach(record => {
                    const date = new Date(record.recordDate || record.dateTime || Date.now());
                    const dateStr = date.toLocaleDateString('ru-RU');
                    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                    
                    let statusBadge = '';
                    let statusColor = '#666';
                    if (record.status === 'PRESENT') {
                        statusBadge = '✓ Был';
                        statusColor = '#4caf50';
                    } else if (record.status === 'ABSENT') {
                        statusBadge = '✗ Не был';
                        statusColor = '#f44336';
                    } else if (record.status === 'LATE') {
                        statusBadge = '⏰ Опоздал';
                        statusColor = '#ff9800';
                    } else if (record.status === 'EXCUSED') {
                        statusBadge = '📝 Уважительная причина';
                        statusColor = '#2196f3';
                    }
                    
                    html += '<tr>';
                    html += `<td style="padding: 0.5rem; border: 1px solid #ddd;">${dateStr}</td>`;
                    html += `<td style="padding: 0.5rem; border: 1px solid #ddd;">${timeStr}</td>`;
                    html += `<td style="padding: 0.5rem; text-align: center; border: 1px solid #ddd;">
                        <span style="color: ${statusColor}; font-weight: bold;">${statusBadge}</span>
                    </td>`;
                    html += `<td style="padding: 0.5rem; border: 1px solid #ddd;">${record.notes || '-'}</td>`;
                    html += '</tr>';
                });
                
                html += '</tbody>';
                html += '</table>';
                html += '</div>';
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Ошибка загрузки посещаемости:', error);
        const container = document.getElementById('attendanceContent');
        if (container) {
            container.innerHTML = '<div class="card"><p class="error-message">Ошибка загрузки посещаемости: ' + (error.message || 'Неизвестная ошибка') + '</p></div>';
        }
    }
}

window.loadAttendance = loadAttendance;
