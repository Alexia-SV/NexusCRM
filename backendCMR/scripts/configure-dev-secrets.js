const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const envPath = path.resolve(__dirname, '..', '.env')

if (!fs.existsSync(envPath)) {
  throw new Error('backendCMR/.env does not exist')
}

let content = fs.readFileSync(envPath, 'utf8')

function configureSecret(name) {
  const pattern = new RegExp(`^${name}=["']?([^"'\\r\\n]*)["']?`, 'm')
  const current = content.match(pattern)?.[1]

  if (current && current.length >= 32 && !current.startsWith('change_me')) return

  const secret = crypto.randomBytes(48).toString('base64url')
  const line = `${name}="${secret}"`

  content = pattern.test(content)
    ? content.replace(pattern, line)
    : `${content.trimEnd()}\n${line}\n`
}

configureSecret('JWT_ACCESS_SECRET')
configureSecret('JWT_REFRESH_SECRET')

fs.writeFileSync(envPath, content, 'utf8')
console.log('JWT development secrets are configured.')
