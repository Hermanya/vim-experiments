var testUtil = require('./test-util.js');
describe('chamber 00', function() {
	var chamber, cursor, keys;
	keys = require('../src/keys.js');
	cursor = require('../src/cursor.js');
	chamber = require('../src/chamber.js');

	beforeEach(function() {
		testUtil.loadChamber(0);
	});

	describe('basic movement', function() {
		it('moves cursor to the next column', function() {
			expect(cursor.column).toEqual(7);
			keys.l();
			expect(cursor.column).toEqual(8);
		});

		it('moves cursor to the previous column', function() {
			expect(cursor.column).toEqual(7);
			keys.h();
			expect(cursor.column).toEqual(6);
		});

		it('moves cursor to the next row', function() {
			expect(cursor.row).toEqual(5);
			keys.j();
			expect(cursor.row).toEqual(6);
		});

		it('moves cursor to the previous row', function() {
			expect(cursor.row).toEqual(5);
			keys.k();
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
			keys.l(2);
			keys.j();
			expect(chamber.matrix[6][9].character).toEqual(' ');
		});
	});

	describe('completing the level', function() {
		it('completes the level', function() {
			keys.k(3);
			keys.l(6);
			keys.j(3);
			keys.h(2);
			keys.j(3);
			keys.h(8);
			keys.k(6);
			keys.l(2);
			keys.k();
			expect(cursor.hasCompletedLevel).toEqual(true);
		});
	});
});