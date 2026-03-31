const {
  normalizePhone,
  fetchDB,
  saveDB,
  getPhoneStatus,
  removePhoneFromAllLists
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

    const adminKey = req.headers['x-admin-key']
    if (adminKey !== process.env.SECURITY_ADMIN_KEY) {
      return res.status(401).json({
        ok: false,
        status: 'unauthorized',
        message: 'Admin key tidak valid'
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
    const oldStatus = getPhoneStatus(db, phone)

    if (oldStatus === 'unregistered') {
      return res.status(200).json({
        ok: false,
        status: 'unregistered',
        message: `Nomor ${phone} tidak ada di database`
      })
    }

    removePhoneFromAllLists(db, phone)
    await saveDB(db, sha, `Delete access for ${phone}`)

    return res.status(200).json({
      ok: true,
      status: 'deleted',
      previous_status: oldStatus,
      message: `Nomor ${phone} berhasil dihapus dari database`
    })
  } catch (err) {
    return res.status(500).json({
      ok: false,
      status: 'error',
      message: err.message || 'Internal server error'
    })
  }
}
