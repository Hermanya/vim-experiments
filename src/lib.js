var chamber = require('./chamber.js'),
	cursor = require('./cursor.js');

function getCurrentCharacter() {
	return chamber.getCellUnderCursor().character;
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
	return chamber.getCellUnderCursor().isEndOfFile;
}

function isBeginningOfFile() {
	return chamber.getCellUnderCursor().isBeginningOfFile;
}

function toEndOfNonWhiteSpaceSequence(moveToNextCharacter, isLimitingCharacter) {
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;
	while (predicate() && !isLimitingCharacter()) {
		moveToNextCharacter();
	}
}

function toEndOfWhiteSpaceSequence(moveToNextCharacter, isLastCharacter) {
	while (isWhiteSpaceCharacter() && !isLastCharacter()) {
		moveToNextCharacter();
	}
}

function moveOneCharacterBackward () {
	var previousTextCell = chamber.getCellUnderCursor().previousTextCell;
	if (previousTextCell) {
		cursor.column = previousTextCell.column;
		cursor.row = previousTextCell.row;
	} else if (chamber.matrix[cursor.row][cursor.column - 1].isText) {
		cursor.column--;
	} else {
		chamber.matrix[cursor.row][cursor.column].isBeginningOfFile = true;
	}
}

function moveOneCharacterForward() {
	var nextTextCell = chamber.matrix[cursor.row][cursor.column].nextTextCell;
	if (nextTextCell) {
		cursor.column = nextTextCell.column;
		cursor.row = nextTextCell.row;
	} else if (chamber.matrix[cursor.row][cursor.column + 1].isText) {
		cursor.column++;
	} else {
		chamber.matrix[cursor.row][cursor.column].isEndOfFile = true;
	}
	
}

function isLastCharacterInWord () {
	if (isWhiteSpaceCharacter()) {
		return;
	}
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var nextTextCell = chamber.getCellUnderCursor().nextTextCell;
	if (nextTextCell) {
		return !predicate(nextTextCell.character);
	}
	return !predicate(chamber.matrix[cursor.row][cursor.column + 1].character);
}

function isFirstCharacterInWord () {
	if (isWhiteSpaceCharacter()) {
		return;
	}
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var previousTextCell = chamber.getCellUnderCursor().previousTextCell;
	if (previousTextCell) {
		return !predicate(previousTextCell.character);
	}
	return !predicate(chamber.matrix[cursor.row][cursor.column - 1].character);
}

module.exports = {
	'move horizontally': function(options) {
		cursor.saveCurrentPosition();

		cursor.column += options.direction === 'left' ? -1 : 1;
		if (!chamber.getCellUnderCursor().isBlocking()) {
			cursor.forgetColumnForVerticalMovement();
		}

		if (chamber.getCellUnderCursor().isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	},
	'move vertically': function(options) {
		cursor.saveCurrentPosition();

		var matrix = chamber.matrix;
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

		if (chamber.getCellUnderCursor().isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	},
	'move by word': function(options) {
		cursor.saveCurrentPosition();

		if (!chamber.getCellUnderCursor().isText) {
			return;
		}
		var moveToNextChar, moveToPreviousChar, isLimitingCharacter, isLimitingCharacterInWord;
		
		if (options.direction === 'forward') {
			moveToNextChar = moveOneCharacterForward;
			moveToPreviousChar = moveOneCharacterBackward;
			isLimitingCharacter = isEndOfFile;
			isLimitingCharacterInWord = isLastCharacterInWord;
		} else {
			moveToNextChar = moveOneCharacterBackward;
			moveToPreviousChar = moveOneCharacterForward;
			isLimitingCharacter = isBeginningOfFile;
			isLimitingCharacterInWord = isFirstCharacterInWord;
		}

		if (isLimitingCharacterInWord()) {
			moveToNextChar();
		}

		if (options.direction === 'forward' && options.to === 'beginning') {
			toEndOfNonWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
		}
		
		toEndOfWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);

		if (options.direction === 'forward' && options.to === 'ending' ||
			options.direction === 'backward' && options.to === 'beginning') {
			toEndOfNonWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
			if (!isLimitingCharacter()) {
				moveToPreviousChar();
			}
		}

		if (chamber.getCellUnderCursor().isBlocking()) {
			cursor.restoreToSavedPosition();
		}
	}
};