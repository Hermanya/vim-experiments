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
	toString: function(configuration) {
		var propertyToClassName = {
				'isText': 'text',
				'isUnderCursor': 'cursor',
				'isVerticalLazerBeam': 'vertical-lazer-beam',
				'isHorizontalLazerBeam': 'horizontal-lazer-beam',
				'isUnderTurretFire': 'turret-fire'
			},
			classNames = Object.keys(propertyToClassName).filter(function(key) {
				return this[key];
			}.bind(this)).map(function(key) {
				return propertyToClassName[key];
			}).join(' ');
        if (this.lineNumber) {
            this.character = configuration['display line numbers'] ? this.lineNumber : ' ';
        }

		return '<span  class="' + classNames + '">' + this.character + '</span>';
	}
};

},{}],2:[function(require,module,exports){
var matrixDecorator = require('./matrix-decorator.js'),
	cellDecorator = require('./cell-decorator.js'),
	turretDecorator = require('./turret-decorator.js'),
	cursor = require('./cursor.js');

var chamber = Object.create(matrixDecorator);

chamber.fromJSON = function(json) {
	this.fromArrayOfStrings(json.scene);
	Object.keys(json).filter(function(key) {
		return key !== 'scene';
	}).forEach(function(key) {
		this[key] = json[key];
	}.bind(this));
    this.configuration = json.configuration || {};
};

chamber.initialize = function() {
	this.replaceCharactersWithCells();
	this.markText();
	this.markLazers();
	this.markCursor();
	this.markTurrets();
};

chamber.replaceCharactersWithCells = function() {
	var chamber = this;
	chamber.matrix = chamber.map(function(character, row, column) {
		if (character === '@') {
			chamber.spawnPosition = {
				row: row,
				column: column
			};
		}
		var cell = Object.create(cellDecorator);
		cell.row = row;
		cell.column = column;
		cell.character = character;
		return cell;
	});
};

chamber.markCursor = function() {
	cursor.reset();
	cursor.setPositionFrom(this.spawnPosition);
};

chamber.markText = function() {
	var isSequenceOfTextInProgress = false,
		lastCellInSequence,
        previousBeginningOfLine;
	this.matrix = this.map(function(cell, row, column) {
		if (isSequenceOfTextInProgress) {
			if (cell.character === '`') {
				isSequenceOfTextInProgress = false;
				lastCellInSequence = chamber.matrix[row][column - 1];
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
		} else if (cell.character === '`') {
			isSequenceOfTextInProgress = true;
            previousBeginningOfLine = chamber.matrix[row - 1][column];
            if (previousBeginningOfLine.lineNumber) {
                cell.lineNumber = previousBeginningOfLine.lineNumber + 1;
            } else {
                lastCellInSequence = undefined;
                cell.lineNumber = 1;
            }
		}

		return cell;
	});
};

chamber.markLazers = function() {
	var matrix = this.matrix;
	this.matrix = this.map(function(cell, row, column) {
		var character = cell.character,
			isVerticalLazerBeam = function() {
				return ['<','>'].indexOf(character) === -1;
			},
			beamProperty = isVerticalLazerBeam() ? 'isVerticalLazerBeam' : 'isHorizontalLazerBeam',
			isBeamContinuing = function() {
				return matrix[row][column].isLazerBeam() || !matrix[row][column].isBlocking();
			},
			next = {
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
		if (next) {
			next();
			while (isBeamContinuing()) {
				next()[beamProperty] = true;
			}
		}
		return cell;
	});
};

chamber.markTurrets = function() {
	var chamber = this;
	this.turrets = [];
	this.matrix = this.map(function(cell, row, column) {
		if (cell.character === '&') {
			var turret = Object.create(turretDecorator);
			turret.row = row;
			turret.column = column;
			turret.cell = cell;
			chamber.turrets.push(turret);
		}
		return cell;
	});
};

chamber.getCellUnderCursor = function() {
	return this.matrix[cursor.row][cursor.column];
};

chamber.render = function() {
	var element = document.querySelector('#scene');
	element.innerHTML = chamber.matrix.map(function(array) {
		array = array.map(function(cell) {
			cell.isUnderCursor = cell.row === cursor.row && cell.column === cursor.column;
            cell = cell.toString(chamber.configuration);
            return cell;
		});
		return array.join('');
	}).join('<br>');
};

chamber.actOnCursor = function() {
	this.turrets.forEach(function(turret) {
		turret.findAndTryToKill(cursor, chamber);
	});
};

module.exports = chamber;

},{"./cell-decorator.js":1,"./cursor.js":5,"./matrix-decorator.js":7,"./turret-decorator.js":10}],3:[function(require,module,exports){
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
	commandLine.element.addEventListener('blur', function() {
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
	});
	commandLine.activate = function() {
		this.element.focus();
	};
	commandLine.deactivate = function() {
		this.element.value = '';
		this.element.blur();
	};
}

module.exports = commandLine;
},{"./commands.js":4}],4:[function(require,module,exports){
var commands = {},
    mainFunction,
    printText = require('./print.js');
module.exports = commands;

commands['chamber (\\d+)'] = function(chamberNumber) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState !== 4) {
            return;
        }
        var defaultAction = function() {
                window.alert(xmlhttp.status);
            },
            action = {
                '200': function() {
                    localStorage.chamber = chamberNumber;
                    try {
                        mainFunction(JSON.parse(xmlhttp.responseText));
                    } catch (_) {
                        action['404']();
                    }
                },
                '404': function() {
                    window.alert('This is the last chamber at this moment. ' +
                        'Next you are going to be redirected to the repo of this game. ' +
                        'Let me know your favorite VIM features which are missing.');
                    window.location.href = 'https://github.com/hermanya/vim-experiments';
                }
            }[xmlhttp.status] || defaultAction;
        action();

    };
    chamberNumber = chamberNumber || localStorage.chamber || 0;
    xmlhttp.open('GET', './chambers/' + chamberNumber + '.json', true);
    xmlhttp.send();
};

commands['set number'] = function() {
    require('./chamber.js').configuration['display line numbers'] = true;
    require('./chamber.js').render();
};
commands['set nu'] = commands['set number'];

commands['set nonumber'] = function() {
    require('./chamber.js').configuration['display line numbers'] = false;
    require('./chamber.js').render();
};
commands['set nonu'] = commands['set nonumber'];

commands['cake is a lie'] = function() {
    require('./chamber.js').configuration['killing mode on'] = true;
    printText(['','Now you are going to die. Every time.','']);
};

commands.loadNextChamber = function() {
    var nextChamberNumber = Number(localStorage.chamber) + 1;
    commands['chamber (\\d+)'](nextChamberNumber);
};

