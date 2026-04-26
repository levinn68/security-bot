const axios = require('axios')

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO_OWNER = process.env.GITHUB_REPO_OWNER
const REPO_NAME = process.env.GITHUB_REPO_NAME
const FILE_PATH = process.env.GITHUB_DB_PATH || 'database.json'
const BRANCH = process.env.GITHUB_BRANCH || 'main'

function normalizePhone(v = '') {
  return String(v || '').replace(/[^0-9]/g, '').trim()
}

function uniquePhoneList(list = []) {
  return [...new Set((list || []).map(normalizePhone).filter(Boolean))]
}

function getGithubHeaders() {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN belum diset')

  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json'
  }
}

function getDefaultDB() {
  return {
    owner: '',
    approved: [],
    pending: [],
    rejected: [],
    knownBots: []
  }
}

function normalizeDB(db = {}) {
  const base = getDefaultDB()

  base.owner = normalizePhone(db.owner || '')
  base.approved = uniquePhoneList(db.approved)
  base.pending = uniquePhoneList(db.pending)
  base.rejected = uniquePhoneList(db.rejected)
  base.knownBots = uniquePhoneList(db.knownBots)

  return base
}

async function fetchDB() {
  if (!REPO_OWNER) throw new Error('GITHUB_REPO_OWNER belum diset')
  if (!REPO_NAME) throw new Error('GITHUB_REPO_NAME belum diset')

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`

  try {
    const res = await axios.get(url, {
      headers: getGithubHeaders(),
      timeout: 20000
    })

    const content = Buffer.from(res.data.content, 'base64').toString('utf-8')
    const parsed = JSON.parse(content)

    return {
      db: normalizeDB(parsed),
      sha: res.data.sha
    }
  } catch (err) {
    if (err?.response?.status === 404) {
      return {
        db: getDefaultDB(),
        sha: null
      }
    }

    throw new Error(
      err?.response?.data?.message ||
      err?.message ||
      'Gagal mengambil database GitHub'
    )
  }
}

async function saveDB(db, sha = null, message = 'Update security database') {
  if (!REPO_OWNER) throw new Error('GITHUB_REPO_OWNER belum diset')
  if (!REPO_NAME) throw new Error('GITHUB_REPO_NAME belum diset')

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`

  const normalized = normalizeDB(db)
  const content = Buffer.from(JSON.stringify(normalized, null, 2)).toString('base64')

  const payload = {
    message,
    content,
    branch: BRANCH
  }

  if (sha) payload.sha = sha

  await axios.put(url, payload, {
    headers: getGithubHeaders(),
    timeout: 20000
  })

  return normalized
}

function getPhoneStatus(db, phone) {
  const clean = normalizePhone(phone)

  if (!clean) return 'invalid'
  if (db.approved.includes(clean)) return 'approved'
  if (db.pending.includes(clean)) return 'pending'
  if (db.rejected.includes(clean)) return 'rejected'

  return 'unregistered'
}

function removePhoneFromAllLists(db, phone) {
  const clean = normalizePhone(phone)

  db.approved = uniquePhoneList(db.approved).filter(v => v !== clean)
  db.pending = uniquePhoneList(db.pending).filter(v => v !== clean)
  db.rejected = uniquePhoneList(db.rejected).filter(v => v !== clean)

  return db
}

function addKnownBot(db, phone) {
  const clean = normalizePhone(phone)
  if (!clean) return db

  db.knownBots = uniquePhoneList([...(db.knownBots || []), clean])

  return db
}

function removeKnownBot(db, phone) {
  const clean = normalizePhone(phone)
  if (!clean) return db

  db.knownBots = uniquePhoneList(db.knownBots).filter(v => v !== clean)

  return db
}

function addPhoneToApproved(db, phone) {
  const clean = normalizePhone(phone)
  if (!clean) return db

  removePhoneFromAllLists(db, clean)

  db.approved.push(clean)
  db.approved = uniquePhoneList(db.approved)

  // Nomor yang pernah di-approve otomatis masuk knownBots
  // Biar bot owner nanti tahu target broadcast off-nya.
  addKnownBot(db, clean)

  return db
}

function addPhoneToPending(db, phone) {
  const clean = normalizePhone(phone)
  if (!clean) return db

  removePhoneFromAllLists(db, clean)

  db.pending.push(clean)
  db.pending = uniquePhoneList(db.pending)

  return db
}

function addPhoneToRejected(db, phone) {
  const clean = normalizePhone(phone)
  if (!clean) return db

  removePhoneFromAllLists(db, clean)

  db.rejected.push(clean)
  db.rejected = uniquePhoneList(db.rejected)

  return db
}

module.exports = {
  normalizePhone,
  fetchDB,
  saveDB,
  getPhoneStatus,
  removePhoneFromAllLists,
  addPhoneToApproved,
  addPhoneToPending,
  addPhoneToRejected,
  addKnownBot,
  removeKnownBot
}
