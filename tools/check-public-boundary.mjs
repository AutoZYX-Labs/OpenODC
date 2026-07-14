import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')
const allowedExtensions = new Set(['.md', '.html', '.css', '.js', '.mjs', '.ts', '.json', '.yml', '.yaml', '.txt', '.xml'])
const ignoredDirectories = new Set(['.git', '.vercel', 'node_modules', 'test-results', 'playwright-report'])
const checks = [
  ['unpublished standard title', /道路通行规定符合性测试内容和方法/],
  ['consultation wording', /征求意见稿/],
  ['dated internal label', /(?:draft[-_ ]?)?2026[-_]?07[-_]?08|0708/iu],
  ['unpublished mandatory-standard wording', /强制标准草案/],
  ['local macOS path', /\/Users\//],
  ['local file URL', /file:\/\//i],
  ['local host', /(?:localhost|127\.0\.0\.1)/i],
  ['private IPv4 address', /(?:^|[^\d])(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?:[^\d]|$)/],
  ['common API secret', /(?:sk-[A-Za-z0-9_-]{20,}|(?:api|access|secret)[_-]?key\s*[:=]\s*["'][^"']{12,}["'])/i],
  ['Feishu token', /(?:tenant_access_token|app_access_token|user_access_token)\s*[:=]\s*["'][^"']+["']/i],
  ['unsupported public claim', /(?:保证合规|完全合规|100%合规|自动合规|法规全覆盖|全部道路规则|全部场景覆盖|零违法|永不违章|官方认证|国标认证|监管认可|公安认可|司法认可|合法上路|可直接上路|获准商业运营|认证级规则引擎|执法级|司法级|自动判定违法|自动认定事故责任|无需安全员|安全证明|合规证明)/],
  ['unsupported English claim', /(?:fully compliant|100% compliant|regulator approved|legal-grade|enforcement-grade|court-ready|production-ready compliance engine|covers all Chinese traffic laws)/i]
]

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else if (allowedExtensions.has(extname(entry))) files.push(path)
  }
  return files
}

const findings = []
for (const path of walk(repoRoot)) {
  if (path === fileURLToPath(import.meta.url)) continue
  const content = readFileSync(path, 'utf8')
  const repoPath = relative(repoRoot, path)
  for (const [label, pattern] of checks) {
    if (label === 'local host' && (repoPath === 'playwright.config.mjs' || repoPath.startsWith(`tests${process.platform === 'win32' ? '\\' : '/'}`))) continue
    if (pattern.test(content)) findings.push(`${repoPath}: ${label}`)
    pattern.lastIndex = 0
  }
}

if (findings.length) {
  console.error('Public-boundary scan failed:')
  for (const finding of findings) console.error(`  - ${finding}`)
  process.exit(1)
}

console.log('Public-boundary scan passed: no unpublished source labels, local paths, or common secrets found.')