commands['initialize chamber'] = function(main) {
    mainFunction = main;
    commands['chamber (\\d+)']();
};

},{"./chamber.js":2,"./print.js":9}],5:[function(require,module,exports){
var commands = require('./commands.js'),
    printText = require('./print.js');
module.exports = {
    score: 0,
    actOnCurrentCell: function(chamber) {
        var cursor = this,
            cell = chamber.getCellUnderCursor(),
            action = {
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
                        printText(['', congratulationMessage, '']);
                        commands.loadNextChamber();
                    }
                },
                '&': function() {
                    cell.isDeactivatedTurret = true;
                    cell.character = ' <div class="deactivated-turret">&</div>';
                }
            }[cell.character];
        if (!cell.isText && action) {
            action();
        }
    },
    reset: function() {
        this.hasCompletedLevel = false;
        this.score = 0;
        this.forgetColumnForVerticalMovement();
    },
    setPositionFrom: function(anotherObject) {
        this.column = anotherObject.column;
        this.row = anotherObject.row;
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

},{"./commands.js":4,"./print.js":9}],6:[function(require,module,exports){
var lib = require('./movements.js'),
    commandLine = require('./command-line.js'),
    cursor = require('./cursor.js'),
    chamber = require('./chamber.js'),
    keylog = [];

var repeatable = {
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
},

other = {
    ':': function() {
        commandLine.activate();
    },
    'G': function(proceedingNumber) {
        if (proceedingNumber) {
            lib['move to beginning of line number']({
                lineNumber: proceedingNumber
            });
        } else {
            lib['move to end of text']({
                direction: 'forward'
            });
        }
    },
    'g': function() {
        if (keylog[keylog.length - 1] === 'g') {
            lib['move to end of text']({
                direction: 'backward'
            });
        }

    },
    '$': function() {
        lib['move to end of line']({
            direction: 'forward'
        });
    },
    '0': function() {
        lib['move to end of line']({
            direction: 'backward'
        });
    }
};

function getNumberFromLog() {
    var digits = [],
        lastLogEntry = keylog.pop();
    while (/\d/.test(lastLogEntry)) {
        digits.push(lastLogEntry);
        lastLogEntry = keylog.pop();
    }
    keylog.push(lastLogEntry);
    return parseInt(digits.reverse().join(''));
}

function getNiceArrayOfCharacters (args) {
    return [].slice.call(args, 0).join('').split('');
}

function logKey(/*characters*/) {
    var characters = getNiceArrayOfCharacters(arguments);
    characters.forEach(function(character) {
        var proceedingNumber, numberOfTimesRemaining;
        if (/[^\d]/.test(character)) {
            proceedingNumber = numberOfTimesRemaining = getNumberFromLog();
            numberOfTimesRemaining = numberOfTimesRemaining || 1;
        }

        if (repeatable[character]) {
            while (numberOfTimesRemaining-- > 0) {
                repeatable[character]();
            }
        }
        if (other[character]) {
            other[character](proceedingNumber);
        }
        cursor.actOnCurrentCell(chamber);
        chamber.actOnCursor();
        keylog.push(character);
    });
    return logKey;
}

module.exports = logKey;

},{"./chamber.js":2,"./command-line.js":3,"./cursor.js":5,"./movements.js":8}],7:[function(require,module,exports){
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

function getAdjacentTextCellInSameLine(forwardOrBackward) {
    var adjacentColumn, cell;
    if (forwardOrBackward === 'forward') {
        adjacentColumn = cursor.column + 1;
    } else {
        adjacentColumn = cursor.column - 1;
    }
    cell = chamber.matrix[cursor.row][adjacentColumn];
    if (cell.isText) {
        return cell;
    }
}

function getAdjacentTextCellInAnotherLine(forwardOrBackward) {
    var linkToAdjacentCell = forwardOrBackward === 'forward' ? 'nextTextCell' : 'previousTextCell';
    return chamber.getCellUnderCursor()[linkToAdjacentCell];
}

function getAdjacentTextCell(forwardOrBackward) {
    return getAdjacentTextCellInSameLine(forwardOrBackward) || getAdjacentTextCellInAnotherLine(forwardOrBackward);
}

function makeFunctionWhichLimitsMovement(forwardOrBackward) {
    return function() {
        return !getAdjacentTextCell(forwardOrBackward);
    };
}

function toEndOfNonWhiteSpaceSequence(moveToNextCharacter, isLimitingCharacter) {
    var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;
    while (predicate() && !isLimitingCharacter()) {
        moveToNextCharacter();
    }
}

function toEndOfWhiteSpaceSequence(moveToNextCharacter, isLimitingCharacter) {
    while (isWhiteSpaceCharacter() && !isLimitingCharacter()) {
        moveToNextCharacter();
    }
}

function makeFunctionToMoveOneCharacterInText(forwardOrBackward) {
    return function() {
        var adjacentCell = getAdjacentTextCell(forwardOrBackward);
        if (adjacentCell) {
            cursor.setPositionFrom(adjacentCell);
        }
    };
}

function makeFunctionWhichDecidesIfIsMovingOneCharacterFirst(forwardOrBackward) {
    return function() {
        if (isWhiteSpaceCharacter()) {
            return;
        }
        var predicate = isWordCharacter() ? isWordCharacter : isOtherCharacter;
        var cell = getAdjacentTextCell(forwardOrBackward);
        if (cell) {
            return !predicate(cell.character);
        }
    };
}

module.exports = {
    'move horizontally': function(options) {
        cursor.saveCurrentPosition();

        cursor.column += options.direction === 'left' ? -1 : 1;
        if (!chamber.getCellUnderCursor().isBlocking()) {
            cursor.forgetColumnForVerticalMovement();
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
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

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
            cursor.restoreToSavedPosition();
        }
    },
    'move by word': function(options) {
        cursor.saveCurrentPosition();

        if (!chamber.getCellUnderCursor().isText) {
            return;
        }
        var direction = options.direction,
            oppositeDirection = direction === 'forward' ? 'backward' : 'forward',
            moveToNextChar = makeFunctionToMoveOneCharacterInText(direction),
            moveToPreviousChar = makeFunctionToMoveOneCharacterInText(oppositeDirection),
            isLimitingCharacter = makeFunctionWhichLimitsMovement(direction),
            isMovingOneCharacterFirst = makeFunctionWhichDecidesIfIsMovingOneCharacterFirst(direction);

        if (isMovingOneCharacterFirst()) {
            moveToNextChar();
        }
        if (direction === 'forward' && options.to === 'beginning') {
            toEndOfNonWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
        }
        toEndOfWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
        if (direction === 'forward' && options.to === 'ending' ||
            direction === 'backward' && options.to === 'beginning') {
            toEndOfNonWhiteSpaceSequence(moveToNextChar, isLimitingCharacter);
            if (!isLimitingCharacter()) {
                moveToPreviousChar();
            }
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
            cursor.restoreToSavedPosition();
        }
    },
    'move to end of text': function(options) {
        cursor.saveCurrentPosition();

        var adjacentCell = getAdjacentTextCell(options.direction);
        while (adjacentCell) {
            cursor.setPositionFrom(adjacentCell);
            adjacentCell = getAdjacentTextCell(options.direction);
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
            cursor.restoreToSavedPosition();
        }
    },
    'move to end of line': function(options) {
        cursor.saveCurrentPosition();

        var adjacentCell = getAdjacentTextCellInSameLine(options.direction);
        while (adjacentCell) {
            cursor.setPositionFrom(adjacentCell);
            adjacentCell = getAdjacentTextCellInSameLine(options.direction);
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
            cursor.restoreToSavedPosition();
        }
    },
    'move to beginning of line number': function(options) {
        cursor.saveCurrentPosition();

        this['move to end of line']({
            direction: 'backward'
        });
        var targetLineNumber = options.lineNumber,
            lineNumberCell = chamber.matrix[cursor.row][cursor.column - 1],
            currentLineNumber = lineNumberCell.lineNumber,
            step = targetLineNumber > currentLineNumber ? 1 : -1;
        while (currentLineNumber && currentLineNumber !== targetLineNumber) {
            cursor.row += step;
            lineNumberCell = chamber.matrix[cursor.row][cursor.column - 1];
            currentLineNumber = lineNumberCell.lineNumber;
        }
        if (!currentLineNumber) {
            cursor.row -= step;
        }

        if (chamber.configuration['killing mode on'] && chamber.getCellUnderCursor().isLazerBeam()) {
            cursor.setPositionFrom(chamber.spawnPosition);
        } else if (chamber.getCellUnderCursor().isBlocking()) {
            cursor.restoreToSavedPosition();
        }
    }
};

},{"./chamber.js":2,"./cursor.js":5}],9:[function(require,module,exports){
var console;
if (typeof window !== 'undefined') {
    console = document.querySelector('#console');
}

var printText = function(text) {
    var line = text.shift();
    if (line !== undefined) {
        window.setTimeout (function() {
            console.innerHTML += text.by + line + '<br>';
            console.scrollTop +=100;
            printText(text);
        }, line.length * 40);
    }

};

module.exports = function(text) {
    if (!Array.isArray(text)) {
        text = [text];
    }
    text.by = text.by ? text.by + '> ' : '';
    printText(text);
};

},{}],10:[function(require,module,exports){
var printText = require('./print.js');
module.exports = {
	findAndTryToKill: function(cursor, chamber) {
	// add some funny excuse for the kill from turret
		if (this.isShooting || this.cell.isDeactivatedTurret) {
			return;
		}
		var turret = this,
		rise = cursor.row - turret.row,
		run = cursor.column - turret.column,
		count = Math.max(Math.abs(rise), Math.abs(run)),
		total = count,
		path = [],
		cell;
		if (!rise && !run) {
			return;
		}
		for (var i = 0; i <= count; i++) {
			cell = chamber.matrix[Math.round(turret.row + rise*(i/total))][Math.round(turret.column + run*(i/total))];
			if (!cell.isLazerBeam() && cell.isBlocking()) {
				break;
			}
			if (cell !== turret.cell && path.indexOf(cell) === -1) {
				path.push(cell);
			}
			if (cell.row === cursor.row && cell.column === cursor.column) {
				turret.tryToKill(cursor, chamber, path);
				break;
			}
		}
	},
	tryToKill: function(cursor, chamber, path) {
		var turret = this;
		setTimeout(function() {
			var isCursorUnderLazer = !path.every(function(cell) {
                return !cell.isUnderCursor;
            });
			if (isCursorUnderLazer) {
				turret.isShooting = true;
				path.forEach(function(cell) {
					cell.isUnderTurretFire = true;
				});
                var message = 'turret> ' + [
                    'I did not mean to.',
                    'They made me do this.',
                    'I am trully sorry.',
                    'Sometimes I can not help myself.',
                    'Watch out.',
                    'Please do not think less of me.'
                ][Math.floor(Math.random() * 3)];
                printText(message);
                if (require('./chamber.js').configuration['killing mode on']) {
                    cursor.setPositionFrom(require('./chamber.js').spawnPosition);
                }
				chamber.render();
				window.setTimeout(function() {
					turret.isShooting = false;
					path.forEach(function(cell) {
						cell.isUnderTurretFire = false;
					});
					chamber.render();
				}, 1000);
			} else {
				turret.findAndTryToKill(cursor, chamber);
			}
		}, 1000);
	}
};

},{"./chamber.js":2,"./print.js":9}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jaGFtYmVyLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kLWxpbmUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jdXJzb3IuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2Zha2VfMzU4MTA2MzMuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL21hdHJpeC1kZWNvcmF0b3IuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL21vdmVtZW50cy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvcHJpbnQuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL3R1cnJldC1kZWNvcmF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRpc1dhbGw6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJysnLCAnLScsICd8J10uaW5kZXhPZih0aGlzLmNoYXJhY3RlcikgIT09IC0xICYmICF0aGlzLmlzVGV4dDtcblx0fSxcblx0aXNMYXplcjogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFsnVicsICdeJywgJz4nLCAnPCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXJCZWFtOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1ZlcnRpY2FsTGF6ZXJCZWFtIHx8IHRoaXMuaXNIb3Jpem9udGFsTGF6ZXJCZWFtO1xuXHR9LFxuXHRpc0Jsb2NraW5nOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1dhbGwoKSB8fCB0aGlzLmlzTGF6ZXIoKSB8fCB0aGlzLmlzTGF6ZXJCZWFtKCk7XG5cdH0sXG5cdHRvU3RyaW5nOiBmdW5jdGlvbihjb25maWd1cmF0aW9uKSB7XG5cdFx0dmFyIHByb3BlcnR5VG9DbGFzc05hbWUgPSB7XG5cdFx0XHRcdCdpc1RleHQnOiAndGV4dCcsXG5cdFx0XHRcdCdpc1VuZGVyQ3Vyc29yJzogJ2N1cnNvcicsXG5cdFx0XHRcdCdpc1ZlcnRpY2FsTGF6ZXJCZWFtJzogJ3ZlcnRpY2FsLWxhemVyLWJlYW0nLFxuXHRcdFx0XHQnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJzogJ2hvcml6b250YWwtbGF6ZXItYmVhbScsXG5cdFx0XHRcdCdpc1VuZGVyVHVycmV0RmlyZSc6ICd0dXJyZXQtZmlyZSdcblx0XHRcdH0sXG5cdFx0XHRjbGFzc05hbWVzID0gT2JqZWN0LmtleXMocHJvcGVydHlUb0NsYXNzTmFtZSkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpc1trZXldO1xuXHRcdFx0fS5iaW5kKHRoaXMpKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiBwcm9wZXJ0eVRvQ2xhc3NOYW1lW2tleV07XG5cdFx0XHR9KS5qb2luKCcgJyk7XG4gICAgICAgIGlmICh0aGlzLmxpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhcmFjdGVyID0gY29uZmlndXJhdGlvblsnZGlzcGxheSBsaW5lIG51bWJlcnMnXSA/IHRoaXMubGluZU51bWJlciA6ICcgJztcbiAgICAgICAgfVxuXG5cdFx0cmV0dXJuICc8c3BhbiAgY2xhc3M9XCInICsgY2xhc3NOYW1lcyArICdcIj4nICsgdGhpcy5jaGFyYWN0ZXIgKyAnPC9zcGFuPic7XG5cdH1cbn07XG4iLCJ2YXIgbWF0cml4RGVjb3JhdG9yID0gcmVxdWlyZSgnLi9tYXRyaXgtZGVjb3JhdG9yLmpzJyksXG5cdGNlbGxEZWNvcmF0b3IgPSByZXF1aXJlKCcuL2NlbGwtZGVjb3JhdG9yLmpzJyksXG5cdHR1cnJldERlY29yYXRvciA9IHJlcXVpcmUoJy4vdHVycmV0LWRlY29yYXRvci5qcycpLFxuXHRjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xuXG52YXIgY2hhbWJlciA9IE9iamVjdC5jcmVhdGUobWF0cml4RGVjb3JhdG9yKTtcblxuY2hhbWJlci5mcm9tSlNPTiA9IGZ1bmN0aW9uKGpzb24pIHtcblx0dGhpcy5mcm9tQXJyYXlPZlN0cmluZ3MoanNvbi5zY2VuZSk7XG5cdE9iamVjdC5rZXlzKGpzb24pLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRyZXR1cm4ga2V5ICE9PSAnc2NlbmUnO1xuXHR9KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdHRoaXNba2V5XSA9IGpzb25ba2V5XTtcblx0fS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmNvbmZpZ3VyYXRpb24gPSBqc29uLmNvbmZpZ3VyYXRpb24gfHwge307XG59O1xuXG5jaGFtYmVyLmluaXRpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscygpO1xuXHR0aGlzLm1hcmtUZXh0KCk7XG5cdHRoaXMubWFya0xhemVycygpO1xuXHR0aGlzLm1hcmtDdXJzb3IoKTtcblx0dGhpcy5tYXJrVHVycmV0cygpO1xufTtcblxuY2hhbWJlci5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2hhbWJlciA9IHRoaXM7XG5cdGNoYW1iZXIubWF0cml4ID0gY2hhbWJlci5tYXAoZnVuY3Rpb24oY2hhcmFjdGVyLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjaGFyYWN0ZXIgPT09ICdAJykge1xuXHRcdFx0Y2hhbWJlci5zcGF3blBvc2l0aW9uID0ge1xuXHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHZhciBjZWxsID0gT2JqZWN0LmNyZWF0ZShjZWxsRGVjb3JhdG9yKTtcblx0XHRjZWxsLnJvdyA9IHJvdztcblx0XHRjZWxsLmNvbHVtbiA9IGNvbHVtbjtcblx0XHRjZWxsLmNoYXJhY3RlciA9IGNoYXJhY3Rlcjtcblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLm1hcmtDdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0Y3Vyc29yLnJlc2V0KCk7XG5cdGN1cnNvci5zZXRQb3NpdGlvbkZyb20odGhpcy5zcGF3blBvc2l0aW9uKTtcbn07XG5cbmNoYW1iZXIubWFya1RleHQgPSBmdW5jdGlvbigpIHtcblx0dmFyIGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2UsXG5cdFx0bGFzdENlbGxJblNlcXVlbmNlLFxuICAgICAgICBwcmV2aW91c0JlZ2lubmluZ09mTGluZTtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcykge1xuXHRcdFx0aWYgKGNlbGwuY2hhcmFjdGVyID09PSAnYCcpIHtcblx0XHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlID0gY2hhbWJlci5tYXRyaXhbcm93XVtjb2x1bW4gLSAxXTtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjZWxsLmlzVGV4dCA9IHRydWU7XG5cdFx0XHRcdGlmIChsYXN0Q2VsbEluU2VxdWVuY2UpIHtcblx0XHRcdFx0XHRpZiAoTWF0aC5hYnMobGFzdENlbGxJblNlcXVlbmNlLnJvdyAtIGNlbGwucm93KSA9PT0gMSkge1xuXHRcdFx0XHRcdFx0Y2VsbC5wcmV2aW91c1RleHRDZWxsID0gbGFzdENlbGxJblNlcXVlbmNlO1xuXHRcdFx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlLm5leHRUZXh0Q2VsbCA9IGNlbGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgcHJldmlvdXNCZWdpbm5pbmdPZkxpbmUgPSBjaGFtYmVyLm1hdHJpeFtyb3cgLSAxXVtjb2x1bW5dO1xuICAgICAgICAgICAgaWYgKHByZXZpb3VzQmVnaW5uaW5nT2ZMaW5lLmxpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICBjZWxsLmxpbmVOdW1iZXIgPSBwcmV2aW91c0JlZ2lubmluZ09mTGluZS5saW5lTnVtYmVyICsgMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGFzdENlbGxJblNlcXVlbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGNlbGwubGluZU51bWJlciA9IDE7XG4gICAgICAgICAgICB9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5tYXJrTGF6ZXJzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBtYXRyaXggPSB0aGlzLm1hdHJpeDtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdHZhciBjaGFyYWN0ZXIgPSBjZWxsLmNoYXJhY3Rlcixcblx0XHRcdGlzVmVydGljYWxMYXplckJlYW0gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIFsnPCcsJz4nXS5pbmRleE9mKGNoYXJhY3RlcikgPT09IC0xO1xuXHRcdFx0fSxcblx0XHRcdGJlYW1Qcm9wZXJ0eSA9IGlzVmVydGljYWxMYXplckJlYW0oKSA/ICdpc1ZlcnRpY2FsTGF6ZXJCZWFtJyA6ICdpc0hvcml6b250YWxMYXplckJlYW0nLFxuXHRcdFx0aXNCZWFtQ29udGludWluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uXS5pc0xhemVyQmVhbSgpIHx8ICFtYXRyaXhbcm93XVtjb2x1bW5dLmlzQmxvY2tpbmcoKTtcblx0XHRcdH0sXG5cdFx0XHRuZXh0ID0ge1xuXHRcdFx0XHQnVic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93KytdW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCdeJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ctLV1bY29sdW1uXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Jz4nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uKytdO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnPCc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW4tLV07XG5cdFx0XHRcdH1cblx0XHRcdH1bY2hhcmFjdGVyXTtcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dCgpO1xuXHRcdFx0d2hpbGUgKGlzQmVhbUNvbnRpbnVpbmcoKSkge1xuXHRcdFx0XHRuZXh0KClbYmVhbVByb3BlcnR5XSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya1R1cnJldHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIGNoYW1iZXIgPSB0aGlzO1xuXHR0aGlzLnR1cnJldHMgPSBbXTtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJyYnKSB7XG5cdFx0XHR2YXIgdHVycmV0ID0gT2JqZWN0LmNyZWF0ZSh0dXJyZXREZWNvcmF0b3IpO1xuXHRcdFx0dHVycmV0LnJvdyA9IHJvdztcblx0XHRcdHR1cnJldC5jb2x1bW4gPSBjb2x1bW47XG5cdFx0XHR0dXJyZXQuY2VsbCA9IGNlbGw7XG5cdFx0XHRjaGFtYmVyLnR1cnJldHMucHVzaCh0dXJyZXQpO1xuXHRcdH1cblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLmdldENlbGxVbmRlckN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl07XG59O1xuXG5jaGFtYmVyLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzY2VuZScpO1xuXHRlbGVtZW50LmlubmVySFRNTCA9IGNoYW1iZXIubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSkge1xuXHRcdGFycmF5ID0gYXJyYXkubWFwKGZ1bmN0aW9uKGNlbGwpIHtcblx0XHRcdGNlbGwuaXNVbmRlckN1cnNvciA9IGNlbGwucm93ID09PSBjdXJzb3Iucm93ICYmIGNlbGwuY29sdW1uID09PSBjdXJzb3IuY29sdW1uO1xuICAgICAgICAgICAgY2VsbCA9IGNlbGwudG9TdHJpbmcoY2hhbWJlci5jb25maWd1cmF0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiBjZWxsO1xuXHRcdH0pO1xuXHRcdHJldHVybiBhcnJheS5qb2luKCcnKTtcblx0fSkuam9pbignPGJyPicpO1xufTtcblxuY2hhbWJlci5hY3RPbkN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnR1cnJldHMuZm9yRWFjaChmdW5jdGlvbih0dXJyZXQpIHtcblx0XHR0dXJyZXQuZmluZEFuZFRyeVRvS2lsbChjdXJzb3IsIGNoYW1iZXIpO1xuXHR9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2hhbWJlcjtcbiIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMuanMnKTtcblxudmFyIGNvbW1hbmRMaW5lID0ge1xuXHRleGVjdXRlOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgZ2l2ZW5Db21tYW5kID0gdGhpcy5lbGVtZW50LnZhbHVlLnNsaWNlKDEpOyAvLyBzdHJpcCBjb2xvblxuXHRcdE9iamVjdC5rZXlzKGNvbW1hbmRzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0dmFyIG1hdGNoZXMgPSBnaXZlbkNvbW1hbmQubWF0Y2gobmV3IFJlZ0V4cChrZXkpKTtcblx0XHRcdGlmIChtYXRjaGVzKSB7XG5cdFx0XHRcdGNvbW1hbmRzW2tleV0uYXBwbHkodGhpcywgbWF0Y2hlcy5zbGljZSgxKSk7IC8vIHN0cmlwIG1hdGNoaW5nIGxpbmVcblx0XHRcdH1cblx0XHR9KTtcblx0fVxufTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdGNvbW1hbmRMaW5lLmVsZW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvbW1hbmQtbGluZScpO1xuXHRjb21tYW5kTGluZS5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2JsdXInLCBmdW5jdGlvbigpIHtcblx0XHRpZiAoY29tbWFuZExpbmUuZWxlbWVudC52YWx1ZSkge1xuXHRcdFx0Y29tbWFuZExpbmUuZWxlbWVudC5mb2N1cygpO1xuXHRcdH1cblx0fSk7XG5cdGNvbW1hbmRMaW5lLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCBmdW5jdGlvbihlKSB7XG5cdFx0aWYgKGUud2hpY2ggPT09IDEzKSB7XG5cdFx0XHRjb21tYW5kTGluZS5leGVjdXRlKCk7XG5cdFx0XHRjb21tYW5kTGluZS5kZWFjdGl2YXRlKCk7XG5cdFx0fVxuXHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdH0pO1xuXHRjb21tYW5kTGluZS5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24oKSB7XG5cdFx0aWYgKGNvbW1hbmRMaW5lLmVsZW1lbnQudmFsdWUgPT09ICcnKSB7XG5cdFx0XHRjb21tYW5kTGluZS5kZWFjdGl2YXRlKCk7XG5cdFx0fVxuXHR9KTtcblx0Y29tbWFuZExpbmUuYWN0aXZhdGUgPSBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmVsZW1lbnQuZm9jdXMoKTtcblx0fTtcblx0Y29tbWFuZExpbmUuZGVhY3RpdmF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuZWxlbWVudC52YWx1ZSA9ICcnO1xuXHRcdHRoaXMuZWxlbWVudC5ibHVyKCk7XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZExpbmU7IiwidmFyIGNvbW1hbmRzID0ge30sXG4gICAgbWFpbkZ1bmN0aW9uLFxuICAgIHByaW50VGV4dCA9IHJlcXVpcmUoJy4vcHJpbnQuanMnKTtcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZHM7XG5cbmNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10gPSBmdW5jdGlvbihjaGFtYmVyTnVtYmVyKSB7XG4gICAgdmFyIHhtbGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB4bWxodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoeG1saHR0cC5yZWFkeVN0YXRlICE9PSA0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRlZmF1bHRBY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuYWxlcnQoeG1saHR0cC5zdGF0dXMpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAnMjAwJzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5jaGFtYmVyID0gY2hhbWJlck51bWJlcjtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1haW5GdW5jdGlvbihKU09OLnBhcnNlKHhtbGh0dHAucmVzcG9uc2VUZXh0KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvblsnNDA0J10oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJzQwNCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuYWxlcnQoJ1RoaXMgaXMgdGhlIGxhc3QgY2hhbWJlciBhdCB0aGlzIG1vbWVudC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnTmV4dCB5b3UgYXJlIGdvaW5nIHRvIGJlIHJlZGlyZWN0ZWQgdG8gdGhlIHJlcG8gb2YgdGhpcyBnYW1lLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdMZXQgbWUga25vdyB5b3VyIGZhdm9yaXRlIFZJTSBmZWF0dXJlcyB3aGljaCBhcmUgbWlzc2luZy4nKTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9naXRodWIuY29tL2hlcm1hbnlhL3ZpbS1leHBlcmltZW50cyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVt4bWxodHRwLnN0YXR1c10gfHwgZGVmYXVsdEFjdGlvbjtcbiAgICAgICAgYWN0aW9uKCk7XG5cbiAgICB9O1xuICAgIGNoYW1iZXJOdW1iZXIgPSBjaGFtYmVyTnVtYmVyIHx8IGxvY2FsU3RvcmFnZS5jaGFtYmVyIHx8IDA7XG4gICAgeG1saHR0cC5vcGVuKCdHRVQnLCAnLi9jaGFtYmVycy8nICsgY2hhbWJlck51bWJlciArICcuanNvbicsIHRydWUpO1xuICAgIHhtbGh0dHAuc2VuZCgpO1xufTtcblxuY29tbWFuZHNbJ3NldCBudW1iZXInXSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2Rpc3BsYXkgbGluZSBudW1iZXJzJ10gPSB0cnVlO1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLnJlbmRlcigpO1xufTtcbmNvbW1hbmRzWydzZXQgbnUnXSA9IGNvbW1hbmRzWydzZXQgbnVtYmVyJ107XG5cbmNvbW1hbmRzWydzZXQgbm9udW1iZXInXSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2Rpc3BsYXkgbGluZSBudW1iZXJzJ10gPSBmYWxzZTtcbiAgICByZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5yZW5kZXIoKTtcbn07XG5jb21tYW5kc1snc2V0IG5vbnUnXSA9IGNvbW1hbmRzWydzZXQgbm9udW1iZXInXTtcblxuY29tbWFuZHNbJ2Nha2UgaXMgYSBsaWUnXSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddID0gdHJ1ZTtcbiAgICBwcmludFRleHQoWycnLCdOb3cgeW91IGFyZSBnb2luZyB0byBkaWUuIEV2ZXJ5IHRpbWUuJywnJ10pO1xufTtcblxuY29tbWFuZHMubG9hZE5leHRDaGFtYmVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5leHRDaGFtYmVyTnVtYmVyID0gTnVtYmVyKGxvY2FsU3RvcmFnZS5jaGFtYmVyKSArIDE7XG4gICAgY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXShuZXh0Q2hhbWJlck51bWJlcik7XG59O1xuXG5jb21tYW5kc1snaW5pdGlhbGl6ZSBjaGFtYmVyJ10gPSBmdW5jdGlvbihtYWluKSB7XG4gICAgbWFpbkZ1bmN0aW9uID0gbWFpbjtcbiAgICBjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKCk7XG59O1xuIiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpLFxuICAgIHByaW50VGV4dCA9IHJlcXVpcmUoJy4vcHJpbnQuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjb3JlOiAwLFxuICAgIGFjdE9uQ3VycmVudENlbGw6IGZ1bmN0aW9uKGNoYW1iZXIpIHtcbiAgICAgICAgdmFyIGN1cnNvciA9IHRoaXMsXG4gICAgICAgICAgICBjZWxsID0gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKSxcbiAgICAgICAgICAgIGFjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAnKic6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjZWxsLmNoYXJhY3RlciA9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnNjb3JlKys7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnTyc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3IuaGFzQ29tcGxldGVkTGV2ZWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29uZ3JhdHVsYXRpb25NZXNzYWdlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJzAnOiAnWW91IGRpZCBpdCwgSSBhbSBib3JlZCB3YXRjaGluZyB5b3UuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcxJzogJ09ubHkgb25lIHBhdGhldGljIHN0YXI/JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcyJzogJ0RpZCB5b3UgZXZlbiB0cnk/J1xuICAgICAgICAgICAgICAgICAgICB9W2N1cnNvci5zY29yZV0gfHwgJ1NhdGlzZnlpbmcgcGVyZm9ybWFjZS4nO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50VGV4dChbJycsIGNvbmdyYXR1bGF0aW9uTWVzc2FnZSwgJyddKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlcigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnJic6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjZWxsLmlzRGVhY3RpdmF0ZWRUdXJyZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjZWxsLmNoYXJhY3RlciA9ICcgPGRpdiBjbGFzcz1cImRlYWN0aXZhdGVkLXR1cnJldFwiPiY8L2Rpdj4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1bY2VsbC5jaGFyYWN0ZXJdO1xuICAgICAgICBpZiAoIWNlbGwuaXNUZXh0ICYmIGFjdGlvbikge1xuICAgICAgICAgICAgYWN0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5oYXNDb21wbGV0ZWRMZXZlbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnNjb3JlID0gMDtcbiAgICAgICAgdGhpcy5mb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KCk7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkZyb206IGZ1bmN0aW9uKGFub3RoZXJPYmplY3QpIHtcbiAgICAgICAgdGhpcy5jb2x1bW4gPSBhbm90aGVyT2JqZWN0LmNvbHVtbjtcbiAgICAgICAgdGhpcy5yb3cgPSBhbm90aGVyT2JqZWN0LnJvdztcbiAgICB9LFxuICAgIHJlbWVtYmVyQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCA9IHRoaXMuY29sdW1uO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBmb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ7XG4gICAgfSxcbiAgICBzYXZlQ3VycmVudFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zYXZlZENvbHVtbiA9IHRoaXMuY29sdW1uO1xuICAgICAgICB0aGlzLnNhdmVkUm93ID0gdGhpcy5yb3c7XG4gICAgfSxcbiAgICByZXN0b3JlVG9TYXZlZFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jb2x1bW4gPSB0aGlzLnNhdmVkQ29sdW1uO1xuICAgICAgICB0aGlzLnJvdyA9IHRoaXMuc2F2ZWRSb3c7XG4gICAgfVxufTtcbiIsInZhciBsaWIgPSByZXF1aXJlKCcuL21vdmVtZW50cy5qcycpLFxuICAgIGNvbW1hbmRMaW5lID0gcmVxdWlyZSgnLi9jb21tYW5kLWxpbmUuanMnKSxcbiAgICBjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpLFxuICAgIGNoYW1iZXIgPSByZXF1aXJlKCcuL2NoYW1iZXIuanMnKSxcbiAgICBrZXlsb2cgPSBbXTtcblxudmFyIHJlcGVhdGFibGUgPSB7XG4gICAgJ2gnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGliWydtb3ZlIGhvcml6b250YWxseSddKHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2xlZnQnXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgJ2wnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGliWydtb3ZlIGhvcml6b250YWxseSddKHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ3JpZ2h0J1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgICdrJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIGxpYlsnbW92ZSB2ZXJ0aWNhbGx5J10oe1xuICAgICAgICAgICAgZGlyZWN0aW9uOiAndXAnXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgJ2onOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGliWydtb3ZlIHZlcnRpY2FsbHknXSh7XG4gICAgICAgICAgICBkaXJlY3Rpb246ICdkb3duJ1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgICd3JzogZnVuY3Rpb24oKSB7XG4gICAgICAgIGxpYlsnbW92ZSBieSB3b3JkJ10oe1xuICAgICAgICAgICAgZGlyZWN0aW9uOiAnZm9yd2FyZCcsXG4gICAgICAgICAgICB0bzogJ2JlZ2lubmluZydcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAnZSc6IGZ1bmN0aW9uKCkge1xuICAgICAgICBsaWJbJ21vdmUgYnkgd29yZCddKHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2ZvcndhcmQnLFxuICAgICAgICAgICAgdG86ICdlbmRpbmcnXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgJ2InOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGliWydtb3ZlIGJ5IHdvcmQnXSh7XG4gICAgICAgICAgICBkaXJlY3Rpb246ICdiYWNrd2FyZCcsXG4gICAgICAgICAgICB0bzogJ2JlZ2lubmluZydcbiAgICAgICAgfSk7XG4gICAgfVxufSxcblxub3RoZXIgPSB7XG4gICAgJzonOiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29tbWFuZExpbmUuYWN0aXZhdGUoKTtcbiAgICB9LFxuICAgICdHJzogZnVuY3Rpb24ocHJvY2VlZGluZ051bWJlcikge1xuICAgICAgICBpZiAocHJvY2VlZGluZ051bWJlcikge1xuICAgICAgICAgICAgbGliWydtb3ZlIHRvIGJlZ2lubmluZyBvZiBsaW5lIG51bWJlciddKHtcbiAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBwcm9jZWVkaW5nTnVtYmVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxpYlsnbW92ZSB0byBlbmQgb2YgdGV4dCddKHtcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb246ICdmb3J3YXJkJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgICdnJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChrZXlsb2dba2V5bG9nLmxlbmd0aCAtIDFdID09PSAnZycpIHtcbiAgICAgICAgICAgIGxpYlsnbW92ZSB0byBlbmQgb2YgdGV4dCddKHtcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb246ICdiYWNrd2FyZCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICB9LFxuICAgICckJzogZnVuY3Rpb24oKSB7XG4gICAgICAgIGxpYlsnbW92ZSB0byBlbmQgb2YgbGluZSddKHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2ZvcndhcmQnXG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgJzAnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgbGliWydtb3ZlIHRvIGVuZCBvZiBsaW5lJ10oe1xuICAgICAgICAgICAgZGlyZWN0aW9uOiAnYmFja3dhcmQnXG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGdldE51bWJlckZyb21Mb2coKSB7XG4gICAgdmFyIGRpZ2l0cyA9IFtdLFxuICAgICAgICBsYXN0TG9nRW50cnkgPSBrZXlsb2cucG9wKCk7XG4gICAgd2hpbGUgKC9cXGQvLnRlc3QobGFzdExvZ0VudHJ5KSkge1xuICAgICAgICBkaWdpdHMucHVzaChsYXN0TG9nRW50cnkpO1xuICAgICAgICBsYXN0TG9nRW50cnkgPSBrZXlsb2cucG9wKCk7XG4gICAgfVxuICAgIGtleWxvZy5wdXNoKGxhc3RMb2dFbnRyeSk7XG4gICAgcmV0dXJuIHBhcnNlSW50KGRpZ2l0cy5yZXZlcnNlKCkuam9pbignJykpO1xufVxuXG5mdW5jdGlvbiBnZXROaWNlQXJyYXlPZkNoYXJhY3RlcnMgKGFyZ3MpIHtcbiAgICByZXR1cm4gW10uc2xpY2UuY2FsbChhcmdzLCAwKS5qb2luKCcnKS5zcGxpdCgnJyk7XG59XG5cbmZ1bmN0aW9uIGxvZ0tleSgvKmNoYXJhY3RlcnMqLykge1xuICAgIHZhciBjaGFyYWN0ZXJzID0gZ2V0TmljZUFycmF5T2ZDaGFyYWN0ZXJzKGFyZ3VtZW50cyk7XG4gICAgY2hhcmFjdGVycy5mb3JFYWNoKGZ1bmN0aW9uKGNoYXJhY3Rlcikge1xuICAgICAgICB2YXIgcHJvY2VlZGluZ051bWJlciwgbnVtYmVyT2ZUaW1lc1JlbWFpbmluZztcbiAgICAgICAgaWYgKC9bXlxcZF0vLnRlc3QoY2hhcmFjdGVyKSkge1xuICAgICAgICAgICAgcHJvY2VlZGluZ051bWJlciA9IG51bWJlck9mVGltZXNSZW1haW5pbmcgPSBnZXROdW1iZXJGcm9tTG9nKCk7XG4gICAgICAgICAgICBudW1iZXJPZlRpbWVzUmVtYWluaW5nID0gbnVtYmVyT2ZUaW1lc1JlbWFpbmluZyB8fCAxO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlcGVhdGFibGVbY2hhcmFjdGVyXSkge1xuICAgICAgICAgICAgd2hpbGUgKG51bWJlck9mVGltZXNSZW1haW5pbmctLSA+IDApIHtcbiAgICAgICAgICAgICAgICByZXBlYXRhYmxlW2NoYXJhY3Rlcl0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAob3RoZXJbY2hhcmFjdGVyXSkge1xuICAgICAgICAgICAgb3RoZXJbY2hhcmFjdGVyXShwcm9jZWVkaW5nTnVtYmVyKTtcbiAgICAgICAgfVxuICAgICAgICBjdXJzb3IuYWN0T25DdXJyZW50Q2VsbChjaGFtYmVyKTtcbiAgICAgICAgY2hhbWJlci5hY3RPbkN1cnNvcigpO1xuICAgICAgICBrZXlsb2cucHVzaChjaGFyYWN0ZXIpO1xuICAgIH0pO1xuICAgIHJldHVybiBsb2dLZXk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbG9nS2V5O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdGZyb21BcnJheU9mU3RyaW5nczogZnVuY3Rpb24gKGFycmF5T2ZTdHJpbmdzKSB7XG5cdFx0dGhpcy5tYXRyaXggPSBhcnJheU9mU3RyaW5ncy5tYXAoZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KCcnKTtcblx0XHR9KTtcblx0fSxcblx0bWFwOiBmdW5jdGlvbihmbikge1xuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5tYXAoZnVuY3Rpb24oYXJyYXksIHJvdykge1xuXHRcdFx0cmV0dXJuIGFycmF5Lm1hcChmdW5jdGlvbihpdGVtLCBjb2x1bW4pIHtcblx0XHRcdFx0cmV0dXJuIGZuKGl0ZW0sIHJvdywgY29sdW1uKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHRnZXRDb29yZGluYXRlc09mOiBmdW5jdGlvbiAodGhpbmdUb0ZpbmQpIHtcblx0XHR2YXIgcHJlZGljYXRlO1xuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbihzdHJpbmcsIGFub3RoZXJTdHJpbmcpIHtcblx0XHRcdFx0cmV0dXJuIHN0cmluZyA9PT0gYW5vdGhlclN0cmluZztcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbih0aGluZ1RvRmluZCwgYW5vdGhlck9iamVjdCkge1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpbmdUb0ZpbmQpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpbmdUb0ZpbmRba2V5XSAhPT0gYW5vdGhlck9iamVjdFtrZXldO1xuXHRcdFx0XHR9KS5sZW5ndGggPT09IDA7XG5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5yZWR1Y2UoZnVuY3Rpb24oZm91bmQsIGFycmF5LCByb3cpIHtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oY2VsbCwgY29sdW1uKSB7XG5cdFx0XHRcdGlmIChwcmVkaWNhdGUodGhpbmdUb0ZpbmQsIGNlbGwpKSB7XG5cdFx0XHRcdFx0Zm91bmQucHVzaCh7XG5cdFx0XHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0XHRcdGNvbHVtbjogY29sdW1uXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZvdW5kO1xuXHRcdH0sIFtdKTtcblx0fVxufTsiLCJ2YXIgY2hhbWJlciA9IHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLFxuICAgIGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyk7XG5cbmZ1bmN0aW9uIGdldEN1cnJlbnRDaGFyYWN0ZXIoKSB7XG4gICAgcmV0dXJuIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuY2hhcmFjdGVyO1xufVxuXG5mdW5jdGlvbiBpc1dvcmRDaGFyYWN0ZXIoY2hhcmFjdGVyKSB7XG4gICAgcmV0dXJuIC9bQS1aYS16XzAtOV0vLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGlzV2hpdGVTcGFjZUNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcbiAgICByZXR1cm4gL1xccy8udGVzdChjaGFyYWN0ZXIgfHwgZ2V0Q3VycmVudENoYXJhY3RlcigpKTtcbn1cblxuZnVuY3Rpb24gaXNPdGhlckNoYXJhY3RlcihjaGFyYWN0ZXIpIHtcbiAgICByZXR1cm4gL1teQS1aYS16XzAtOVxcc10vLnRlc3QoY2hhcmFjdGVyIHx8IGdldEN1cnJlbnRDaGFyYWN0ZXIoKSk7XG59XG5cbmZ1bmN0aW9uIGdldEFkamFjZW50VGV4dENlbGxJblNhbWVMaW5lKGZvcndhcmRPckJhY2t3YXJkKSB7XG4gICAgdmFyIGFkamFjZW50Q29sdW1uLCBjZWxsO1xuICAgIGlmIChmb3J3YXJkT3JCYWNrd2FyZCA9PT0gJ2ZvcndhcmQnKSB7XG4gICAgICAgIGFkamFjZW50Q29sdW1uID0gY3Vyc29yLmNvbHVtbiArIDE7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYWRqYWNlbnRDb2x1bW4gPSBjdXJzb3IuY29sdW1uIC0gMTtcbiAgICB9XG4gICAgY2VsbCA9IGNoYW1iZXIubWF0cml4W2N1cnNvci5yb3ddW2FkamFjZW50Q29sdW1uXTtcbiAgICBpZiAoY2VsbC5pc1RleHQpIHtcbiAgICAgICAgcmV0dXJuIGNlbGw7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRBZGphY2VudFRleHRDZWxsSW5Bbm90aGVyTGluZShmb3J3YXJkT3JCYWNrd2FyZCkge1xuICAgIHZhciBsaW5rVG9BZGphY2VudENlbGwgPSBmb3J3YXJkT3JCYWNrd2FyZCA9PT0gJ2ZvcndhcmQnID8gJ25leHRUZXh0Q2VsbCcgOiAncHJldmlvdXNUZXh0Q2VsbCc7XG4gICAgcmV0dXJuIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKClbbGlua1RvQWRqYWNlbnRDZWxsXTtcbn1cblxuZnVuY3Rpb24gZ2V0QWRqYWNlbnRUZXh0Q2VsbChmb3J3YXJkT3JCYWNrd2FyZCkge1xuICAgIHJldHVybiBnZXRBZGphY2VudFRleHRDZWxsSW5TYW1lTGluZShmb3J3YXJkT3JCYWNrd2FyZCkgfHwgZ2V0QWRqYWNlbnRUZXh0Q2VsbEluQW5vdGhlckxpbmUoZm9yd2FyZE9yQmFja3dhcmQpO1xufVxuXG5mdW5jdGlvbiBtYWtlRnVuY3Rpb25XaGljaExpbWl0c01vdmVtZW50KGZvcndhcmRPckJhY2t3YXJkKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gIWdldEFkamFjZW50VGV4dENlbGwoZm9yd2FyZE9yQmFja3dhcmQpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHRvRW5kT2ZOb25XaGl0ZVNwYWNlU2VxdWVuY2UobW92ZVRvTmV4dENoYXJhY3RlciwgaXNMaW1pdGluZ0NoYXJhY3Rlcikge1xuICAgIHZhciBwcmVkaWNhdGUgPSBpc1dvcmRDaGFyYWN0ZXIoKSA/IGlzV29yZENoYXJhY3RlciA6IGlzT3RoZXJDaGFyYWN0ZXI7XG4gICAgd2hpbGUgKHByZWRpY2F0ZSgpICYmICFpc0xpbWl0aW5nQ2hhcmFjdGVyKCkpIHtcbiAgICAgICAgbW92ZVRvTmV4dENoYXJhY3RlcigpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdG9FbmRPZldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhcmFjdGVyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyKSB7XG4gICAgd2hpbGUgKGlzV2hpdGVTcGFjZUNoYXJhY3RlcigpICYmICFpc0xpbWl0aW5nQ2hhcmFjdGVyKCkpIHtcbiAgICAgICAgbW92ZVRvTmV4dENoYXJhY3RlcigpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gbWFrZUZ1bmN0aW9uVG9Nb3ZlT25lQ2hhcmFjdGVySW5UZXh0KGZvcndhcmRPckJhY2t3YXJkKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYWRqYWNlbnRDZWxsID0gZ2V0QWRqYWNlbnRUZXh0Q2VsbChmb3J3YXJkT3JCYWNrd2FyZCk7XG4gICAgICAgIGlmIChhZGphY2VudENlbGwpIHtcbiAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20oYWRqYWNlbnRDZWxsKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIG1ha2VGdW5jdGlvbldoaWNoRGVjaWRlc0lmSXNNb3ZpbmdPbmVDaGFyYWN0ZXJGaXJzdChmb3J3YXJkT3JCYWNrd2FyZCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGlzV2hpdGVTcGFjZUNoYXJhY3RlcigpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByZWRpY2F0ZSA9IGlzV29yZENoYXJhY3RlcigpID8gaXNXb3JkQ2hhcmFjdGVyIDogaXNPdGhlckNoYXJhY3RlcjtcbiAgICAgICAgdmFyIGNlbGwgPSBnZXRBZGphY2VudFRleHRDZWxsKGZvcndhcmRPckJhY2t3YXJkKTtcbiAgICAgICAgaWYgKGNlbGwpIHtcbiAgICAgICAgICAgIHJldHVybiAhcHJlZGljYXRlKGNlbGwuY2hhcmFjdGVyKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgICdtb3ZlIGhvcml6b250YWxseSc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgY3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuICAgICAgICBjdXJzb3IuY29sdW1uICs9IG9wdGlvbnMuZGlyZWN0aW9uID09PSAnbGVmdCcgPyAtMSA6IDE7XG4gICAgICAgIGlmICghY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc0Jsb2NraW5nKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5mb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hhbWJlci5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSAmJiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzTGF6ZXJCZWFtKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20oY2hhbWJlci5zcGF3blBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmxvY2tpbmcoKSkge1xuICAgICAgICAgICAgY3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ21vdmUgdmVydGljYWxseSc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgY3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuICAgICAgICB2YXIgbWF0cml4ID0gY2hhbWJlci5tYXRyaXg7XG4gICAgICAgIGN1cnNvci5yZW1lbWJlckNvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcbiAgICAgICAgdmFyIHN0ZXBzQXNpZGUgPSAwLFxuICAgICAgICAgICAgc2lnbiA9IG9wdGlvbnMuZGlyZWN0aW9uID09PSAndXAnID8gLTEgOiAxO1xuICAgICAgICBpZiAoIW1hdHJpeFtjdXJzb3Iucm93ICsgMSAqIHNpZ25dW2N1cnNvci5jb2x1bW5dLmlzV2FsbCgpKSB7XG4gICAgICAgICAgICB3aGlsZSAoIW1hdHJpeFtjdXJzb3Iucm93ICsgMSAqIHNpZ25dW2N1cnNvci5jb2x1bW4gKyBzdGVwc0FzaWRlICsgMV0uaXNXYWxsKCkgJiZcbiAgICAgICAgICAgICAgICBjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZSA8IGN1cnNvci5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCkge1xuICAgICAgICAgICAgICAgIHN0ZXBzQXNpZGUrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGN1cnNvci5jb2x1bW4gKz0gc3RlcHNBc2lkZTtcbiAgICAgICAgICAgIGN1cnNvci5yb3cgKz0gMSAqIHNpZ247XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aGlsZSAoIW1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZV0uaXNCbG9ja2luZygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXRyaXhbY3Vyc29yLnJvdyArIDEgKiBzaWduXVtjdXJzb3IuY29sdW1uICsgc3RlcHNBc2lkZV0uaXNCbG9ja2luZygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5yb3cgKz0gMSAqIHNpZ247XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb2x1bW4gKz0gc3RlcHNBc2lkZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RlcHNBc2lkZS0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGFtYmVyLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddICYmIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNMYXplckJlYW0oKSkge1xuICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShjaGFtYmVyLnNwYXduUG9zaXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG4gICAgICAgICAgICBjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnbW92ZSBieSB3b3JkJzogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG4gICAgICAgIGlmICghY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKS5pc1RleHQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGlyZWN0aW9uID0gb3B0aW9ucy5kaXJlY3Rpb24sXG4gICAgICAgICAgICBvcHBvc2l0ZURpcmVjdGlvbiA9IGRpcmVjdGlvbiA9PT0gJ2ZvcndhcmQnID8gJ2JhY2t3YXJkJyA6ICdmb3J3YXJkJyxcbiAgICAgICAgICAgIG1vdmVUb05leHRDaGFyID0gbWFrZUZ1bmN0aW9uVG9Nb3ZlT25lQ2hhcmFjdGVySW5UZXh0KGRpcmVjdGlvbiksXG4gICAgICAgICAgICBtb3ZlVG9QcmV2aW91c0NoYXIgPSBtYWtlRnVuY3Rpb25Ub01vdmVPbmVDaGFyYWN0ZXJJblRleHQob3Bwb3NpdGVEaXJlY3Rpb24pLFxuICAgICAgICAgICAgaXNMaW1pdGluZ0NoYXJhY3RlciA9IG1ha2VGdW5jdGlvbldoaWNoTGltaXRzTW92ZW1lbnQoZGlyZWN0aW9uKSxcbiAgICAgICAgICAgIGlzTW92aW5nT25lQ2hhcmFjdGVyRmlyc3QgPSBtYWtlRnVuY3Rpb25XaGljaERlY2lkZXNJZklzTW92aW5nT25lQ2hhcmFjdGVyRmlyc3QoZGlyZWN0aW9uKTtcblxuICAgICAgICBpZiAoaXNNb3ZpbmdPbmVDaGFyYWN0ZXJGaXJzdCgpKSB7XG4gICAgICAgICAgICBtb3ZlVG9OZXh0Q2hhcigpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICdmb3J3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnYmVnaW5uaW5nJykge1xuICAgICAgICAgICAgdG9FbmRPZk5vbldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMaW1pdGluZ0NoYXJhY3Rlcik7XG4gICAgICAgIH1cbiAgICAgICAgdG9FbmRPZldoaXRlU3BhY2VTZXF1ZW5jZShtb3ZlVG9OZXh0Q2hhciwgaXNMaW1pdGluZ0NoYXJhY3Rlcik7XG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICdmb3J3YXJkJyAmJiBvcHRpb25zLnRvID09PSAnZW5kaW5nJyB8fFxuICAgICAgICAgICAgZGlyZWN0aW9uID09PSAnYmFja3dhcmQnICYmIG9wdGlvbnMudG8gPT09ICdiZWdpbm5pbmcnKSB7XG4gICAgICAgICAgICB0b0VuZE9mTm9uV2hpdGVTcGFjZVNlcXVlbmNlKG1vdmVUb05leHRDaGFyLCBpc0xpbWl0aW5nQ2hhcmFjdGVyKTtcbiAgICAgICAgICAgIGlmICghaXNMaW1pdGluZ0NoYXJhY3RlcigpKSB7XG4gICAgICAgICAgICAgICAgbW92ZVRvUHJldmlvdXNDaGFyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hhbWJlci5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSAmJiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzTGF6ZXJCZWFtKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20oY2hhbWJlci5zcGF3blBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmxvY2tpbmcoKSkge1xuICAgICAgICAgICAgY3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ21vdmUgdG8gZW5kIG9mIHRleHQnOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGN1cnNvci5zYXZlQ3VycmVudFBvc2l0aW9uKCk7XG5cbiAgICAgICAgdmFyIGFkamFjZW50Q2VsbCA9IGdldEFkamFjZW50VGV4dENlbGwob3B0aW9ucy5kaXJlY3Rpb24pO1xuICAgICAgICB3aGlsZSAoYWRqYWNlbnRDZWxsKSB7XG4gICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKGFkamFjZW50Q2VsbCk7XG4gICAgICAgICAgICBhZGphY2VudENlbGwgPSBnZXRBZGphY2VudFRleHRDZWxsKG9wdGlvbnMuZGlyZWN0aW9uKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGFtYmVyLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddICYmIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNMYXplckJlYW0oKSkge1xuICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShjaGFtYmVyLnNwYXduUG9zaXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG4gICAgICAgICAgICBjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAnbW92ZSB0byBlbmQgb2YgbGluZSc6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgY3Vyc29yLnNhdmVDdXJyZW50UG9zaXRpb24oKTtcblxuICAgICAgICB2YXIgYWRqYWNlbnRDZWxsID0gZ2V0QWRqYWNlbnRUZXh0Q2VsbEluU2FtZUxpbmUob3B0aW9ucy5kaXJlY3Rpb24pO1xuICAgICAgICB3aGlsZSAoYWRqYWNlbnRDZWxsKSB7XG4gICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKGFkamFjZW50Q2VsbCk7XG4gICAgICAgICAgICBhZGphY2VudENlbGwgPSBnZXRBZGphY2VudFRleHRDZWxsSW5TYW1lTGluZShvcHRpb25zLmRpcmVjdGlvbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hhbWJlci5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSAmJiBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzTGF6ZXJCZWFtKCkpIHtcbiAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20oY2hhbWJlci5zcGF3blBvc2l0aW9uKTtcbiAgICAgICAgfSBlbHNlIGlmIChjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLmlzQmxvY2tpbmcoKSkge1xuICAgICAgICAgICAgY3Vyc29yLnJlc3RvcmVUb1NhdmVkUG9zaXRpb24oKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ21vdmUgdG8gYmVnaW5uaW5nIG9mIGxpbmUgbnVtYmVyJzogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgICBjdXJzb3Iuc2F2ZUN1cnJlbnRQb3NpdGlvbigpO1xuXG4gICAgICAgIHRoaXNbJ21vdmUgdG8gZW5kIG9mIGxpbmUnXSh7XG4gICAgICAgICAgICBkaXJlY3Rpb246ICdiYWNrd2FyZCdcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciB0YXJnZXRMaW5lTnVtYmVyID0gb3B0aW9ucy5saW5lTnVtYmVyLFxuICAgICAgICAgICAgbGluZU51bWJlckNlbGwgPSBjaGFtYmVyLm1hdHJpeFtjdXJzb3Iucm93XVtjdXJzb3IuY29sdW1uIC0gMV0sXG4gICAgICAgICAgICBjdXJyZW50TGluZU51bWJlciA9IGxpbmVOdW1iZXJDZWxsLmxpbmVOdW1iZXIsXG4gICAgICAgICAgICBzdGVwID0gdGFyZ2V0TGluZU51bWJlciA+IGN1cnJlbnRMaW5lTnVtYmVyID8gMSA6IC0xO1xuICAgICAgICB3aGlsZSAoY3VycmVudExpbmVOdW1iZXIgJiYgY3VycmVudExpbmVOdW1iZXIgIT09IHRhcmdldExpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgIGN1cnNvci5yb3cgKz0gc3RlcDtcbiAgICAgICAgICAgIGxpbmVOdW1iZXJDZWxsID0gY2hhbWJlci5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbiAtIDFdO1xuICAgICAgICAgICAgY3VycmVudExpbmVOdW1iZXIgPSBsaW5lTnVtYmVyQ2VsbC5saW5lTnVtYmVyO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY3VycmVudExpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgIGN1cnNvci5yb3cgLT0gc3RlcDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjaGFtYmVyLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddICYmIGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNMYXplckJlYW0oKSkge1xuICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShjaGFtYmVyLnNwYXduUG9zaXRpb24pO1xuICAgICAgICB9IGVsc2UgaWYgKGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCkuaXNCbG9ja2luZygpKSB7XG4gICAgICAgICAgICBjdXJzb3IucmVzdG9yZVRvU2F2ZWRQb3NpdGlvbigpO1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsInZhciBjb25zb2xlO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgY29uc29sZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNjb25zb2xlJyk7XG59XG5cbnZhciBwcmludFRleHQgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgdmFyIGxpbmUgPSB0ZXh0LnNoaWZ0KCk7XG4gICAgaWYgKGxpbmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB3aW5kb3cuc2V0VGltZW91dCAoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLmlubmVySFRNTCArPSB0ZXh0LmJ5ICsgbGluZSArICc8YnI+JztcbiAgICAgICAgICAgIGNvbnNvbGUuc2Nyb2xsVG9wICs9MTAwO1xuICAgICAgICAgICAgcHJpbnRUZXh0KHRleHQpO1xuICAgICAgICB9LCBsaW5lLmxlbmd0aCAqIDQwKTtcbiAgICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odGV4dCkge1xuICAgIGlmICghQXJyYXkuaXNBcnJheSh0ZXh0KSkge1xuICAgICAgICB0ZXh0ID0gW3RleHRdO1xuICAgIH1cbiAgICB0ZXh0LmJ5ID0gdGV4dC5ieSA/IHRleHQuYnkgKyAnPiAnIDogJyc7XG4gICAgcHJpbnRUZXh0KHRleHQpO1xufTtcbiIsInZhciBwcmludFRleHQgPSByZXF1aXJlKCcuL3ByaW50LmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0ZmluZEFuZFRyeVRvS2lsbDogZnVuY3Rpb24oY3Vyc29yLCBjaGFtYmVyKSB7XG5cdC8vIGFkZCBzb21lIGZ1bm55IGV4Y3VzZSBmb3IgdGhlIGtpbGwgZnJvbSB0dXJyZXRcblx0XHRpZiAodGhpcy5pc1Nob290aW5nIHx8IHRoaXMuY2VsbC5pc0RlYWN0aXZhdGVkVHVycmV0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciB0dXJyZXQgPSB0aGlzLFxuXHRcdHJpc2UgPSBjdXJzb3Iucm93IC0gdHVycmV0LnJvdyxcblx0XHRydW4gPSBjdXJzb3IuY29sdW1uIC0gdHVycmV0LmNvbHVtbixcblx0XHRjb3VudCA9IE1hdGgubWF4KE1hdGguYWJzKHJpc2UpLCBNYXRoLmFicyhydW4pKSxcblx0XHR0b3RhbCA9IGNvdW50LFxuXHRcdHBhdGggPSBbXSxcblx0XHRjZWxsO1xuXHRcdGlmICghcmlzZSAmJiAhcnVuKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDw9IGNvdW50OyBpKyspIHtcblx0XHRcdGNlbGwgPSBjaGFtYmVyLm1hdHJpeFtNYXRoLnJvdW5kKHR1cnJldC5yb3cgKyByaXNlKihpL3RvdGFsKSldW01hdGgucm91bmQodHVycmV0LmNvbHVtbiArIHJ1biooaS90b3RhbCkpXTtcblx0XHRcdGlmICghY2VsbC5pc0xhemVyQmVhbSgpICYmIGNlbGwuaXNCbG9ja2luZygpKSB7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNlbGwgIT09IHR1cnJldC5jZWxsICYmIHBhdGguaW5kZXhPZihjZWxsKSA9PT0gLTEpIHtcblx0XHRcdFx0cGF0aC5wdXNoKGNlbGwpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGNlbGwucm93ID09PSBjdXJzb3Iucm93ICYmIGNlbGwuY29sdW1uID09PSBjdXJzb3IuY29sdW1uKSB7XG5cdFx0XHRcdHR1cnJldC50cnlUb0tpbGwoY3Vyc29yLCBjaGFtYmVyLCBwYXRoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHR0cnlUb0tpbGw6IGZ1bmN0aW9uKGN1cnNvciwgY2hhbWJlciwgcGF0aCkge1xuXHRcdHZhciB0dXJyZXQgPSB0aGlzO1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaXNDdXJzb3JVbmRlckxhemVyID0gIXBhdGguZXZlcnkoZnVuY3Rpb24oY2VsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhY2VsbC5pc1VuZGVyQ3Vyc29yO1xuICAgICAgICAgICAgfSk7XG5cdFx0XHRpZiAoaXNDdXJzb3JVbmRlckxhemVyKSB7XG5cdFx0XHRcdHR1cnJldC5pc1Nob290aW5nID0gdHJ1ZTtcblx0XHRcdFx0cGF0aC5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwpIHtcblx0XHRcdFx0XHRjZWxsLmlzVW5kZXJUdXJyZXRGaXJlID0gdHJ1ZTtcblx0XHRcdFx0fSk7XG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSAndHVycmV0PiAnICsgW1xuICAgICAgICAgICAgICAgICAgICAnSSBkaWQgbm90IG1lYW4gdG8uJyxcbiAgICAgICAgICAgICAgICAgICAgJ1RoZXkgbWFkZSBtZSBkbyB0aGlzLicsXG4gICAgICAgICAgICAgICAgICAgICdJIGFtIHRydWxseSBzb3JyeS4nLFxuICAgICAgICAgICAgICAgICAgICAnU29tZXRpbWVzIEkgY2FuIG5vdCBoZWxwIG15c2VsZi4nLFxuICAgICAgICAgICAgICAgICAgICAnV2F0Y2ggb3V0LicsXG4gICAgICAgICAgICAgICAgICAgICdQbGVhc2UgZG8gbm90IHRoaW5rIGxlc3Mgb2YgbWUuJ1xuICAgICAgICAgICAgICAgIF1bTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMyldO1xuICAgICAgICAgICAgICAgIHByaW50VGV4dChtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBpZiAocmVxdWlyZSgnLi9jaGFtYmVyLmpzJykuY29uZmlndXJhdGlvblsna2lsbGluZyBtb2RlIG9uJ10pIHtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnNldFBvc2l0aW9uRnJvbShyZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5zcGF3blBvc2l0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG5cdFx0XHRcdGNoYW1iZXIucmVuZGVyKCk7XG5cdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHR1cnJldC5pc1Nob290aW5nID0gZmFsc2U7XG5cdFx0XHRcdFx0cGF0aC5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwpIHtcblx0XHRcdFx0XHRcdGNlbGwuaXNVbmRlclR1cnJldEZpcmUgPSBmYWxzZTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRjaGFtYmVyLnJlbmRlcigpO1xuXHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHR1cnJldC5maW5kQW5kVHJ5VG9LaWxsKGN1cnNvciwgY2hhbWJlcik7XG5cdFx0XHR9XG5cdFx0fSwgMTAwMCk7XG5cdH1cbn07XG4iXX0=
