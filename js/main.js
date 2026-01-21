// --- Configuration ---
const CONFIG = {
    canvasWidth: 1080,
    canvasHeight: 1440,
    fontBaseSize: 30,
};

// --- State Management ---
const DEFAULT_STATE = {
    songName: "14. bản nhạc cuối (cho em)",
    artistName: "B Ray",
    channelName: "annc19324",
    lyrics: "Lần đầu gặp gỡ\nAnh đã đem lòng mong nhớ\nAnh đã bắt đầu ngủ ngày\nChỉ để có thể thấy em trong mơ\nThế cho nên là\nVào một ngày nào không may\nEm thấy tim mình tan vỡ\nVì anh đã không còn đây",
    images: { background: null, art: null, bgSrc: './assets/bg_1.webp', artSrc: './assets/art_default.webp' },
    style: {
        template: '1', font: "'Patrick Hand', cursive", textColor: '#ffffff', fontSize: 30,
        songSize: 40, artistSize: 30, channelSize: 30, overlayOpacity: 40, bgBlur: 0,
        mask: 'none', songX: 0, songY: 0, artistX: 0, artistY: 0, lyricsX: 0, lyricsY: 0,
        channelX: 0, channelY: -60, lyricsAlign: 'left', previewGap: 10, lineHeight: 18,
        artPosX: 0, artPosY: 0, artScale: 100
    }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function loadState() {
    const saved = localStorage.getItem('lyrics2anh_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = {
                ...DEFAULT_STATE, ...parsed,
                style: { ...DEFAULT_STATE.style, ...parsed.style },
                images: { ...DEFAULT_STATE.images, ...parsed.images }
            };
        } catch (e) { console.error(e); }
    }
}

function saveState() {
    const stateToSave = {
        ...state,
        images: {
            ...state.images,
            background: undefined,
            art: undefined
        }
    };
    localStorage.setItem('lyrics2anh_state', JSON.stringify(stateToSave));
}

function restoreUI() {
    // Basic fields
    ['songName', 'artistName', 'channelName', 'lyricsText'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = state[id.replace('Text', '')] || '';
    });
    // Style fields
    ['templateSelect', 'fontSelect', 'textColor', 'fontSize', 'songSize', 'artistSize', 'channelSize',
        'overlayOpacity', 'bgBlur', 'songX', 'songY', 'artistX', 'artistY', 'channelX', 'channelY',
        'lyricsX', 'lyricsY', 'lyricsAlign', 'previewGap', 'lineHeight', 'artPosX', 'artPosY', 'artScale'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = state.style[id.replace('Select', '').replace('Color', 'Color').replace('Align', 'Align')] || '';
        });
    // Mask UI
    document.querySelectorAll('#maskOptions .option-item').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.value === state.style.mask);
    });
    // Gap CSS
    document.getElementById('canvasContainerInner').style.setProperty('--preview-gap', `${state.style.previewGap}px`);
}

// --- Initialization ---
async function init() {
    loadState();
    if (canvas1) { canvas1.width = CONFIG.canvasWidth; canvas1.height = CONFIG.canvasHeight; }
    if (canvas2) { canvas2.width = CONFIG.canvasWidth; canvas2.height = CONFIG.canvasHeight; }

    restoreUI();
    setupEventListeners();

    loadImage('background', state.images.bgSrc || './assets/bg_1.jpg');
    loadImage('art', state.images.artSrc || './assets/art_default.png');

    await Auth.checkSession();
    renderComments();
    renderHeader();
    renderAds();
}

function loadImage(type, src) {
    if (!src) return;
    const img = new Image();
    if (window.location.protocol !== 'file:') img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
        state.images[type] = img;
        state.images[type === 'background' ? 'bgSrc' : 'artSrc'] = src;
        render();
    };
}

// --- UI Rendering ---
function updateAuthUI() {
    const isLogged = Auth.isLoggedIn();
    const warns = document.getElementById('commentAuthWarning');
    const input = document.getElementById('commentInputArea');
    if (warns) warns.classList.toggle('hidden', isLogged);
    if (input) input.classList.toggle('hidden', !isLogged);

    const userDisplay = document.getElementById('currentUserName');
    if (userDisplay && currentUser) userDisplay.innerText = currentUser.username;

    renderHeader();
}

