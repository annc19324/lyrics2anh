/** @type {HTMLCanvasElement} */
const canvas1 = document.getElementById('canvas1');
/** @type {HTMLCanvasElement} */
const canvas2 = document.getElementById('canvas2');
const ctx1 = canvas1.getContext('2d');
const ctx2 = canvas2.getContext('2d');

// --- Configuration ---
const CONFIG = {
    canvasWidth: 1080,
    canvasHeight: 1920, // TikTok ratio 9:16
    fontBaseSize: 30, // Base scale for slider
};

// --- State ---
// --- State Management ---
const DEFAULT_STATE = {
    songName: "14. bản nhạc cuối (cho em)",
    artistName: "B Ray",
    channelName: "annc19324",
    lyrics: "Lần đầu gặp gỡ\nAnh đã đem lòng mong nhớ\nAnh đã bắt đầu ngủ ngày\nChỉ để có thể thấy em trong mơ\nThế cho nên là\nVào một ngày nào không may\nEm thấy tim mình tan vỡ\nVì anh đã không còn đây",
    images: {
        background: null,
        art: null,
        bgSrc: './assets/bg_1.jpg',
        artSrc: './assets/art_default.png'
    },
    style: {
        template: '1',
        font: "'Patrick Hand', cursive",
        textColor: '#ffffff',
        fontSize: 30,

        // Font Sizes
        songSize: 40,
        artistSize: 30,
        channelSize: 30,

        overlayOpacity: 40,
        bgBlur: 0,
        mask: 'none',

        // Position Offsets
        songX: 0,
        songY: 0,
        artistX: 0,
        artistY: 0,
        lyricsX: 0,
        lyricsY: 0,
        channelX: 0,
        channelY: -160,

        // Text Align
        lyricsAlign: 'left',

        // Gap
        previewGap: 10
    }
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE)); // Deep copy

// --- Initialization ---
function init() {
    loadState(); // Load from LocalStorage
    setupEventListeners();

    // Set canvas dimensions
    canvas1.width = CONFIG.canvasWidth;
    canvas1.height = CONFIG.canvasHeight;
    canvas2.width = CONFIG.canvasWidth;
    canvas2.height = CONFIG.canvasHeight;

    // Restore Inputs from State
    restoreUI();

    // Load Images
    // If we have saved state src, use it. Otherwise use default.
    const bgSrc = state.images.bgSrc || './assets/bg_1.jpg';
    loadImage('background', bgSrc);

    const artSrc = state.images.artSrc || './assets/art_default.png';
    loadImage('art', artSrc);

    // Restore Gap
    if (state.style.previewGap) {
        document.getElementById('canvasContainerInner').style.setProperty('--preview-gap', `${state.style.previewGap}px`);
    }
}

function loadState() {
    const saved = localStorage.getItem('lyrics2anh_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = {
                ...DEFAULT_STATE,
                ...parsed,
                style: { ...DEFAULT_STATE.style, ...parsed.style },
                images: { ...DEFAULT_STATE.images, ...parsed.images }
            };
        } catch (e) {
            console.error("Failed to load state", e);
        }
    }
}

function saveState() {
    const stateToSave = {
        ...state,
        images: {
            bgSrc: state.images.bgSrc,
            artSrc: state.images.artSrc
        }
    };
    // Don't save image blobs
    delete stateToSave.images.background;
    delete stateToSave.images.art;

    localStorage.setItem('lyrics2anh_state', JSON.stringify(stateToSave));
}

