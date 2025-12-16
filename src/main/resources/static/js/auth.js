const API_BASE = '/api';

let currentUser = null;
let currentToken = null;

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (token) {
        currentToken = token;
        loadUserProfile();
    } else {
        showLogin();
    }
});

function showLogin() {
    const loginPage = document.getElementById('loginPage');
    const navbar = document.getElementById('navbar');
    if (loginPage) loginPage.style.display = 'block';
    if (navbar) navbar.style.display = 'none';
    hideAllPages();
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (response.ok) {
            const token = await response.text();
            currentToken = token;
            localStorage.setItem('token', token);
            await loadUserProfile();
        } else {
            const error = await response.text();
            errorDiv.textContent = error || 'Ошибка входа';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Ошибка соединения с сервером';
        errorDiv.style.display = 'block';
    }
}

// Публичная регистрация отключена - пользователи создаются только администратором

async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showLogin();
            return;
        }

        // Получаем информацию о текущем пользователе
        const userInfo = await apiCall('/auth/me');
        if (!userInfo) {
            showLogin();
            return;
        }

        currentUser = userInfo;
        localStorage.setItem('username', userInfo.username);
        localStorage.setItem('role', userInfo.role);

        // Показываем навигацию
        const navbar = document.getElementById('navbar');
        const loginPage = document.getElementById('loginPage');
        if (navbar) navbar.style.display = 'block';
        if (loginPage) loginPage.style.display = 'none';

        // Показываем меню в зависимости от роли
        const role = userInfo.role;
        
        // Безопасное обновление стилей элементов меню
        const setMenuDisplay = (id, display) => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = display;
            }
        };
        
        setMenuDisplay('studentMenu', role === 'STUDENT' ? 'block' : 'none');
        setMenuDisplay('studentMenu2', role === 'STUDENT' ? 'block' : 'none');
        setMenuDisplay('studentMenu3', role === 'STUDENT' ? 'block' : 'none');
        setMenuDisplay('studentMenu4', role === 'STUDENT' ? 'block' : 'none');
        setMenuDisplay('teacherMenu', (role === 'TEACHER' || role === 'ADMIN') ? 'block' : 'none');
        setMenuDisplay('teacherMenu2', (role === 'TEACHER' || role === 'ADMIN') ? 'block' : 'none');
        setMenuDisplay('teacherMenu3', (role === 'TEACHER' || role === 'ADMIN') ? 'block' : 'none');
        setMenuDisplay('registrarMenu', role === 'REGISTRAR' ? 'block' : 'none');
        setMenuDisplay('registrarMenu2', role === 'REGISTRAR' ? 'block' : 'none');
        setMenuDisplay('adminCoursesMenu', role === 'ADMIN' ? 'block' : 'none');
        setMenuDisplay('adminTeachersMenu', role === 'ADMIN' ? 'block' : 'none');
        setMenuDisplay('adminMenu', role === 'ADMIN' ? 'block' : 'none');
        setMenuDisplay('adminMenu2', role === 'ADMIN' ? 'block' : 'none');

        showPage('dashboard');
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        showLogin();
    }
}

function logout() {
    localStorage.removeItem('token');
    currentToken = null;
    currentUser = null;
    showLogin();
}

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken || localStorage.getItem('token')}`
    };
}

function hideAllPages() {
    const pages = ['dashboardPage', 'profilePage', 'coursesPage', 'studentsPage',
                   'teachersPage', 'schedulePage', 'usersPage', 'statisticsPage', 'aboutPage',
                   'gradesPage', 'attendancePage', 'gradebookPage'];
    pages.forEach(pageId => {
        const page = document.getElementById(pageId);
        if (page) page.style.display = 'none';
    });
}

function showPage(pageName) {
    hideAllPages();
    const pageMap = {
        'dashboard': 'dashboardPage',
        'profile': 'profilePage',
        'courses': 'coursesPage',
        'students': 'studentsPage',
        'teachers': 'teachersPage',
        'schedule': 'schedulePage',
        'users': 'usersPage',
        'statistics': 'statisticsPage',
        'about': 'aboutPage',
        'studentGradebook': 'studentGradebookPage',
        'gradebook': 'gradebookPage'
    };
    
    const pageId = pageMap[pageName];
    if (pageId) {
        const page = document.getElementById(pageId);
        if (page) {
            page.style.display = 'block';
            
            // Загружаем данные для страницы
            if (pageName === 'students') {
                loadStudents();
            } else if (pageName === 'teachers') {
                loadTeachers();
            } else if (pageName === 'courses') {
                loadCourses();
            } else if (pageName === 'schedule') {
                loadSchedule();
            } else if (pageName === 'users') {
                loadUsers();
            } else if (pageName === 'statistics') {
                loadStatistics();
            } else if (pageName === 'profile') {
                loadProfile();
            } else if (pageName === 'studentGradebook') {
                if (typeof loadStudentGradebook === 'function') {
                    loadStudentGradebook();
                }
            } else if (pageName === 'gradebook') {
                console.log('Переход на страницу gradebook, pageId:', pageId);
                if (typeof loadGradebook === 'function') {
                    console.log('Функция loadGradebook найдена, вызываем');
                    try {
                        loadGradebook();
                    } catch (error) {
                        console.error('Ошибка при вызове loadGradebook:', error);
                        const container = document.getElementById('gradebookContent');
                        if (container) {
                            container.innerHTML = '<div class="card"><p class="error-message">Ошибка загрузки журнала: ' + (error.message || 'Неизвестная ошибка') + '</p></div>';
                        }
                    }
                } else {
                    console.error('Функция loadGradebook не найдена!');
                    const container = document.getElementById('gradebookContent');
                    if (container) {
                        container.innerHTML = '<div class="card"><p class="error-message">Ошибка: функция loadGradebook не загружена. Проверьте, что файл gradebook.js подключен.</p></div>';
                    }
                }
            }
        } else {
            console.error('Страница не найдена:', pageId);
        }
    } else {
        console.error('Неизвестная страница:', pageName);
    }
}

window.showPage = showPage;

