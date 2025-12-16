async function loadStatistics() {
    try {
        const stats = await apiCall('/stats');
        if (stats) {
            renderStatistics(stats);
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

function renderStatistics(stats) {
    const container = document.getElementById('statisticsContent');
    if (!container) return;

    let html = `
        <div class="stats-grid">
            <div class="stat-card">
                <h3>${stats.totalUsers || 0}</h3>
                <p>Всего пользователей</p>
            </div>
            <div class="stat-card">
                <h3>${stats.totalStudents || 0}</h3>
                <p>Учеников</p>
            </div>
            <div class="stat-card">
                <h3>${stats.totalTeachers || 0}</h3>
                <p>Преподавателей</p>
            </div>
            <div class="stat-card">
                <h3>${stats.totalCourses || 0}</h3>
                <p>Курсов</p>
            </div>
            <div class="stat-card">
                <h3>${stats.activeCourses || 0}</h3>
                <p>Активных курсов</p>
            </div>
            <div class="stat-card">
                <h3>${stats.totalEnrollments || 0}</h3>
                <p>Записей на курсы</p>
            </div>
        </div>
    `;

    if (stats.averageGrade) {
        html += `
            <div class="stat-card" style="margin-top: 2rem;">
                <h3>${stats.averageGrade.toFixed(2)}</h3>
                <p>Средняя оценка</p>
            </div>
        `;
    }

    container.innerHTML = html;
}































































