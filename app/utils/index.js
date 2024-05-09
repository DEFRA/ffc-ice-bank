require('dotenv').config()
const axios = require('axios')

const isValidAccessToken = config => config?.defaults?.headers?.common?.Authorization &&
  config?.defaults?._tokenExpiry * 1000 > Date.now()

const getAccessToken = async () => {
  try {
    const formData = {
      grant_type: 'client_credentials',
      client_id: process.env.D365_CLIENT_ID,
      client_secret: process.env.D365_CLIENT_SECRET,
      resource: process.env.D365_API_HOST
    }

    const response = await axios.post(`https://login.microsoftonline.com/${process.env.D365_TENANT_ID}/oauth2/token`, formData, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })

    return response.data
  } catch (err) {
    console.error('Error acquiring token:', err)
    throw new Error(err)
  }
}

module.exports = {
  getAccessToken,
  isValidAccessToken
}
