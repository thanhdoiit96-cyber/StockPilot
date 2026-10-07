function httpError(res, status, code, message, data) {
  const payload = { success: false, code, message }
  if (data !== undefined) payload.data = data
  return res.status(status).json(payload)
}

module.exports = { httpError };
