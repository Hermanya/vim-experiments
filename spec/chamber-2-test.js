var testUtil = require('./test-util.js');
describe('chamber 02', function() {
	var logKey = require('../src/log-key.js'),
		cursor = require('../src/cursor.js');

	beforeEach(function() {
		testUtil.loadChamber(2);
	});

	describe('word movement', function() {
		beforeEach(function() {
			logKey('2j');
		});

		it('brings me to the right place before each test in this section', function() {
			expect(cursor.column).toEqual(2);
			expect(cursor.row).toEqual(3);
		});
		it('moves to beginning of next word when press w', function() {
            logKey('w');
			expect(cursor.column).toEqual(6);
		});
		it('moves to ending on next word when press e', function() {
			logKey('e');
			expect(cursor.column).toEqual(5);
			logKey('e');
			expect(cursor.column).toEqual(6);
		});
		it('moves beginnning of previous word when press b', function() {
			logKey('w b');
			expect(cursor.column).toEqual(2);
		});
	});

	describe('completing the level', function() {
		it('completes the level', function() {
            logKey('2j 5w l 2j h 4b l 2j l 6e 2j h b 2j');
			expect(cursor.hasCompletedLevel).toEqual(true);
		});
	});
});
