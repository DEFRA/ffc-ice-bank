const axios = require('axios')
require('dotenv').config()
const { getAccessToken, isValidAccessToken } = require('./utils')

const axiosInstance = axios.create({
  baseURL: process.env.D365_API_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
})

axiosInstance.interceptors.request.use(async config => {
  if (isValidAccessToken(axiosInstance)) {
    return config
  }

  const token = await getAccessToken()

  axiosInstance.defaults.headers.common.Authorization = `Bearer ${token.access_token}`
  axiosInstance.defaults._tokenExpiry = token.expires_on

  return config
}, err => Promise.reject(err))

axiosInstance.interceptors.response.use(response => (
  response
), async (err) => {
  const originalRequest = err.config
  const unauthorizedStatusCode = 401
  if (err.response?.status === unauthorizedStatusCode && !originalRequest._retry) {
    originalRequest._retry = true
    const token = await getAccessToken()
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${token.access_token}`
    axiosInstance.defaults._tokenExpiry = token.expires_on

    return axiosInstance(originalRequest)
  }

  const error = new Error(err.response?.statusText)
  error.status = err.response?.status
  error.error = err.response?.data?.error
  return Promise.reject(error)
})

module.exports = axiosInstance
