// Основной файл приложения

// Убеждаемся, что API_BASE доступен
if (typeof API_BASE === 'undefined') {
    window.API_BASE = '/api';
}

window.showMessage = function(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    if (type === 'success') {
        messageDiv.style.background = '#28a745';
        messageDiv.style.color = 'white';
    } else {
        messageDiv.style.background = '#dc3545';
        messageDiv.style.color = 'white';
    }
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
};

window.formatDate = function(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

window.formatDateTime = function(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};;

window.apiCall = async function(endpoint, options = {}) {
    const apiBase = window.API_BASE || '/api';
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    };
    
    const defaultOptions = {
        headers: headers,
        method: options.method || 'GET'
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        finalOptions.body = JSON.stringify(options.body);
    }
    
    try {
        console.log(`API Call: ${apiBase}${endpoint}`, finalOptions);
        const response = await fetch(`${apiBase}${endpoint}`, finalOptions);
        
        console.log(`Response status: ${response.status}`, response);
        
        if (response.status === 401) {
            if (typeof logout === 'function') {
                logout();
            }
            return null;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(errorText || `Ошибка запроса: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const text = await response.text();
            console.log('API Response raw text:', text);
            if (!text || text.trim() === '') {
                console.warn('Пустой ответ от сервера');
                return null;
            }
            try {
                const data = JSON.parse(text);
                console.log('API Response parsed data:', data);
                return data;
            } catch (e) {
                console.error('Ошибка парсинга JSON:', e, 'Raw text:', text);
                throw new Error('Неверный формат ответа от сервера: ' + text.substring(0, 100));
            }
        } else {
            const text = await response.text();
            console.log('API Response text (не JSON):', text);
            return text;
        }
    } catch (error) {
        console.error('API Error:', error);
        if (typeof showMessage === 'function') {
            showMessage(error.message || 'Ошибка соединения с сервером', 'error');
        }
        throw error;
    }
};




















