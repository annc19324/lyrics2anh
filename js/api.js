// Backend Configuration
const IS_LOCAL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && !window.Capacitor;
const PRIMARY_DOMAIN = 'https://lyrics2anh.onrender.com/api';
const SECONDARY_DOMAIN = 'https://lyrics2anh-2cun.onrender.com/api';

let API_URL = IS_LOCAL ? '/api' : PRIMARY_DOMAIN;
let isUsingBackup = false;
let recoveryInterval = null;

const BackendManager = {
    checkRecovery: async () => {
        if (!isUsingBackup || IS_LOCAL) return;
        try {
            // Check lightweight endpoint to see if primary is back
            const res = await fetch(`${PRIMARY_DOMAIN}/ads`, { method: 'GET' });
            if (res.ok) {
                API_URL = PRIMARY_DOMAIN;
                isUsingBackup = false;
                if (recoveryInterval) { clearInterval(recoveryInterval); recoveryInterval = null; }
                if (typeof Toast !== 'undefined') Toast.show('Đã kết nối lại máy chủ chính!');
                console.log('Restored Primary Backend');
            }
        } catch (e) { /* Still down */ }
    },
    switchToBackup: () => {
        if (isUsingBackup || IS_LOCAL) return;
        API_URL = SECONDARY_DOMAIN;
        isUsingBackup = true;
        if (typeof Toast !== 'undefined') Toast.show('Máy chủ chính gặp sự cố, chuyển sang máy chủ phụ...', 'warning');
        console.warn('Switched to Backup Backend');

        if (!recoveryInterval) {
            recoveryInterval = setInterval(BackendManager.checkRecovery, 30000); // Check every 30s
        }
    }
};

const fetchWithFailover = async (endpoint, options) => {
    try {
        const res = await fetch(`${API_URL}${endpoint}`, options);
        // Treat 502/503/504 as server down
        if (!res.ok && res.status >= 502) {
            throw new Error(`Server Error ${res.status}`);
        }
        return res;
    } catch (err) {
        // If we are not local and not yet on backup, try switching
        if (!IS_LOCAL && !isUsingBackup) {
            BackendManager.switchToBackup();
            // Retry request on new URL
            return await fetch(`${API_URL}${endpoint}`, options);
        }
        throw err;
    }
};
let token = localStorage.getItem('l2a_token');
let currentUser = null;

const Toast = {
    timer: null,
    show(msg, type = 'info') {
        const t = document.getElementById('toast');
        if (!t) return;

        if (this.timer) clearTimeout(this.timer);

        t.innerText = msg;
        t.classList.remove('hidden');
        t.style.borderLeftColor = type === 'error' ? '#ef4444' : '#6366f1';

        this.timer = setTimeout(() => t.classList.add('hidden'), 3500);
    }
};

const API = {
    async get(endpoint) {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        try {
            const res = await fetchWithFailover(endpoint, { headers });
            return await res.json();
        } catch (e) {
            console.error(e);
            return { error: 'Network error' };
        }
    },
    async post(endpoint, body) {
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        try {
            const res = await fetchWithFailover(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (e) {
            return { error: 'Network error' };
        }
    },
    async delete(endpoint) {
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        try {
            const res = await fetchWithFailover(endpoint, { method: 'DELETE', headers });
            return await res.json();
        } catch (e) {
            return { error: 'Network error' };
        }
    }
};

const Auth = {
    isLoggedIn() { return !!currentUser; },
    isAdmin() { return currentUser && currentUser.role === 'admin'; },

    async login(username, password) {
        const data = await API.post('/auth/login', { username, password });
        if (data.token) {
            token = data.token;
            localStorage.setItem('l2a_token', token);
            currentUser = { username: data.username, role: data.role };
            Toast.show(`Chào mừng ${data.username}!`);
            if (window.updateAuthUI) window.updateAuthUI();
            return true;
        } else {
            Toast.show(data.error || 'Lỗi đăng nhập', 'error');
            return false;
        }
    },

    async register(username, password) {
        const data = await API.post('/auth/register', { username, password });
        if (data.message) {
            Toast.show('Đăng ký thành công! Vui lòng đăng nhập.');
            return true;
        } else {
            Toast.show(data.error || 'Lỗi đăng ký', 'error');
            return false;
        }
    },

    logout() {
        currentUser = null;
        token = null;
        localStorage.removeItem('l2a_token');
        if (window.updateAuthUI) window.updateAuthUI();
        Toast.show('Đã đăng xuất.');
    },

    async checkSession() {
        if (!token) return;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUser = { username: payload.username, role: payload.role };
            if (window.updateAuthUI) window.updateAuthUI();
        } catch (e) {
            localStorage.removeItem('l2a_token');
        }
    }
};
