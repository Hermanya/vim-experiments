(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
	isWall: function() {
		return ['+', '-', '|'].indexOf(this.character) !== -1 && !this.isText;
	},
	isLazer: function() {
		return ['V', '^', '>', '<'].indexOf(this.character) !== -1 && !this.isText;
	},
	isLazerBeam: function() {
		return this.isVerticalLazerBeam || this.isHorizontalLazerBeam;
	},
	isBlocking: function() {
		return this.isWall() || this.isLazer() || this.isLazerBeam();
	},
	toString: function() {
		var propertyToClassName = {
				'isText': 'text',
				'isUnderCursor': 'cursor',
				'isVerticalLazerBeam': 'vertical-lazer-beam',
				'isHorizontalLazerBeam': 'horizontal-lazer-beam'
			},
			classNames = Object.keys(propertyToClassName).filter(function(key) {
				return this[key];
			}.bind(this)).map(function(key) {
				return propertyToClassName[key];
			}).join(' ');
			
		return '<span  class="' + classNames + '">' + this.character + '</span>';
	}
};
},{}],2:[function(require,module,exports){
var commands = require('./commands.js');

var commandLine = {
	execute: function() {
		var givenCommand = this.element.value.slice(1); // strip colon
		Object.keys(commands).forEach(function(key) {
			var matches = givenCommand.match(new RegExp(key));
			if (matches) {
				commands[key].apply(this, matches.slice(1)); // strip matching line
			}
		});
	}
};

if (typeof window !== 'undefined') {
	commandLine.element = window.document.querySelector('#command-line');
	commandLine.element.addEventListener('blur', function(e) {
		if (commandLine.element.value) {
			commandLine.element.focus();
		}
	});
	commandLine.element.addEventListener('keypress', function(e) {
		if (e.which === 13) {
			commandLine.execute();
			commandLine.deactivate();
		}
		e.stopPropagation();
	});
	commandLine.element.addEventListener('keyup', function() {
		if (commandLine.element.value === '') {
			commandLine.deactivate();
		}
	})
	commandLine.activate = function() {
		this.element.focus();
	};
	commandLine.deactivate = function() {
		this.element.value = '';
		this.element.blur();
	};
}

module.exports = commandLine;
},{"./commands.js":3}],3:[function(require,module,exports){
var commands = {}, mainFunction;
module.exports = commands;

commands['chamber (\\d+)'] = function(chamberNumber) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState !== 4) {
			return;
		} else if (xmlhttp.status === 200) {
			localStorage.chamber = chamberNumber;
			mainFunction(JSON.parse(xmlhttp.responseText));
		} else if (xmlhttp.status === 404) {
			alert('Out of chambers');
		} else {
			alert(xmlhttp.status);
		}
		
	};
	chamberNumber = chamberNumber || localStorage.chamber || 0;
	xmlhttp.open('GET', './chambers/' + chamberNumber + '.json', true);
	xmlhttp.send();
};

commands.loadNextChamber = function() {
	var nextChamberNumber = Number(localStorage.chamber) + 1;
	commands['chamber (\\d+)'](nextChamberNumber);
};

