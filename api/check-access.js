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

    if (status === 'approved') {
      return res.status(200).json({
        ok: true,
        status: 'approved',
        message: 'Nomor disetujui'
      })
    }

    if (status === 'pending') {
      return res.status(200).json({
        ok: false,
        status: 'pending',
        message: 'Nomor masih menunggu persetujuan'
      })
    }

    if (status === 'rejected') {
      return res.status(200).json({
        ok: false,
        status: 'rejected',
        message: 'Nomor ditolak'
      })
    }

    return res.status(200).json({
      ok: false,
      status: 'unregistered',
      message: 'Nomor belum terdaftar'
    })
  } catch (err) {
    return res.status(500).json({
      ok: false,
      status: 'error',
      message: err.message || 'Internal server error'
    })
  }
}
