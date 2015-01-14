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
            actions = {
                '200': function() {
                    localStorage.chamber = chamberNumber;
                    try {
                        mainFunction(JSON.parse(xmlhttp.responseText));
                    } catch (_) {
                        actions['404']();
                    }
                },
                '404': function() {
                    window.alert('This is the last chamber at this moment. ' +
                        'Next you are going to be redirected to the repo of this game. ' +
                        'Let me know your favorite VIM features which are missing.');
                    window.location.href = 'https://github.com/hermanya/vim-experiments';
                }
            },
            action = actions[xmlhttp.status] || defaultAction;
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

},{"./chamber.js":2,"./print.js":7}],6:[function(require,module,exports){
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
module.exports=require(5)
},{"./chamber.js":2,"./print.js":7}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jaGFtYmVyLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kcy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvY3Vyc29yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9mYWtlX2JkMWIwZjA4LmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9tYXRyaXgtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9wcmludC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHRpc1dhbGw6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBbJysnLCAnLScsICd8J10uaW5kZXhPZih0aGlzLmNoYXJhY3RlcikgIT09IC0xICYmICF0aGlzLmlzVGV4dDtcblx0fSxcblx0aXNMYXplcjogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFsnVicsICdeJywgJz4nLCAnPCddLmluZGV4T2YodGhpcy5jaGFyYWN0ZXIpICE9PSAtMSAmJiAhdGhpcy5pc1RleHQ7XG5cdH0sXG5cdGlzTGF6ZXJCZWFtOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1ZlcnRpY2FsTGF6ZXJCZWFtIHx8IHRoaXMuaXNIb3Jpem9udGFsTGF6ZXJCZWFtO1xuXHR9LFxuXHRpc0Jsb2NraW5nOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5pc1dhbGwoKSB8fCB0aGlzLmlzTGF6ZXIoKSB8fCB0aGlzLmlzTGF6ZXJCZWFtKCk7XG5cdH0sXG5cdHRvU3RyaW5nOiBmdW5jdGlvbihjb25maWd1cmF0aW9uKSB7XG5cdFx0dmFyIHByb3BlcnR5VG9DbGFzc05hbWUgPSB7XG5cdFx0XHRcdCdpc1RleHQnOiAndGV4dCcsXG5cdFx0XHRcdCdpc1VuZGVyQ3Vyc29yJzogJ2N1cnNvcicsXG5cdFx0XHRcdCdpc1ZlcnRpY2FsTGF6ZXJCZWFtJzogJ3ZlcnRpY2FsLWxhemVyLWJlYW0nLFxuXHRcdFx0XHQnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJzogJ2hvcml6b250YWwtbGF6ZXItYmVhbScsXG5cdFx0XHRcdCdpc1VuZGVyVHVycmV0RmlyZSc6ICd0dXJyZXQtZmlyZSdcblx0XHRcdH0sXG5cdFx0XHRjbGFzc05hbWVzID0gT2JqZWN0LmtleXMocHJvcGVydHlUb0NsYXNzTmFtZSkuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpc1trZXldO1xuXHRcdFx0fS5iaW5kKHRoaXMpKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdHJldHVybiBwcm9wZXJ0eVRvQ2xhc3NOYW1lW2tleV07XG5cdFx0XHR9KS5qb2luKCcgJyk7XG4gICAgICAgIGlmICh0aGlzLmxpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgIHRoaXMuY2hhcmFjdGVyID0gY29uZmlndXJhdGlvblsnZGlzcGxheSBsaW5lIG51bWJlcnMnXSA/IHRoaXMubGluZU51bWJlciA6ICcgJztcbiAgICAgICAgfVxuXG5cdFx0cmV0dXJuICc8c3BhbiAgY2xhc3M9XCInICsgY2xhc3NOYW1lcyArICdcIj4nICsgdGhpcy5jaGFyYWN0ZXIgKyAnPC9zcGFuPic7XG5cdH1cbn07XG4iLCJ2YXIgbWF0cml4RGVjb3JhdG9yID0gcmVxdWlyZSgnLi9tYXRyaXgtZGVjb3JhdG9yLmpzJyksXG5cdGNlbGxEZWNvcmF0b3IgPSByZXF1aXJlKCcuL2NlbGwtZGVjb3JhdG9yLmpzJyksXG5cdHR1cnJldERlY29yYXRvciA9IHJlcXVpcmUoJy4vdHVycmV0LWRlY29yYXRvci5qcycpLFxuXHRjdXJzb3IgPSByZXF1aXJlKCcuL2N1cnNvci5qcycpO1xuXG52YXIgY2hhbWJlciA9IE9iamVjdC5jcmVhdGUobWF0cml4RGVjb3JhdG9yKTtcblxuY2hhbWJlci5mcm9tSlNPTiA9IGZ1bmN0aW9uKGpzb24pIHtcblx0dGhpcy5mcm9tQXJyYXlPZlN0cmluZ3MoanNvbi5zY2VuZSk7XG5cdE9iamVjdC5rZXlzKGpzb24pLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRyZXR1cm4ga2V5ICE9PSAnc2NlbmUnO1xuXHR9KS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdHRoaXNba2V5XSA9IGpzb25ba2V5XTtcblx0fS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLmNvbmZpZ3VyYXRpb24gPSBqc29uLmNvbmZpZ3VyYXRpb24gfHwge307XG59O1xuXG5jaGFtYmVyLmluaXRpYWxpemUgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscygpO1xuXHR0aGlzLm1hcmtUZXh0KCk7XG5cdHRoaXMubWFya0xhemVycygpO1xuXHR0aGlzLm1hcmtDdXJzb3IoKTtcblx0dGhpcy5tYXJrVHVycmV0cygpO1xufTtcblxuY2hhbWJlci5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2hhbWJlciA9IHRoaXM7XG5cdGNoYW1iZXIubWF0cml4ID0gY2hhbWJlci5tYXAoZnVuY3Rpb24oY2hhcmFjdGVyLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjaGFyYWN0ZXIgPT09ICdAJykge1xuXHRcdFx0Y2hhbWJlci5zcGF3blBvc2l0aW9uID0ge1xuXHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHZhciBjZWxsID0gT2JqZWN0LmNyZWF0ZShjZWxsRGVjb3JhdG9yKTtcblx0XHRjZWxsLnJvdyA9IHJvdztcblx0XHRjZWxsLmNvbHVtbiA9IGNvbHVtbjtcblx0XHRjZWxsLmNoYXJhY3RlciA9IGNoYXJhY3Rlcjtcblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLm1hcmtDdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0Y3Vyc29yLnJlc2V0KCk7XG5cdGN1cnNvci5zZXRQb3NpdGlvbkZyb20odGhpcy5zcGF3blBvc2l0aW9uKTtcbn07XG5cbmNoYW1iZXIubWFya1RleHQgPSBmdW5jdGlvbigpIHtcblx0dmFyIGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2UsXG5cdFx0bGFzdENlbGxJblNlcXVlbmNlLFxuICAgICAgICBwcmV2aW91c0JlZ2lubmluZ09mTGluZTtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcykge1xuXHRcdFx0aWYgKGNlbGwuY2hhcmFjdGVyID09PSAnYCcpIHtcblx0XHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSBmYWxzZTtcblx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlID0gY2hhbWJlci5tYXRyaXhbcm93XVtjb2x1bW4gLSAxXTtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjZWxsLmlzVGV4dCA9IHRydWU7XG5cdFx0XHRcdGlmIChsYXN0Q2VsbEluU2VxdWVuY2UpIHtcblx0XHRcdFx0XHRpZiAoTWF0aC5hYnMobGFzdENlbGxJblNlcXVlbmNlLnJvdyAtIGNlbGwucm93KSA9PT0gMSkge1xuXHRcdFx0XHRcdFx0Y2VsbC5wcmV2aW91c1RleHRDZWxsID0gbGFzdENlbGxJblNlcXVlbmNlO1xuXHRcdFx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlLm5leHRUZXh0Q2VsbCA9IGNlbGw7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGxhc3RDZWxsSW5TZXF1ZW5jZSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0aXNTZXF1ZW5jZU9mVGV4dEluUHJvZ3Jlc3MgPSB0cnVlO1xuICAgICAgICAgICAgcHJldmlvdXNCZWdpbm5pbmdPZkxpbmUgPSBjaGFtYmVyLm1hdHJpeFtyb3cgLSAxXVtjb2x1bW5dO1xuICAgICAgICAgICAgaWYgKHByZXZpb3VzQmVnaW5uaW5nT2ZMaW5lLmxpbmVOdW1iZXIpIHtcbiAgICAgICAgICAgICAgICBjZWxsLmxpbmVOdW1iZXIgPSBwcmV2aW91c0JlZ2lubmluZ09mTGluZS5saW5lTnVtYmVyICsgMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGFzdENlbGxJblNlcXVlbmNlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIGNlbGwubGluZU51bWJlciA9IDE7XG4gICAgICAgICAgICB9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGNlbGw7XG5cdH0pO1xufTtcblxuY2hhbWJlci5tYXJrTGF6ZXJzID0gZnVuY3Rpb24oKSB7XG5cdHZhciBtYXRyaXggPSB0aGlzLm1hdHJpeDtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdHZhciBjaGFyYWN0ZXIgPSBjZWxsLmNoYXJhY3Rlcixcblx0XHRcdGlzVmVydGljYWxMYXplckJlYW0gPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIFsnPCcsJz4nXS5pbmRleE9mKGNoYXJhY3RlcikgPT09IC0xO1xuXHRcdFx0fSxcblx0XHRcdGJlYW1Qcm9wZXJ0eSA9IGlzVmVydGljYWxMYXplckJlYW0oKSA/ICdpc1ZlcnRpY2FsTGF6ZXJCZWFtJyA6ICdpc0hvcml6b250YWxMYXplckJlYW0nLFxuXHRcdFx0aXNCZWFtQ29udGludWluZyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uXS5pc0xhemVyQmVhbSgpIHx8ICFtYXRyaXhbcm93XVtjb2x1bW5dLmlzQmxvY2tpbmcoKTtcblx0XHRcdH0sXG5cdFx0XHRuZXh0ID0ge1xuXHRcdFx0XHQnVic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93KytdW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCdeJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ctLV1bY29sdW1uXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Jz4nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uKytdO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnPCc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93XVtjb2x1bW4tLV07XG5cdFx0XHRcdH1cblx0XHRcdH1bY2hhcmFjdGVyXTtcblx0XHRpZiAobmV4dCkge1xuXHRcdFx0bmV4dCgpO1xuXHRcdFx0d2hpbGUgKGlzQmVhbUNvbnRpbnVpbmcoKSkge1xuXHRcdFx0XHRuZXh0KClbYmVhbVByb3BlcnR5XSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya1R1cnJldHMgPSBmdW5jdGlvbigpIHtcblx0dmFyIGNoYW1iZXIgPSB0aGlzO1xuXHR0aGlzLnR1cnJldHMgPSBbXTtcblx0dGhpcy5tYXRyaXggPSB0aGlzLm1hcChmdW5jdGlvbihjZWxsLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJyYnKSB7XG5cdFx0XHR2YXIgdHVycmV0ID0gT2JqZWN0LmNyZWF0ZSh0dXJyZXREZWNvcmF0b3IpO1xuXHRcdFx0dHVycmV0LnJvdyA9IHJvdztcblx0XHRcdHR1cnJldC5jb2x1bW4gPSBjb2x1bW47XG5cdFx0XHR0dXJyZXQuY2VsbCA9IGNlbGw7XG5cdFx0XHRjaGFtYmVyLnR1cnJldHMucHVzaCh0dXJyZXQpO1xuXHRcdH1cblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLmdldENlbGxVbmRlckN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl07XG59O1xuXG5jaGFtYmVyLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzY2VuZScpO1xuXHRlbGVtZW50LmlubmVySFRNTCA9IGNoYW1iZXIubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSkge1xuXHRcdGFycmF5ID0gYXJyYXkubWFwKGZ1bmN0aW9uKGNlbGwpIHtcblx0XHRcdGNlbGwuaXNVbmRlckN1cnNvciA9IGNlbGwucm93ID09PSBjdXJzb3Iucm93ICYmIGNlbGwuY29sdW1uID09PSBjdXJzb3IuY29sdW1uO1xuICAgICAgICAgICAgY2VsbCA9IGNlbGwudG9TdHJpbmcoY2hhbWJlci5jb25maWd1cmF0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiBjZWxsO1xuXHRcdH0pO1xuXHRcdHJldHVybiBhcnJheS5qb2luKCcnKTtcblx0fSkuam9pbignPGJyPicpO1xufTtcblxuY2hhbWJlci5hY3RPbkN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnR1cnJldHMuZm9yRWFjaChmdW5jdGlvbih0dXJyZXQpIHtcblx0XHR0dXJyZXQuZmluZEFuZFRyeVRvS2lsbChjdXJzb3IsIGNoYW1iZXIpO1xuXHR9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2hhbWJlcjtcbiIsInZhciBjb21tYW5kcyA9IHt9LFxuICAgIG1haW5GdW5jdGlvbixcbiAgICBwcmludFRleHQgPSByZXF1aXJlKCcuL3ByaW50LmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmRzO1xuXG5jb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddID0gZnVuY3Rpb24oY2hhbWJlck51bWJlcikge1xuICAgIHZhciB4bWxodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgeG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHhtbGh0dHAucmVhZHlTdGF0ZSAhPT0gNCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkZWZhdWx0QWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmFsZXJ0KHhtbGh0dHAuc3RhdHVzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhY3Rpb25zID0ge1xuICAgICAgICAgICAgICAgICcyMDAnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLmNoYW1iZXIgPSBjaGFtYmVyTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFpbkZ1bmN0aW9uKEpTT04ucGFyc2UoeG1saHR0cC5yZXNwb25zZVRleHQpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uc1snNDA0J10oKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJzQwNCc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuYWxlcnQoJ1RoaXMgaXMgdGhlIGxhc3QgY2hhbWJlciBhdCB0aGlzIG1vbWVudC4gJyArXG4gICAgICAgICAgICAgICAgICAgICAgICAnTmV4dCB5b3UgYXJlIGdvaW5nIHRvIGJlIHJlZGlyZWN0ZWQgdG8gdGhlIHJlcG8gb2YgdGhpcyBnYW1lLiAnICtcbiAgICAgICAgICAgICAgICAgICAgICAgICdMZXQgbWUga25vdyB5b3VyIGZhdm9yaXRlIFZJTSBmZWF0dXJlcyB3aGljaCBhcmUgbWlzc2luZy4nKTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnaHR0cHM6Ly9naXRodWIuY29tL2hlcm1hbnlhL3ZpbS1leHBlcmltZW50cyc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFjdGlvbiA9IGFjdGlvbnNbeG1saHR0cC5zdGF0dXNdIHx8IGRlZmF1bHRBY3Rpb247XG4gICAgICAgIGFjdGlvbigpO1xuXG4gICAgfTtcbiAgICBjaGFtYmVyTnVtYmVyID0gY2hhbWJlck51bWJlciB8fCBsb2NhbFN0b3JhZ2UuY2hhbWJlciB8fCAwO1xuICAgIHhtbGh0dHAub3BlbignR0VUJywgJy4vY2hhbWJlcnMvJyArIGNoYW1iZXJOdW1iZXIgKyAnLmpzb24nLCB0cnVlKTtcbiAgICB4bWxodHRwLnNlbmQoKTtcbn07XG5cbmNvbW1hbmRzWydzZXQgbnVtYmVyJ10gPSBmdW5jdGlvbigpIHtcbiAgICByZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5jb25maWd1cmF0aW9uWydkaXNwbGF5IGxpbmUgbnVtYmVycyddID0gdHJ1ZTtcbiAgICByZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5yZW5kZXIoKTtcbn07XG5jb21tYW5kc1snc2V0IG51J10gPSBjb21tYW5kc1snc2V0IG51bWJlciddO1xuXG5jb21tYW5kc1snc2V0IG5vbnVtYmVyJ10gPSBmdW5jdGlvbigpIHtcbiAgICByZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5jb25maWd1cmF0aW9uWydkaXNwbGF5IGxpbmUgbnVtYmVycyddID0gZmFsc2U7XG4gICAgcmVxdWlyZSgnLi9jaGFtYmVyLmpzJykucmVuZGVyKCk7XG59O1xuY29tbWFuZHNbJ3NldCBub251J10gPSBjb21tYW5kc1snc2V0IG5vbnVtYmVyJ107XG5cbmNvbW1hbmRzWydjYWtlIGlzIGEgbGllJ10gPSBmdW5jdGlvbigpIHtcbiAgICByZXF1aXJlKCcuL2NoYW1iZXIuanMnKS5jb25maWd1cmF0aW9uWydraWxsaW5nIG1vZGUgb24nXSA9IHRydWU7XG4gICAgcHJpbnRUZXh0KFsnJywnTm93IHlvdSBhcmUgZ29pbmcgdG8gZGllLiBFdmVyeSB0aW1lLicsJyddKTtcbn07XG5cbmNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlciA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBuZXh0Q2hhbWJlck51bWJlciA9IE51bWJlcihsb2NhbFN0b3JhZ2UuY2hhbWJlcikgKyAxO1xuICAgIGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10obmV4dENoYW1iZXJOdW1iZXIpO1xufTtcblxuY29tbWFuZHNbJ2luaXRpYWxpemUgY2hhbWJlciddID0gZnVuY3Rpb24obWFpbikge1xuICAgIG1haW5GdW5jdGlvbiA9IG1haW47XG4gICAgY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSgpO1xufTtcbiIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMuanMnKSxcbiAgICBwcmludFRleHQgPSByZXF1aXJlKCcuL3ByaW50LmpzJyk7XG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBzY29yZTogMCxcbiAgICBhY3RPbkN1cnJlbnRDZWxsOiBmdW5jdGlvbihjaGFtYmVyKSB7XG4gICAgICAgIHZhciBjdXJzb3IgPSB0aGlzLFxuICAgICAgICAgICAgY2VsbCA9IGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCksXG4gICAgICAgICAgICBhY3Rpb24gPSB7XG4gICAgICAgICAgICAgICAgJyonOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY2VsbC5jaGFyYWN0ZXIgPSAnICc7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5zY29yZSsrO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJ08nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmhhc0NvbXBsZXRlZExldmVsID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbmdyYXR1bGF0aW9uTWVzc2FnZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICcwJzogJ1lvdSBkaWQgaXQsIEkgYW0gYm9yZWQgd2F0Y2hpbmcgeW91LicsXG4gICAgICAgICAgICAgICAgICAgICAgICAnMSc6ICdPbmx5IG9uZSBwYXRoZXRpYyBzdGFyPycsXG4gICAgICAgICAgICAgICAgICAgICAgICAnMic6ICdEaWQgeW91IGV2ZW4gdHJ5PydcbiAgICAgICAgICAgICAgICAgICAgfVtjdXJzb3Iuc2NvcmVdIHx8ICdTYXRpc2Z5aW5nIHBlcmZvcm1hY2UuJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcmludFRleHQoWycnLCBjb25ncmF0dWxhdGlvbk1lc3NhZ2UsICcnXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tYW5kcy5sb2FkTmV4dENoYW1iZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgJyYnOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY2VsbC5pc0RlYWN0aXZhdGVkVHVycmV0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgY2VsbC5jaGFyYWN0ZXIgPSAnIDxkaXYgY2xhc3M9XCJkZWFjdGl2YXRlZC10dXJyZXRcIj4mPC9kaXY+JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9W2NlbGwuY2hhcmFjdGVyXTtcbiAgICAgICAgaWYgKCFjZWxsLmlzVGV4dCAmJiBhY3Rpb24pIHtcbiAgICAgICAgICAgIGFjdGlvbigpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuaGFzQ29tcGxldGVkTGV2ZWwgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5zY29yZSA9IDA7XG4gICAgICAgIHRoaXMuZm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudCgpO1xuICAgIH0sXG4gICAgc2V0UG9zaXRpb25Gcm9tOiBmdW5jdGlvbihhbm90aGVyT2JqZWN0KSB7XG4gICAgICAgIHRoaXMuY29sdW1uID0gYW5vdGhlck9iamVjdC5jb2x1bW47XG4gICAgICAgIHRoaXMucm93ID0gYW5vdGhlck9iamVjdC5yb3c7XG4gICAgfSxcbiAgICByZW1lbWJlckNvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoIXRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQpIHtcbiAgICAgICAgICAgIHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQgPSB0aGlzLmNvbHVtbjtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZm9yZ2V0Q29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50O1xuICAgIH0sXG4gICAgc2F2ZUN1cnJlbnRQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc2F2ZWRDb2x1bW4gPSB0aGlzLmNvbHVtbjtcbiAgICAgICAgdGhpcy5zYXZlZFJvdyA9IHRoaXMucm93O1xuICAgIH0sXG4gICAgcmVzdG9yZVRvU2F2ZWRQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuY29sdW1uID0gdGhpcy5zYXZlZENvbHVtbjtcbiAgICAgICAgdGhpcy5yb3cgPSB0aGlzLnNhdmVkUm93O1xuICAgIH1cbn07XG4iLCJ2YXIgcHJpbnRUZXh0ID0gcmVxdWlyZSgnLi9wcmludC5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGZpbmRBbmRUcnlUb0tpbGw6IGZ1bmN0aW9uKGN1cnNvciwgY2hhbWJlcikge1xuXHQvLyBhZGQgc29tZSBmdW5ueSBleGN1c2UgZm9yIHRoZSBraWxsIGZyb20gdHVycmV0XG5cdFx0aWYgKHRoaXMuaXNTaG9vdGluZyB8fCB0aGlzLmNlbGwuaXNEZWFjdGl2YXRlZFR1cnJldCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgdHVycmV0ID0gdGhpcyxcblx0XHRyaXNlID0gY3Vyc29yLnJvdyAtIHR1cnJldC5yb3csXG5cdFx0cnVuID0gY3Vyc29yLmNvbHVtbiAtIHR1cnJldC5jb2x1bW4sXG5cdFx0Y291bnQgPSBNYXRoLm1heChNYXRoLmFicyhyaXNlKSwgTWF0aC5hYnMocnVuKSksXG5cdFx0dG90YWwgPSBjb3VudCxcblx0XHRwYXRoID0gW10sXG5cdFx0Y2VsbDtcblx0XHRpZiAoIXJpc2UgJiYgIXJ1bikge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRmb3IgKHZhciBpID0gMDsgaSA8PSBjb3VudDsgaSsrKSB7XG5cdFx0XHRjZWxsID0gY2hhbWJlci5tYXRyaXhbTWF0aC5yb3VuZCh0dXJyZXQucm93ICsgcmlzZSooaS90b3RhbCkpXVtNYXRoLnJvdW5kKHR1cnJldC5jb2x1bW4gKyBydW4qKGkvdG90YWwpKV07XG5cdFx0XHRpZiAoIWNlbGwuaXNMYXplckJlYW0oKSAmJiBjZWxsLmlzQmxvY2tpbmcoKSkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGlmIChjZWxsICE9PSB0dXJyZXQuY2VsbCAmJiBwYXRoLmluZGV4T2YoY2VsbCkgPT09IC0xKSB7XG5cdFx0XHRcdHBhdGgucHVzaChjZWxsKTtcblx0XHRcdH1cblx0XHRcdGlmIChjZWxsLnJvdyA9PT0gY3Vyc29yLnJvdyAmJiBjZWxsLmNvbHVtbiA9PT0gY3Vyc29yLmNvbHVtbikge1xuXHRcdFx0XHR0dXJyZXQudHJ5VG9LaWxsKGN1cnNvciwgY2hhbWJlciwgcGF0aCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0fSxcblx0dHJ5VG9LaWxsOiBmdW5jdGlvbihjdXJzb3IsIGNoYW1iZXIsIHBhdGgpIHtcblx0XHR2YXIgdHVycmV0ID0gdGhpcztcblx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGlzQ3Vyc29yVW5kZXJMYXplciA9ICFwYXRoLmV2ZXJ5KGZ1bmN0aW9uKGNlbGwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWNlbGwuaXNVbmRlckN1cnNvcjtcbiAgICAgICAgICAgIH0pO1xuXHRcdFx0aWYgKGlzQ3Vyc29yVW5kZXJMYXplcikge1xuXHRcdFx0XHR0dXJyZXQuaXNTaG9vdGluZyA9IHRydWU7XG5cdFx0XHRcdHBhdGguZm9yRWFjaChmdW5jdGlvbihjZWxsKSB7XG5cdFx0XHRcdFx0Y2VsbC5pc1VuZGVyVHVycmV0RmlyZSA9IHRydWU7XG5cdFx0XHRcdH0pO1xuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlID0gJ3R1cnJldD4gJyArIFtcbiAgICAgICAgICAgICAgICAgICAgJ0kgZGlkIG5vdCBtZWFuIHRvLicsXG4gICAgICAgICAgICAgICAgICAgICdUaGV5IG1hZGUgbWUgZG8gdGhpcy4nLFxuICAgICAgICAgICAgICAgICAgICAnSSBhbSB0cnVsbHkgc29ycnkuJyxcbiAgICAgICAgICAgICAgICAgICAgJ1NvbWV0aW1lcyBJIGNhbiBub3QgaGVscCBteXNlbGYuJyxcbiAgICAgICAgICAgICAgICAgICAgJ1dhdGNoIG91dC4nLFxuICAgICAgICAgICAgICAgICAgICAnUGxlYXNlIGRvIG5vdCB0aGluayBsZXNzIG9mIG1lLidcbiAgICAgICAgICAgICAgICBdW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDMpXTtcbiAgICAgICAgICAgICAgICBwcmludFRleHQobWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlcXVpcmUoJy4vY2hhbWJlci5qcycpLmNvbmZpZ3VyYXRpb25bJ2tpbGxpbmcgbW9kZSBvbiddKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnNvci5zZXRQb3NpdGlvbkZyb20ocmVxdWlyZSgnLi9jaGFtYmVyLmpzJykuc3Bhd25Qb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuXHRcdFx0XHRjaGFtYmVyLnJlbmRlcigpO1xuXHRcdFx0XHR3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR0dXJyZXQuaXNTaG9vdGluZyA9IGZhbHNlO1xuXHRcdFx0XHRcdHBhdGguZm9yRWFjaChmdW5jdGlvbihjZWxsKSB7XG5cdFx0XHRcdFx0XHRjZWxsLmlzVW5kZXJUdXJyZXRGaXJlID0gZmFsc2U7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0Y2hhbWJlci5yZW5kZXIoKTtcblx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0dXJyZXQuZmluZEFuZFRyeVRvS2lsbChjdXJzb3IsIGNoYW1iZXIpO1xuXHRcdFx0fVxuXHRcdH0sIDEwMDApO1xuXHR9XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdGZyb21BcnJheU9mU3RyaW5nczogZnVuY3Rpb24gKGFycmF5T2ZTdHJpbmdzKSB7XG5cdFx0dGhpcy5tYXRyaXggPSBhcnJheU9mU3RyaW5ncy5tYXAoZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KCcnKTtcblx0XHR9KTtcblx0fSxcblx0bWFwOiBmdW5jdGlvbihmbikge1xuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5tYXAoZnVuY3Rpb24oYXJyYXksIHJvdykge1xuXHRcdFx0cmV0dXJuIGFycmF5Lm1hcChmdW5jdGlvbihpdGVtLCBjb2x1bW4pIHtcblx0XHRcdFx0cmV0dXJuIGZuKGl0ZW0sIHJvdywgY29sdW1uKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHRnZXRDb29yZGluYXRlc09mOiBmdW5jdGlvbiAodGhpbmdUb0ZpbmQpIHtcblx0XHR2YXIgcHJlZGljYXRlO1xuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbihzdHJpbmcsIGFub3RoZXJTdHJpbmcpIHtcblx0XHRcdFx0cmV0dXJuIHN0cmluZyA9PT0gYW5vdGhlclN0cmluZztcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbih0aGluZ1RvRmluZCwgYW5vdGhlck9iamVjdCkge1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpbmdUb0ZpbmQpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpbmdUb0ZpbmRba2V5XSAhPT0gYW5vdGhlck9iamVjdFtrZXldO1xuXHRcdFx0XHR9KS5sZW5ndGggPT09IDA7XG5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5yZWR1Y2UoZnVuY3Rpb24oZm91bmQsIGFycmF5LCByb3cpIHtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oY2VsbCwgY29sdW1uKSB7XG5cdFx0XHRcdGlmIChwcmVkaWNhdGUodGhpbmdUb0ZpbmQsIGNlbGwpKSB7XG5cdFx0XHRcdFx0Zm91bmQucHVzaCh7XG5cdFx0XHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0XHRcdGNvbHVtbjogY29sdW1uXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZvdW5kO1xuXHRcdH0sIFtdKTtcblx0fVxufTsiLCJ2YXIgY29uc29sZTtcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGNvbnNvbGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY29uc29sZScpO1xufVxuXG52YXIgcHJpbnRUZXh0ID0gZnVuY3Rpb24odGV4dCkge1xuICAgIHZhciBsaW5lID0gdGV4dC5zaGlmdCgpO1xuICAgIGlmIChsaW5lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQgKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc29sZS5pbm5lckhUTUwgKz0gdGV4dC5ieSArIGxpbmUgKyAnPGJyPic7XG4gICAgICAgICAgICBjb25zb2xlLnNjcm9sbFRvcCArPTEwMDtcbiAgICAgICAgICAgIHByaW50VGV4dCh0ZXh0KTtcbiAgICAgICAgfSwgbGluZS5sZW5ndGggKiA0MCk7XG4gICAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodGV4dCkpIHtcbiAgICAgICAgdGV4dCA9IFt0ZXh0XTtcbiAgICB9XG4gICAgdGV4dC5ieSA9IHRleHQuYnkgPyB0ZXh0LmJ5ICsgJz4gJyA6ICcnO1xuICAgIHByaW50VGV4dCh0ZXh0KTtcbn07XG4iXX0=
