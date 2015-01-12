var testUtil = require('./test-util.js');
describe('chamber 00', function() {
    var logKey = require('../src/log-key.js'),
        cursor = require('../src/cursor.js'),
        chamber = require('../src/chamber.js');

    beforeEach(function() {
        testUtil.loadChamber(0);
    });

    describe('basic movement', function() {
        it('moves cursor to the next column', function() {
            expect(cursor.column).toEqual(7);
            logKey('l');
            expect(cursor.column).toEqual(8);
        });

        it('moves cursor to the previous column', function() {
            expect(cursor.column).toEqual(7);
            logKey('h');
            expect(cursor.column).toEqual(6);
        });

        it('moves cursor to the next row', function() {
            expect(cursor.row).toEqual(5);
            logKey('j');
            expect(cursor.row).toEqual(6);
        });

        it('moves cursor to the previous row', function() {
            expect(cursor.row).toEqual(5);
            logKey('k');
            expect(cursor.row).toEqual(4);
        });
    });

    describe('getting a star', function() {
        it('should have 3 stars', function() {
            expect(chamber.getCoordinatesOf({
                character: '*'
            }).length).toEqual(3);
        });
        it('should have a star near by', function() {
            expect(chamber.matrix[6][9].character).toEqual('*');
        });
        it('should be able to collect the star near by', function() {
            logKey('2l j');
            expect(chamber.matrix[6][9].character).toEqual(' ');
        });
    });

    describe('completing the level', function() {
        it('completes the level', function() {
            logKey('3k 6l 3j 2h 3j 8h 6k 2l k');
            expect(cursor.hasCompletedLevel).toEqual(true);
        });
    });
});
