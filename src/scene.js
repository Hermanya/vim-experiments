var matrixDecorator = require('./matrix-decorator.js'),
	cursor = require('./cursor.js');

var scene = Object.create(matrixDecorator);

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
		return {
			row: row,
			column: column,
			isUnderCursor: character === '@',
			character: ['@'].indexOf(character) !== -1 ? ' ' : character,
			isWall: function() {
				return ['+', '-', '|'].indexOf(character) !== -1 && !this.isText;
			},
			isLazer: function() {
				return ['V', '^', '>', '<'].indexOf(character) !== -1 && !this.isText;
			},
			isBlocking: function() {
				return this.isWall() || this.isLazer() || this.isVerticalLazerBeam || this.isHorizontalLazerBeam;
			},
			toString: function() {
				return '<span  class="' + 
				(this.isUnderCursor ? ' cursor' : '') +
				(this.isText ? ' text' : '') +
				(this.isVerticalLazerBeam ? ' vertical-lazer-beam' : '') +
				(this.isHorizontalLazerBeam ? ' horizontal-lazer-beam' : '') +
				 '">' + this.character + '</span>';
			}
		};
	}, scene);
};

scene.markCursor = function() {
	cursor.column = this.spawnPosition.column;
	cursor.row = this.spawnPosition.row;
	cursor.isDone = false;
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
	matrix = this.map(function(cell, row, column) {
		var propertyName
		switch (cell.character) {
			case 'V':
				row++;
				while (matrix[row][column].isHorizontalLazerBeam || !matrix[row][column].isBlocking()) {
					matrix[row][column].isVerticalLazerBeam = true;
					row++;
				}
				break;
			case '^':
				row--;
				while (matrix[row][column].isHorizontalLazerBeam || !matrix[row][column].isBlocking()) {
					matrix[row][column].isVerticalLazerBeam = true;
					row--;
				}
				break;
			case '>':
				column++;
				while (matrix[row][column].isVerticalLazerBeam || !matrix[row][column].isBlocking()) {
					matrix[row][column].isHorizontalLazerBeam = true;
					column++;
				}
				break;
			case '<':
				column--;
				while (matrix[row][column].isVerticalLazerBeam || !matrix[row][column].isBlocking()) {
					matrix[row][column].isHorizontalLazerBeam = true;
					column--;
				}
				break;
		}
		return cell;
	});
};

scene.getCurrentCell = function() {
	return this.matrix[cursor.row][cursor.column];
};

scene.render = function() {
	var element = document.querySelector('#scene');
	element.innerHTML = scene.matrix.map(function(array) {
		return array.join('');
	}).join('<br>');
};

scene.toggleCursor = function() {
	var cell = scene.matrix[cursor.row][cursor.column];
	cell.isUnderCursor = !cell.isUnderCursor;
};

module.exports = scene;