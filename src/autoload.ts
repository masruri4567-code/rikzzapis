import { Application, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { logRouterRequest } from './logger';

let regRouter = new Set<string>();
let currentConfig: any = null;
let appInstance: Application;

export const initAutoLoad = (app: Application, config: any, configPath: string) => {
    appInstance = app;
    currentConfig = config;
    console.log('[✓] Auto Load Activated');

    const routerDir = path.join(process.cwd(), 'router');
    if (fs.existsSync(routerDir)) {
        fs.watch(routerDir, { recursive: true }, (eventType, filename) => {
            if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
                setTimeout(() => {
                    console.log('[~] Detected change: ' + filename);
                    scanAndSync(app, currentConfig, configPath);
                }, 300);
            }
        });
    }

    if (fs.existsSync(configPath)) {
        fs.watch(configPath, (eventType, filename) => {
            if (filename && eventType === 'change') {
                try {
                    const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                    currentConfig = newConfig;
                    console.log('[✓] Config reloaded');
                    regRouter.clear();
                    scanAndSync(app, newConfig, configPath);
                } catch (e) {
                    console.error('[ㄨ] Failed to reload config:', e);
                }
            }
        });
    }
};

export const loadRouter = (app: Application, config: any) => {
    scanAndSync(app, config, path.join(process.cwd(), 'src', 'config.json'));
};

const scanAndSync = (app: Application, config: any, configPath: string) => {
    const routerDir = path.join(process.cwd(), 'router');
    if (!fs.existsSync(routerDir)) return;

    const tags = config.tags || {};
    let changed = false;

    const categories = fs.readdirSync(routerDir).filter(f =>
        fs.statSync(path.join(routerDir, f)).isDirectory()
    );

    for (const category of categories) {
        const catDir = path.join(routerDir, category);
        const files = fs.readdirSync(catDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

        if (!tags[category]) {
            tags[category] = [];
        }

        for (const file of files) {
            const filename = file.replace(/\.(ts|js)$/, '');
            const endpoint = '/api/' + category + '/' + filename;
            const exists = tags[category].some((r: any) => r.filename === filename);
            if (!exists) {
                tags[category].push({ name: filename, endpoint, filename, method: 'GET', description: '', params: [] });
                changed = true;
                console.log('[+] Auto-added: ' + endpoint);
            }
        }
    }

    if (changed) {
        config.tags = tags;
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
            console.log('[✓] config.json auto-updated');
        } catch (e) {
            console.error('[ㄨ] Failed to write config:', e);
        }
    }

    Object.keys(tags).forEach(category => {
        tags[category].forEach((route: any) => {
            registerRoute(route, category, config.settings.creator, app);
        });
    });
};

const registerRoute = (route: any, category: string, creatorName?: string, app?: Application) => {
    const targetApp = app || appInstance;
    const targetCreator = creatorName || (currentConfig && currentConfig.settings && currentConfig.settings.creator) || 'KayzzAoshi';
    if (!targetApp) return;

    const routeKey = (route.method || 'GET') + ':' + route.endpoint;
    if (regRouter.has(routeKey)) return;

    const possibleDirs = [
        path.join(__dirname, '..', 'router', category),
        path.join(process.cwd(), 'router', category),
        path.join(process.cwd(), 'dist', 'router', category)
    ];

    let modulePath = '';
    outer: for (const dir of possibleDirs) {
        for (const ext of ['.ts', '.js']) {
            const p = path.join(dir, route.filename + ext);
            if (fs.existsSync(p)) { modulePath = p; break outer; }
        }
    }

    if (!modulePath) {
        console.warn('[!] Module not found: ' + route.endpoint);
        return;
    }

    try {
        try { delete require.cache[require.resolve(modulePath)]; } catch (e) {}
        const mod = require(modulePath);
        const handler = mod.default || mod;
        if (typeof handler !== 'function') return;

        const method = (route.method || 'GET').toUpperCase();
        const wrappedHandler = async (req: Request, res: Response, next: NextFunction) => {
            logRouterRequest(req, res);
            const originalJson = res.json.bind(res);
            (res as any).json = function (body: any) {
                if (body && typeof body === 'object' && !Array.isArray(body)) {
                    return originalJson({ creator: targetCreator, ...body });
                }
                return originalJson(body);
            };
            try {
                await handler(req, res, next);
            } catch (err: any) {
                console.error('[Error] ' + route.endpoint + ':', err.message);
                if (!res.headersSent) {
                    res.status(500).json({ status: false, message: err.message || 'Internal server error' });
                }
            }
        };

        const m = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
        targetApp[m](route.endpoint, wrappedHandler);
        regRouter.add(routeKey);
        console.log('[✓] Registered: ' + method + ' ' + route.endpoint);
    } catch (err: any) {
        console.error('[ㄨ] Failed to load ' + modulePath + ':', err.message);
    }
};
