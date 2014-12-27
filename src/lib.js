var scene = require('./chamber.js'),
	cursor = require('./cursor.js');



module.exports = {
	'move horizontally': function(options) {
		var matrix = scene.matrix;
		var _column = cursor.column + (options.direction === 'left' ? -1 : 1);

		if (!matrix[cursor.row][_column].isBlocking()) {
			cursor.column = _column;
			cursor.forgetColumnForVerticalMovement();
		}
	},
	'move vertically': function(options) {
		var matrix = scene.matrix;
		cursor.saveCurrentPosition();
		cursor.rememberColumnForVerticalMovement();
		var stepsAside = 0,
			sign = options.direction === 'up' ? -1 : 1;
		if (!matrix[cursor.row + 1 * sign][cursor.column].isWall()) {
			while (!matrix[cursor.row + 1 * sign][cursor.column + stepsAside + 1].isWall() &&
			 cursor.column + stepsAside < cursor.rememberedColumnForVerticalMovement) {
				stepsAside++;
			}
			cursor.column += stepsAside;
			cursor.row += 1 * sign;
		} else {
			while (!matrix[cursor.row][cursor.column + stepsAside].isBlocking()) {
				if (!matrix[cursor.row + 1 * sign][cursor.column + stepsAside].isBlocking()) {
					cursor.row += 1 * sign;
					cursor.column += stepsAside;
					break;
				} else {
					stepsAside--;
				}
			}
		}
		if (matrix[cursor.row][cursor.column].isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	},
	'move by word': function(options) {
		if (!scene.getCellUnderCursor().isText) {
			return;
		}
		var moveToNextChar, isLastCharacter;
		cursor.saveCurrentPosition();
		
		if (options.direction === 'forward') {
			moveToNextChar = moveOneCharacterForward;
			isLastCharacter = isEndOfFile;
			if (!isWhiteSpaceCharacter() && isLastCharacterInWord()) {
				moveOneCharacterForward();
			}
		} else {
			moveToNextChar = moveOneCharacterBackward;
			isLastCharacter = isBeginningOfFile;
			if (!isWhiteSpaceCharacter() && isFirstCharacterInWord()) {
				moveOneCharacterBackward();
			}
		}

		if (isWhiteSpaceCharacter()) {
			toEndOfWhiteSpaceSequence(moveToNextChar, isLastCharacter);
			if (options.direction === 'forward' && options.to === 'ending') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCellUnderCursor().isEndOfFile) {
					moveOneCharacterBackward();
				}
				
			} else if (options.direction === 'backward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				
				if (!scene.getCellUnderCursor().isBeginningOfFile) {
					moveOneCharacterForward();
				}
			}
		} else {

			if (options.direction === 'forward' && options.to === 'ending') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCellUnderCursor().isEndOfFile) {
					moveOneCharacterBackward();
				}
			} else if (options.direction === 'forward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				toEndOfWhiteSpaceSequence(moveToNextChar, isLastCharacter);
			} else if (options.direction === 'backward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCellUnderCursor().isBeginningOfFile) {
					moveOneCharacterForward();
				}
			}
		}
		if (scene.matrix[cursor.row][cursor.column].isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	}
};


function getCurrentCharacter() {
	return scene.getCellUnderCursor().character;
}

function isWordCharacter(character) {
	return /[A-Za-z_0-9]/.test(character || getCurrentCharacter());
}

function isWhiteSpaceCharacter(character) {
	return /\s/.test(character || getCurrentCharacter());
}

function isOtherCharacter(character) {
	return /[^A-Za-z_0-9\s]/.test(character || getCurrentCharacter());
}

function isEndOfFile() {
	return scene.getCellUnderCursor().isEndOfFile;
}

function isBeginningOfFile() {
	return scene.getCellUnderCursor().isBeginningOfFile;
}

function toEndOfNonWhiteSpaceSequence(moveToNextCharacter, isLastCharacter) {
	if (isWordCharacter()) {
		while (isWordCharacter() && !isLastCharacter()) {
			moveToNextCharacter();
		}
	} else {
		while (isOtherCharacter() && !isLastCharacter()) {
			moveToNextCharacter();
		}
	}
}

function toEndOfWhiteSpaceSequence(moveToNextCharacter, isLastCharacter) {
	while (isWhiteSpaceCharacter() && !isLastCharacter()) {
		moveToNextCharacter();
	}
}

function moveOneCharacterBackward () {
	var previousTextCell = scene.getCellUnderCursor().previousTextCell;
	if (previousTextCell) {
		cursor.column = previousTextCell.column;
		cursor.row = previousTextCell.row;
	} else if (scene.matrix[cursor.row][cursor.column - 1].isText) {
		cursor.column--;
	} else {
		scene.matrix[cursor.row][cursor.column].isBeginningOfFile = true;
	}
}

function moveOneCharacterForward() {
	var nextTextCell = scene.matrix[cursor.row][cursor.column].nextTextCell;
	if (nextTextCell) {
		cursor.column = nextTextCell.column;
		cursor.row = nextTextCell.row;
	} else {
		if (scene.matrix[cursor.row][cursor.column + 1].isText) {
			cursor.column++;
		} else {
			scene.matrix[cursor.row][cursor.column].isEndOfFile = true;
		}
	}
}

function isLastCharacterInWord () {
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var nextTextCell = scene.getCellUnderCursor().nextTextCell;
	if (nextTextCell) {
		return !predicate(nextTextCell.character)
	}

	return !predicate(scene.matrix[cursor.row][cursor.column + 1].character);
}

function isFirstCharacterInWord () {
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var previousTextCell = scene.getCellUnderCursor().previousTextCell;
	if (previousTextCell) {
		return !predicate(previousTextCell.character)
	}

	return !predicate(scene.matrix[cursor.row][cursor.column - 1].character);
}