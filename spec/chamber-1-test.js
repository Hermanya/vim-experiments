var testUtil = require('./test-util.js');
describe('chamber 01', function() {
	var keys = require('../src/keys.js'),
		cursor = require('../src/cursor.js');

	beforeEach(function() {
		testUtil.loadChamber(1);
	});

	describe('last column movement', function() {
		beforeEach(function() {
			keys.l();
			keys.j(6);
			keys.l(9);
		});

		it('brings me to the right place before each test in this section', function() {
			expect(cursor.column).toEqual(11);
			expect(cursor.row).toEqual(7);
		});
		it('moves to the last column of a shorter row', function() {
			keys.k();
			expect(cursor.column).toEqual(7);
		});
		it('remembers column where begun if keep moving vertically', function() {
			keys.k(6);
			expect(cursor.column).toEqual(11);
		});
		it('should forget column where begun if move horizontally', function() {
			keys.k();
			keys.h();
			keys.l();
			keys.k();
			expect(cursor.column).toEqual(7);
		});
	});

	describe('completing the level', function() {
		it('completes the level', function() {
			keys.l();
			keys.j(6);
			keys.l(9);
			keys.k(6);
			keys.l(3);
			keys.j(4);
			keys.l(5);
			keys.k(3);
			keys.l(5);
			keys.j(2);
			keys.l();
			keys.j(2);
			keys.l(4);
			expect(cursor.hasCompletedLevel).toEqual(true);
		});
	});
});