import fs from 'fs';
import http from 'http';
import path from 'path';
import {NotConfiguredError} from './config';

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

async function handleApi(handler: ApiHandler, url: URL, res: http.ServerResponse): Promise<void> {
    const from = url.searchParams.get('from') ?? '', to = url.searchParams.get('to') ?? '';
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
        return sendJson(res, 400, {error: 'from/to invalides (YYYY-MM-DD)'});
    }
    try {
        sendJson(res, 200, await handler(from, to));
    } catch (e) {
        if (e instanceof NotConfiguredError) return sendJson(res, 503, {error: e.message, notConfigured: true});
        sendJson(res, 500, {error: e instanceof Error ? e.message : String(e)});
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

export function createServer(routes: Record<string, ApiHandler>): http.Server {
    return http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const handler = routes[url.pathname];
        if (handler) return void handleApi(handler, url, res);
        serveFrontend(decodeURIComponent(url.pathname), res);
    });
}
