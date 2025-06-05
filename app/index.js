const MessageProcessorService = require('./message-processor')
const server = require('./server')

const init = async () => {
  await server.start()
  MessageProcessorService.getInstance()
  console.log('Server running on %s', server.info.uri)
}

// Disable all console logging in non-development environments to prevent
// sensitive logs or excessive output in production and pre environments.
// This includes console.log, console.debug, console.info, and console.warn.
if (process.env.NODE_ENV != "development") { 
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    console.warn = () => {};
}


process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

init()

module.exports = init