commands['initialize chamber'] = function(main) {
	mainFunction = main;
	commands['chamber (\\d+)']();
} 
},{}],4:[function(require,module,exports){
var commands = require('./commands.js');
module.exports = {
	score: 0,
	reactOnCurrentCellOnScene: function(scene) {
		var cursor = this,
		cell = scene.getCellUnderCursor(),
		reaction = {
			'*': function() {
				cell.character = ' ';
				cursor.score++;
			},
			'O': function() {
				cursor.hasCompletedLevel = true;
				var congratulationMessage = {
					'0': 'You did it, I am bored watching you.',
					'1': 'Only one pathetic star?',
					'2': 'Did you even try?'
				}[cursor.score] || 'Satisfying performace.';
				if (typeof window !== 'undefined') {
					setTimeout(function() {
						alert(congratulationMessage);
						commands.loadNextChamber();
					}, 0);
				}
			}
		}[cell.character];
		if (!cell.isText && reaction) {
			reaction();
		}
	},
	reset: function() {
		this.hasCompletedLevel = false;
		this.score = 0;
		this.forgetColumnForVerticalMovement();
	},
	rememberColumnForVerticalMovement: function() {
		if (!this.rememberedColumnForVerticalMovement) {
			this.rememberedColumnForVerticalMovement = this.column;
		}
	},
	forgetColumnForVerticalMovement: function() {
		delete this.rememberedColumnForVerticalMovement;
	},
	saveCurrentPosition: function() {
		this.savedColumn = this.column;
		this.savedRow = this.row;
	},
	restoreToSavedPosition: function() {
		this.column = this.savedColumn;
		this.row = this.savedRow;
	}
};
},{"./commands.js":3}],5:[function(require,module,exports){
var lib = require('./lib.js'),
	commandLine = require('./command-line.js'),
	cursor = require('./cursor.js'),
	scene = require('./scene.js');

var keys = {
	'h': function() {
		lib['move horizontally']({
			direction: 'left'
		});
	},
	'l': function() {
		lib['move horizontally']({
			direction: 'right'
		});
	},
	'k': function() {
		lib['move vertically']({
			direction: 'up'
		});
	},
	'j': function() {
		lib['move vertically']({
			direction: 'down'
		});
	},
	':': function() {
		commandLine.activate();
	},
	'w': function() {
		lib['move by word']({
			direction: 'forward',
			to: 'beginning'
		});
	},
	'e': function() {
		lib['move by word']({
			direction: 'forward',
			to: 'ending'
		});
	},
	'b': function() {
		lib['move by word']({
			direction: 'backward',
			to: 'beginning'
		});
	}
};

module.exports = {};

Object.keys(keys).map(function(key) {
	module.exports[key] = function(numberOfTimes) {
		numberOfTimes = numberOfTimes || 1;
		while (numberOfTimes > 0) {
			keys[key]();
			cursor.reactOnCurrentCellOnScene(scene);
			numberOfTimes--;
		}
	}
})
},{"./command-line.js":2,"./cursor.js":4,"./lib.js":6,"./scene.js":8}],6:[function(require,module,exports){
var scene = require('./scene.js'),
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
},{"./cursor.js":4,"./scene.js":8}],7:[function(require,module,exports){
module.exports = {
	fromArrayOfStrings: function (arrayOfStrings) {
		this.matrix = arrayOfStrings.map(function(string) {
			return string.split('');
		});
	},
	map: function(fn) {
		return this.matrix.map(function(array, row) {
			return array.map(function(item, column) {
				return fn(item, row, column);
			});
		});
	},
	getCoordinatesOf: function (thingToFind) {
		var predicate;
		if (typeof thingToFind === 'string') {
			predicate = function(string, anotherString) {
				return string === anotherString;
			};
		}
		if (typeof thingToFind === 'object') {
			predicate = function(thingToFind, anotherObject) {
				return Object.keys(thingToFind).filter(function(key) {
					return thingToFind[key] !== anotherObject[key];
				}).length === 0;

			};
		}
		return this.matrix.reduce(function(found, array, row) {
			array.forEach(function(cell, column) {
				if (predicate(thingToFind, cell)) {
					found.push({
						row: row,
						column: column
					});
				}
			});
			return found;
		}, []);
	}
};
},{}],8:[function(require,module,exports){
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
},{"./cell-decorator.js":1,"./cursor.js":4,"./matrix-decorator.js":7}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kLWxpbmUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jdXJzb3IuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2Zha2VfYzEzM2U0NDAuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2xpYi5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvbWF0cml4LWRlY29yYXRvci5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0aXNXYWxsOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gWycrJywgJy0nLCAnfCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJ1YnLCAnXicsICc+JywgJzwnXS5pbmRleE9mKHRoaXMuY2hhcmFjdGVyKSAhPT0gLTEgJiYgIXRoaXMuaXNUZXh0O1xuXHR9LFxuXHRpc0xhemVyQmVhbTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNWZXJ0aWNhbExhemVyQmVhbSB8fCB0aGlzLmlzSG9yaXpvbnRhbExhemVyQmVhbTtcblx0fSxcblx0aXNCbG9ja2luZzogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNXYWxsKCkgfHwgdGhpcy5pc0xhemVyKCkgfHwgdGhpcy5pc0xhemVyQmVhbSgpO1xuXHR9LFxuXHR0b1N0cmluZzogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHByb3BlcnR5VG9DbGFzc05hbWUgPSB7XG5cdFx0XHRcdCdpc1RleHQnOiAndGV4dCcsXG5cdFx0XHRcdCdpc1VuZGVyQ3Vyc29yJzogJ2N1cnNvcicsXG5cdFx0XHRcdCdpc1ZlcnRpY2FsTGF6ZXJCZWFtJzogJ3ZlcnRpY2FsLWxhemVyLWJlYW0nLFxuXHRcdFx0XHQnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJzogJ2hvcml6b250YWwtbGF6ZXItYmVhbSdcblx0XHRcdH0sXG5cdFx0XHRjbGFzc05hbWVzID0gT2JqZWN0LmtleXMocHJvcGVydHlUb0NsYXNzTmFtZSkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpc1trZXldO1xuXHRcdFx0fS5iaW5kKHRoaXMpKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiBwcm9wZXJ0eVRvQ2xhc3NOYW1lW2tleV07XG5cdFx0XHR9KS5qb2luKCcgJyk7XG5cdFx0XHRcblx0XHRyZXR1cm4gJzxzcGFuICBjbGFzcz1cIicgKyBjbGFzc05hbWVzICsgJ1wiPicgKyB0aGlzLmNoYXJhY3RlciArICc8L3NwYW4+Jztcblx0fVxufTsiLCJ2YXIgY29tbWFuZHMgPSByZXF1aXJlKCcuL2NvbW1hbmRzLmpzJyk7XG5cbnZhciBjb21tYW5kTGluZSA9IHtcblx0ZXhlY3V0ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGdpdmVuQ29tbWFuZCA9IHRoaXMuZWxlbWVudC52YWx1ZS5zbGljZSgxKTsgLy8gc3RyaXAgY29sb25cblx0XHRPYmplY3Qua2V5cyhjb21tYW5kcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdHZhciBtYXRjaGVzID0gZ2l2ZW5Db21tYW5kLm1hdGNoKG5ldyBSZWdFeHAoa2V5KSk7XG5cdFx0XHRpZiAobWF0Y2hlcykge1xuXHRcdFx0XHRjb21tYW5kc1trZXldLmFwcGx5KHRoaXMsIG1hdGNoZXMuc2xpY2UoMSkpOyAvLyBzdHJpcCBtYXRjaGluZyBsaW5lXG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn07XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRjb21tYW5kTGluZS5lbGVtZW50ID0gd2luZG93LmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb21tYW5kLWxpbmUnKTtcblx0Y29tbWFuZExpbmUuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdibHVyJywgZnVuY3Rpb24oZSkge1xuXHRcdGlmIChjb21tYW5kTGluZS5lbGVtZW50LnZhbHVlKSB7XG5cdFx0XHRjb21tYW5kTGluZS5lbGVtZW50LmZvY3VzKCk7XG5cdFx0fVxuXHR9KTtcblx0Y29tbWFuZExpbmUuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoZS53aGljaCA9PT0gMTMpIHtcblx0XHRcdGNvbW1hbmRMaW5lLmV4ZWN1dGUoKTtcblx0XHRcdGNvbW1hbmRMaW5lLmRlYWN0aXZhdGUoKTtcblx0XHR9XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0fSk7XG5cdGNvbW1hbmRMaW5lLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbigpIHtcblx0XHRpZiAoY29tbWFuZExpbmUuZWxlbWVudC52YWx1ZSA9PT0gJycpIHtcblx0XHRcdGNvbW1hbmRMaW5lLmRlYWN0aXZhdGUoKTtcblx0XHR9XG5cdH0pXG5cdGNvbW1hbmRMaW5lLmFjdGl2YXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5lbGVtZW50LmZvY3VzKCk7XG5cdH07XG5cdGNvbW1hbmRMaW5lLmRlYWN0aXZhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmVsZW1lbnQudmFsdWUgPSAnJztcblx0XHR0aGlzLmVsZW1lbnQuYmx1cigpO1xuXHR9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRMaW5lOyIsInZhciBjb21tYW5kcyA9IHt9LCBtYWluRnVuY3Rpb247XG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuXG5jb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddID0gZnVuY3Rpb24oY2hhbWJlck51bWJlcikge1xuXHR2YXIgeG1saHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHR4bWxodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmICh4bWxodHRwLnJlYWR5U3RhdGUgIT09IDQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9IGVsc2UgaWYgKHhtbGh0dHAuc3RhdHVzID09PSAyMDApIHtcblx0XHRcdGxvY2FsU3RvcmFnZS5jaGFtYmVyID0gY2hhbWJlck51bWJlcjtcblx0XHRcdG1haW5GdW5jdGlvbihKU09OLnBhcnNlKHhtbGh0dHAucmVzcG9uc2VUZXh0KSk7XG5cdFx0fSBlbHNlIGlmICh4bWxodHRwLnN0YXR1cyA9PT0gNDA0KSB7XG5cdFx0XHRhbGVydCgnT3V0IG9mIGNoYW1iZXJzJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFsZXJ0KHhtbGh0dHAuc3RhdHVzKTtcblx0XHR9XG5cdFx0XG5cdH07XG5cdGNoYW1iZXJOdW1iZXIgPSBjaGFtYmVyTnVtYmVyIHx8IGxvY2FsU3RvcmFnZS5jaGFtYmVyIHx8IDA7XG5cdHhtbGh0dHAub3BlbignR0VUJywgJy4vY2hhbWJlcnMvJyArIGNoYW1iZXJOdW1iZXIgKyAnLmpzb24nLCB0cnVlKTtcblx0eG1saHR0cC5zZW5kKCk7XG59O1xuXG5jb21tYW5kcy5sb2FkTmV4dENoYW1iZXIgPSBmdW5jdGlvbigpIHtcblx0dmFyIG5leHRDaGFtYmVyTnVtYmVyID0gTnVtYmVyKGxvY2FsU3RvcmFnZS5jaGFtYmVyKSArIDE7XG5cdGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10obmV4dENoYW1iZXJOdW1iZXIpO1xufTtcblxuY29tbWFuZHNbJ2luaXRpYWxpemUgY2hhbWJlciddID0gZnVuY3Rpb24obWFpbikge1xuXHRtYWluRnVuY3Rpb24gPSBtYWluO1xuXHRjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKCk7XG59ICIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuXHRzY29yZTogMCxcblx0cmVhY3RPbkN1cnJlbnRDZWxsT25TY2VuZTogZnVuY3Rpb24oc2NlbmUpIHtcblx0XHR2YXIgY3Vyc29yID0gdGhpcyxcblx0XHRjZWxsID0gc2NlbmUuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCksXG5cdFx0cmVhY3Rpb24gPSB7XG5cdFx0XHQnKic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcgJztcblx0XHRcdFx0Y3Vyc29yLnNjb3JlKys7XG5cdFx0XHR9LFxuXHRcdFx0J08nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y3Vyc29yLmhhc0NvbXBsZXRlZExldmVsID0gdHJ1ZTtcblx0XHRcdFx0dmFyIGNvbmdyYXR1bGF0aW9uTWVzc2FnZSA9IHtcblx0XHRcdFx0XHQnMCc6ICdZb3UgZGlkIGl0LCBJIGFtIGJvcmVkIHdhdGNoaW5nIHlvdS4nLFxuXHRcdFx0XHRcdCcxJzogJ09ubHkgb25lIHBhdGhldGljIHN0YXI/Jyxcblx0XHRcdFx0XHQnMic6ICdEaWQgeW91IGV2ZW4gdHJ5Pydcblx0XHRcdFx0fVtjdXJzb3Iuc2NvcmVdIHx8ICdTYXRpc2Z5aW5nIHBlcmZvcm1hY2UuJztcblx0XHRcdFx0aWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdGFsZXJ0KGNvbmdyYXR1bGF0aW9uTWVzc2FnZSk7XG5cdFx0XHRcdFx0XHRjb21tYW5kcy5sb2FkTmV4dENoYW1iZXIoKTtcblx0XHRcdFx0XHR9LCAwKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1bY2VsbC5jaGFyYWN0ZXJdO1xuXHRcdGlmICghY2VsbC5pc1RleHQgJiYgcmVhY3Rpb24pIHtcblx0XHRcdHJlYWN0aW9uKCk7XG5cdFx0fVxuXHR9LFxuXHRyZXNldDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5oYXNDb21wbGV0ZWRMZXZlbCA9IGZhbHNlO1xuXHRcdHRoaXMuc2NvcmUgPSAwO1xuXHRcdHRoaXMuZm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCgpO1xuXHR9LFxuXHRyZW1lbWJlckNvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICghdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCkge1xuXHRcdFx0dGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCA9IHRoaXMuY29sdW1uO1xuXHRcdH1cblx0fSxcblx0Zm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDogZnVuY3Rpb24oKSB7XG5cdFx0ZGVsZXRlIHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ7XG5cdH0sXG5cdHNhdmVDdXJyZW50UG9zaXRpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc2F2ZWRDb2x1bW4gPSB0aGlzLmNvbHVtbjtcblx0XHR0aGlzLnNhdmVkUm93ID0gdGhpcy5yb3c7XG5cdH0sXG5cdHJlc3RvcmVUb1NhdmVkUG9zaXRpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuY29sdW1uID0gdGhpcy5zYXZlZENvbHVtbjtcblx0XHR0aGlzLnJvdyA9IHRoaXMuc2F2ZWRSb3c7XG5cdH1cbn07IiwidmFyIGxpYiA9IHJlcXVpcmUoJy4vbGliLmpzJyksXG5cdGNvbW1hbmRMaW5lID0gcmVxdWlyZSgnLi9jb21tYW5kLWxpbmUuanMnKSxcblx0Y3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKSxcblx0c2NlbmUgPSByZXF1aXJlKCcuL3NjZW5lLmpzJyk7XG5cbnZhciBrZXlzID0ge1xuXHQnaCc6IGZ1bmN0aW9uKCkge1xuXHRcdGxpYlsnbW92ZSBob3Jpem9udGFsbHknXSh7XG5cdFx0XHRkaXJlY3Rpb246ICdsZWZ0J1xuXHRcdH0pO1xuXHR9LFxuXHQnbCc6IGZ1bmN0aW9uKCkge1xuXHRcdGxpYlsnbW92ZSBob3Jpem9udGFsbHknXSh7XG5cdFx0XHRkaXJlY3Rpb246ICdyaWdodCdcblx0XHR9KTtcblx0fSxcblx0J2snOiBmdW5jdGlvbigpIHtcblx0XHRsaWJbJ21vdmUgdmVydGljYWxseSddKHtcblx0XHRcdGRpcmVjdGlvbjogJ3VwJ1xuXHRcdH0pO1xuXHR9LFxuXHQnaic6IGZ1bmN0aW9uKCkge1xuXHRcdGxpYlsnbW92ZSB2ZXJ0aWNhbGx5J10oe1xuXHRcdFx0ZGlyZWN0aW9uOiAnZG93bidcblx0XHR9KTtcblx0fSxcblx0JzonOiBmdW5jdGlvbigpIHtcblx0XHRjb21tYW5kTGluZS5hY3RpdmF0ZSgpO1xuXHR9LFxuXHQndyc6IGZ1bmN0aW9uKCkge1xuXHRcdGxpYlsnbW92ZSBieSB3b3JkJ10oe1xuXHRcdFx0ZGlyZWN0aW9uOiAnZm9yd2FyZCcsXG5cdFx0XHR0bzogJ2JlZ2lubmluZydcblx0XHR9KTtcblx0fSxcblx0J2UnOiBmdW5jdGlvbigpIHtcblx0XHRsaWJbJ21vdmUgYnkgd29yZCddKHtcblx0XHRcdGRpcmVjdGlvbjogJ2ZvcndhcmQnLFxuXHRcdFx0dG86ICdlbmRpbmcnXG5cdFx0fSk7XG5cdH0sXG5cdCdiJzogZnVuY3Rpb24oKSB7XG5cdFx0bGliWydtb3ZlIGJ5IHdvcmQnXSh7XG5cdFx0XHRkaXJlY3Rpb246ICdiYWNrd2FyZCcsXG5cdFx0XHR0bzogJ2JlZ2lubmluZydcblx0XHR9KTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuT2JqZWN0LmtleXMoa2V5cykubWFwKGZ1bmN0aW9uKGtleSkge1xuXHRtb2R1bGUuZXhwb3J0c1trZXldID0gZnVuY3Rpb24obnVtYmVyT2ZUaW1lcykge1xuXHRcdG51bWJlck9mVGltZXMgPSBudW1iZXJPZlRpbWVzIHx8IDE7XG5cdFx0d2hpbGUgKG51bWJlck9mVGltZXMgPiAwKSB7XG5cdFx0XHRrZXlzW2tleV0oKTtcblx0XHRcdGN1cnNvci5yZWFjdE9uQ3VycmVudENlbGxPblNjZW5lKHNjZW5lKTtcblx0XHRcdG51bWJlck9mVGltZXMtLTtcblx0XHR9XG5cdH1cbn0pIiwidmFyIHNjZW5lID0gcmVxdWlyZSgnLi9zY2VuZS5qcycpLFxuXHRjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xuXG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdCdtb3ZlIGhvcml6b250YWxseSc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgbWF0cml4ID0gc2NlbmUubWF0cml4O1xuXHRcdHZhciBfY29sdW1uID0gY3Vyc29yLmNvbHVtbiArIChvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2xlZnQnID8gLTEgOiAxKTtcblxuXHRcdGlmICghbWF0cml4W2N1cnNvci5yb3ddW19jb2x1bW5dLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0Y3Vyc29yLmNvbHVtbiA9IF9jb2x1bW47XG5cdFx0XHRjdXJzb3IuZm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCgpO1xuXHRcdH1cblx0fSxcblx0J21vdmUgdmVydGljYWxseSc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0XHR2YXIgbWF0cml4ID0gc2NlbmUubWF0cml4O1xuXHRcdGN1cnNvci5zYXZlQ3VycmVudFBvc2l0aW9uKCk7XG5cdFx0Y3Vyc29yLnJlbWVtYmVyQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCgpO1xuXHRcdHZhciBzdGVwc0FzaWRlID0gMCxcblx0XHRcdHNpZ24gPSBvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ3VwJyA/IC0xIDogMTtcblx0XHRpZiAoIW1hdHJpeFtjdXJzb3Iucm93ICsgMSAqIHNpZ25dW2N1cnNvci5jb2x1bW5dLmlzV2FsbCgpKSB7XG5cdFx0XHR3aGlsZSAoIW1hdHJpeFtjdXJzb3Iucm93ICsgMSAqIHNpZ25dW2N1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlICsgMV0uaXNXYWxsKCkgJiZcblx0XHRcdCBjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZSA8IGN1cnNvci5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCkge1xuXHRcdFx0XHRzdGVwc0FzaWRlKys7XG5cdFx0XHR9XG5cdFx0XHRjdXJzb3IuY29sdW1uICs9IHN0ZXBzQXNpZGU7XG5cdFx0XHRjdXJzb3Iucm93ICs9IDEgKiBzaWduO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR3aGlsZSAoIW1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZV0uaXNCbG9ja2luZygpKSB7XG5cdFx0XHRcdGlmICghbWF0cml4W2N1cnNvci5yb3cgKyAxICogc2lnbl1bY3Vyc29yLmNvbHVtbiArIHN0ZXBzQXNpZGVdLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0XHRcdGN1cnNvci5yb3cgKz0gMSAqIHNpZ247XG5cdFx0XHRcdFx0Y3Vyc29yLmNvbHVtbiArPSBzdGVwc0FzaWRlO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHN0ZXBzQXNpZGUtLTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAobWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0Y3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcblx0XHR9XG5cdH0sXG5cdCdtb3ZlIGJ5IHdvcmQnOiBmdW5jdGlvbihvcHRpb25zKSB7XG5cdFx0aWYgKCFzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc1RleHQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXI7XG5cdFx0Y3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblx0XHRcblx0XHRpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdmb3J3YXJkJykge1xuXHRcdFx0bW92ZVRvTmV4dENoYXIgPSBtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZDtcblx0XHRcdGlzTGFzdENoYXJhY3RlciA9IGlzRW5kT2ZGaWxlO1xuXHRcdFx0aWYgKCFpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSAmJiBpc0xhc3RDaGFyYWN0ZXJJbldvcmQoKSkge1xuXHRcdFx0XHRtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZCgpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRtb3ZlVG9OZXh0Q2hhciA9IG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZDtcblx0XHRcdGlzTGFzdENoYXJhY3RlciA9IGlzQmVnaW5uaW5nT2ZGaWxlO1xuXHRcdFx0aWYgKCFpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSAmJiBpc0ZpcnN0Q2hhcmFjdGVySW5Xb3JkKCkpIHtcblx0XHRcdFx0bW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGlzV2hpdGVTcGFjZUNoYXJhY3RlcigpKSB7XG5cdFx0XHR0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0aWYgKG9wdGlvbnMuZGlyZWN0aW9uID09PSAnZm9yd2FyZCcgJiYgb3B0aW9ucy50byA9PT0gJ2VuZGluZycpIHtcblx0XHRcdFx0dG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMYXN0Q2hhcmFjdGVyKTtcblx0XHRcdFx0aWYgKCFzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0VuZE9mRmlsZSkge1xuXHRcdFx0XHRcdG1vdmVPbmVDaGFyYWN0ZXJCYWNrd2FyZCgpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdFxuXHRcdFx0fSBlbHNlIGlmIChvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2JhY2t3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnYmVnaW5uaW5nJykge1xuXHRcdFx0XHR0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCFzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0JlZ2lubmluZ09mRmlsZSkge1xuXHRcdFx0XHRcdG1vdmVPbmVDaGFyYWN0ZXJGb3J3YXJkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdmb3J3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnZW5kaW5nJykge1xuXHRcdFx0XHR0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0XHRpZiAoIXNjZW5lLmdldENlbGxVbmRlckN1cnNvcigpLmlzRW5kT2ZGaWxlKSB7XG5cdFx0XHRcdFx0bW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAob3B0aW9ucy5kaXJlY3Rpb24gPT09ICdmb3J3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnYmVnaW5uaW5nJykge1xuXHRcdFx0XHR0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0XHR0b0VuZE9mV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0fSBlbHNlIGlmIChvcHRpb25zLmRpcmVjdGlvbiA9PT0gJ2JhY2t3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnYmVnaW5uaW5nJykge1xuXHRcdFx0XHR0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xhc3RDaGFyYWN0ZXIpO1xuXHRcdFx0XHRpZiAoIXNjZW5lLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmVnaW5uaW5nT2ZGaWxlKSB7XG5cdFx0XHRcdFx0bW92ZU9uZUNoYXJhY3RlckZvcndhcmQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoc2NlbmUubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0Y3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcblx0XHR9XG5cdH1cbn07XG5cblxuZnVuY3Rpb24gZ2V0Q3VycmVudENoYXJhY3RlcigpIHtcblx0cmV0dXJuIHNjZW5lLmdldENlbGxVbmRlckN1cnNvcigpLmNoYXJhY3Rlcjtcbn1cblxuZnVuY3Rpb24gaXNXb3JkQ2hhcmFjdGVyKGNoYXJhY3Rlcikge1xuXHRyZXR1cm4gL1tBLVphLXpfMC05XS8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNXaGl0ZVNwYWNlQ2hhcmFjdGVyKGNoYXJhY3Rlcikge1xuXHRyZXR1cm4gL1xccy8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNPdGhlckNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcblx0cmV0dXJuIC9bXkEtWmEtel8wLTlcXHNdLy50ZXN0KGNoYXJhY3RlciB8fCBnZXRDdXJyZW50Q2hhcmFjdGVyKCkpO1xufVxuXG5mdW5jdGlvbiBpc0VuZE9mRmlsZSgpIHtcblx0cmV0dXJuIHNjZW5lLmdldENlbGxVbmRlckN1cnNvcigpLmlzRW5kT2ZGaWxlO1xufVxuXG5mdW5jdGlvbiBpc0JlZ2lubmluZ09mRmlsZSgpIHtcblx0cmV0dXJuIHNjZW5lLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmVnaW5uaW5nT2ZGaWxlO1xufVxuXG5mdW5jdGlvbiB0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyYWN0ZXIsIGlzTGFzdENoYXJhY3Rlcikge1xuXHRpZiAoaXNXb3JkQ2hhcmFjdGVyKCkpIHtcblx0XHR3aGlsZSAoaXNXb3JkQ2hhcmFjdGVyKCkgJiYgIWlzTGFzdENoYXJhY3RlcigpKSB7XG5cdFx0XHRtb3ZlVG9OZXh0Q2hhcmFjdGVyKCk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdHdoaWxlIChpc090aGVyQ2hhcmFjdGVyKCkgJiYgIWlzTGFzdENoYXJhY3RlcigpKSB7XG5cdFx0XHRtb3ZlVG9OZXh0Q2hhcmFjdGVyKCk7XG5cdFx0fVxuXHR9XG59XG5cbmZ1bmN0aW9uIHRvRW5kT2ZXaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXJhY3RlciwgaXNMYXN0Q2hhcmFjdGVyKSB7XG5cdHdoaWxlIChpc1doaXRlU3BhY2VDaGFyYWN0ZXIoKSAmJiAhaXNMYXN0Q2hhcmFjdGVyKCkpIHtcblx0XHRtb3ZlVG9OZXh0Q2hhcmFjdGVyKCk7XG5cdH1cbn1cblxuZnVuY3Rpb24gbW92ZU9uZUNoYXJhY3RlckJhY2t3YXJkICgpIHtcblx0dmFyIHByZXZpb3VzVGV4dENlbGwgPSBzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5wcmV2aW91c1RleHRDZWxsO1xuXHRpZiAocHJldmlvdXNUZXh0Q2VsbCkge1xuXHRcdGN1cnNvci5jb2x1bW4gPSBwcmV2aW91c1RleHRDZWxsLmNvbHVtbjtcblx0XHRjdXJzb3Iucm93ID0gcHJldmlvdXNUZXh0Q2VsbC5yb3c7XG5cdH0gZWxzZSBpZiAoc2NlbmUubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW4gLSAxXS5pc1RleHQpIHtcblx0XHRjdXJzb3IuY29sdW1uLS07XG5cdH0gZWxzZSB7XG5cdFx0c2NlbmUubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dLmlzQmVnaW5uaW5nT2ZGaWxlID0gdHJ1ZTtcblx0fVxufVxuXG5mdW5jdGlvbiBtb3ZlT25lQ2hhcmFjdGVyRm9yd2FyZCgpIHtcblx0dmFyIG5leHRUZXh0Q2VsbCA9IHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXS5uZXh0VGV4dENlbGw7XG5cdGlmIChuZXh0VGV4dENlbGwpIHtcblx0XHRjdXJzb3IuY29sdW1uID0gbmV4dFRleHRDZWxsLmNvbHVtbjtcblx0XHRjdXJzb3Iucm93ID0gbmV4dFRleHRDZWxsLnJvdztcblx0fSBlbHNlIHtcblx0XHRpZiAoc2NlbmUubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW4gKyAxXS5pc1RleHQpIHtcblx0XHRcdGN1cnNvci5jb2x1bW4rKztcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2NlbmUubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dLmlzRW5kT2ZGaWxlID0gdHJ1ZTtcblx0XHR9XG5cdH1cbn1cblxuZnVuY3Rpb24gaXNMYXN0Q2hhcmFjdGVySW5Xb3JkICgpIHtcblx0dmFyIHByZWRpY2F0ZSA9IGlzV29yZENoYXJhY3RlcigpID8gaXNXb3JkQ2hhcmFjdGVyIDogaXNPdGhlckNoYXJhY3RlcjtcblxuXHR2YXIgbmV4dFRleHRDZWxsID0gc2NlbmUuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkubmV4dFRleHRDZWxsO1xuXHRpZiAobmV4dFRleHRDZWxsKSB7XG5cdFx0cmV0dXJuICFwcmVkaWNhdGUobmV4dFRleHRDZWxsLmNoYXJhY3Rlcilcblx0fVxuXG5cdHJldHVybiAhcHJlZGljYXRlKHNjZW5lLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uICsgMV0uY2hhcmFjdGVyKTtcbn1cblxuZnVuY3Rpb24gaXNGaXJzdENoYXJhY3RlckluV29yZCAoKSB7XG5cdHZhciBwcmVkaWNhdGUgPSBpc1dvcmRDaGFyYWN0ZXIoKSA/IGlzV29yZENoYXJhY3RlciA6IGlzT3RoZXJDaGFyYWN0ZXI7XG5cblx0dmFyIHByZXZpb3VzVGV4dENlbGwgPSBzY2VuZS5nZXRDZWxsVW5kZXJDdXJzb3IoKS5wcmV2aW91c1RleHRDZWxsO1xuXHRpZiAocHJldmlvdXNUZXh0Q2VsbCkge1xuXHRcdHJldHVybiAhcHJlZGljYXRlKHByZXZpb3VzVGV4dENlbGwuY2hhcmFjdGVyKVxuXHR9XG5cblx0cmV0dXJuICFwcmVkaWNhdGUoc2NlbmUubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW4gLSAxXS5jaGFyYWN0ZXIpO1xufSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRmcm9tQXJyYXlPZlN0cmluZ3M6IGZ1bmN0aW9uIChhcnJheU9mU3RyaW5ncykge1xuXHRcdHRoaXMubWF0cml4ID0gYXJyYXlPZlN0cmluZ3MubWFwKGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHN0cmluZy5zcGxpdCgnJyk7XG5cdFx0fSk7XG5cdH0sXG5cdG1hcDogZnVuY3Rpb24oZm4pIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRyaXgubWFwKGZ1bmN0aW9uKGFycmF5LCByb3cpIHtcblx0XHRcdHJldHVybiBhcnJheS5tYXAoZnVuY3Rpb24oaXRlbSwgY29sdW1uKSB7XG5cdFx0XHRcdHJldHVybiBmbihpdGVtLCByb3csIGNvbHVtbik7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblx0Z2V0Q29vcmRpbmF0ZXNPZjogZnVuY3Rpb24gKHRoaW5nVG9GaW5kKSB7XG5cdFx0dmFyIHByZWRpY2F0ZTtcblx0XHRpZiAodHlwZW9mIHRoaW5nVG9GaW5kID09PSAnc3RyaW5nJykge1xuXHRcdFx0cHJlZGljYXRlID0gZnVuY3Rpb24oc3RyaW5nLCBhbm90aGVyU3RyaW5nKSB7XG5cdFx0XHRcdHJldHVybiBzdHJpbmcgPT09IGFub3RoZXJTdHJpbmc7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHRoaW5nVG9GaW5kID09PSAnb2JqZWN0Jykge1xuXHRcdFx0cHJlZGljYXRlID0gZnVuY3Rpb24odGhpbmdUb0ZpbmQsIGFub3RoZXJPYmplY3QpIHtcblx0XHRcdFx0cmV0dXJuIE9iamVjdC5rZXlzKHRoaW5nVG9GaW5kKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaW5nVG9GaW5kW2tleV0gIT09IGFub3RoZXJPYmplY3Rba2V5XTtcblx0XHRcdFx0fSkubGVuZ3RoID09PSAwO1xuXG5cdFx0XHR9O1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5tYXRyaXgucmVkdWNlKGZ1bmN0aW9uKGZvdW5kLCBhcnJheSwgcm93KSB7XG5cdFx0XHRhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwsIGNvbHVtbikge1xuXHRcdFx0XHRpZiAocHJlZGljYXRlKHRoaW5nVG9GaW5kLCBjZWxsKSkge1xuXHRcdFx0XHRcdGZvdW5kLnB1c2goe1xuXHRcdFx0XHRcdFx0cm93OiByb3csXG5cdFx0XHRcdFx0XHRjb2x1bW46IGNvbHVtblxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmb3VuZDtcblx0XHR9LCBbXSk7XG5cdH1cbn07IiwidmFyIG1hdHJpeERlY29yYXRvciA9IHJlcXVpcmUoJy4vbWF0cml4LWRlY29yYXRvci5qcycpLFxuXHRjZWxsRGVjb3JhdG9yID0gcmVxdWlyZSgnLi9jZWxsLWRlY29yYXRvci5qcycpLFxuXHRjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xuXG52YXIgc2NlbmUgPSBPYmplY3QuY3JlYXRlKG1hdHJpeERlY29yYXRvcik7XG5cbnNjZW5lLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuXHR0aGlzLmZyb21BcnJheU9mU3RyaW5ncyhqc29uLnNjZW5lKTtcblx0T2JqZWN0LmtleXMoanNvbikuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdHJldHVybiBrZXkgIT09ICdzY2VuZSdcblx0fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHR0aGlzW2tleV0gPSBqc29uW2tleV07XG5cdH0pXG59O1xuXG5zY2VuZS5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMoKTtcblx0dGhpcy5tYXJrVGV4dCgpO1xuXHR0aGlzLm1hcmtMYXplcnMoKTtcblx0dGhpcy5tYXJrQ3Vyc29yKCk7XG59O1xuXG5zY2VuZS5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgc2NlbmUgPSB0aGlzO1xuXHRzY2VuZS5tYXRyaXggPSBzY2VuZS5tYXAoZnVuY3Rpb24oY2hhcmFjdGVyLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjaGFyYWN0ZXIgPT09ICdAJykge1xuXHRcdFx0c2NlbmUuc3Bhd25Qb3NpdGlvbiA9IHtcblx0XHRcdFx0cm93OiByb3csXG5cdFx0XHRcdGNvbHVtbjogY29sdW1uXG5cdFx0XHR9XG5cdFx0fVxuXHRcdHZhciBjZWxsID0gT2JqZWN0LmNyZWF0ZShjZWxsRGVjb3JhdG9yKTtcblx0XHRjZWxsLnJvdyA9IHJvdztcblx0XHRjZWxsLmNvbHVtbiA9IGNvbHVtbjtcblx0XHRjZWxsLmNoYXJhY3RlciA9IGNoYXJhY3Rlcjtcblx0XHRyZXR1cm4gY2VsbDtcblx0fSwgc2NlbmUpO1xufTtcblxuc2NlbmUubWFya0N1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRjdXJzb3IucmVzZXQoKTtcblx0Y3Vyc29yLmNvbHVtbiA9IHRoaXMuc3Bhd25Qb3NpdGlvbi5jb2x1bW47XG5cdGN1cnNvci5yb3cgPSB0aGlzLnNwYXduUG9zaXRpb24ucm93O1xufTtcblxuc2NlbmUubWFya1RleHQgPSBmdW5jdGlvbigpIHtcblx0dmFyIGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2UsXG5cdFx0bGFzdENlbGxJblNlcXVlbmNlO1xuXHR0aGlzLm1hdHJpeCA9IHRoaXMubWFwKGZ1bmN0aW9uKGNlbGwsIHJvdywgY29sdW1uKSB7XG5cdFx0aWYgKGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzKSB7XG5cdFx0XHRpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0XHRpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSBzY2VuZS5tYXRyaXhbcm93XVtjb2x1bW4gLSAxXTtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjZWxsLmlzVGV4dCA9IHRydWU7XG5cdFx0XHRcdGlmIChsYXN0Q2VsbEluU2VxdWVuY2UpIHtcblx0XHRcdFx0XHRpZiAoTWF0aC5hYnMobGFzdENlbGxJblNlcXVlbmNlLnJvdyAtIGNlbGwucm93KSA9PT0gMSkge1xuXHRcdFx0XHRcdFx0Y2VsbC5wcmV2aW91c1RleHRDZWxsID0gbGFzdENlbGxJblNlcXVlbmNlO1xuXHRcdFx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlLm5leHRUZXh0Q2VsbCA9IGNlbGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0XHRpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IHRydWU7XG5cdFx0XHRcdGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuXG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHR9XG5cblx0XHR9XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuc2NlbmUubWFya0xhemVycyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbWF0cml4ID0gdGhpcy5tYXRyaXg7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHR2YXIgY29udGludWVCZWFtLFxuXHRcdFx0Y2hhcmFjdGVyID0gY2VsbC5jaGFyYWN0ZXIsXG5cdFx0XHRpc1ZlcnRpY2FsTGF6ZXJCZWFtID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBbJzwnLCc+J10uaW5kZXhPZihjaGFyYWN0ZXIpID09PSAtMTtcblx0XHRcdH0sXG5cdFx0XHRiZWFtUHJvcGVydHkgPSBpc1ZlcnRpY2FsTGF6ZXJCZWFtKCkgPyAnaXNWZXJ0aWNhbExhemVyQmVhbScgOiAnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJztcblx0XHRcdGlzQmVhbUNvbnRpbnVpbmcgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNMYXplckJlYW0oKSB8fCAhbWF0cml4W3Jvd11bY29sdW1uXS5pc0Jsb2NraW5nKCk7XG5cdFx0XHR9LFxuXHRcdFx0bmV4dENlbGwgPSB7XG5cdFx0XHRcdCdWJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3crK11bY29sdW1uXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0J14nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvdy0tXVtjb2x1bW5dO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnPic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW4rK107XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc8JzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbi0tXTtcblx0XHRcdFx0fVxuXHRcdFx0fVtjaGFyYWN0ZXJdO1xuXHRcdGlmIChuZXh0Q2VsbCkge1xuXHRcdFx0bmV4dENlbGwoKTtcblx0XHRcdHdoaWxlIChpc0JlYW1Db250aW51aW5nKCkpIHtcblx0XHRcdFx0bmV4dENlbGwoKVtiZWFtUHJvcGVydHldID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuc2NlbmUuZ2V0Q2VsbFVuZGVyQ3Vyc29yID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uXTtcbn07XG5cbnNjZW5lLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzY2VuZScpO1xuXHRlbGVtZW50LmlubmVySFRNTCA9IHNjZW5lLm1hdHJpeC5tYXAoZnVuY3Rpb24oYXJyYXkpIHtcblx0XHRhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwpIHtcblx0XHRcdGNlbGwuaXNVbmRlckN1cnNvciA9IGNlbGwucm93ID09PSBjdXJzb3Iucm93ICYmIGNlbGwuY29sdW1uID09PSBjdXJzb3IuY29sdW1uO1xuXHRcdH0pXG5cdFx0cmV0dXJuIGFycmF5LmpvaW4oJycpO1xuXHR9KS5qb2luKCc8YnI+Jyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHNjZW5lOyJdfQ==
