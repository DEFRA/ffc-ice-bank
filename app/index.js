const MessageProcessorService = require('./message-processor')
const server = require('./server')

const init = async () => {
  await server.start()
  MessageProcessorService.getInstance()
  console.log('Server running on %s', server.info.uri)
}

process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

init()

module.exports = init
