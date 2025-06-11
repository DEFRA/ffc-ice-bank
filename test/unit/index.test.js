const server = require('../../app/server')
const init = require('../../app/index')
const MessageProcessorService = require('../../app/message-processor')

jest.mock('../../app/server')
jest.mock('../../app/message-processor')

describe('Init Script', () => {
  test('should start the server and initialize MessageProcessorService', async () => {
    const startSpy = jest.spyOn(server, 'start')
    const getInstanceSpy = jest.spyOn(MessageProcessorService, 'getInstance')

    await init()

    expect(startSpy).toHaveBeenCalled()
    expect(getInstanceSpy).toHaveBeenCalled()
  })

  test('should log the error and exit the process with code 1', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {})

    const unhandledRejectionHandler = process.listeners('unhandledRejection')[0]
    unhandledRejectionHandler('Test Error')

    expect(logSpy).toHaveBeenCalledWith('Test Error')
    expect(exitSpy).toHaveBeenCalledWith(1)

    logSpy.mockRestore()
    exitSpy.mockRestore()
  })
})

describe('Console Logging', () => {
  let originalConsoleLog, originalConsoleDebug, originalConsoleInfo, originalConsoleWarn

  beforeEach(() => {
    originalConsoleLog = console.log
    originalConsoleDebug = console.debug
    originalConsoleInfo = console.info
    originalConsoleWarn = console.warn
  })

  afterEach(() => {
    console.log = originalConsoleLog
    console.debug = originalConsoleDebug
    console.info = originalConsoleInfo
    console.warn = originalConsoleWarn
  })

  test('should disable console logging in non-development environments', () => {
    process.env.NODE_ENV = 'production'
    require('../../app/index')
    expect(console.log).toEqual(expect.any(Function))
    expect(console.log()).toBeUndefined()
    expect(console.debug).toEqual(expect.any(Function))
    expect(console.debug()).toBeUndefined()
    expect(console.info).toEqual(expect.any(Function))
    expect(console.info()).toBeUndefined()
    expect(console.warn).toEqual(expect.any(Function))
    expect(console.warn()).toBeUndefined()
  })

  test('should not disable console logging in development environments', () => {
    process.env.NODE_ENV = 'development'
    require('../../app/index')
    expect(console.log).toEqual(originalConsoleLog)
    expect(console.debug).toEqual(originalConsoleDebug)
    expect(console.info).toEqual(originalConsoleInfo)
    expect(console.warn).toEqual(originalConsoleWarn)
  })
})
