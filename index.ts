import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { loadRouter, initAutoLoad } from './src/autoload';
import { registerChatRoutes } from './src/chat';

const app: Application = express();
const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(process.cwd(), 'src', 'config.json');

let config: any = {};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/src', express.static(path.join(process.cwd(), 'src')));

app.get('/config', (req: Request, res: Response) => {
    try {
        const latest = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        res.json({ creator: latest.settings.creator, ...latest });
    } catch (err: any) {
        res.status(500).json({ creator: config.settings?.creator || 'ZFloryn-Z', error: 'Internal Server Error' });
    }
});

app.get('/api', (req: Request, res: Response) => {
    try {
        const latest = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        res.json({ status: true, creator: latest.settings.creator, apiName: latest.settings.apiName, description: latest.settings.description, version: latest.settings.apiVersion, endpoints: latest.tags });
    } catch (err: any) {
        res.status(500).json({ status: false, message: err.message });
    }
});

app.get('/', (req: Request, res: Response) => { res.sendFile(path.join(process.cwd(), 'public', 'index.html')); });
app.get('/docs', (req: Request, res: Response) => { res.sendFile(path.join(process.cwd(), 'public', 'docs.html')); });
app.get('/blog', (req: Request, res: Response) => { res.sendFile(path.join(process.cwd(), 'public', 'blog.html')); });
app.get('/chat', (req: Request, res: Response) => { res.sendFile(path.join(process.cwd(), 'public', 'publicchat.html')); });

const _upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const _files = new Map<string, { filename: string; mimetype: string; data: Buffer; expiresAt: number }>();

setInterval(() => {
    const now = Date.now();
    for (const [id, f] of _files.entries()) {
        if (now > f.expiresAt) _files.delete(id);
    }
}, 60 * 1000);

app.post('/upload', _upload.single('file'), (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ status: false, message: 'No file uploaded' }) as any;
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    _files.set(id, { filename: file.originalname, mimetype: file.mimetype, data: file.buffer, expiresAt });
    setTimeout(() => _files.delete(id), 5 * 60 * 1000);
    const url = req.protocol + '://' + req.get('host') + '/f/' + id;
    res.json({ status: true, url, expires_in: '5 minutes' });
});

app.get('/f/:id', (req: Request, res: Response) => {
    const f = _files.get(req.params.id);
    if (!f || Date.now() > f.expiresAt) {
        return res.status(404).json({ status: false, message: 'File tidak ditemukan atau sudah kadaluarsa' }) as any;
    }
    res.setHeader('Content-Type', f.mimetype);
    res.setHeader('Content-Disposition', 'inline; filename="' + f.filename + '"');
    res.send(f.data);
});

async function startServer() {
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        loadRouter(app, config);
        registerChatRoutes(app);
        initAutoLoad(app, config, CONFIG_PATH);
        app.use((req: Request, res: Response) => {
            const p404 = path.join(process.cwd(), 'public', '404.html');
            if (fs.existsSync(p404)) return res.status(404).sendFile(p404);
            res.status(404).json({ status: false, message: 'Not Found' });
        });
        app.listen(PORT, () => { console.log('[✓] Server running on port ' + PORT); });
    } catch (err: any) {
        console.error('[ㄨ] Failed to start server:', err.message);
        process.exit(1);
    }
}

startServer();