function restoreUI() {
    document.getElementById('songName').value = state.songName;
    document.getElementById('artistName').value = state.artistName;
    document.getElementById('channelName').value = state.channelName;
    document.getElementById('lyricsText').value = state.lyrics;

    document.getElementById('templateSelect').value = state.style.template;
    document.getElementById('fontSelect').value = state.style.font;
    document.getElementById('textColor').value = state.style.textColor;
    document.getElementById('fontSize').value = state.style.fontSize;
    document.getElementById('songSize').value = state.style.songSize;
    document.getElementById('artistSize').value = state.style.artistSize;
    document.getElementById('channelSize').value = state.style.channelSize;
    document.getElementById('overlayOpacity').value = state.style.overlayOpacity;
    document.getElementById('bgBlur').value = state.style.bgBlur;

    document.getElementById('songX').value = state.style.songX;
    document.getElementById('songY').value = state.style.songY;
    document.getElementById('artistX').value = state.style.artistX;
    document.getElementById('artistY').value = state.style.artistY;
    document.getElementById('channelX').value = state.style.channelX;
    document.getElementById('channelY').value = state.style.channelY;
    document.getElementById('lyricsX').value = state.style.lyricsX;
    document.getElementById('lyricsY').value = state.style.lyricsY;
    document.getElementById('lyricsAlign').value = state.style.lyricsAlign;
    document.getElementById('previewGap').value = state.style.previewGap || 10;

    // Mask UI
    document.querySelectorAll('#maskOptions .option-item').forEach(opt => {
        if (opt.dataset.value === state.style.mask) opt.classList.add('active');
        else opt.classList.remove('active');
    });
}

function loadImage(type, src) {
    if (!src) return;
    const img = new Image();
    // Only set crossOrigin if NOT on file:// protocol to avoid CORS block on local files
    if (window.location.protocol !== 'file:') {
        img.crossOrigin = "anonymous";
    }
    img.src = src;
    img.onload = () => {
        state.images[type] = img;
        state.images[type === 'background' ? 'bgSrc' : 'artSrc'] = src;
        render(); // Render once loaded
    };
    img.onerror = () => {
        console.warn(`Failed to load ${type}: ${src}`);
        // Fallback
        const fallback = type === 'background' ? './assets/bg_1.jpg' : './assets/art_default.png';
        if (src !== fallback) {
            loadImage(type, fallback);
        }
    };
}

