const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const ctx1 = canvas1 ? canvas1.getContext('2d') : null;
const ctx2 = canvas2 ? canvas2.getContext('2d') : null;

function render() {
    if (!ctx1 || !ctx2) return;
    renderCanvas(ctx1, 1);
    renderCanvas(ctx2, 2);
}

function renderCanvas(ctx, index) {
    const { width, height } = ctx.canvas;

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    if (state.images.background) {
        drawSplitImage(ctx, state.images.background, width, height, index, state.style.bgBlur);
    } else {
        const grd = ctx.createLinearGradient(0, 0, width, height);
        grd.addColorStop(0, '#334155');
        grd.addColorStop(1, '#0f172a');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
    }

    // Overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${state.style.overlayOpacity / 100})`;
    ctx.fillRect(0, 0, width, height);

    // Templates
    if (state.style.template === '1') renderTemplate1(ctx, index, width, height);
    else if (state.style.template === '2') renderTemplate2(ctx, index, width, height);
    else renderTemplate3(ctx, index, width, height);

    // Channel (Watermark)
    renderChannelSplit(ctx, index, width, height);
}

function renderChannelSplit(ctx, index, w, h) {
    if (!state.channelName) return;
    const seamX = (index === 1) ? w : 0;
    const adjustedX = seamX + state.style.channelX;
    const bottomY = h - 60 + state.style.channelY;

    ctx.font = `400 ${state.style.channelSize}px ${state.style.font}`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.channelName, adjustedX, bottomY);
}

function renderTemplate1(ctx, index, w, h) {
    const scale = state.style.artScale / 100;
    let artWidth = w * 0.8 * scale;
    let artHeight = h * 0.55 * scale;

    // Adjust for tall rectangle masks
    if (state.style.mask === 'rectangle' || state.style.mask === 'rounded_rectangle') {
        artHeight = artWidth * 1.5;
        if (artHeight > h * 0.85) artHeight = h * 0.85; // Limit max height
    }
    const artY = (h - artHeight) / 2 + state.style.artPosY;

    renderSplitArt(ctx, index, w, h, artWidth, artHeight, artY, state.style.artPosX);

    ctx.fillStyle = state.style.textColor;
    if (index === 1) {
        ctx.textAlign = 'center';
        const centerX = (w - (artWidth / 2)) / 2;
        let startY = (h / 2 - 100);

        ctx.font = `600 ${state.style.artistSize}px ${state.style.font}`;
        ctx.fillText(state.artistName, centerX + state.style.artistX, startY + state.style.artistY);

        const songY = startY + (state.style.artistSize * 1.5) + state.style.songY;
        ctx.font = `700 ${state.style.songSize}px ${state.style.font}`;
        wrapText(ctx, state.songName, centerX + state.style.songX, songY, w * 0.5, state.style.songSize * 1.2);
    } else {
        const startX = artWidth / 2;
        ctx.textAlign = state.style.lyricsAlign;
        ctx.font = `500 ${state.style.fontSize}px ${state.style.font}`;

        const anchorX = (state.style.lyricsAlign === 'left') ? (startX + 50 + state.style.lyricsX) :
            (state.style.lyricsAlign === 'right') ? (w - 50 + state.style.lyricsX) :
                (startX + (w - startX) / 2 + state.style.lyricsX);

        drawLyrics(ctx, anchorX, h, state.style.fontSize, state.style.lyricsY);
    }
}

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

        let artW = 600 * (state.style.artScale / 100);
        let artH = artW;

        let artY = songY + 180 + state.style.artPosY;

        // Adjust for tall rectangle masks
        if (state.style.mask === 'rectangle' || state.style.mask === 'rounded_rectangle') {
            artH = artW * 1.5;
            // Center the taller height relative to where the square would be
            artY = artY + (artW - artH) / 2;
        }

        const artX = centerX - artW / 2 + state.style.artPosX;

        ctx.save();
        applyMask(ctx, artX, artY, artW, artH);
        if (state.images.art) drawImageCheck(ctx, state.images.art, artX, artY, artW, artH);
        else { ctx.fillStyle = '#334155'; ctx.fillRect(artX, artY, artW, artH); }
        ctx.restore();
    } else {
        const anchorX = (state.style.lyricsAlign === 'left') ? (100 + state.style.lyricsX) :
            (state.style.lyricsAlign === 'right') ? (w - 100 + state.style.lyricsX) :
                ((w / 2) + state.style.lyricsX);

        ctx.textAlign = state.style.lyricsAlign;
        ctx.fillStyle = state.style.textColor;
        ctx.font = `500 ${state.style.fontSize}px ${state.style.font}`;
        drawLyrics(ctx, anchorX, h, state.style.fontSize, state.style.lyricsY);
    }
}

function renderTemplate3(ctx, index, w, h) {
    ctx.fillStyle = state.style.textColor;
    ctx.textAlign = 'center';
    if (index === 1) {
        let y = h / 2;
        ctx.font = `500 ${state.style.artistSize}px ${state.style.font}`;
        ctx.fillText(state.artistName, w / 2 + state.style.artistX, y + 120 + state.style.artistY);
        ctx.font = `700 ${state.style.songSize}px ${state.style.font}`;
        wrapText(ctx, state.songName, w / 2 + state.style.songX, y - 60 + state.style.songY, w - 100, state.style.songSize * 1.2);
    } else {
        const anchorX = (state.style.lyricsAlign === 'left') ? (100 + state.style.lyricsX) :
            (state.style.lyricsAlign === 'right') ? (w - 100 + state.style.lyricsX) :
                ((w / 2) + state.style.lyricsX);
        ctx.textAlign = state.style.lyricsAlign;
        ctx.font = `500 ${state.style.fontSize}px ${state.style.font}`;
        drawLyrics(ctx, anchorX, h, state.style.fontSize, state.style.lyricsY);
    }
}

