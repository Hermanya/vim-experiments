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
var commands = {},
	mainFunction;
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
					window.alert('Out of such chambers');
				}
			}[xmlhttp.status] || defaultAction;
		action();

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
};
},{}],3:[function(require,module,exports){
var commands = require('./commands.js');
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
					setTimeout(function() {
						window.alert(congratulationMessage);
						commands.loadNextChamber();
					}, 0);
				}
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
},{"./commands.js":2}],4:[function(require,module,exports){
var matrixDecorator = require('./matrix-decorator.js'),
	cellDecorator = require('./cell-decorator.js'),
	cursor = require('./cursor.js');

var chamber = Object.create(matrixDecorator);

chamber.fromJSON = function(json) {
	this.fromArrayOfStrings(json.scene);
	Object.keys(json).filter(function(key) {
		return key !== 'scene';
	}).forEach(function(key) {
		this[key] = json[key];
	});
};

chamber.initialize = function() {
	this.replaceCharactersWithCells();
	this.markText();
	this.markLazers();
	this.markCursor();
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
	cursor.column = this.spawnPosition.column;
	cursor.row = this.spawnPosition.row;
};

chamber.markText = function() {
	var isSequenceOfTextInProgress = false,
		lastCellInSequence;
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
		} else {
			if (cell.character === '`') {
				isSequenceOfTextInProgress = true;
				cell.character = ' ';
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

chamber.getCellUnderCursor = function() {
	return this.matrix[cursor.row][cursor.column];
};

chamber.render = function() {
	var element = document.querySelector('#scene');
	element.innerHTML = chamber.matrix.map(function(array) {
		array.forEach(function(cell) {
			cell.isUnderCursor = cell.row === cursor.row && cell.column === cursor.column;
		});
		return array.join('');
	}).join('<br>');
};

module.exports = chamber;
},{"./cell-decorator.js":1,"./cursor.js":3,"./matrix-decorator.js":5}],5:[function(require,module,exports){
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
},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NlbGwtZGVjb3JhdG9yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9jb21tYW5kcy5qcyIsIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9zcmMvY3Vyc29yLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9mYWtlX2M1Y2IwMTAxLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9tYXRyaXgtZGVjb3JhdG9yLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdGlzV2FsbDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIFsnKycsICctJywgJ3wnXS5pbmRleE9mKHRoaXMuY2hhcmFjdGVyKSAhPT0gLTEgJiYgIXRoaXMuaXNUZXh0O1xuXHR9LFxuXHRpc0xhemVyOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gWydWJywgJ14nLCAnPicsICc8J10uaW5kZXhPZih0aGlzLmNoYXJhY3RlcikgIT09IC0xICYmICF0aGlzLmlzVGV4dDtcblx0fSxcblx0aXNMYXplckJlYW06IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmlzVmVydGljYWxMYXplckJlYW0gfHwgdGhpcy5pc0hvcml6b250YWxMYXplckJlYW07XG5cdH0sXG5cdGlzQmxvY2tpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmlzV2FsbCgpIHx8IHRoaXMuaXNMYXplcigpIHx8IHRoaXMuaXNMYXplckJlYW0oKTtcblx0fSxcblx0dG9TdHJpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBwcm9wZXJ0eVRvQ2xhc3NOYW1lID0ge1xuXHRcdFx0XHQnaXNUZXh0JzogJ3RleHQnLFxuXHRcdFx0XHQnaXNVbmRlckN1cnNvcic6ICdjdXJzb3InLFxuXHRcdFx0XHQnaXNWZXJ0aWNhbExhemVyQmVhbSc6ICd2ZXJ0aWNhbC1sYXplci1iZWFtJyxcblx0XHRcdFx0J2lzSG9yaXpvbnRhbExhemVyQmVhbSc6ICdob3Jpem9udGFsLWxhemVyLWJlYW0nXG5cdFx0XHR9LFxuXHRcdFx0Y2xhc3NOYW1lcyA9IE9iamVjdC5rZXlzKHByb3BlcnR5VG9DbGFzc05hbWUpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXNba2V5XTtcblx0XHRcdH0uYmluZCh0aGlzKSkubWFwKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRyZXR1cm4gcHJvcGVydHlUb0NsYXNzTmFtZVtrZXldO1xuXHRcdFx0fSkuam9pbignICcpO1xuXHRcdFx0XG5cdFx0cmV0dXJuICc8c3BhbiAgY2xhc3M9XCInICsgY2xhc3NOYW1lcyArICdcIj4nICsgdGhpcy5jaGFyYWN0ZXIgKyAnPC9zcGFuPic7XG5cdH1cbn07IiwidmFyIGNvbW1hbmRzID0ge30sXG5cdG1haW5GdW5jdGlvbjtcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZHM7XG5cbmNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10gPSBmdW5jdGlvbihjaGFtYmVyTnVtYmVyKSB7XG5cdHZhciB4bWxodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHhtbGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHhtbGh0dHAucmVhZHlTdGF0ZSAhPT0gNCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgZGVmYXVsdEFjdGlvbiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR3aW5kb3cuYWxlcnQoeG1saHR0cC5zdGF0dXMpO1xuXHRcdFx0fSxcblx0XHRcdGFjdGlvbiA9IHtcblx0XHRcdFx0JzIwMCc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGxvY2FsU3RvcmFnZS5jaGFtYmVyID0gY2hhbWJlck51bWJlcjtcblx0XHRcdFx0XHRtYWluRnVuY3Rpb24oSlNPTi5wYXJzZSh4bWxodHRwLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnNDA0JzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0d2luZG93LmFsZXJ0KCdPdXQgb2Ygc3VjaCBjaGFtYmVycycpO1xuXHRcdFx0XHR9XG5cdFx0XHR9W3htbGh0dHAuc3RhdHVzXSB8fCBkZWZhdWx0QWN0aW9uO1xuXHRcdGFjdGlvbigpO1xuXG5cdH07XG5cdGNoYW1iZXJOdW1iZXIgPSBjaGFtYmVyTnVtYmVyIHx8IGxvY2FsU3RvcmFnZS5jaGFtYmVyIHx8IDA7XG5cdHhtbGh0dHAub3BlbignR0VUJywgJy4vY2hhbWJlcnMvJyArIGNoYW1iZXJOdW1iZXIgKyAnLmpzb24nLCB0cnVlKTtcblx0eG1saHR0cC5zZW5kKCk7XG59O1xuXG5jb21tYW5kcy5sb2FkTmV4dENoYW1iZXIgPSBmdW5jdGlvbigpIHtcblx0dmFyIG5leHRDaGFtYmVyTnVtYmVyID0gTnVtYmVyKGxvY2FsU3RvcmFnZS5jaGFtYmVyKSArIDE7XG5cdGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10obmV4dENoYW1iZXJOdW1iZXIpO1xufTtcblxuY29tbWFuZHNbJ2luaXRpYWxpemUgY2hhbWJlciddID0gZnVuY3Rpb24obWFpbikge1xuXHRtYWluRnVuY3Rpb24gPSBtYWluO1xuXHRjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKCk7XG59OyIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuXHRzY29yZTogMCxcblx0YWN0T25DdXJyZW50Q2VsbDogZnVuY3Rpb24oY2hhbWJlcikge1xuXHRcdHZhciBjdXJzb3IgPSB0aGlzLFxuXHRcdGNlbGwgPSBjaGFtYmVyLmdldENlbGxVbmRlckN1cnNvcigpLFxuXHRcdGFjdGlvbiA9IHtcblx0XHRcdCcqJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNlbGwuY2hhcmFjdGVyID0gJyAnO1xuXHRcdFx0XHRjdXJzb3Iuc2NvcmUrKztcblx0XHRcdH0sXG5cdFx0XHQnTyc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjdXJzb3IuaGFzQ29tcGxldGVkTGV2ZWwgPSB0cnVlO1xuXHRcdFx0XHR2YXIgY29uZ3JhdHVsYXRpb25NZXNzYWdlID0ge1xuXHRcdFx0XHRcdCcwJzogJ1lvdSBkaWQgaXQsIEkgYW0gYm9yZWQgd2F0Y2hpbmcgeW91LicsXG5cdFx0XHRcdFx0JzEnOiAnT25seSBvbmUgcGF0aGV0aWMgc3Rhcj8nLFxuXHRcdFx0XHRcdCcyJzogJ0RpZCB5b3UgZXZlbiB0cnk/J1xuXHRcdFx0XHR9W2N1cnNvci5zY29yZV0gfHwgJ1NhdGlzZnlpbmcgcGVyZm9ybWFjZS4nO1xuXHRcdFx0XHRpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0d2luZG93LmFsZXJ0KGNvbmdyYXR1bGF0aW9uTWVzc2FnZSk7XG5cdFx0XHRcdFx0XHRjb21tYW5kcy5sb2FkTmV4dENoYW1iZXIoKTtcblx0XHRcdFx0XHR9LCAwKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1bY2VsbC5jaGFyYWN0ZXJdO1xuXHRcdGlmICghY2VsbC5pc1RleHQgJiYgYWN0aW9uKSB7XG5cdFx0XHRhY3Rpb24oKTtcblx0XHR9XG5cdH0sXG5cdHJlc2V0OiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmhhc0NvbXBsZXRlZExldmVsID0gZmFsc2U7XG5cdFx0dGhpcy5zY29yZSA9IDA7XG5cdFx0dGhpcy5mb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KCk7XG5cdH0sXG5cdHJlbWVtYmVyQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCF0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50KSB7XG5cdFx0XHR0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50ID0gdGhpcy5jb2x1bW47XG5cdFx0fVxuXHR9LFxuXHRmb3JnZXRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcblx0XHRkZWxldGUgdGhpcy5yZW1lbWJlcmVkQ29sdW1uRm9yVmVydGljYWxNb3ZlbWVudDtcblx0fSxcblx0c2F2ZUN1cnJlbnRQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zYXZlZENvbHVtbiA9IHRoaXMuY29sdW1uO1xuXHRcdHRoaXMuc2F2ZWRSb3cgPSB0aGlzLnJvdztcblx0fSxcblx0cmVzdG9yZVRvU2F2ZWRQb3NpdGlvbjogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5jb2x1bW4gPSB0aGlzLnNhdmVkQ29sdW1uO1xuXHRcdHRoaXMucm93ID0gdGhpcy5zYXZlZFJvdztcblx0fVxufTsiLCJ2YXIgbWF0cml4RGVjb3JhdG9yID0gcmVxdWlyZSgnLi9tYXRyaXgtZGVjb3JhdG9yLmpzJyksXG5cdGNlbGxEZWNvcmF0b3IgPSByZXF1aXJlKCcuL2NlbGwtZGVjb3JhdG9yLmpzJyksXG5cdGN1cnNvciA9IHJlcXVpcmUoJy4vY3Vyc29yLmpzJyk7XG5cbnZhciBjaGFtYmVyID0gT2JqZWN0LmNyZWF0ZShtYXRyaXhEZWNvcmF0b3IpO1xuXG5jaGFtYmVyLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuXHR0aGlzLmZyb21BcnJheU9mU3RyaW5ncyhqc29uLnNjZW5lKTtcblx0T2JqZWN0LmtleXMoanNvbikuZmlsdGVyKGZ1bmN0aW9uKGtleSkge1xuXHRcdHJldHVybiBrZXkgIT09ICdzY2VuZSc7XG5cdH0pLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0dGhpc1trZXldID0ganNvbltrZXldO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKCkge1xuXHR0aGlzLnJlcGxhY2VDaGFyYWN0ZXJzV2l0aENlbGxzKCk7XG5cdHRoaXMubWFya1RleHQoKTtcblx0dGhpcy5tYXJrTGF6ZXJzKCk7XG5cdHRoaXMubWFya0N1cnNvcigpO1xufTtcblxuY2hhbWJlci5yZXBsYWNlQ2hhcmFjdGVyc1dpdGhDZWxscyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgY2hhbWJlciA9IHRoaXM7XG5cdGNoYW1iZXIubWF0cml4ID0gY2hhbWJlci5tYXAoZnVuY3Rpb24oY2hhcmFjdGVyLCByb3csIGNvbHVtbikge1xuXHRcdGlmIChjaGFyYWN0ZXIgPT09ICdAJykge1xuXHRcdFx0Y2hhbWJlci5zcGF3blBvc2l0aW9uID0ge1xuXHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0Y29sdW1uOiBjb2x1bW5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHZhciBjZWxsID0gT2JqZWN0LmNyZWF0ZShjZWxsRGVjb3JhdG9yKTtcblx0XHRjZWxsLnJvdyA9IHJvdztcblx0XHRjZWxsLmNvbHVtbiA9IGNvbHVtbjtcblx0XHRjZWxsLmNoYXJhY3RlciA9IGNoYXJhY3Rlcjtcblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLm1hcmtDdXJzb3IgPSBmdW5jdGlvbigpIHtcblx0Y3Vyc29yLnJlc2V0KCk7XG5cdGN1cnNvci5jb2x1bW4gPSB0aGlzLnNwYXduUG9zaXRpb24uY29sdW1uO1xuXHRjdXJzb3Iucm93ID0gdGhpcy5zcGF3blBvc2l0aW9uLnJvdztcbn07XG5cbmNoYW1iZXIubWFya1RleHQgPSBmdW5jdGlvbigpIHtcblx0dmFyIGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gZmFsc2UsXG5cdFx0bGFzdENlbGxJblNlcXVlbmNlO1xuXHR0aGlzLm1hdHJpeCA9IHRoaXMubWFwKGZ1bmN0aW9uKGNlbGwsIHJvdywgY29sdW1uKSB7XG5cdFx0aWYgKGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzKSB7XG5cdFx0XHRpZiAoY2VsbC5jaGFyYWN0ZXIgPT09ICdgJykge1xuXHRcdFx0XHRpc1NlcXVlbmNlT2ZUZXh0SW5Qcm9ncmVzcyA9IGZhbHNlO1xuXHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UgPSBjaGFtYmVyLm1hdHJpeFtyb3ddW2NvbHVtbiAtIDFdO1xuXHRcdFx0XHRjZWxsLmNoYXJhY3RlciA9ICcgJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNlbGwuaXNUZXh0ID0gdHJ1ZTtcblx0XHRcdFx0aWYgKGxhc3RDZWxsSW5TZXF1ZW5jZSkge1xuXHRcdFx0XHRcdGlmIChNYXRoLmFicyhsYXN0Q2VsbEluU2VxdWVuY2Uucm93IC0gY2VsbC5yb3cpID09PSAxKSB7XG5cdFx0XHRcdFx0XHRjZWxsLnByZXZpb3VzVGV4dENlbGwgPSBsYXN0Q2VsbEluU2VxdWVuY2U7XG5cdFx0XHRcdFx0XHRsYXN0Q2VsbEluU2VxdWVuY2UubmV4dFRleHRDZWxsID0gY2VsbDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bGFzdENlbGxJblNlcXVlbmNlID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChjZWxsLmNoYXJhY3RlciA9PT0gJ2AnKSB7XG5cdFx0XHRcdGlzU2VxdWVuY2VPZlRleHRJblByb2dyZXNzID0gdHJ1ZTtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBjZWxsO1xuXHR9KTtcbn07XG5cbmNoYW1iZXIubWFya0xhemVycyA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbWF0cml4ID0gdGhpcy5tYXRyaXg7XG5cdHRoaXMubWF0cml4ID0gdGhpcy5tYXAoZnVuY3Rpb24oY2VsbCwgcm93LCBjb2x1bW4pIHtcblx0XHR2YXIgY2hhcmFjdGVyID0gY2VsbC5jaGFyYWN0ZXIsXG5cdFx0XHRpc1ZlcnRpY2FsTGF6ZXJCZWFtID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiBbJzwnLCc+J10uaW5kZXhPZihjaGFyYWN0ZXIpID09PSAtMTtcblx0XHRcdH0sXG5cdFx0XHRiZWFtUHJvcGVydHkgPSBpc1ZlcnRpY2FsTGF6ZXJCZWFtKCkgPyAnaXNWZXJ0aWNhbExhemVyQmVhbScgOiAnaXNIb3Jpem9udGFsTGF6ZXJCZWFtJyxcblx0XHRcdGlzQmVhbUNvbnRpbnVpbmcgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbl0uaXNMYXplckJlYW0oKSB8fCAhbWF0cml4W3Jvd11bY29sdW1uXS5pc0Jsb2NraW5nKCk7XG5cdFx0XHR9LFxuXHRcdFx0bmV4dCA9IHtcblx0XHRcdFx0J1YnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3JvdysrXVtjb2x1bW5dO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQnXic6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHJldHVybiBtYXRyaXhbcm93LS1dW2NvbHVtbl07XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc+JzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG1hdHJpeFtyb3ddW2NvbHVtbisrXTtcblx0XHRcdFx0fSxcblx0XHRcdFx0JzwnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXR1cm4gbWF0cml4W3Jvd11bY29sdW1uLS1dO1xuXHRcdFx0XHR9XG5cdFx0XHR9W2NoYXJhY3Rlcl07XG5cdFx0aWYgKG5leHQpIHtcblx0XHRcdG5leHQoKTtcblx0XHRcdHdoaWxlIChpc0JlYW1Db250aW51aW5nKCkpIHtcblx0XHRcdFx0bmV4dCgpW2JlYW1Qcm9wZXJ0eV0gPSB0cnVlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gY2VsbDtcblx0fSk7XG59O1xuXG5jaGFtYmVyLmdldENlbGxVbmRlckN1cnNvciA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gdGhpcy5tYXRyaXhbY3Vyc29yLnJvd11bY3Vyc29yLmNvbHVtbl07XG59O1xuXG5jaGFtYmVyLnJlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNzY2VuZScpO1xuXHRlbGVtZW50LmlubmVySFRNTCA9IGNoYW1iZXIubWF0cml4Lm1hcChmdW5jdGlvbihhcnJheSkge1xuXHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oY2VsbCkge1xuXHRcdFx0Y2VsbC5pc1VuZGVyQ3Vyc29yID0gY2VsbC5yb3cgPT09IGN1cnNvci5yb3cgJiYgY2VsbC5jb2x1bW4gPT09IGN1cnNvci5jb2x1bW47XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGFycmF5LmpvaW4oJycpO1xuXHR9KS5qb2luKCc8YnI+Jyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNoYW1iZXI7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdGZyb21BcnJheU9mU3RyaW5nczogZnVuY3Rpb24gKGFycmF5T2ZTdHJpbmdzKSB7XG5cdFx0dGhpcy5tYXRyaXggPSBhcnJheU9mU3RyaW5ncy5tYXAoZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gc3RyaW5nLnNwbGl0KCcnKTtcblx0XHR9KTtcblx0fSxcblx0bWFwOiBmdW5jdGlvbihmbikge1xuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5tYXAoZnVuY3Rpb24oYXJyYXksIHJvdykge1xuXHRcdFx0cmV0dXJuIGFycmF5Lm1hcChmdW5jdGlvbihpdGVtLCBjb2x1bW4pIHtcblx0XHRcdFx0cmV0dXJuIGZuKGl0ZW0sIHJvdywgY29sdW1uKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9LFxuXHRnZXRDb29yZGluYXRlc09mOiBmdW5jdGlvbiAodGhpbmdUb0ZpbmQpIHtcblx0XHR2YXIgcHJlZGljYXRlO1xuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbihzdHJpbmcsIGFub3RoZXJTdHJpbmcpIHtcblx0XHRcdFx0cmV0dXJuIHN0cmluZyA9PT0gYW5vdGhlclN0cmluZztcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmICh0eXBlb2YgdGhpbmdUb0ZpbmQgPT09ICdvYmplY3QnKSB7XG5cdFx0XHRwcmVkaWNhdGUgPSBmdW5jdGlvbih0aGluZ1RvRmluZCwgYW5vdGhlck9iamVjdCkge1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpbmdUb0ZpbmQpLmZpbHRlcihmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpbmdUb0ZpbmRba2V5XSAhPT0gYW5vdGhlck9iamVjdFtrZXldO1xuXHRcdFx0XHR9KS5sZW5ndGggPT09IDA7XG5cblx0XHRcdH07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzLm1hdHJpeC5yZWR1Y2UoZnVuY3Rpb24oZm91bmQsIGFycmF5LCByb3cpIHtcblx0XHRcdGFycmF5LmZvckVhY2goZnVuY3Rpb24oY2VsbCwgY29sdW1uKSB7XG5cdFx0XHRcdGlmIChwcmVkaWNhdGUodGhpbmdUb0ZpbmQsIGNlbGwpKSB7XG5cdFx0XHRcdFx0Zm91bmQucHVzaCh7XG5cdFx0XHRcdFx0XHRyb3c6IHJvdyxcblx0XHRcdFx0XHRcdGNvbHVtbjogY29sdW1uXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGZvdW5kO1xuXHRcdH0sIFtdKTtcblx0fVxufTsiXX0=
