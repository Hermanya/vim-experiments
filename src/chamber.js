var matrixDecorator = require('./matrix-decorator.js'),
	cellDecorator = require('./cell-decorator.js'),
	cursor = require('./cursor.js');

var scene = Object.create(matrixDecorator);

scene.fromJSON = function(json) {
	this.fromArrayOfStrings(json.scene);
	Object.keys(json).filter(function(key) {
		return key !== 'scene'
	}).forEach(function(key) {
		this[key] = json[key];
	})
};

scene.initialize = function() {
	this.replaceCharactersWithCells();
	this.markText();
	this.markLazers();
	this.markCursor();
};

scene.replaceCharactersWithCells = function() {
	var scene = this;
	scene.matrix = scene.map(function(character, row, column) {
		if (character === '@') {
			scene.spawnPosition = {
				row: row,
				column: column
			}
		}
		var cell = Object.create(cellDecorator);
		cell.row = row;
		cell.column = column;
		cell.character = character;
		return cell;
	}, scene);
};

scene.markCursor = function() {
	cursor.reset();
	cursor.column = this.spawnPosition.column;
	cursor.row = this.spawnPosition.row;
};

scene.markText = function() {
	var isSequenceOfTextInProgress = false,
		lastCellInSequence;
	this.matrix = this.map(function(cell, row, column) {
		if (isSequenceOfTextInProgress) {
			if (cell.character === '`') {
				isSequenceOfTextInProgress = false;
				lastCellInSequence = scene.matrix[row][column - 1];
				cell.character = ' ';
			} else {
				cell.isText = true;
				if (lastCellInSequence) {
					if (Math.abs(lastCellInSequence.row - cell.row) === 1) {
						cell.previousTextCell = lastCellInSequence;
						lastCellInSequence.nextTextCell = cell;
					}
					lastCellInSequence = undefined;
				}
			}
		} else {
			if (cell.character === '`') {
				isSequenceOfTextInProgress = true;
				cell.character = ' ';

			} else {

			}

		}
		return cell;
	});
};

scene.markLazers = function() {
	var matrix = this.matrix;
	this.matrix = this.map(function(cell, row, column) {
		var continueBeam,
			character = cell.character,
			isVerticalLazerBeam = function() {
				return ['<','>'].indexOf(character) === -1;
			},
			beamProperty = isVerticalLazerBeam() ? 'isVerticalLazerBeam' : 'isHorizontalLazerBeam';
			isBeamContinuing = function() {
				return matrix[row][column].isLazerBeam() || !matrix[row][column].isBlocking();
			},
			nextCell = {
				'V': function() {
					return matrix[row++][column];
				},
				'^': function() {
					return matrix[row--][column];
				},
				'>': function() {
					return matrix[row][column++];
				},
				'<': function() {
					return matrix[row][column--];
				}
			}[character];
		if (nextCell) {
			nextCell();
			while (isBeamContinuing()) {
				nextCell()[beamProperty] = true;
			}
		}
		return cell;
	});
};

scene.getCellUnderCursor = function() {
	return this.matrix[cursor.row][cursor.column];
};

scene.render = function() {
	var element = document.querySelector('#scene');
	element.innerHTML = scene.matrix.map(function(array) {
		array.forEach(function(cell) {
			cell.isUnderCursor = cell.row === cursor.row && cell.column === cursor.column;
		})
		return array.join('');
	}).join('<br>');
};

module.exports = scene;