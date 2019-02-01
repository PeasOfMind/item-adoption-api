'use strict'

exports.DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost/item-adoption-api';
exports.TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'mongodb://localhost/test-item-adoption-api';
exports.PORT = process.env.PORT || 8080;
exports.CLIENT_ORIGIN = 'https://sleepy-scrubland-39053.herokuapp.com/';