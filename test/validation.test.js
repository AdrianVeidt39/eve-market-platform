const assert = require('assert');
const { logInfo, logWarn, logError } = require('../client/logging');

assert.strictEqual(typeof logInfo, 'function');
assert.strictEqual(typeof logWarn, 'function');
assert.strictEqual(typeof logError, 'function');

logInfo('Tests passed');