let visibleComments = 5;
async function renderComments() {
    const comments = await API.get('/comments');
    if (!Array.isArray(comments)) return;

    const count = document.getElementById('commentCount');
    if (count) count.innerText = comments.length;

    const list = document.getElementById('commentsList');
    if (!list) return;

    const isAdmin = Auth.isAdmin();
    const displayed = comments.slice(0, visibleComments);

    list.innerHTML = displayed.map(c => `
        <div class="comment-item">
            <div class="comment-header">
                <strong>${c.username}</strong>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span>${new Date(c.createdAt).toLocaleDateString()}</span>
                    ${isAdmin ? `<button onclick="deleteComment(${c.id})" style="color:red; background:none; border:none; cursor:pointer;">&times;</button>` : ''}
                </div>
            </div>
            <div class="comment-content">${c.content}</div>
        </div>
    `).join('');

    if (comments.length > visibleComments) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.width = '100%';
        btn.innerText = `Xem thêm (${comments.length - visibleComments})`;
        btn.onclick = () => { visibleComments += 5; renderComments(); };
        list.appendChild(btn);
    }
}

window.deleteComment = async (id) => {
    await API.delete(`/comments/${id}`); renderComments();
};

async function renderHeader() {
    const contacts = await API.get('/contact');
    const left = document.getElementById('footerSocials');
    if (left) {
        let html = '';
        if (contacts.facebook) html += `<a href="${contacts.facebook}" target="_blank" class="footer-btn"><i class="fa-brands fa-facebook"></i> Facebook</a>`;
        html += `<span class="footer-btn" id="footerDonateBtn"><i class="fa-solid fa-heart"></i> Donate</span>`;
        left.innerHTML = html;
        const dBtn = document.getElementById('footerDonateBtn');
        if (dBtn) dBtn.onclick = () => { document.getElementById('donateSection').classList.remove('hidden'); checkDonate(); };
    }

    const right = document.getElementById('footerSystem');
    if (right) {
        let html = '';
        if (Auth.isAdmin()) html += `<span class="footer-btn" id="openAdminBtn"><i class="fa-solid fa-screwdriver-wrench"></i> Admin</span>`;
        if (Auth.isLoggedIn()) html += `<span class="footer-btn logout" id="logoutBtn"><i class="fa-solid fa-right-from-bracket"></i> Đăng xuất</span>`;
        else html += `<span class="footer-btn" id="footerLoginBtn"><i class="fa-solid fa-user"></i> Đăng nhập</span>`;
        right.innerHTML = html;

        const adm = document.getElementById('openAdminBtn');
        if (adm) adm.onclick = () => { document.getElementById('adminPanel').classList.remove('hidden'); renderAdminUsers(); };
        const logout = document.getElementById('logoutBtn');
        if (logout) logout.onclick = () => Auth.logout();
        const loginBtn = document.getElementById('footerLoginBtn');
        if (loginBtn) loginBtn.onclick = (e) => { e.preventDefault(); document.getElementById('authModal').classList.remove('hidden'); };

        const triggerLogin = document.getElementById('triggerLogin');
        if (triggerLogin) triggerLogin.onclick = (e) => { e.preventDefault(); document.getElementById('authModal').classList.remove('hidden'); };
    }
}

async function renderAds() {
    const ads = await API.get('/ads');
    if (ads && ads.length > 0) {
        const txt = document.getElementById('adText');
        if (txt) txt.innerText = ads[0].content;
        document.getElementById('adContainer').classList.remove('hidden');
    }
}

const checkDonate = async () => {
    const d = await API.get('/donate');
    const disp = document.getElementById('qrDisplay');
    if (disp) disp.innerHTML = d.qrCode ? `<img src="${d.qrCode}" style="width:100%">` : "Chưa có mã QR.";
};

// --- Admin ---
async function renderAdminUsers() {
    const users = await API.get('/admin/users');
    const list = document.getElementById('userList');
    if (!list || !Array.isArray(users)) return;
    list.innerHTML = users.length ? users.map(u => `
        <div class="admin-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border-color);">
            <span>${u.username} (${u.role})</span>
            ${u.role !== 'admin' ? `<button onclick="deleteUser(${u.id})" class="btn btn-secondary btn-sm">Xóa</button>` : ''}
        </div>
    `).join('') : '<p>Chưa có người dùng.</p>';
}
window.deleteUser = async (id) => { if (confirm('Xóa user?')) { await API.delete(`/admin/users/${id}`); renderAdminUsers(); } };

async function renderAdminAds() {
    const ads = await API.get('/ads');
    const list = document.getElementById('adsList');
    if (!list || !Array.isArray(ads)) return;
    list.innerHTML = ads.length ? ads.map(a => `
        <div class="admin-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px; border-bottom:1px solid var(--border-color);">
            <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:10px;">${a.content}</span>
            <button onclick="deleteAd(${a.id})" class="btn btn-secondary btn-sm">Xóa</button>
        </div>
    `).join('') : '<p>Chưa có quảng cáo.</p>';
}
window.deleteAd = async (id) => { if (confirm('Xóa quảng cáo?')) { await API.delete(`/admin/ads/${id}`); renderAdminAds(); renderAds(); } };

