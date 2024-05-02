const utils = require('../../app/utils')

jest.mock('axios', () => {
  return {
    post: jest.fn(async (url, data) => {
      const invalidSecret = 'invalid' // pragma: allowlist secret
      if (data.client_secret === invalidSecret) { throw new Error('Invalid params') }
      return { data: 'bearer_token' }
    })
  }
})

describe('Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    process.env.D365_CLIENT_ID = 'your_mocked_client_id' // pragma: allowlist secret
    process.env.D365_TENANT_ID = 'your_mocked_tenant_id' // pragma: allowlist secret
    process.env.D365_CLIENT_SECRET = 'your_mocked_client_secret' // pragma: allowlist secret
    process.env.D365_API_HOST = 'your_mocked_host' // pragma: allowlist secret
  })

  describe('should get an access token', () => {
    test('should call getAccessToken', async () => {
      const getAccessTokenSpy = jest.spyOn(utils, 'getAccessToken')

      const result = await utils.getAccessToken()

      expect(result).toEqual('bearer_token')
      expect(getAccessTokenSpy).toHaveBeenCalledTimes(1)
    })

    test('should throw error if invalid client secret', async () => {
      process.env.D365_CLIENT_SECRET = 'invalid' // pragma: allowlist secret

      const getAccessTokenSpy = jest.spyOn(utils, 'getAccessToken')

      await expect(utils.getAccessToken()).rejects.toThrowError()

      expect(getAccessTokenSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('should check is valid access token', () => {
    test('should return true when valid', () => {
      const getIsValidAccessTokenSpy = jest.spyOn(utils, 'isValidAccessToken')

      let expiry = Date.now() * 10
      expiry = expiry / 1000

      const result = utils.isValidAccessToken({
        defaults: {
          headers: {
            common: { Authorization: 'bearer_token' }
          },
          _tokenExpiry: expiry
        }
      })

      expect(result).toBeTruthy()
      expect(getIsValidAccessTokenSpy).toHaveBeenCalledTimes(1)
    })
  })
})
