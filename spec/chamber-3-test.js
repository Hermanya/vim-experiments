var testUtil = require('./test-util.js');
describe('chamber 03', function() {
    var logKey = require('../src/log-key.js'),
        cursor = require('../src/cursor.js');

    beforeEach(function() {
        testUtil.loadChamber(3);
    });

    describe('completing the level', function() {
        it('completes the level', function() {
            logKey('5j e j 3e 4k');
            expect(cursor.hasCompletedLevel).toEqual(true);
        });
    });
});
