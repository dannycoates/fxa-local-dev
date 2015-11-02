/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var inherits = require('util').inherits
var messages = require('joi/lib/language').errors

var DEFAULTS = {
  code: 500,
  error: 'Internal Server Error',
  errno: 999,
  message: 'Unspecified error',
  info: 'https://github.com/mozilla/fxa-auth-server/blob/master/docs/api.md#response-format'
}

var TOO_LARGE = /^Payload (?:content length|size) greater than maximum allowed/

var BAD_SIGNATURE_ERRORS = [
  'Bad mac',
  'Unknown algorithm',
  'Missing required payload hash',
  'Payload is invalid'
]

function AppError(options, extra, headers) {
  this.message = options.message || DEFAULTS.message
  this.isBoom = true
  this.stack = options.stack
  this.errno = options.errno || DEFAULTS.errno
  this.output = {
    statusCode: options.code || DEFAULTS.code,
    payload: {
      code: options.code || DEFAULTS.code,
      errno: this.errno,
      error: options.error || DEFAULTS.error,
      message: this.message,
      info: options.info || DEFAULTS.info
    },
    headers: headers || {}
  }
  var keys = Object.keys(extra || {})
  for (var i = 0; i < keys.length; i++) {
    this.output.payload[keys[i]] = extra[keys[i]]
  }
}
inherits(AppError, Error)

AppError.prototype.toString = function () {
  return 'Error: ' + this.message
}

AppError.prototype.header = function (name, value) {
  this.output.headers[name] = value
}

AppError.prototype.backtrace = function (traced) {
  this.output.payload.log = traced
}

/*/
  Translates an error from Hapi format to our format
/*/
AppError.translate = function (response) {
  var error
  if (response instanceof AppError) {
    return response
  }
  var payload = response.output.payload
  if (payload.statusCode === 401) {
    // These are common errors generated by Hawk auth lib.
    if (payload.message === 'Unknown credentials' ||
        payload.message === 'Invalid credentials') {
      error = AppError.invalidToken()
    }
    else if (payload.message === 'Stale timestamp') {
      error = AppError.invalidTimestamp()
    }
    else if (payload.message === 'Invalid nonce') {
      error = AppError.invalidNonce()
    }
    else if (BAD_SIGNATURE_ERRORS.indexOf(payload.message) !== -1) {
      error = AppError.invalidSignature(payload.message)
    }
    else {
      error = AppError.invalidToken(payload.message)
    }
  }
  else if (payload.validation) {
    if (payload.message && payload.message.indexOf(messages.any.required) >= 0) {
      error = AppError.missingRequestParameter(payload.validation.keys[0])
    } else {
      error = AppError.invalidRequestParameter(payload.validation)
    }
  }
  else if (payload.statusCode === 400 && TOO_LARGE.test(payload.message)) {
    error = AppError.requestBodyTooLarge()
  }
  else {
    error = new AppError({
      message: payload.message,
      code: payload.statusCode,
      error: payload.error,
      errno: payload.errno,
      info: payload.info,
      stack: response.stack
    })
  }
  return error
}

// Helper functions for creating particular response types.

AppError.dbIncorrectPatchLevel = function (level, levelRequired) {
  return new AppError(
    {
      code: 400,
      error: 'Server Startup',
      errno: 100,
      message: 'Incorrect Database Patch Level'
    },
    {
      level: level,
      levelRequired: levelRequired
    }
  )
}

AppError.accountExists = function (email) {
  return new AppError(
    {
      code: 400,
      error: 'Bad Request',
      errno: 101,
      message: 'Account already exists'
    },
    {
      email: email
    }
  )
}

AppError.unknownAccount = function (email) {
  return new AppError(
    {
      code: 400,
      error: 'Bad Request',
      errno: 102,
      message: 'Unknown account'
    },
    {
      email: email
    }
  )
}

