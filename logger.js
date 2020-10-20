const { format, createLogger} = require('winston');
const winstonRotator = require('winston-daily-rotate-file');

const info = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
  });
info.configure({
level: 'verbose',
transports: [
    new winstonRotator({
        'name': 'info-file',
        'level': 'info',
        'filename': './logs/info.log',
        'json': false,
        'datePattern': 'yyyy-MM-dd-',
        'prepend': true
      })
]
});

const error = createLogger({
    level: 'error',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
  });
error.configure({
level: 'verbose',
transports: [
    new winstonRotator({
        'name': 'error-file',
        'level': 'error',
        'filename': './logs/error.log',
        'json': false,
        'datePattern': 'yyyy-MM-dd-',
        'prepend': true
      })
]
});

module.exports = {
    info,
    error
};