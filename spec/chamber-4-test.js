var testUtil = require('./test-util.js');
describe('chamber 04', function() {
    var logKey = require('../src/log-key.js'),
        cursor = require('../src/cursor.js');

    beforeEach(function() {
        testUtil.loadChamber(4);
    });

    describe('moving to certain line', function() {
        it('jumps to first character on another line', function() {
            logKey('2j 4G');
            expect(cursor.row).toEqual(8);
            expect(cursor.column).toEqual(3);
        });
    });

    describe('completing the level', function() {
        it('completes the level', function() {
            logKey('2j 4G 6l jj 5l 2k 3l 4k l b k 4h');
            expect(cursor.hasCompletedLevel).toEqual(true);
        });
    });
});
