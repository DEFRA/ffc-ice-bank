const MessageProcessorService = require('../../app/message-processor')

jest.mock('@azure/service-bus', () => {
  const mockServiceBusClient = {
    createReceiver: jest.fn(),
    createSender: jest.fn((queueName) => {
      if (!queueName) {
        throw new Error('Invalid queue name')
      }
      return {
        sendMessages: jest.fn((body) => {
          if (!body || !body.body) {
            throw new Error('Invalid message body')
          }
        })
      }
    })
  }

  const mockReceiver = {
    subscribe: jest.fn(),
    completeMessage: jest.fn(async (message) => {
    }),
    deadLetterMessage: jest.fn(async (message) => {
    })
  }

  mockServiceBusClient.createReceiver.mockReturnValue(mockReceiver)

  const ServiceBusClient = jest.fn((params) => {
    if (params === 'invalid') {
      throw new Error('Invalid params')
    }

    return mockServiceBusClient
  })

  return {
    ServiceBusClient
  }
})

jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn()
}))

jest.mock('../../app/api', () => {
  return {
    post: jest.fn(async (url, data) => {
      if (data._request && data._request.CurrencyCode) {
        return {
          data: {
            $id: '1',
            SupplierHoldStatus: 'Invoice',
            Result: true,
            InfoMessages: [
              'Bank account 01 created succufully for FRN 1001'
            ]
          }
        }
      } else {
        return {
          data: {
            $id: '1',
            SupplierHoldStatus: 'Invoice',
            Result: false,
            InfoMessages: [
              'Currency code not populated',
              'Bank account 01 cannot be created for FRN number 1001 '
            ]
          }
        }
      }
    })
  }
})

beforeAll(() => {
  process.env.SERVICE_BUS_CONNECTION_STRING = 'your_mocked_connection_string' // pragma: allowlist secret
  process.env.SERVICE_BUS_HOST = 'your_mocked_host' // pragma: allowlist secret
  process.env.SERVICE_BUS_USERNAME = 'your_mocked_username' // pragma: allowlist secret
  process.env.SERVICE_BUS_PASSWORD = 'your_mocked_password'// pragma: allowlist secret
  process.env.CASE_DETAILS_QUEUE = 'your_case_queue'// pragma: allowlist secret
})

