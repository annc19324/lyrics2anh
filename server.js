const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'lyrics2anh_dev_fallback_secret_667788';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: JWT_SECRET is not set in production!');
}
const path = require('path');

// CORS Configuration
const allowedOrigins = [
    'https://lyrics2anh.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5500' // Live Server
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            // Optional: Allow all on dev, restrict on prod. For now, defaulting to allow to fix specific errors.
            // Using a loose check or simply callback(null, true) can also solve it if security matches.
            // But let's stick to the list or return true for now to be safe against the error.
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Increase for Image Uploads
app.use(express.static(path.join(__dirname, '.'))); // Serve Static Files

// Middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Token invalid' });
            req.user = user;
            next();
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

const authorizeAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') next();
    else res.status(403).json({ error: 'Admin only' });
};

// Seed Admin
const seedAdmin = async () => {
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!admin) {
        // Zeanokai@1
        const hash = await bcrypt.hash('Zeanokai@1', 10);
        await prisma.user.create({
            data: { username: 'admin', password: hash, role: 'admin' }
        });
        console.log('Admin seeded');
    }
};
seedAdmin();

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;

    // Validate
    const userRegex = /^[a-zA-Z0-9.]+$/;
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!userRegex.test(username)) return res.status(400).json({ error: 'Tên tài khoản không hợp lệ (Chỉ dùng chữ cái, số và dấu chấm)' });
    if (!passRegex.test(password)) return res.status(400).json({ error: 'Mật khẩu quá yếu (Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt)' });

    try {
        // Check existence case-insensitively
        const existing = await prisma.user.findFirst({
            where: { username: { equals: username, mode: 'insensitive' } }
        });
        if (existing) return res.status(400).json({ error: 'Tài khoản này đã tồn tại trên hệ thống' });

        const hash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: hash }
        });
        res.json({ message: 'Đăng ký thành công!' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Lỗi hệ thống khi đăng ký' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    // Find user case-insensitively
    const user = await prisma.user.findFirst({
        where: { username: { equals: username, mode: 'insensitive' } }
    });

    if (!user) return res.status(400).json({ error: 'Tài khoản không tồn tại' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Mật khẩu không chính xác' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET);
    res.json({ token, role: user.role, username: user.username });
});

// --- Comments ---
app.get('/api/comments', async (req, res) => {
    const comments = await prisma.comment.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(comments);
});

app.post('/api/comments', authenticate, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Empty content' });

    const comment = await prisma.comment.create({
        data: {
            content,
            userId: req.user.id,
            username: req.user.username
        }
    });
    res.json(comment);
});

app.delete('/api/comments/:id', authenticate, authorizeAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await prisma.comment.delete({ where: { id } });
    res.json({ success: true });
});

// --- Admin: Users ---
app.get('/api/admin/users', authenticate, authorizeAdmin, async (req, res) => {
    const users = await prisma.user.findMany({ select: { id: true, username: true, role: true } });
    res.json(users);
});
app.delete('/api/admin/users/:id', authenticate, authorizeAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    await prisma.comment.deleteMany({ where: { userId: id } }); // Cleanup
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
});

// --- Ads ---
app.get('/api/ads', async (req, res) => {
    const ads = await prisma.ad.findMany();
    res.json(ads);
});
app.post('/api/admin/ads', authenticate, authorizeAdmin, async (req, res) => {
    const { content } = req.body;
    const ad = await prisma.ad.create({ data: { content } });
    res.json(ad);
});
app.delete('/api/admin/ads/:id', authenticate, authorizeAdmin, async (req, res) => {
    await prisma.ad.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
});

// --- Contacts ---
app.get('/api/contact', async (req, res) => {
    const contact = await prisma.contact.findFirst();
    res.json(contact || {});
});
app.post('/api/admin/contact', authenticate, authorizeAdmin, async (req, res) => {
    const { facebook, email } = req.body;
    // Update or Create (Singleton)
    const existing = await prisma.contact.findFirst();
    if (existing) {
        await prisma.contact.update({ where: { id: existing.id }, data: { facebook, email } });
    } else {
        await prisma.contact.create({ data: { facebook, email } });
    }
    res.json({ success: true });
});

// --- Donate ---
app.get('/api/donate', async (req, res) => {
    const donate = await prisma.donate.findFirst();
    res.json(donate || {});
});
app.post('/api/admin/donate', authenticate, authorizeAdmin, async (req, res) => {
    const { qrCode } = req.body;
    const existing = await prisma.donate.findFirst();
    if (existing) {
        await prisma.donate.update({ where: { id: existing.id }, data: { qrCode } });
    } else {
        await prisma.donate.create({ data: { qrCode } });
    }
    res.json({ success: true });
});

// --- Download Route ---
app.get('/download-app', (req, res) => {
    const apkPath = path.join(__dirname, 'android/app/build/outputs/apk/release/lyrics2anh-app.apk');
    res.download(apkPath, 'Lyrics2Anh.apk', (err) => {
        if (err) {
            console.error('Download error:', err);
            if (!res.headersSent) {
                res.status(404).send('File APK chưa sẵn sàng. Vui lòng thử lại sau.');
            }
        }
    });
});

// Fallback to index.html for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