// --- Event Listeners ---
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

    const update = () => { render(); saveState(); }; // Auto save on updates

    document.getElementById('songName').addEventListener('input', (e) => { state.songName = e.target.value; update(); });
    document.getElementById('artistName').addEventListener('input', (e) => { state.artistName = e.target.value; update(); });
    document.getElementById('channelName').addEventListener('input', (e) => { state.channelName = e.target.value; update(); });
    document.getElementById('lyricsText').addEventListener('input', (e) => { state.lyrics = e.target.value; update(); });

    document.getElementById('templateSelect').addEventListener('change', (e) => { state.style.template = e.target.value; update(); });
    document.getElementById('fontSelect').addEventListener('change', (e) => { state.style.font = e.target.value; update(); });
    document.getElementById('textColor').addEventListener('input', (e) => { state.style.textColor = e.target.value; update(); });

    document.getElementById('fontSize').addEventListener('input', (e) => { state.style.fontSize = parseInt(e.target.value); update(); });
    document.getElementById('songSize').addEventListener('input', (e) => { state.style.songSize = parseInt(e.target.value); update(); });
    document.getElementById('artistSize').addEventListener('input', (e) => { state.style.artistSize = parseInt(e.target.value); update(); });
    document.getElementById('channelSize').addEventListener('input', (e) => { state.style.channelSize = parseInt(e.target.value); update(); });

    document.getElementById('overlayOpacity').addEventListener('input', (e) => { state.style.overlayOpacity = parseInt(e.target.value); update(); });
    document.getElementById('bgBlur').addEventListener('input', (e) => { state.style.bgBlur = parseInt(e.target.value); update(); });

    document.getElementById('songX').addEventListener('input', (e) => { state.style.songX = parseInt(e.target.value); update(); });
    document.getElementById('songY').addEventListener('input', (e) => { state.style.songY = parseInt(e.target.value); update(); });
    document.getElementById('artistX').addEventListener('input', (e) => { state.style.artistX = parseInt(e.target.value); update(); });
    document.getElementById('artistY').addEventListener('input', (e) => { state.style.artistY = parseInt(e.target.value); update(); });
    document.getElementById('channelX').addEventListener('input', (e) => { state.style.channelX = parseInt(e.target.value); update(); });
    document.getElementById('channelY').addEventListener('input', (e) => { state.style.channelY = parseInt(e.target.value); update(); });
    document.getElementById('lyricsX').addEventListener('input', (e) => { state.style.lyricsX = parseInt(e.target.value); update(); });
    document.getElementById('lyricsY').addEventListener('input', (e) => { state.style.lyricsY = parseInt(e.target.value); update(); });
    document.getElementById('lyricsAlign').addEventListener('change', (e) => { state.style.lyricsAlign = e.target.value; update(); });

    document.getElementById('previewGap').addEventListener('input', (e) => {
        const gap = e.target.value;
        state.style.previewGap = gap;
        document.getElementById('canvasContainerInner').style.setProperty('--preview-gap', `${gap}px`);
        saveState();
    });

    document.querySelectorAll('#maskOptions .option-item').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('#maskOptions .option-item').forEach(o => o.classList.remove('active'));
            e.target.classList.add('active');
            state.style.mask = e.target.dataset.value;
            update();
        });
    });

    // Assets: Click = Load + Save
    document.querySelectorAll('#bgAssets .asset-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const src = e.target.dataset.src;
            loadImage('background', src);
            saveState(); // Update state src
            document.querySelectorAll('#bgAssets .asset-item').forEach(i => i.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    document.querySelectorAll('#artAssets .asset-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const src = e.target.dataset.src;
            loadImage('art', src);
            saveState(); // Update state src
            document.querySelectorAll('#artAssets .asset-item').forEach(i => i.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Image Uploads
    const handleImageUpload = (input, key, boxId) => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const img = new Image();
                    img.onload = () => {
                        state.images[key] = img;
                        render();
                    };
                    img.src = evt.target.result;
                    // Note: We don't save Blob to localStorage (quota). 
                    // User must re-upload if they refresh, OR we use IndexedDB (out of scope for quick fix).
                    // We simply don't overwrite the bgSrc state effectively? Or we warn.

                    const box = document.getElementById(boxId);
                    box.style.backgroundImage = `url(${evt.target.result})`;
                    box.style.backgroundSize = 'cover';
                    box.querySelector('i').style.display = 'none';
                    box.querySelector('span').innerText = file.name;
                };
                reader.readAsDataURL(file);
            }
        });
    };
    handleImageUpload(document.getElementById('bgInput'), 'background', 'bgUploadBox');
    handleImageUpload(document.getElementById('artInput'), 'art', 'artUploadBox');

    // Create Image button ALSO saves state explicitly
    document.getElementById('generateBtn').addEventListener('click', () => {
        render();
        saveState();
    });

    // Reset Button
    document.getElementById('resetBtn').addEventListener('click', () => {
        localStorage.removeItem('lyrics2anh_state');
        location.reload();
    });

    document.getElementById('downloadBtn').addEventListener('click', downloadImages);

    // Zoom Logic
    let zoom = 0.5; // Start smaller (50%)
    const updateZoom = () => {
        const h = 600 * zoom;
        document.querySelectorAll('canvas').forEach(c => {
            c.style.height = `${h}px`;
            c.style.width = 'auto';
        });
        document.getElementById('zoomLevel').innerText = `${Math.round(zoom * 100)}%`;
    };
    document.getElementById('zoomIn').addEventListener('click', () => { zoom += 0.1; updateZoom(); });
    document.getElementById('zoomOut').addEventListener('click', () => { if (zoom > 0.2) zoom -= 0.1; updateZoom(); });

    updateZoom();
}

// --- Rendering Logic ---
function render() {
    renderCanvas(ctx1, 1);
    renderCanvas(ctx2, 2);
}