describe('MessageProcessorService', () => {
  let service

  beforeEach(() => {
    jest.clearAllMocks()
    service = MessageProcessorService.getInstance()
    process.env.SERVICE_BUS_CONNECTION_STRING = 'your_mocked_connection_string'// pragma: allowlist secret
    process.env.SERVICE_BUS_HOST = 'your_mocked_host'// pragma: allowlist secret
    process.env.SERVICE_BUS_USERNAME = 'your_mocked_username'// pragma: allowlist secret
    process.env.SERVICE_BUS_PASSWORD = 'your_mocked_password'// pragma: allowlist secret
    process.env.CASE_DETAILS_QUEUE = 'your_case_queue'// pragma: allowlist secret
  })

  test('should create an instance', async () => {
    const messageService = MessageProcessorService.getInstance()
    expect(messageService).toBeInstanceOf(MessageProcessorService)
  })

  test('should connect to Service Bus, receive messages, and initialize sender using connection string', async () => {
    const connectToServiceBusSpy = jest.spyOn(service, 'connectToServiceBus')
    const receiveMessageFromQueueSpy = jest.spyOn(service, 'receiveMessageFromQueue')
    const initializeSenderSpy = jest.spyOn(service, 'initializeSender')

    const result = await service.connectToServiceBusAndStartListening()

    expect(connectToServiceBusSpy).toHaveBeenCalledTimes(1)
    expect(receiveMessageFromQueueSpy).toHaveBeenCalledTimes(1)
    expect(initializeSenderSpy).toHaveBeenCalledTimes(1)
    expect(result).toBe('success')
  })

  test('should connect to Service Bus using username password and host', async () => {
    delete process.env.SERVICE_BUS_CONNECTION_STRING
    const result = await service.connectToServiceBusAndStartListening()
    expect(result).toBe('success')
  })

  test('should connect to Service Bus using host only', async () => {
    delete process.env.SERVICE_BUS_CONNECTION_STRING
    delete process.env.SERVICE_BUS_USERNAME
    delete process.env.SERVICE_BUS_PASSWORD
    const result = await service.connectToServiceBusAndStartListening()
    expect(result).toBe('success')
  })

  test('should throw an error if missing credentials', async () => {
    delete process.env.SERVICE_BUS_CONNECTION_STRING
    delete process.env.SERVICE_BUS_HOST
    delete process.env.SERVICE_BUS_USERNAME
    delete process.env.SERVICE_BUS_PASSWORD

    await expect(service.connectToServiceBusAndStartListening()).rejects.toThrowError('Missing credentials to connect to Azure Service Bus')
  })

  test('should throw an error if credentials are invalid', async () => {
    process.env.SERVICE_BUS_CONNECTION_STRING = 'invalid' // pragma: allowlist secret
    await expect(service.connectToServiceBusAndStartListening()).rejects.toThrowError()
  })

  test('should successfully initialize sender', async () => {
    const result = await service.initializeSender()
    expect(result).toBe('success')
  })

  test('should not successfully initialize sender', async () => {
    process.env.CASE_DETAILS_QUEUE = '' // pragma: allowlist secret
    await expect(service.initializeSender()).rejects.toThrowError()
  })

  test('should successfully initialize the reciever', async () => {
    const result = await service.receiveMessageFromQueue()
    expect(result).toBe('success')
  })

  test('should successfully send message to the CRM queue', async () => {
    const result = await service.sendMessageToCRMQueue({})
    expect(result).toBe('success')
  })

  test('should successfully process the message and send the message to the CRM queue', async () => {
    const receiver = service.getReciever()
    const message = {
      body: {
        sbi: '123456789',
        frn: '123456789',
        crn: '123456789',
        SubmissionId: '123456789_1642721400',
        submissionDateTime: '01/01/2023 14:12:11',
        filesInSubmission: 0,
        files: [''],
        type: 'Bank Account Update',
        bankAccountNumber: '23456',
        listofCRNwithEmpowerment: ['CRN'],
        SupplierAccount: '123456789',
        BankName: 'Acme Office Supplies',
        BankIBAN: 'CH5604835012345678009',
        BankAccountNumber: '012345678009',
        RoutingNumber: '04835',
        SwiftNo: 'CRESCHZZ80A',
        CurrencyCode: 'GBP'
      }
    }

    const result = await service.processQueueMessage(message, receiver)
    expect(result).toBe(true)
  })

  test('should not successfully process the message and send the message to the CRM queue', async () => {
    const receiver = service.getReciever()
    const message = {
      body: {
        sbi: '123456789',
        frn: '123456789',
        crn: '123456789',
        SubmissionId: '123456789_1642721400',
        submissionDateTime: '01/01/2023 14:12:11',
        filesInSubmission: 0,
        files: [''],
        type: 'Bank Account Update',
        bankAccountNumber: '23456',
        listofCRNwithEmpowerment: ['CRN'],
        SupplierAccount: '123456789',
        BankName: 'Acme Office Supplies',
        BankIBAN: 'CH5604835012345678009',
        BankAccountNumber: '012345678009',
        RoutingNumber: '04835',
        SwiftNo: 'CRESCHZZ80A'
      }
    }

    const result = await service.processQueueMessage(message, receiver)
    expect(result).toBe(false)
  })

  test('should successfully return the reciever', async () => {
    const receiver = await service.getReciever()
    expect(receiver).toBeDefined()
  })

  test('should throw an error if message body is empty', async () => {
    await expect(service.sendMessageToCRMQueue()).rejects.toThrowError()
  })
})

afterAll(() => {
  delete process.env.SERVICE_BUS_CONNECTION_STRING
  delete process.env.SERVICE_BUS_HOST
  delete process.env.SERVICE_BUS_USERNAME
  delete process.env.SERVICE_BUS_PASSWORD
})
