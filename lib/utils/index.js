module.exports = {
  getName: require('./getName'),

  compose: require('./compose'),

  toJSON: require('./toJSON'),

  toXML: require('./toXML'),

  addPrefix: require('./addPrefix'),

  logError: require('./logError'),

  logWarning: require('./logWarning'),

  sortRoute: require('./sortRoute'),

  installHttpMethods: require('./installHttpMethods'),

  buildArgs: require('./buildArgs'),

  wrapperFn: require('./wrapperFn'),

  emitSync: require('./emitSync'),

  copyEvents: require('./copyEvents'),

  mockResponse: require('./mockResponse'),

  convertControllerToApp: require('./convertControllerToApp')
};