AppError.incorrectPassword = function (dbEmail, requestEmail) {
  if (dbEmail !== requestEmail) {
    return new AppError(
      {
        code: 400,
        error: 'Bad Request',
        errno: 120,
        message: 'Incorrect email case'
      },
      {
        email: dbEmail
      }
    )
  }
  return new AppError(
    {
      code: 400,
      error: 'Bad Request',
      errno: 103,
      message: 'Incorrect password'
    },
    {
      email: dbEmail
    }
  )
}

AppError.unverifiedAccount = function () {
  return new AppError({
    code: 400,
    error: 'Bad Request',
    errno: 104,
    message: 'Unverified account'
  })
}

AppError.invalidVerificationCode = function (details) {
  return new AppError(
    {
      code: 400,
      error: 'Bad Request',
      errno: 105,
      message: 'Invalid verification code'
    },
    details
  )
}

AppError.invalidRequestBody = function () {
  return new AppError({
    code: 400,
    error: 'Bad Request',
    errno: 106,
    message: 'Invalid JSON in request body'
  })
}

AppError.invalidRequestParameter = function (validation) {
  return new AppError(
    {
      code: 400,
      error: 'Bad Request',
      errno: 107,
      message: 'Invalid parameter in request body'
    },
    {
      validation: validation
    }
  )
}

AppError.missingRequestParameter = function (param) {
  return new AppError(
    {
      code: 400,
      error: 'Bad Request',
      errno: 108,
      message: 'Missing parameter in request body' + (param ? ': ' + param : '')
    },
    {
      param: param
    }
  )
}

AppError.invalidSignature = function (message) {
  return new AppError({
    code: 401,
    error: 'Unauthorized',
    errno: 109,
    message: message || 'Invalid request signature'
  })
}

AppError.invalidToken = function (message) {
  return new AppError({
    code: 401,
    error: 'Unauthorized',
    errno: 110,
    message: message || 'Invalid authentication token in request signature'
  })
}

AppError.invalidTimestamp = function () {
  return new AppError(
    {
      code: 401,
      error: 'Unauthorized',
      errno: 111,
      message: 'Invalid timestamp in request signature'
    },
    {
      serverTime: Math.floor(+new Date() / 1000)
    }
  )
}

AppError.invalidNonce = function () {
  return new AppError({
    code: 401,
    error: 'Unauthorized',
    errno: 115,
    message: 'Invalid nonce in request signature'
  })
}

AppError.missingContentLength = function () {
  return new AppError({
    code: 411,
    error: 'Length Required',
    errno: 112,
    message: 'Missing content-length header'
  })
}

AppError.requestBodyTooLarge = function () {
  return new AppError({
    code: 413,
    error: 'Request Entity Too Large',
    errno: 113,
    message: 'Request body too large'
  })
}

AppError.tooManyRequests = function (retryAfter) {
  if (!retryAfter) {
    retryAfter = 30
  }
  return new AppError(
    {
      code: 429,
      error: 'Too Many Requests',
      errno: 114,
      message: 'Client has sent too many requests'
    },
    {
      retryAfter: retryAfter
    },
    {
      'retry-after': retryAfter
    }
  )
}

AppError.serviceUnavailable = function (retryAfter) {
  if (!retryAfter) {
    retryAfter = 30
  }
  return new AppError(
    {
      code: 503,
      error: 'Service Unavailable',
      errno: 201,
      message: 'Service unavailable'
    },
    {
      retryAfter: retryAfter
    },
    {
      'retry-after': retryAfter
    }
  )
}

AppError.gone = function () {
  return new AppError({
    code: 410,
    error: 'Gone',
    errno: 116,
    message: 'This endpoint is no longer supported'
  })
}

AppError.lockedAccount = function () {
  return new AppError({
    code: 400,
    error: 'Bad Request',
    errno: 121,
    message: 'Account is locked'
  })
}

AppError.accountNotLocked = function (email) {
  return new AppError(
    {
      code: 400,
      error: 'Bad Request',
      errno: 122,
      message: 'Account is not locked'
    },
    {
      email: email
    }
  )
}

module.exports = AppError
