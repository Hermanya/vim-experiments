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

},{"./cell-decorator.js":1,"./cursor.js":4,"./matrix-decorator.js":6,"./turret-decorator.js":8}],3:[function(require,module,exports){
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
                    mainFunction(JSON.parse(xmlhttp.responseText));
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

},{"./chamber.js":2,"./print.js":7}],4:[function(require,module,exports){
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

},{"./commands.js":3,"./print.js":7}],5:[function(require,module,exports){
module.exports=require(4)
},{"./commands.js":3,"./print.js":7}],6:[function(require,module,exports){
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
},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{"./chamber.js":2,"./print.js":7}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jaGFtYmVyLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kcy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvY3Vyc29yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9tYXRyaXgtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9wcmludC5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvdHVycmV0LWRlY29yYXRvci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0aXNXYWxsOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gWycrJywgJy0nLCAnfCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJ1YnLCAnXicsICc+JywgJzwnXS5pbmRleE9mKHRoaXMuY2hhcmFjdGVyKSAhPT0gLTEgJiYgIXRoaXMuaXNUZXh0O1xuXHR9LFxuXHRpc0xhemVyQmVhbTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNWZXJ0aWNhbExhemVyQmVhbSB8fCB0aGlzLmlzSG9yaXpvbnRhbExhemVyQmVhbTtcblx0fSxcblx0aXNCbG9ja2luZzogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuaXNXYWxsKCkgfHwgdGhpcy5pc0xhemVyKCkgfHwgdGhpcy5pc0xhemVyQmVhbSgpO1xuXHR9LFxuXHR0b1N0cmluZzogZnVuY3Rpb24oY29uZmlndXJhdGlvbikge1xuXHRcdHZhciBwcm9wZXJ0eVRvQ2xhc3NOYW1lID0ge1xuXHRcdFx0XHQnaXNUZXh0JzogJ3RleHQnLFxuXHRcdFx0XHQnaXNVbmRlckN1cnNvcic6ICdjdXJzb3InLFxuXHRcdFx0XHQnaXNWZXJ0aWNhbExhemVyQmVhbSc6ICd2ZXJ0aWNhbC1sYXplci1iZWFtJyxcblx0XHRcdFx0J2lzSG9yaXpvbnRhbExhemVyQmVhbSc6ICdob3Jpem9udGFsLWxhemVyLWJlYW0nLFxuXHRcdFx0XHQnaXNVbmRlclR1cnJldEZpcmUnOiAndHVycmV0LWZpcmUnXG5cdFx0XHR9LFxuXHRcdFx0Y2xhc3NOYW1lcyA9IE9iamVjdC5rZXlzKHByb3BlcnR5VG9DbGFzc05hbWUpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXNba2V5XTtcblx0XHRcdH0uYmluZCh0aGlzKSkubWFwKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gcHJvcGVydHlUb0NsYXNzTmFtZVtrZXldO1xuXHRcdFx0fSkuam9pbignICcpO1xuICAgICAgICBpZiAodGhpcy5saW5lTnVtYmVyKSB7XG4gICAgICAgICAgICB0aGlzLmNoYXJhY3RlciA9IGNvbmZpZ3VyYXRpb25bJ2Rpc3BsYXkgbGluZSBudW1iZXJzJ10gPyB0aGlzLmxpbmVOdW1iZXIgOiAnICc7XG4gICAgICAgIH1cblxuXHRcdHJldHVybiAnPHNwYW4gIGNsYXNzPVwiJyArIGNsYXNzTmFtZXMgKyAnXCI+JyArIHRoaXMuY2hhcmFjdGVyICsgJzwvc3Bhbj4nO1xuXHR9XG59O1xuIiwidmFyIG1hdHJpeERlY29yYXRvciA9IHJlcXVpcmUoJy4vbWF0cml4LWRlY29yYXRvci5qcycpLFxuXHRjZWxsRGVjb3JhdG9yID0gcmVxdWlyZSgnLi9jZWxsLWRlY29yYXRvci5qcycpLFxuXHR0dXJyZXREZWNvcmF0b3IgPSByZXF1aXJlKCcuL3R1cnJldC1kZWNvcmF0b3IuanMnKSxcblx0Y3Vyc29yID0gcmVxdWlyZSgnLi9jdXJzb3IuanMnKTtcblxudmFyIGNoYW1iZXIgPSBPYmplY3QuY3JlYXRlKG1hdHJpeERlY29yYXRvcik7XG5cbmNoYW1iZXIuZnJvbUpTT04gPSBmdW5jdGlvbihqc29uKSB7XG5cdHRoaXMuZnJvbUFycmF5T2ZTdHJpbmdzKGpzb24uc2NlbmUpO1xuXHRPYmplY3Qua2V5cyhqc29uKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0cmV0dXJuIGtleSAhPT0gJ3NjZW5lJztcblx0fSkuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHR0aGlzW2tleV0gPSBqc29uW2tleV07XG5cdH0uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5jb25maWd1cmF0aW9uID0ganNvbi5jb25maWd1cmF0aW9uIHx8IHt9O1xufTtcblxuY2hhbWJlci5pbml0aWFsaXplID0gZnVuY3Rpb24oKSB7XG5cdHRoaXMucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMoKTtcblx0dGhpcy5tYXJrVGV4dCgpO1xuXHR0aGlzLm1hcmtMYXplcnMoKTtcblx0dGhpcy5tYXJrQ3Vyc29yKCk7XG5cdHRoaXMubWFya1R1cnJldHMoKTtcbn07XG5cbmNoYW1iZXIucmVwbGFjZUNoYXJhY3RlcnNXaXRoQ2VsbHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIGNoYW1iZXIgPSB0aGlzO1xuXHRjaGFtYmVyLm1hdHJpeCA9IGNoYW1iZXIubWFwKGZ1bmN0aW9uKGNoYXJhY3Rlciwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoY2hhcmFjdGVyID09PSAnQCcpIHtcblx0XHRcdGNoYW1iZXIuc3Bhd25Qb3NpdGlvbiA9IHtcblx0XHRcdFx0cm93OiByb3csXG5cdFx0XHRcdGNvbHVtbjogY29sdW1uXG5cdFx0XHR9O1xuXHRcdH1cblx0XHR2YXIgY2VsbCA9IE9iamVjdC5jcmVhdGUoY2VsbERlY29yYXRvcik7XG5cdFx0Y2VsbC5yb3cgPSByb3c7XG5cdFx0Y2VsbC5jb2x1bW4gPSBjb2x1bW47XG5cdFx0Y2VsbC5jaGFyYWN0ZXIgPSBjaGFyYWN0ZXI7XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5tYXJrQ3Vyc29yID0gZnVuY3Rpb24oKSB7XG5cdGN1cnNvci5yZXNldCgpO1xuXHRjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKHRoaXMuc3Bhd25Qb3NpdGlvbik7XG59O1xuXG5jaGFtYmVyLm1hcmtUZXh0ID0gZnVuY3Rpb24oKSB7XG5cdHZhciBpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IGZhbHNlLFxuXHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSxcbiAgICAgICAgcHJldmlvdXNCZWdpbm5pbmdPZkxpbmU7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoaXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MpIHtcblx0XHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJ2AnKSB7XG5cdFx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2U7XG5cdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IGNoYW1iZXIubWF0cml4W3Jvd11bY29sdW1uIC0gMV07XG5cdFx0XHRcdGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y2VsbC5pc1RleHQgPSB0cnVlO1xuXHRcdFx0XHRpZiAobGFzdENlbGxJblNlcXVlbmNlKSB7XG5cdFx0XHRcdFx0aWYgKE1hdGguYWJzKGxhc3RDZWxsSW5TZXF1ZW5jZS5yb3cgLSBjZWxsLnJvdykgPT09IDEpIHtcblx0XHRcdFx0XHRcdGNlbGwucHJldmlvdXNUZXh0Q2VsbCA9IGxhc3RDZWxsSW5TZXF1ZW5jZTtcblx0XHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZS5uZXh0VGV4dENlbGwgPSBjZWxsO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKGNlbGwuY2hhcmFjdGVyID09PSAnYCcpIHtcblx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gdHJ1ZTtcbiAgICAgICAgICAgIHByZXZpb3VzQmVnaW5uaW5nT2ZMaW5lID0gY2hhbWJlci5tYXRyaXhbcm93IC0gMV1bY29sdW1uXTtcbiAgICAgICAgICAgIGlmIChwcmV2aW91c0JlZ2lubmluZ09mTGluZS5saW5lTnVtYmVyKSB7XG4gICAgICAgICAgICAgICAgY2VsbC5saW5lTnVtYmVyID0gcHJldmlvdXNCZWdpbm5pbmdPZkxpbmUubGluZU51bWJlciArIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGxhc3RDZWxsSW5TZXF1ZW5jZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICBjZWxsLmxpbmVOdW1iZXIgPSAxO1xuICAgICAgICAgICAgfVxuXHRcdH1cblxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya0xhemVycyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbWF0cml4ID0gdGhpcy5tYXRyaXg7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHR2YXIgY2hhcmFjdGVyID0gY2VsbC5jaGFyYWN0ZXIsXG5cdFx0XHRpc1ZlcnRpY2FsTGF6ZXJCZWFtID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBbJzwnLCc+J10uaW5kZXhPZihjaGFyYWN0ZXIpID09PSAtMTtcblx0XHRcdH0sXG5cdFx0XHRiZWFtUHJvcGVydHkgPSBpc1ZlcnRpY2FsTGF6ZXJCZWFtKCkgPyAnaXNWZXJ0aWNhbExhemVyQmVhbScgOiAnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJyxcblx0XHRcdGlzQmVhbUNvbnRpbnVpbmcgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNMYXplckJlYW0oKSB8fCAhbWF0cml4W3Jvd11bY29sdW1uXS5pc0Jsb2NraW5nKCk7XG5cdFx0XHR9LFxuXHRcdFx0bmV4dCA9IHtcblx0XHRcdFx0J1YnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3JvdysrXVtjb2x1bW5dO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnXic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93LS1dW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc+JzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbisrXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0JzwnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uLS1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9W2NoYXJhY3Rlcl07XG5cdFx0aWYgKG5leHQpIHtcblx0XHRcdG5leHQoKTtcblx0XHRcdHdoaWxlIChpc0JlYW1Db250aW51aW5nKCkpIHtcblx0XHRcdFx0bmV4dCgpW2JlYW1Qcm9wZXJ0eV0gPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLm1hcmtUdXJyZXRzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBjaGFtYmVyID0gdGhpcztcblx0dGhpcy50dXJyZXRzID0gW107XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHRpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICcmJykge1xuXHRcdFx0dmFyIHR1cnJldCA9IE9iamVjdC5jcmVhdGUodHVycmV0RGVjb3JhdG9yKTtcblx0XHRcdHR1cnJldC5yb3cgPSByb3c7XG5cdFx0XHR0dXJyZXQuY29sdW1uID0gY29sdW1uO1xuXHRcdFx0dHVycmV0LmNlbGwgPSBjZWxsO1xuXHRcdFx0Y2hhbWJlci50dXJyZXRzLnB1c2godHVycmV0KTtcblx0XHR9XG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMubWF0cml4W2N1cnNvci5yb3ddW2N1cnNvci5jb2x1bW5dO1xufTtcblxuY2hhbWJlci5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0dmFyIGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjc2NlbmUnKTtcblx0ZWxlbWVudC5pbm5lckhUTUwgPSBjaGFtYmVyLm1hdHJpeC5tYXAoZnVuY3Rpb24oYXJyYXkpIHtcblx0XHRhcnJheSA9IGFycmF5Lm1hcChmdW5jdGlvbihjZWxsKSB7XG5cdFx0XHRjZWxsLmlzVW5kZXJDdXJzb3IgPSBjZWxsLnJvdyA9PT0gY3Vyc29yLnJvdyAmJiBjZWxsLmNvbHVtbiA9PT0gY3Vyc29yLmNvbHVtbjtcbiAgICAgICAgICAgIGNlbGwgPSBjZWxsLnRvU3RyaW5nKGNoYW1iZXIuY29uZmlndXJhdGlvbik7XG4gICAgICAgICAgICByZXR1cm4gY2VsbDtcblx0XHR9KTtcblx0XHRyZXR1cm4gYXJyYXkuam9pbignJyk7XG5cdH0pLmpvaW4oJzxicj4nKTtcbn07XG5cbmNoYW1iZXIuYWN0T25DdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0dGhpcy50dXJyZXRzLmZvckVhY2goZnVuY3Rpb24odHVycmV0KSB7XG5cdFx0dHVycmV0LmZpbmRBbmRUcnlUb0tpbGwoY3Vyc29yLCBjaGFtYmVyKTtcblx0fSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNoYW1iZXI7XG4iLCJ2YXIgY29tbWFuZHMgPSB7fSxcbiAgICBtYWluRnVuY3Rpb24sXG4gICAgcHJpbnRUZXh0ID0gcmVxdWlyZSgnLi9wcmludC5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcztcblxuY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSA9IGZ1bmN0aW9uKGNoYW1iZXJOdW1iZXIpIHtcbiAgICB2YXIgeG1saHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHhtbGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh4bWxodHRwLnJlYWR5U3RhdGUgIT09IDQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZGVmYXVsdEFjdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hbGVydCh4bWxodHRwLnN0YXR1cyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWN0aW9uID0ge1xuICAgICAgICAgICAgICAgICcyMDAnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmNoYW1iZXIgPSBjaGFtYmVyTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICBtYWluRnVuY3Rpb24oSlNPTi5wYXJzZSh4bWxodHRwLnJlc3BvbnNlVGV4dCkpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJzQwNCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuYWxlcnQoJ1RoaXMgaXMgdGhlIGxhc3QgY2hhbWJlciBhdCB0aGlzIG1vbWVudC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnTmV4dCB5b3UgYXJlIGdvaW5nIHRvIGJlIHJlZGlyZWN0ZWQgdG8gdGhlIHJlcG8gb2YgdGhpcyBnYW1lLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdMZXQgbWUga25vdyB5b3VyIGZhdm9yaXRlIFZJTSBmZWF0dXJlcyB3aGljaCBhcmUgbWlzc2luZy4nKTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9naXRodWIuY29tL2hlcm1hbnlhL3ZpbS1leHBlcmltZW50cyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVt4bWxodHRwLnN0YXR1c10gfHwgZGVmYXVsdEFjdGlvbjtcbiAgICAgICAgYWN0aW9uKCk7XG5cbiAgICB9O1xuICAgIGNoYW1iZXJOdW1iZXIgPSBjaGFtYmVyTnVtYmVyIHx8IGxvY2FsU3RvcmFnZS5jaGFtYmVyIHx8IDA7XG4gICAgeG1saHR0cC5vcGVuKCdHRVQnLCAnLi9jaGFtYmVycy8nICsgY2hhbWJlck51bWJlciArICcuanNvbicsIHRydWUpO1xuICAgIHhtbGh0dHAuc2VuZCgpO1xufTtcblxuY29tbWFuZHNbJ3NldCBudW1iZXInXSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2Rpc3BsYXkgbGluZSBudW1iZXJzJ10gPSB0cnVlO1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLnJlbmRlcigpO1xufTtcbmNvbW1hbmRzWydzZXQgbnUnXSA9IGNvbW1hbmRzWydzZXQgbnVtYmVyJ107XG5cbmNvbW1hbmRzWydzZXQgbm9udW1iZXInXSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2Rpc3BsYXkgbGluZSBudW1iZXJzJ10gPSBmYWxzZTtcbiAgICByZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5yZW5kZXIoKTtcbn07XG5jb21tYW5kc1snc2V0IG5vbnUnXSA9IGNvbW1hbmRzWydzZXQgbm9udW1iZXInXTtcblxuY29tbWFuZHNbJ2Nha2UgaXMgYSBsaWUnXSA9IGZ1bmN0aW9uKCkge1xuICAgIHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddID0gdHJ1ZTtcbiAgICBwcmludFRleHQoWycnLCdOb3cgeW91IGFyZSBnb2luZyB0byBkaWUuIEV2ZXJ5IHRpbWUuJywnJ10pO1xufTtcblxuY29tbWFuZHMubG9hZE5leHRDaGFtYmVyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG5leHRDaGFtYmVyTnVtYmVyID0gTnVtYmVyKGxvY2FsU3RvcmFnZS5jaGFtYmVyKSArIDE7XG4gICAgY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXShuZXh0Q2hhbWJlck51bWJlcik7XG59O1xuXG5jb21tYW5kc1snaW5pdGlhbGl6ZSBjaGFtYmVyJ10gPSBmdW5jdGlvbihtYWluKSB7XG4gICAgbWFpbkZ1bmN0aW9uID0gbWFpbjtcbiAgICBjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKCk7XG59O1xuIiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpLFxuICAgIHByaW50VGV4dCA9IHJlcXVpcmUoJy4vcHJpbnQuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHNjb3JlOiAwLFxuICAgIGFjdE9uQ3VycmVudENlbGw6IGZ1bmN0aW9uKGNoYW1iZXIpIHtcbiAgICAgICAgdmFyIGN1cnNvciA9IHRoaXMsXG4gICAgICAgICAgICBjZWxsID0gY2hhbWJlci5nZXRDZWxsVW5kZXJDdXJzb3IoKSxcbiAgICAgICAgICAgIGFjdGlvbiA9IHtcbiAgICAgICAgICAgICAgICAnKic6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjZWxsLmNoYXJhY3RlciA9ICcgJztcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLnNjb3JlKys7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnTyc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3IuaGFzQ29tcGxldGVkTGV2ZWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29uZ3JhdHVsYXRpb25NZXNzYWdlID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgJzAnOiAnWW91IGRpZCBpdCwgSSBhbSBib3JlZCB3YXRjaGluZyB5b3UuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcxJzogJ09ubHkgb25lIHBhdGhldGljIHN0YXI/JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICcyJzogJ0RpZCB5b3UgZXZlbiB0cnk/J1xuICAgICAgICAgICAgICAgICAgICB9W2N1cnNvci5zY29yZV0gfHwgJ1NhdGlzZnlpbmcgcGVyZm9ybWFjZS4nO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW50VGV4dChbJycsIGNvbmdyYXR1bGF0aW9uTWVzc2FnZSwgJyddKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlcigpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAnJic6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjZWxsLmlzRGVhY3RpdmF0ZWRUdXJyZXQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjZWxsLmNoYXJhY3RlciA9ICcgPGRpdiBjbGFzcz1cImRlYWN0aXZhdGVkLXR1cnJldFwiPiY8L2Rpdj4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1bY2VsbC5jaGFyYWN0ZXJdO1xuICAgICAgICBpZiAoIWNlbGwuaXNUZXh0ICYmIGFjdGlvbikge1xuICAgICAgICAgICAgYWN0aW9uKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5oYXNDb21wbGV0ZWRMZXZlbCA9IGZhbHNlO1xuICAgICAgICB0aGlzLnNjb3JlID0gMDtcbiAgICAgICAgdGhpcy5mb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KCk7XG4gICAgfSxcbiAgICBzZXRQb3NpdGlvbkZyb206IGZ1bmN0aW9uKGFub3RoZXJPYmplY3QpIHtcbiAgICAgICAgdGhpcy5jb2x1bW4gPSBhbm90aGVyT2JqZWN0LmNvbHVtbjtcbiAgICAgICAgdGhpcy5yb3cgPSBhbm90aGVyT2JqZWN0LnJvdztcbiAgICB9LFxuICAgIHJlbWVtYmVyQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCkge1xuICAgICAgICAgICAgdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCA9IHRoaXMuY29sdW1uO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBmb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ7XG4gICAgfSxcbiAgICBzYXZlQ3VycmVudFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5zYXZlZENvbHVtbiA9IHRoaXMuY29sdW1uO1xuICAgICAgICB0aGlzLnNhdmVkUm93ID0gdGhpcy5yb3c7XG4gICAgfSxcbiAgICByZXN0b3JlVG9TYXZlZFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jb2x1bW4gPSB0aGlzLnNhdmVkQ29sdW1uO1xuICAgICAgICB0aGlzLnJvdyA9IHRoaXMuc2F2ZWRSb3c7XG4gICAgfVxufTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRmcm9tQXJyYXlPZlN0cmluZ3M6IGZ1bmN0aW9uIChhcnJheU9mU3RyaW5ncykge1xuXHRcdHRoaXMubWF0cml4ID0gYXJyYXlPZlN0cmluZ3MubWFwKGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHN0cmluZy5zcGxpdCgnJyk7XG5cdFx0fSk7XG5cdH0sXG5cdG1hcDogZnVuY3Rpb24oZm4pIHtcblx0XHRyZXR1cm4gdGhpcy5tYXRyaXgubWFwKGZ1bmN0aW9uKGFycmF5LCByb3cpIHtcblx0XHRcdHJldHVybiBhcnJheS5tYXAoZnVuY3Rpb24oaXRlbSwgY29sdW1uKSB7XG5cdFx0XHRcdHJldHVybiBmbihpdGVtLCByb3csIGNvbHVtbik7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fSxcblx0Z2V0Q29vcmRpbmF0ZXNPZjogZnVuY3Rpb24gKHRoaW5nVG9GaW5kKSB7XG5cdFx0dmFyIHByZWRpY2F0ZTtcblx0XHRpZiAodHlwZW9mIHRoaW5nVG9GaW5kID09PSAnc3RyaW5nJykge1xuXHRcdFx0cHJlZGljYXRlID0gZnVuY3Rpb24oc3RyaW5nLCBhbm90aGVyU3RyaW5nKSB7XG5cdFx0XHRcdHJldHVybiBzdHJpbmcgPT09IGFub3RoZXJTdHJpbmc7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRpZiAodHlwZW9mIHRoaW5nVG9GaW5kID09PSAnb2JqZWN0Jykge1xuXHRcdFx0cHJlZGljYXRlID0gZnVuY3Rpb24odGhpbmdUb0ZpbmQsIGFub3RoZXJPYmplY3QpIHtcblx0XHRcdFx0cmV0dXJuIE9iamVjdC5rZXlzKHRoaW5nVG9GaW5kKS5maWx0ZXIoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaW5nVG9GaW5kW2tleV0gIT09IGFub3RoZXJPYmplY3Rba2V5XTtcblx0XHRcdFx0fSkubGVuZ3RoID09PSAwO1xuXG5cdFx0XHR9O1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5tYXRyaXgucmVkdWNlKGZ1bmN0aW9uKGZvdW5kLCBhcnJheSwgcm93KSB7XG5cdFx0XHRhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGNlbGwsIGNvbHVtbikge1xuXHRcdFx0XHRpZiAocHJlZGljYXRlKHRoaW5nVG9GaW5kLCBjZWxsKSkge1xuXHRcdFx0XHRcdGZvdW5kLnB1c2goe1xuXHRcdFx0XHRcdFx0cm93OiByb3csXG5cdFx0XHRcdFx0XHRjb2x1bW46IGNvbHVtblxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybiBmb3VuZDtcblx0XHR9LCBbXSk7XG5cdH1cbn07IiwidmFyIGNvbnNvbGU7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBjb25zb2xlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvbnNvbGUnKTtcbn1cblxudmFyIHByaW50VGV4dCA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICB2YXIgbGluZSA9IHRleHQuc2hpZnQoKTtcbiAgICBpZiAobGluZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuaW5uZXJIVE1MICs9IHRleHQuYnkgKyBsaW5lICsgJzxicj4nO1xuICAgICAgICAgICAgY29uc29sZS5zY3JvbGxUb3AgKz0xMDA7XG4gICAgICAgICAgICBwcmludFRleHQodGV4dCk7XG4gICAgICAgIH0sIGxpbmUubGVuZ3RoICogNDApO1xuICAgIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHRleHQpKSB7XG4gICAgICAgIHRleHQgPSBbdGV4dF07XG4gICAgfVxuICAgIHRleHQuYnkgPSB0ZXh0LmJ5ID8gdGV4dC5ieSArICc+ICcgOiAnJztcbiAgICBwcmludFRleHQodGV4dCk7XG59O1xuIiwidmFyIHByaW50VGV4dCA9IHJlcXVpcmUoJy4vcHJpbnQuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuXHRmaW5kQW5kVHJ5VG9LaWxsOiBmdW5jdGlvbihjdXJzb3IsIGNoYW1iZXIpIHtcblx0Ly8gYWRkIHNvbWUgZnVubnkgZXhjdXNlIGZvciB0aGUga2lsbCBmcm9tIHR1cnJldFxuXHRcdGlmICh0aGlzLmlzU2hvb3RpbmcgfHwgdGhpcy5jZWxsLmlzRGVhY3RpdmF0ZWRUdXJyZXQpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dmFyIHR1cnJldCA9IHRoaXMsXG5cdFx0cmlzZSA9IGN1cnNvci5yb3cgLSB0dXJyZXQucm93LFxuXHRcdHJ1biA9IGN1cnNvci5jb2x1bW4gLSB0dXJyZXQuY29sdW1uLFxuXHRcdGNvdW50ID0gTWF0aC5tYXgoTWF0aC5hYnMocmlzZSksIE1hdGguYWJzKHJ1bikpLFxuXHRcdHRvdGFsID0gY291bnQsXG5cdFx0cGF0aCA9IFtdLFxuXHRcdGNlbGw7XG5cdFx0aWYgKCFyaXNlICYmICFydW4pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPD0gY291bnQ7IGkrKykge1xuXHRcdFx0Y2VsbCA9IGNoYW1iZXIubWF0cml4W01hdGgucm91bmQodHVycmV0LnJvdyArIHJpc2UqKGkvdG90YWwpKV1bTWF0aC5yb3VuZCh0dXJyZXQuY29sdW1uICsgcnVuKihpL3RvdGFsKSldO1xuXHRcdFx0aWYgKCFjZWxsLmlzTGF6ZXJCZWFtKCkgJiYgY2VsbC5pc0Jsb2NraW5nKCkpIHtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2VsbCAhPT0gdHVycmV0LmNlbGwgJiYgcGF0aC5pbmRleE9mKGNlbGwpID09PSAtMSkge1xuXHRcdFx0XHRwYXRoLnB1c2goY2VsbCk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoY2VsbC5yb3cgPT09IGN1cnNvci5yb3cgJiYgY2VsbC5jb2x1bW4gPT09IGN1cnNvci5jb2x1bW4pIHtcblx0XHRcdFx0dHVycmV0LnRyeVRvS2lsbChjdXJzb3IsIGNoYW1iZXIsIHBhdGgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cdH0sXG5cdHRyeVRvS2lsbDogZnVuY3Rpb24oY3Vyc29yLCBjaGFtYmVyLCBwYXRoKSB7XG5cdFx0dmFyIHR1cnJldCA9IHRoaXM7XG5cdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdHZhciBpc0N1cnNvclVuZGVyTGF6ZXIgPSAhcGF0aC5ldmVyeShmdW5jdGlvbihjZWxsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFjZWxsLmlzVW5kZXJDdXJzb3I7XG4gICAgICAgICAgICB9KTtcblx0XHRcdGlmIChpc0N1cnNvclVuZGVyTGF6ZXIpIHtcblx0XHRcdFx0dHVycmV0LmlzU2hvb3RpbmcgPSB0cnVlO1xuXHRcdFx0XHRwYXRoLmZvckVhY2goZnVuY3Rpb24oY2VsbCkge1xuXHRcdFx0XHRcdGNlbGwuaXNVbmRlclR1cnJldEZpcmUgPSB0cnVlO1xuXHRcdFx0XHR9KTtcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZSA9ICd0dXJyZXQ+ICcgKyBbXG4gICAgICAgICAgICAgICAgICAgICdJIGRpZCBub3QgbWVhbiB0by4nLFxuICAgICAgICAgICAgICAgICAgICAnVGhleSBtYWRlIG1lIGRvIHRoaXMuJyxcbiAgICAgICAgICAgICAgICAgICAgJ0kgYW0gdHJ1bGx5IHNvcnJ5LicsXG4gICAgICAgICAgICAgICAgICAgICdTb21ldGltZXMgSSBjYW4gbm90IGhlbHAgbXlzZWxmLicsXG4gICAgICAgICAgICAgICAgICAgICdXYXRjaCBvdXQuJyxcbiAgICAgICAgICAgICAgICAgICAgJ1BsZWFzZSBkbyBub3QgdGhpbmsgbGVzcyBvZiBtZS4nXG4gICAgICAgICAgICAgICAgXVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzKV07XG4gICAgICAgICAgICAgICAgcHJpbnRUZXh0KG1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgIGlmIChyZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSkge1xuICAgICAgICAgICAgICAgICAgICBjdXJzb3Iuc2V0UG9zaXRpb25Gcm9tKHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLnNwYXduUG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIH1cblx0XHRcdFx0Y2hhbWJlci5yZW5kZXIoKTtcblx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0dHVycmV0LmlzU2hvb3RpbmcgPSBmYWxzZTtcblx0XHRcdFx0XHRwYXRoLmZvckVhY2goZnVuY3Rpb24oY2VsbCkge1xuXHRcdFx0XHRcdFx0Y2VsbC5pc1VuZGVyVHVycmV0RmlyZSA9IGZhbHNlO1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdGNoYW1iZXIucmVuZGVyKCk7XG5cdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dHVycmV0LmZpbmRBbmRUcnlUb0tpbGwoY3Vyc29yLCBjaGFtYmVyKTtcblx0XHRcdH1cblx0XHR9LCAxMDAwKTtcblx0fVxufTtcbiJdfQ==
