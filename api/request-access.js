const {
  normalizePhone,
  fetchDB,
  saveDB,
  getPhoneStatus
} = require('../lib/github-db')

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        ok: false,
        status: 'method_not_allowed',
        message: 'Method tidak diizinkan'
      })
    }

    const apiKey = req.headers['x-api-key']
    if (apiKey !== process.env.SECURITY_API_KEY) {
      return res.status(401).json({
        ok: false,
        status: 'unauthorized',
        message: 'API key tidak valid'
      })
    }

    const phone = normalizePhone(req.body?.phone)
    if (!phone) {
      return res.status(400).json({
        ok: false,
        status: 'invalid',
        message: 'Nomor tidak valid'
      })
    }

    const { db, sha } = await fetchDB()
    const status = getPhoneStatus(db, phone)

    if (status === 'approved') {
      return res.status(200).json({
        ok: true,
        status: 'approved',
        message: 'Nomor sudah approved'
      })
    }

    if (status === 'pending') {
      return res.status(200).json({
        ok: false,
        status: 'pending',
        message: 'Nomor sudah dalam antrian pending'
      })
    }

    if (status === 'rejected') {
      return res.status(200).json({
        ok: false,
        status: 'rejected',
        message: 'Nomor sebelumnya ditolak'
      })
    }

    db.pending.push(phone)

    await saveDB(db, sha, `Request access for ${phone}`)

    return res.status(200).json({
      ok: true,
      status: 'pending',
      message: 'Request akses berhasil dikirim'
    })
  } catch (err) {
    return res.status(500).json({
      ok: false,
      status: 'error',
      message: err.message || 'Internal server error'
    })
  }
}
