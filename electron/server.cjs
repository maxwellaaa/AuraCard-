const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const { URL } = require('url')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
}

const PROXY_RULES = [
  {
    prefix: '/deepseek-proxy',
    target: 'https://api.deepseek.com',
    rewrite: (p) => p.replace(/^\/deepseek-proxy/, '') || '/',
  },
  {
    prefix: '/openai-proxy',
    target: 'https://api.openai.com',
    rewrite: (p) => p.replace(/^\/openai-proxy/, '') || '/',
  },
  {
    prefix: '/openrouter-proxy',
    target: 'https://openrouter.ai/api',
    rewrite: (p) => p.replace(/^\/openrouter-proxy/, '') || '/',
  },
  {
    prefix: '/dashscope-proxy',
    target: 'https://dashscope.aliyuncs.com',
    rewrite: (p) => p.replace(/^\/dashscope-proxy/, '') || '/',
  },
  {
    prefix: '/api',
    target: 'http://127.0.0.1:3001',
    rewrite: (p) => p,
  },
]

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers)
  res.end(body)
}

function proxyRequest(req, res, rule) {
  const incoming = new URL(req.url, 'http://127.0.0.1')
  const targetBase = new URL(rule.target)
  const rewrittenPath = rule.rewrite(incoming.pathname) + incoming.search
  const isHttps = targetBase.protocol === 'https:'
  const lib = isHttps ? https : http

  const headers = { ...req.headers, host: targetBase.host }
  delete headers['origin']
  delete headers['referer']

  const upstream = lib.request(
    {
      protocol: targetBase.protocol,
      hostname: targetBase.hostname,
      port: targetBase.port || (isHttps ? 443 : 80),
      path: rewrittenPath,
      method: req.method,
      headers,
      rejectUnauthorized: false,
    },
    (upRes) => {
      const outHeaders = { ...upRes.headers }
      // Avoid leaking encoding issues through compressed streams in some environments
      res.writeHead(upRes.statusCode || 502, outHeaders)
      upRes.pipe(res)
    },
  )

  upstream.on('error', (err) => {
    send(
      res,
      502,
      JSON.stringify({
        message: `代理失败：${err.message}`,
        code: 'DESKTOP_PROXY_ERROR',
      }),
      { 'Content-Type': 'application/json; charset=utf-8' },
    )
  })

  req.pipe(upstream)
}

function serveStatic(distDir, req, res) {
  const url = new URL(req.url, 'http://127.0.0.1')
  let pathname = decodeURIComponent(url.pathname)
  if (pathname === '/') pathname = '/index.html'

  const filePath = path.normalize(path.join(distDir, pathname))
  if (!filePath.startsWith(path.normalize(distDir))) {
    send(res, 403, 'Forbidden')
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (!err) {
      const ext = path.extname(filePath).toLowerCase()
      send(res, 200, data, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
      return
    }

    // SPA fallback
    fs.readFile(path.join(distDir, 'index.html'), (indexErr, indexData) => {
      if (indexErr) {
        send(res, 404, 'Not Found')
        return
      }
      send(res, 200, indexData, { 'Content-Type': 'text/html; charset=utf-8' })
    })
  })
}

function listen(server, preferredPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port, attemptsLeft) => {
      const onError = (err) => {
        server.off('listening', onListening)
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          tryPort(port + 1, attemptsLeft - 1)
          return
        }
        reject(err)
      }
      const onListening = () => {
        server.off('error', onError)
        resolve(port)
      }
      server.once('error', onError)
      server.once('listening', onListening)
      server.listen(port, '127.0.0.1')
    }
    tryPort(preferredPort, 20)
  })
}

/**
 * @param {{ distDir: string, preferredPort?: number }} options
 */
async function startDesktopServer(options) {
  const distDir = options.distDir
  const preferredPort = options.preferredPort || 17831

  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error(`未找到前端构建产物：${path.join(distDir, 'index.html')}，请先执行 npm run build`)
  }

  const server = http.createServer((req, res) => {
    const rule = PROXY_RULES.find((item) => (req.url || '').startsWith(item.prefix))
    if (rule) {
      proxyRequest(req, res, rule)
      return
    }
    serveStatic(distDir, req, res)
  })

  const port = await listen(server, preferredPort)
  return {
    port,
    close: () => {
      try {
        server.close()
      } catch {
        // ignore
      }
    },
  }
}

module.exports = { startDesktopServer }