function renderCanvas(ctx, index) {
    const { width, height } = ctx.canvas;

    // 1. Fill Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Background Image (Split Mode)
    if (state.images.background) {
        drawSplitImage(ctx, state.images.background, width, height, index, state.style.bgBlur);
    } else {
        const grd = ctx.createLinearGradient(0, 0, width, height);
        grd.addColorStop(0, '#334155');
        grd.addColorStop(1, '#0f172a');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
    }

    // 3. Overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${state.style.overlayOpacity / 100})`;
    ctx.fillRect(0, 0, width, height);

    // 4. Render Layout
    if (state.style.template === '1') {
        renderTemplate1(ctx, index, width, height);
    } else if (state.style.template === '2') {
        renderTemplate2(ctx, index, width, height);
    } else {
        renderTemplate3(ctx, index, width, height);
    }

    // 5. Channel Name (Split Center)
    renderChannelSplit(ctx, index, width, height);
}

// --- Split Channel Logic ---
function renderChannelSplit(ctx, index, w, h) {
    if (!state.channelName) return;

    const seamX = (index === 1) ? w : 0;

    // Center of "Combined" logic + Offset
    const adjustedX = seamX + state.style.channelX;
    const bottomY = h - 60 + state.style.channelY;

    ctx.font = `400 ${state.style.channelSize}px ${state.style.font}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(state.channelName, adjustedX, bottomY);
}


// --- Template 1: Default Split Art ---
function renderTemplate1(ctx, index, w, h) {
    const artWidth = w * 0.8;
    const artHeight = h * 0.55;
    const artY = (h - artHeight) / 2;

    renderSplitArt(ctx, index, w, h, artWidth, artHeight, artY);

    ctx.fillStyle = state.style.textColor;

    // Canvas 1: Info (Artist, Song) CENTERED in Left Area
    if (index === 1) {
        ctx.textAlign = 'center';
        const leftAreaWidth = w - (artWidth / 2);
        const centerX = (leftAreaWidth / 2);
        let startY = (h / 2 - 100);

        ctx.font = `600 ${state.style.artistSize}px ${state.style.font}`;
        ctx.fillText(state.artistName, centerX + state.style.artistX, startY + state.style.artistY);

        const songY = startY + (state.style.artistSize * 1.5) + state.style.songY;
        ctx.font = `700 ${state.style.songSize}px ${state.style.font}`;
        wrapText(ctx, state.songName, centerX + state.style.songX, songY, leftAreaWidth - 60, state.style.songSize * 1.2);

    } else {
        // Canvas 2: Lyrics - Uses state.style.lyricsAlign
        const startX = artWidth / 2;
        const rightAreaWidth = w - startX;

        // Determine Anchor X based on Align
        let anchorX;
        if (state.style.lyricsAlign === 'left') {
            anchorX = startX + 50 + state.style.lyricsX; // Padding
        } else if (state.style.lyricsAlign === 'right') {
            anchorX = w - 50 + state.style.lyricsX;
        } else {
            anchorX = startX + (rightAreaWidth / 2) + state.style.lyricsX;
        }

        ctx.textAlign = state.style.lyricsAlign;
        ctx.font = `500 ${state.style.fontSize}px ${state.style.font}`;

        const lines = state.lyrics.split('\n');
        let lyY = ((h - (lines.length * (state.style.fontSize * 1.8))) / 2) + state.style.lyricsY;

        lines.forEach(line => {
            ctx.fillText(line, anchorX, lyY);
            lyY += (state.style.fontSize * 1.8);
        });
    }
}

// --- Template 2 ---
function renderTemplate2(ctx, index, w, h) {
    if (index === 1) {
        const centerX = w / 2;
        ctx.fillStyle = state.style.textColor;
        ctx.textAlign = 'center';

        let artistY = 300 + state.style.artistY;
        ctx.font = `600 ${state.style.artistSize}px ${state.style.font}`;
        ctx.fillText(state.artistName, centerX + state.style.artistX, artistY);

        let songY = artistY + (state.style.artistSize * 1.5) + state.style.songY;
        ctx.font = `700 ${state.style.songSize}px ${state.style.font}`;
        wrapText(ctx, state.songName, centerX + state.style.songX, songY, w - 100, state.style.songSize * 1.2);

        const artSize = 600;
        const artY = songY + 180;
        const artX = centerX - artSize / 2;

        ctx.save();
        ctx.beginPath();

        let customClip = false;

        if (state.style.mask === 'circle') {
            ctx.arc(centerX, artY + artSize / 2, artSize / 2, 0, Math.PI * 2);
        } else if (state.style.mask === 'rounded' || state.style.mask === 'album') {
            ctx.roundRect(artX, artY, artSize, artSize, 40);
        } else if (state.style.mask === 'grunge') {
            drawGrungeMask(ctx, artX, artY, artSize, artSize);
            customClip = true;
        } else if (state.style.mask === 'blob') {
            drawBlobMask(ctx, artX, artY, artSize, artSize);
            customClip = true;
        } else if (state.style.mask === 'brush') {
            drawBrushMask(ctx, artX, artY, artSize, artSize);
            customClip = true;
        } else if (state.style.mask === 'star') {
            drawStarMask(ctx, artX, artY, artSize, artSize);
            customClip = true;
        } else {
            ctx.rect(artX, artY, artSize, artSize);
        }

        if (!customClip) ctx.clip();

        if (state.images.art) {
            drawImageCheck(ctx, state.images.art, artX, artY, artSize, artSize);
        } else {
            ctx.fillStyle = '#334155';
            ctx.fillRect(artX, artY, artSize, artSize);
        }
        ctx.restore();

    } else {
        // Canvas 2: Lyrics - Respects Align here too
        let anchorX;
        if (state.style.lyricsAlign === 'left') {
            anchorX = 100 + state.style.lyricsX;
        } else if (state.style.lyricsAlign === 'right') {
            anchorX = w - 100 + state.style.lyricsX;
        } else {
            anchorX = (w / 2) + state.style.lyricsX;
        }

        ctx.textAlign = state.style.lyricsAlign;
        ctx.fillStyle = state.style.textColor;
        ctx.font = `500 ${state.style.fontSize}px ${state.style.font}`;

        const lines = state.lyrics.split('\n');
        let lyY = ((h - (lines.length * (state.style.fontSize * 1.8))) / 2) + state.style.lyricsY;

        lines.forEach(line => {
            ctx.fillText(line, anchorX, lyY);
            lyY += (state.style.fontSize * 1.8);
        });
    }
}

// --- Template 3 ---
function renderTemplate3(ctx, index, w, h) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = state.style.textColor;
    ctx.textAlign = 'center';

    if (index === 1) {
        let y = h / 2;
        ctx.font = `500 ${state.style.artistSize}px ${state.style.font}`;
        ctx.fillText(state.artistName, w / 2 + state.style.artistX, y + 120 + state.style.artistY);

        ctx.font = `700 ${state.style.songSize}px ${state.style.font}`;
        wrapText(ctx, state.songName, w / 2 + state.style.songX, y - 60 + state.style.songY, w - 100, state.style.songSize * 1.2);

    } else {
        let anchorX;
        if (state.style.lyricsAlign === 'left') {
            anchorX = 100 + state.style.lyricsX;
        } else if (state.style.lyricsAlign === 'right') {
            anchorX = w - 100 + state.style.lyricsX;
        } else {
            anchorX = (w / 2) + state.style.lyricsX;
        }

        ctx.textAlign = state.style.lyricsAlign;
        const lines = state.lyrics.split('\n');
        ctx.font = `500 ${state.style.fontSize}px ${state.style.font}`;
        let lyY = ((h - (lines.length * (state.style.fontSize * 1.8))) / 2) + state.style.lyricsY;
        lines.forEach(line => {
            ctx.fillText(line, anchorX, lyY);
            lyY += (state.style.fontSize * 1.8);
        });
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}


// --- Helper Wrapper for Split Art ---
// --- Render Masks ---
// --- Render Masks ---
function drawGrungeMask(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const maxRadius = Math.min(w, h) / 2;
    // Made bigger: Inner limit 0.75 (was 0.6)
    const minRadius = maxRadius * 0.75;

    ctx.beginPath(); // No save/translate

    const points = 70;
    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const noise = Math.sin(i * 12.3) * Math.cos(i * 4.5);
        const r = minRadius + (maxRadius - minRadius) * (0.6 + 0.4 * noise);

        let finalR = r;
        if (i % 5 === 0) finalR = maxRadius * 1.05; // Bigger spikes
        if (i % 9 === 0) finalR = minRadius * 0.9;

        // Absolute Coordinates
        const px = cx + Math.cos(angle) * finalR;
        const py = cy + Math.sin(angle) * finalR;

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.clip();
}

function drawBlobMask(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const radius = Math.min(w, h) / 2;

    ctx.beginPath();
    const res = 100;
    for (let i = 0; i <= res; i++) {
        const angle = (i / res) * Math.PI * 2;
        // Smooth organic shape
        const r = radius * (0.8 + 0.15 * Math.sin(angle * 5 + Math.cos(angle * 3)));
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.clip();
}

function drawBrushMask(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    // Square-ish but rough
    const rw = w * 0.85;
    const rh = h * 0.85;

    ctx.beginPath();
    const steps = 40;

    // Helper to draw rough line
    const drawRoughLine = (x1, y1, x2, y2) => {
        for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const tx = x1 + (x2 - x1) * t;
            const ty = y1 + (y2 - y1) * t;
            // Noise perpendicular to line?
            // Simple random offset
            const nx = tx + (Math.random() - 0.5) * 10;
            const ny = ty + (Math.random() - 0.5) * 10;
            if (j === 0 && ctx.currentCheck) ctx.moveTo(nx, ny);
            else ctx.lineTo(nx, ny);
        }
    };

    // Draw 4 sides manually with noise
    // But simple polygon loop is easier for "around center" logic
    // Let's use polar coordinate box approach for stability
    for (let i = 0; i <= 100; i++) {
        const angle = (i / 100) * Math.PI * 2;
        // Box distance logic
        // ... simplistic approach:
        const rBox = Math.min(Math.abs(rw / 2 / Math.cos(angle)), Math.abs(rh / 2 / Math.sin(angle)));
        // Add noise
        const r = Math.min(rBox, Math.max(rw, rh)) * (0.95 + 0.1 * Math.random());

        // Actually, Random() jitters on render loop!
        // Must use deterministic noise.
        const noise = Math.sin(i * 15.5);
        const rFinal = Math.min(rBox, Math.min(w, h) / 1.2) * (0.9 + 0.1 * noise);

        const px = cx + Math.cos(angle) * rFinal;
        const py = cy + Math.sin(angle) * rFinal;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.clip();
}

function drawStarMask(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const outerRadius = Math.min(w, h) / 2;
    const innerRadius = outerRadius * 0.5;
    const spikes = 5;

    ctx.beginPath();
    let rot = Math.PI / 2 * 3;
    let xk = cx;
    let yk = cy;
    const step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        xk = cx + Math.cos(rot) * outerRadius;
        yk = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(xk, yk);
        rot += step;

        xk = cx + Math.cos(rot) * innerRadius;
        yk = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(xk, yk);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.clip();
}

// --- Helper Wrapper for Split Art ---
// --- Helper Wrapper for Split Art ---
function renderSplitArt(ctx, index, w, h, artWidth, artHeight, artY) {
    const seamX = (index === 1) ? w : 0;
    const localArtX = seamX - (artWidth / 2);

    ctx.save();
    ctx.beginPath();

    // Check for complex custom masks that handle their own clipping
    let isCustomClip = false;

    if (state.style.mask === 'grunge') {
        drawGrungeMask(ctx, localArtX, artY, artWidth, artHeight);
        isCustomClip = true;
    } else if (state.style.mask === 'blob') {
        drawBlobMask(ctx, localArtX, artY, artWidth, artHeight);
        isCustomClip = true;
    } else if (state.style.mask === 'brush') {
        drawBrushMask(ctx, localArtX, artY, artWidth, artHeight);
        isCustomClip = true;
    } else if (state.style.mask === 'star') {
        drawStarMask(ctx, localArtX, artY, artWidth, artHeight);
        isCustomClip = true;
    } else if (state.style.mask === 'arch') {
        ctx.roundRect(localArtX, artY, artWidth, artHeight, [300, 300, 0, 0]);
    } else if (state.style.mask === 'circle') {
        const cx = localArtX + artWidth / 2;
        const cy = artY + artHeight / 2;
        ctx.arc(cx, cy, Math.min(artWidth, artHeight) / 2, 0, Math.PI * 2);
    } else if (state.style.mask === 'rounded') {
        ctx.roundRect(localArtX, artY, artWidth, artHeight, 40);
    } else {
        // Default Rect
        ctx.rect(localArtX, artY, artWidth, artHeight);
    }

    // Apply standard clip if not custom
    if (!isCustomClip) ctx.clip();

    if (state.images.art) {
        drawImageCheck(ctx, state.images.art, localArtX, artY, artWidth, artHeight);
    } else {
        ctx.fillStyle = '#334155';
        ctx.fillRect(localArtX, artY, artWidth, artHeight);
    }
    ctx.restore();
}

// Helpers
function drawSplitImage(ctx, img, w, h, index, blur = 0) {
    if (blur > 0) ctx.filter = `blur(${blur}px)`;

    // Virtual Dimensions: 2W x H
    const virtW = w * 2;
    const virtH = h;

    const imgRatio = img.width / img.height;
    const canvasRatio = virtW / virtH;
    let sWidth, sHeight, sx, sy;

    if (imgRatio < canvasRatio) {
        sWidth = img.width;
        sHeight = sWidth / canvasRatio;
        sx = 0;
        sy = (img.height - sHeight) / 2;
    } else {
        sHeight = img.height;
        sWidth = sHeight * canvasRatio;
        sy = 0;
        sx = (img.width - sWidth) / 2;
    }

    let halfSWidth = sWidth / 2;
    let currentSx;

    if (index === 1) {
        currentSx = sx;
    } else {
        currentSx = sx + halfSWidth;
    }

    ctx.drawImage(img, currentSx, sy, halfSWidth, sHeight, 0, 0, w, h);
    ctx.filter = 'none';
}

function drawImageCheck(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const rectRatio = w / h;
    let renderW, renderH, renderX, renderY;

    if (imgRatio < rectRatio) {
        renderW = w;
        renderH = w / imgRatio;
        renderX = x;
        renderY = y - (renderH - h) / 2;
    } else {
        renderH = h;
        renderW = h * imgRatio;
        renderY = y;
        renderX = x - (renderW - w) / 2;
    }
    ctx.drawImage(img, renderX, renderY, renderW, renderH);
}

// New WrapText with Newline support
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    const paragraphs = text.split('\n');
    let currentY = y;

    paragraphs.forEach(paragraph => {
        const words = paragraph.split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
        currentY += lineHeight; // Advance line for next paragraph
    });
}

function downloadImages() {
    const link = document.createElement('a');
    link.download = 'lyrics_cover.png';
    link.href = canvas1.toDataURL();
    link.click();
    setTimeout(() => {
        link.download = 'lyrics_content.png';
        link.href = canvas2.toDataURL();
        link.click();
    }, 500);
}

init();
