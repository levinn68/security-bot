const {
  normalizePhone,
  fetchDB,
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

    const { db } = await fetchDB()
    const status = getPhoneStatus(db, phone)

    return res.status(200).json({
      ok: status === 'approved',
      status,
      message:
        status === 'approved' ? 'Nomor disetujui' :
        status === 'pending' ? 'Nomor masih pending' :
        status === 'rejected' ? 'Nomor ditolak' :
        status === 'unregistered' ? 'Nomor belum terdaftar' :
        'Nomor tidak valid'
    })
  } catch (err) {
    return res.status(500).json({
      ok: false,
      status: 'error',
      message: err.message || 'Internal server error'
    })
  }
}
