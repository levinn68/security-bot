const { fetchDB } = require('../lib/github-db')

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
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

    const { db } = await fetchDB()

    return res.status(200).json({
      ok: true,
      status: 'success',
      data: db
    })
  } catch (err) {
    return res.status(500).json({
      ok: false,
      status: 'error',
      message: err.message || 'Internal server error'
    })
  }
}