// --- Event Listeners ---
function setupAdminListeners() {
    // Admin Tabs
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(`admin-${e.target.dataset.tab}`).classList.add('active');

            if (e.target.dataset.tab === 'users') renderAdminUsers();
            if (e.target.dataset.tab === 'ads') renderAdminAds();
            if (e.target.dataset.tab === 'contacts') loadAdminContacts();
            if (e.target.dataset.tab === 'donate') loadAdminDonate();
        });
    });

    // Add Ad
    document.getElementById('addAdBtn')?.addEventListener('click', async () => {
        const content = prompt('Nhập nội dung quảng cáo:');
        if (content) {
            await API.post('/admin/ads', { content });
            renderAdminAds();
            renderAds();
        }
    });

    // Contacts
    document.getElementById('saveContactsBtn')?.addEventListener('click', async () => {
        const facebook = document.getElementById('contactFb').value;
        await API.post('/admin/contact', { facebook });
        Toast.show('Đã lưu thông tin liên hệ');
        renderHeader();
    });

    // Donate QR
    let qrData = null;
    document.getElementById('donateQrInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                qrData = evt.target.result;
                document.getElementById('adminQrPreview').innerHTML = `<img src="${qrData}" style="width:100px; margin-top:10px;">`;
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('saveDonateBtn')?.addEventListener('click', async () => {
        if (!qrData) return Toast.show('Vui lòng chọn ảnh QR', 'error');
        const res = await API.post('/admin/donate', { qrCode: qrData });
        if (res.success) Toast.show('Đã lưu mã QR');
        else Toast.show('Lỗi lưu QR', 'error');
    });
}

async function loadAdminContacts() {
    const data = await API.get('/contact');
    const fb = document.getElementById('contactFb');
    if (fb) fb.value = data.facebook || '';
}

async function loadAdminDonate() {
    const data = await API.get('/donate');
    const prev = document.getElementById('adminQrPreview');
    if (prev && data.qrCode) prev.innerHTML = `<img src="${data.qrCode}" style="width:100px; margin-top:10px;">`;
}
function setupEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
        });
    });

    const update = () => { render(); saveState(); };

    // Form inputs
    ['songName', 'artistName', 'channelName', 'lyricsText'].forEach(id => {
        document.getElementById(id).addEventListener('input', (e) => {
            const key = id.replace('Text', '');
            state[key] = e.target.value;
            update();
        });
    });

    // Style inputs
    ['templateSelect', 'fontSelect', 'textColor', 'fontSize', 'songSize', 'artistSize', 'channelSize',
        'overlayOpacity', 'bgBlur', 'songX', 'songY', 'artistX', 'artistY', 'channelX', 'channelY',
        'lyricsX', 'lyricsY', 'lyricsAlign', 'previewGap', 'lineHeight', 'artPosX', 'artPosY', 'artScale'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const key = id.replace('Select', '').replace('Color', 'Color').replace('Align', 'Align');
            el.addEventListener(id.includes('Select') || id.includes('Align') ? 'change' : 'input', (e) => {
                const val = e.target.type === 'number' || e.target.type === 'range' ? parseInt(e.target.value) : e.target.value;
                state.style[key] = val;
                if (id === 'previewGap') document.getElementById('canvasContainerInner').style.setProperty('--preview-gap', `${val}px`);
                update();
            });
        });

    // Masks
    document.querySelectorAll('#maskOptions .option-item').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('#maskOptions .option-item').forEach(o => o.classList.remove('active'));
            e.target.classList.add('active');
            state.style.mask = e.target.dataset.value;
            update();
        });
    });

    // Asset Selection (Defaults)
    document.querySelectorAll('#bgAssets .asset-item').forEach(el => {
        el.addEventListener('click', () => {
            loadImage('background', el.dataset.src);
            document.querySelectorAll('#bgAssets .asset-item').forEach(i => i.classList.toggle('active', i === el));
        });
    });
    document.querySelectorAll('#artAssets .asset-item').forEach(el => {
        el.addEventListener('click', () => {
            loadImage('art', el.dataset.src);
            document.querySelectorAll('#artAssets .asset-item').forEach(i => i.classList.toggle('active', i === el));
        });
    });

    // Image Uploads
    const bindUpload = (id, key, boxId) => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = new Image();
                    img.onload = () => { state.images[key] = img; render(); };
                    img.src = evt.target.result;
                    const box = document.getElementById(boxId);
                    if (box) box.style.backgroundImage = `url(${evt.target.result})`;
                };
                reader.readAsDataURL(file);
            }
        });
    };
    bindUpload('bgInput', 'background', 'bgUploadBox');
    bindUpload('artInput', 'art', 'artUploadBox');

    // Controls
    document.getElementById('resetBtn').addEventListener('click', () => { localStorage.removeItem('lyrics2anh_state'); location.reload(); });
    document.getElementById('downloadBtn').addEventListener('click', downloadImages);

    // Zoom
    let zoom = 0.5;
    const adjustZoom = (delta) => { zoom = Math.max(0.2, zoom + delta); updateZoom(); };
    const updateZoom = () => {
        const h = 600 * zoom;
        document.querySelectorAll('canvas').forEach(c => c.style.height = `${h}px`);
        document.getElementById('zoomLevel').innerText = `${Math.round(zoom * 100)}%`;
    };
    document.getElementById('zoomIn').addEventListener('click', () => adjustZoom(0.1));
    document.getElementById('zoomOut').addEventListener('click', () => adjustZoom(-0.1));
    updateZoom();

    // Admin
    setupAdminListeners();

    // Feature Listeners (Auth, Modal, etc)
    setupFeatureListeners();
}

