var scene = require('./scene.js'),
	cursor = require('./cursor.js');



module.exports = {
	'move horizontally': function(options) {
		var matrix = scene.matrix;
		var _column = cursor.column + (options.direction === 'left' ? -1 : 1);

		if (!matrix[cursor.row][_column].isBlocking()) {
			cursor.column = _column;
			cursor.forgetColumn();
		}
	},
	'move vertically': function(options) {
		var matrix = scene.matrix;
		cursor.save();
		cursor.rememberColumn();
		var stepsAside = 0,
			sign = options.direction === 'up' ? -1 : 1;
		if (!matrix[cursor.row + 1 * sign][cursor.column].isWall()) {
			while (!matrix[cursor.row + 1 * sign][cursor.column + stepsAside + 1].isWall() &&
			 cursor.column + stepsAside < cursor.rememberedColumn) {
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
			cursor.restore();
		}
	},
	'move by word': function(options) {
		if (!scene.getCurrentCell().isText) {
			return;
		}
		var moveToNextChar, isLastCharacter;
		cursor.save();
		
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
				if (!scene.getCurrentCell().isEndOfFile) {
					moveOneCharacterBackward();
				}
				
			} else if (options.direction === 'backward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				
				if (!scene.getCurrentCell().isBeginningOfFile) {
					moveOneCharacterForward();
				}
			}
		} else {

			if (options.direction === 'forward' && options.to === 'ending') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCurrentCell().isEndOfFile) {
					moveOneCharacterBackward();
				}
			} else if (options.direction === 'forward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				toEndOfWhiteSpaceSequence(moveToNextChar, isLastCharacter);
			} else if (options.direction === 'backward' && options.to === 'beginning') {
				toEndOfNonWhiteSpaceSequence(moveToNextChar, isLastCharacter);
				if (!scene.getCurrentCell().isBeginningOfFile) {
					moveOneCharacterForward();
				}
			}
		}
		if (scene.matrix[cursor.row][cursor.column].isBlocking()) {
			cursor.restore();
		}
	}
};


function getCurrentCharacter() {
	return scene.getCurrentCell().character;
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
	return scene.getCurrentCell().isEndOfFile;
}

function isBeginningOfFile() {
	return scene.getCurrentCell().isBeginningOfFile;
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
	var previousTextCell = scene.getCurrentCell().previousTextCell;
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

	var nextTextCell = scene.getCurrentCell().nextTextCell;
	if (nextTextCell) {
		return !predicate(nextTextCell.character)
	}

	return !predicate(scene.matrix[cursor.row][cursor.column + 1].character);
}

function isFirstCharacterInWord () {
	var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;

	var previousTextCell = scene.getCurrentCell().previousTextCell;
	if (previousTextCell) {
		return !predicate(previousTextCell.character)
	}

	return !predicate(scene.matrix[cursor.row][cursor.column - 1].character);
}