// Helpers
function drawLyrics(ctx, x, h, fontSize, offsetY) {
    const lines = state.lyrics.split('\n');
    const lh = fontSize * (state.style.lineHeight / 10 || 1.8);
    let lyY = ((h - (lines.length * lh)) / 2) + offsetY;
    lines.forEach(line => {
        ctx.fillText(line, x, lyY);
        lyY += lh;
    });
}

function renderSplitArt(ctx, index, w, h, artWidth, artHeight, artY, artXOffset = 0) {
    const seamX = (index === 1) ? w : 0;
    const localArtX = seamX - (artWidth / 2) + artXOffset;
    ctx.save();
    applyMask(ctx, localArtX, artY, artWidth, artHeight);
    if (state.images.art) drawImageCheck(ctx, state.images.art, localArtX, artY, artWidth, artHeight);
    else { ctx.fillStyle = '#334155'; ctx.fillRect(localArtX, artY, artWidth, artHeight); }
    ctx.restore();
}

function applyMask(ctx, x, y, w, h) {
    ctx.beginPath();
    const mask = state.style.mask;
    if (mask === 'circle') ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    else if (mask === 'rounded' || mask === 'album' || mask === 'rounded_rectangle') ctx.roundRect(x, y, w, h, 40);
    else if (mask === 'rectangle') ctx.rect(x, y, w, h);
    else if (mask === 'arch') ctx.roundRect(x, y, w, h, [300, 300, 0, 0]);
    else if (mask === 'grunge') drawGrungeMask(ctx, x, y, w, h);
    else if (mask === 'blob') drawBlobMask(ctx, x, y, w, h);
    else if (mask === 'brush') drawBrushMask(ctx, x, y, w, h);
    else if (mask === 'star') drawStarMask(ctx, x, y, w, h);
    else ctx.rect(x, y, w, h);

    if (!['grunge', 'blob', 'brush', 'star'].includes(mask)) ctx.clip();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    const paragraphs = text.split('\n');
    let currentY = y;
    paragraphs.forEach(paragraph => {
        const words = paragraph.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const testWidth = ctx.measureText(testLine).width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else line = testLine;
        }
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
    });
}

function drawSplitImage(ctx, img, w, h, index, blur = 0) {
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    const virtW = w * 2;
    const imgRatio = img.width / img.height;
    const canvasRatio = virtW / h;
    let sWidth, sHeight, sx, sy;

    if (imgRatio < canvasRatio) {
        sWidth = img.width; sHeight = sWidth / canvasRatio;
        sx = 0; sy = (img.height - sHeight) / 2;
    } else {
        sHeight = img.height; sWidth = sHeight * canvasRatio;
        sy = 0; sx = (img.width - sWidth) / 2;
    }
    const currentSx = (index === 1) ? sx : (sx + sWidth / 2);
    ctx.drawImage(img, currentSx, sy, sWidth / 2, sHeight, 0, 0, w, h);
    ctx.filter = 'none';
}

function drawImageCheck(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const rectRatio = w / h;
    let rw, rh, rx, ry;
    if (imgRatio < rectRatio) { rw = w; rh = w / imgRatio; rx = x; ry = y - (rh - h) / 2; }
    else { rh = h; rw = h * imgRatio; ry = y; rx = x - (rw - w) / 2; }
    ctx.drawImage(img, rx, ry, rw, rh);
}

// Mask Implementations (Simplified slightly for module)
function drawGrungeMask(ctx, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2, maxR = Math.min(w, h) / 2, minR = maxR * 0.75;
    ctx.beginPath();
    for (let i = 0; i <= 70; i++) {
        const a = (i / 70) * Math.PI * 2;
        const n = Math.sin(i * 12.3) * Math.cos(i * 4.5);
        const r = minR + (maxR - minR) * (0.6 + 0.4 * n);
        const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.clip();
}

function drawBlobMask(ctx, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
        const a = (i / 100) * Math.PI * 2;
        const dist = r * (0.8 + 0.15 * Math.sin(a * 5 + Math.cos(a * 3)));
        const px = cx + Math.cos(a) * dist, py = cy + Math.sin(a) * dist;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.clip();
}

function drawBrushMask(ctx, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2, rw = w * 0.85, rh = h * 0.85;
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
        const a = (i / 100) * Math.PI * 2;
        const rBox = Math.min(Math.abs(rw / 2 / Math.cos(a)), Math.abs(rh / 2 / Math.sin(a)));
        const rFinal = Math.min(rBox, Math.min(w, h) / 1.2) * (0.9 + 0.1 * Math.sin(i * 15.5));
        const px = cx + Math.cos(a) * rFinal, py = cy + Math.sin(a) * rFinal;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.clip();
}

function drawStarMask(ctx, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2, outR = Math.min(w, h) / 2, inR = outR * 0.5;
    ctx.beginPath();
    let rot = Math.PI / 2 * 3, step = Math.PI / 5;
    ctx.moveTo(cx, cy - outR);
    for (let i = 0; i < 5; i++) {
        ctx.lineTo(cx + Math.cos(rot) * outR, cy + Math.sin(rot) * outR); rot += step;
        ctx.lineTo(cx + Math.cos(rot) * inR, cy + Math.sin(rot) * inR); rot += step;
    }
    ctx.closePath(); ctx.clip();
}