function setupFeatureListeners() {
    const modal = document.getElementById('authModal');
    const form = document.getElementById('authForm');
    let isRegister = false;

    // Switch mode
    document.getElementById('switchAuthMode').addEventListener('click', (e) => {
        e.preventDefault();
        isRegister = !isRegister;
        document.getElementById('authTitle').innerText = isRegister ? 'Đăng ký' : 'Đăng nhập';
        document.getElementById('authSubmitBtn').innerText = isRegister ? 'Đăng ký' : 'Đăng nhập';
        document.getElementById('authSwitchText').innerText = isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?";
        e.target.innerText = isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay';
    });

    document.getElementById('closeAuth').addEventListener('click', () => modal.classList.add('hidden'));

    // Toggle Password
    const togglePass = document.getElementById('togglePassword');
    const passInput = document.getElementById('authPass');
    if (togglePass && passInput) {
        togglePass.addEventListener('click', () => {
            const isPass = passInput.type === 'password';
            passInput.type = isPass ? 'text' : 'password';
            togglePass.classList.toggle('fa-eye', isPass);
            togglePass.classList.toggle('fa-eye-slash', !isPass);
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const u = document.getElementById('authUser').value;
            const p = document.getElementById('authPass').value;
            const success = isRegister ? await Auth.register(u, p) : await Auth.login(u, p);
            if (success && !isRegister) modal.classList.add('hidden');
        });
    }

    // Comments Send
    const sendComment = async () => {
        const txt = document.getElementById('commentText').value;
        if (!txt.trim()) return;
        const res = await API.post('/comments', { content: txt });
        if (res.error) return Toast.show(res.error, 'error');
        document.getElementById('commentText').value = '';
        renderComments();
    };
    document.getElementById('postCommentBtn')?.addEventListener('click', sendComment);
    document.getElementById('commentText')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendComment(); } });

    document.getElementById('closeAdmin')?.addEventListener('click', () => document.getElementById('adminPanel').classList.add('hidden'));
    document.getElementById('closeDonate')?.addEventListener('click', () => document.getElementById('donateSection').classList.add('hidden'));
    document.querySelector('.close-ad')?.addEventListener('click', () => document.getElementById('adContainer').classList.add('hidden'));
}

async function downloadImages() {
    const data1 = canvas1.toDataURL();
    const data2 = canvas2.toDataURL();

    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        try {
            const { Filesystem } = window.Capacitor.Plugins;
            const { Share } = window.Capacitor.Plugins;

            const saveAndShare = async (data, name) => {
                const fileName = `${Date.now()}_${name}`;
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: data.split(',')[1],
                    directory: 'CACHE', // Use CACHE directory for sharing
                });

                await Share.share({
                    title: 'Lưu ảnh Lyrics',
                    text: 'Chia sẻ hoặc lưu ảnh của bạn',
                    url: result.uri,
                    dialogTitle: 'Lưu ảnh',
                });
            };

            await saveAndShare(data1, 'intro.png');
            setTimeout(() => saveAndShare(data2, 'lyrics.png'), 1000);
        } catch (e) {
            console.error('Download error:', e);
            Toast.show('Lỗi tải ảnh: ' + e.message, 'error');
        }
    } else {
        const link = document.createElement('a');
        link.download = 'intro.png'; link.href = data1; link.click();
        setTimeout(() => { link.download = 'lyrics.png'; link.href = data2; link.click(); }, 500);
    }
}

window.updateAuthUI = updateAuthUI;
init();
