var testUtil = require('./test-util.js');
describe('chamber 02', function() {
	var keys = require('../src/keys.js'),
		cursor = require('../src/cursor.js');

	beforeEach(function() {
		testUtil.loadChamber(2);
	});

	describe('word movement', function() {
		beforeEach(function() {
			keys.j(2);
		});

		it('brings me to the right place before each test in this section', function() {
			expect(cursor.column).toEqual(2);
			expect(cursor.row).toEqual(3);
		});
		it('moves to beginning of next word when press w', function() {
			keys.w();
			expect(cursor.column).toEqual(6);
		});
		it('moves to ending on next word when press e', function() {
			keys.e();
			expect(cursor.column).toEqual(5);
			keys.e();
			expect(cursor.column).toEqual(6);
		});
		it('moves beginnning of previous word when press b', function() {
			keys.w();
			keys.b();
			expect(cursor.column).toEqual(2);
		});
	});

	describe('completing the level', function() {
		it('completes the level', function() {
			keys.j(2);
			keys.w(5);
			keys.l();
			keys.j(2);
			keys.h();
			keys.b(4);
			keys.l();
			keys.j(2);
			keys.l();
			keys.e(6);
			keys.j(2);
			keys.h();
			keys.b();
			keys.j(2);
			expect(cursor.hasCompletedLevel).toEqual(true);
		});
	});
});