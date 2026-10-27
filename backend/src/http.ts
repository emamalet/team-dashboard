import fs from 'fs';
import http from 'http';
import path from 'path';
import {NotConfiguredError} from './config';
import {SettingsApi, SettingsError} from './settings';
import {errorMessage} from './utils';

export type ApiHandler = (from: string, to: string) => Promise<unknown>;

// Angular build served in production (cd frontend && npm run build)
const FRONTEND_DIR = path.join(__dirname, '..', '..', 'frontend', 'dist', 'frontend', 'browser');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.ico': 'image/x-icon',
};

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
}

const LOCAL_ADDRESSES = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// Settings hold secrets and rewrite the .env file: only reachable from the machine running the server.
function isLocal(req: http.IncomingMessage): boolean {
    const host = (req.headers.host ?? '').replace(/:\d+$/, '');
    return LOCAL_ADDRESSES.includes(req.socket.remoteAddress ?? '') && LOCAL_HOSTS.includes(host);
}

function readJson(req: http.IncomingMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => {
            size += c.length;
            if (size > 100_000) {
                reject(new SettingsError('Requete trop volumineuse'));
                req.destroy();
            } else chunks.push(c);
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
            } catch {
                reject(new SettingsError('JSON invalide'));
            }
        });
        req.on('error', reject);
    });
}

async function handleSettings(settings: SettingsApi, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const stamp = new Date().toISOString();
    if (!isLocal(req)) {
        console.warn(`[${stamp}] 403 ${req.method} /api/settings depuis ${req.socket.remoteAddress} : configuration reservee a la machine locale`);
        return sendJson(res, 403, {error: 'La configuration ne peut etre modifiee que depuis la machine qui execute le serveur (localhost). Sous Docker, utilisez backend/.env.'});
    }
    try {
        if (req.method === 'GET') return sendJson(res, 200, settings.get());
        if (req.method === 'PUT') {
            // Requiring JSON forces a CORS preflight, which blocks cross-site form posts.
            if (!(req.headers['content-type'] ?? '').startsWith('application/json')) throw new SettingsError('Content-Type application/json requis');
            const body = await readJson(req) as {values?: Record<string, unknown>} | null;
            if (!body || typeof body.values !== 'object' || body.values === null) throw new SettingsError('Corps attendu : {"values": {...}}');
            const result = settings.save(body.values);
            console.log(`[${stamp}] Configuration enregistree dans backend/.env (${Object.keys(body.values).join(', ')})`);
            return sendJson(res, 200, result);
        }
        sendJson(res, 405, {error: 'Methode non autorisee'});
    } catch (e) {
        const status = e instanceof SettingsError ? 400 : 500;
        console.error(`[${stamp}] ERREUR ${status} ${req.method} /api/settings : ${errorMessage(e)}`);
        sendJson(res, status, {error: errorMessage(e)});
    }
}

async function handleApi(handler: ApiHandler, url: URL, res: http.ServerResponse): Promise<void> {
    const from = url.searchParams.get('from') ?? '', to = url.searchParams.get('to') ?? '';
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
        return sendJson(res, 400, {error: 'from/to invalides (YYYY-MM-DD)'});
    }
    const started = Date.now();
    const label = `${url.pathname} ${from}..${to}`;
    try {
        sendJson(res, 200, await handler(from, to));
        console.log(`[${new Date().toISOString()}] OK ${label} (${Date.now() - started} ms)`);
    } catch (e) {
        if (e instanceof NotConfiguredError) {
            console.warn(`[${new Date().toISOString()}] 503 ${label} : ${e.message}`);
            return sendJson(res, 503, {error: e.message, notConfigured: true});
        }
        console.error(`[${new Date().toISOString()}] ERREUR 500 ${label} (${Date.now() - started} ms) : ${errorMessage(e)}`);
        if (e instanceof Error && e.stack) console.error(e.stack);
        sendJson(res, 500, {error: errorMessage(e)});
    }
}

function serveFrontend(pathname: string, res: http.ServerResponse): void {
    const requested = path.join(FRONTEND_DIR, pathname);
    const isAsset = requested.startsWith(FRONTEND_DIR + path.sep) && fs.existsSync(requested) && fs.statSync(requested).isFile();
    // Angular routes (/git, /jira...) fall back to index.html
    const file = isAsset ? requested : path.join(FRONTEND_DIR, 'index.html');
    if (!fs.existsSync(file)) {
        res.statusCode = 404;
        return void res.end('Frontend non construit : cd frontend && npm run build');
    }
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
    res.end(fs.readFileSync(file));
}

export function createServer(routes: Record<string, ApiHandler>, settings: SettingsApi): http.Server {
    return http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname === '/api/settings') return void handleSettings(settings, req, res);
        const handler = routes[url.pathname];
        if (handler) return void handleApi(handler, url, res);
        serveFrontend(decodeURIComponent(url.pathname), res);
    });
}
