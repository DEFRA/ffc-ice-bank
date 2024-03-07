const { ServiceBusClient } = require('@azure/service-bus')
const axios = require('axios')
const { DefaultAzureCredential } = require('@azure/identity')

class MessageProcessorService {
  static instance

  serviceBusClient
  sender

  constructor () {
    this.connectToServiceBusAndStartListening()
  }

  static getInstance () {
    if (!this.instance) {
      this.instance = new MessageProcessorService()
    }
  }

  async connectToServiceBusAndStartListening () {
    await this.connectToServiceBus(5)
    await this.receiveMessageFromQueue(process.env.BANK_DETAILS_QUEUE)
    await this.initializeSender()
  }

  async initializeSender () {
    try {
      this.sender = await this.serviceBusClient.createSender(process.env.CASE_DETAILS_QUEUE)
      console.log('Successfully created sender')
    } catch (error) {
      console.log(error)
    }
  }

  async connectToServiceBus (retries) {
    let retryAttempts = 0
    const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING
    const host = process.env.SERVICE_BUS_HOST
    const username = process.env.SERVICE_BUS_USERNAME
    const password = process.env.SERVICE_BUS_PASSWORD

    while (retryAttempts < retries) {
      try {
        if (connectionString) {
          this.serviceBusClient = new ServiceBusClient(connectionString)
          console.log('Successfully connected to Azure Service Bus!')
          return
        } else if (host && username && password) {
          this.serviceBusClient = new ServiceBusClient(`Endpoint=sb://${host}/;SharedAccessKeyName=${username};SharedAccessKey=${password}`)
          console.log('Successfully connected to Azure Service Bus!')
          return
        } else if (host) {
          console.log(new DefaultAzureCredential())
          this.serviceBusClient = new ServiceBusClient(host, new DefaultAzureCredential())
          console.log('Successfully connected to Azure Service Bus!')
          return
        } else {
          return 'Could not connect to Azure Service Bus'
        }
      } catch (error) {
        console.error(
          `Error connecting to Azure Service Bus (Attempt ${retryAttempts + 1}):`,
          error
        )

        await new Promise((resolve) => setTimeout(resolve, 5000))

        retryAttempts++
      }
    }

    console.error(
      `Failed to connect to Azure Service Bus after ${retries} attempts.`
    )
    throw new Error('Failed to connect to Azure Service Bus.')
  }

  async receiveMessageFromQueue (queueName) {
    try {
      const receiver = this.serviceBusClient?.createReceiver(queueName, {
        receiveMode: 'peekLock'
      })

      if (!receiver) {
        console.error('ServiceBusClient not initialized.')
        return
      }

      receiver.subscribe(
        {
          processMessage: async (message) => {
            await this.processQueueMessage(
              message,
              receiver
            )
          },
          processError: async (error) => {
            console.error('Error in message processing:', error)
          }
        },
        { autoCompleteMessages: false }
      )
      console.log(`Started listening for messages on queue: ${queueName}`)
    } catch (error) {
      console.error('Error setting up message receiver:', error)
    }
  }

  async processQueueMessage (
    message,
    receiver,
    retryAttempts = 3
  ) {
    try {
      const data = message.body
      console.log({ data })
      const bankAccountData = {
        SupplierAccount: data?.SupplierAccount,
        BankName: data?.BankName,
        BankIBAN: data?.BankIBAN,
        BankAccountNumber: data?.BankAccountNumber,
        RoutingNumber: data?.RoutingNumber,
        SwiftNo: data?.SwiftNo,
        CurrencyCode: data?.CurrencyCode
      }

      const response = await axios.post(
        process.env.D365_API_URL,
        bankAccountData
      )

      if (!response?.data?.Result) {
        throw new Error()
      }

      const crmMessage = {
        sbi: data?.sbi,
        frn: data?.frn,
        crn: data?.crn,
        SubmissionId: data?.SubmissionId,
        submissionDateTime: data?.submissionDateTime,
        filesInSubmission: data?.filesInSubmission,
        files: data?.files,
        type: data?.type,
        bankAccountNumber: data?.bankAccountNumber,
        listofCRNwithEmpowerment: data?.listofCRNwithEmpowerment,
        holdStatus: response?.data?.SupplierHoldStatus
      }

      await this.sendMessageToCRMQueue(crmMessage)
      await receiver.completeMessage(message)

      return true
    } catch (error) {
      if (retryAttempts > 0) {
        console.log(
            `Retrying message processing (${retryAttempts} attempts remaining)`
        )
        return this.processQueueMessage(message, receiver, retryAttempts - 1)
      } else {
        console.error('Moving message to Dead-Letter Queue')
        await receiver.deadLetterMessage(message)
        return false
      }
    }
  }

  async sendMessageToCRMQueue (message) {
    try {
      await this.sender.sendMessages({ body: message })
    } catch (error) {
      console.log({ error })
      throw error
    }
  }
}

module.exports = MessageProcessorService
