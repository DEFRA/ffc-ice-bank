const appInsights = require('applicationinsights')

const setup = () => {
  if (process.env.APPINSIGHTS_CONNECTIONSTRING) {
    appInsights.setup(process.env.APPINSIGHTS_CONNECTIONSTRING).start()
    console.log('App Insights running')
    const cloudRoleTag = appInsights.defaultClient.context.keys.cloudRole
    const appName = process.env.APPINSIGHTS_CLOUDROLE
    appInsights.defaultClient.context.tags[cloudRoleTag] = appName
  } else {
    console.log('App Insights not running')
  }
}

const trackException = (error) => {
  if (appInsights.defaultClient) {
    try {
      appInsights.defaultClient.trackException({ exception: error })
    } catch (err) {
      console.log('Unable to track exception', err)
    }
  }
}

module.exports = { setup, trackException }
