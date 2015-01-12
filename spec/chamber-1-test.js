var testUtil = require('./test-util.js');
describe('chamber 01', function() {
	var logKey = require('../src/log-key.js'),
		cursor = require('../src/cursor.js');

	beforeEach(function() {
		testUtil.loadChamber(1);
	});

	describe('last column movement', function() {
		beforeEach(function() {
            logKey('l 6j 9l');
		});

		it('brings me to the right place before each test in this section', function() {
			expect(cursor.column).toEqual(11);
			expect(cursor.row).toEqual(7);
		});
		it('moves to the last column of a shorter row', function() {
			logKey('k');
			expect(cursor.column).toEqual(7);
		});
		it('remembers column where begun if keep moving vertically', function() {
			logKey('6k');
			expect(cursor.column).toEqual(11);
		});
		it('should forget column where begun if move horizontally', function() {
            logKey('k h l k');
			expect(cursor.column).toEqual(7);
		});
	});

	describe('completing the level', function() {
		it('completes the level', function() {
            logKey('l 6j 9l 6k 3l 4j 5l 3k 5l 2j l 2j 4l');
			expect(cursor.hasCompletedLevel).toEqual(true);
		});
	});
});
