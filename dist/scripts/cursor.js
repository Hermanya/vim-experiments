(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{}],2:[function(require,module,exports){
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
},{"./commands.js":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9mYWtlXzE4NjcyNGY0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29tbWFuZHMgPSB7fSxcblx0bWFpbkZ1bmN0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcztcblxuY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSA9IGZ1bmN0aW9uKGNoYW1iZXJOdW1iZXIpIHtcblx0dmFyIHhtbGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0eG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoeG1saHR0cC5yZWFkeVN0YXRlICE9PSA0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBkZWZhdWx0QWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHdpbmRvdy5hbGVydCh4bWxodHRwLnN0YXR1cyk7XG5cdFx0XHR9LFxuXHRcdFx0YWN0aW9uID0ge1xuXHRcdFx0XHQnMjAwJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0bG9jYWxTdG9yYWdlLmNoYW1iZXIgPSBjaGFtYmVyTnVtYmVyO1xuXHRcdFx0XHRcdG1haW5GdW5jdGlvbihKU09OLnBhcnNlKHhtbGh0dHAucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc0MDQnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR3aW5kb3cuYWxlcnQoJ091dCBvZiBzdWNoIGNoYW1iZXJzJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1beG1saHR0cC5zdGF0dXNdIHx8IGRlZmF1bHRBY3Rpb247XG5cdFx0YWN0aW9uKCk7XG5cblx0fTtcblx0Y2hhbWJlck51bWJlciA9IGNoYW1iZXJOdW1iZXIgfHwgbG9jYWxTdG9yYWdlLmNoYW1iZXIgfHwgMDtcblx0eG1saHR0cC5vcGVuKCdHRVQnLCAnLi9jaGFtYmVycy8nICsgY2hhbWJlck51bWJlciArICcuanNvbicsIHRydWUpO1xuXHR4bWxodHRwLnNlbmQoKTtcbn07XG5cbmNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbmV4dENoYW1iZXJOdW1iZXIgPSBOdW1iZXIobG9jYWxTdG9yYWdlLmNoYW1iZXIpICsgMTtcblx0Y29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXShuZXh0Q2hhbWJlck51bWJlcik7XG59O1xuXG5jb21tYW5kc1snaW5pdGlhbGl6ZSBjaGFtYmVyJ10gPSBmdW5jdGlvbihtYWluKSB7XG5cdG1haW5GdW5jdGlvbiA9IG1haW47XG5cdGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10oKTtcbn07IiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpO1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cdHNjb3JlOiAwLFxuXHRhY3RPbkN1cnJlbnRDZWxsOiBmdW5jdGlvbihjaGFtYmVyKSB7XG5cdFx0dmFyIGN1cnNvciA9IHRoaXMsXG5cdFx0Y2VsbCA9IGNoYW1iZXIuZ2V0Q2VsbFVuZGVyQ3Vyc29yKCksXG5cdFx0YWN0aW9uID0ge1xuXHRcdFx0JyonOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnICc7XG5cdFx0XHRcdGN1cnNvci5zY29yZSsrO1xuXHRcdFx0fSxcblx0XHRcdCdPJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGN1cnNvci5oYXNDb21wbGV0ZWRMZXZlbCA9IHRydWU7XG5cdFx0XHRcdHZhciBjb25ncmF0dWxhdGlvbk1lc3NhZ2UgPSB7XG5cdFx0XHRcdFx0JzAnOiAnWW91IGRpZCBpdCwgSSBhbSBib3JlZCB3YXRjaGluZyB5b3UuJyxcblx0XHRcdFx0XHQnMSc6ICdPbmx5IG9uZSBwYXRoZXRpYyBzdGFyPycsXG5cdFx0XHRcdFx0JzInOiAnRGlkIHlvdSBldmVuIHRyeT8nXG5cdFx0XHRcdH1bY3Vyc29yLnNjb3JlXSB8fCAnU2F0aXNmeWluZyBwZXJmb3JtYWNlLic7XG5cdFx0XHRcdGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuYWxlcnQoY29uZ3JhdHVsYXRpb25NZXNzYWdlKTtcblx0XHRcdFx0XHRcdGNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlcigpO1xuXHRcdFx0XHRcdH0sIDApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVtjZWxsLmNoYXJhY3Rlcl07XG5cdFx0aWYgKCFjZWxsLmlzVGV4dCAmJiBhY3Rpb24pIHtcblx0XHRcdGFjdGlvbigpO1xuXHRcdH1cblx0fSxcblx0cmVzZXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuaGFzQ29tcGxldGVkTGV2ZWwgPSBmYWxzZTtcblx0XHR0aGlzLnNjb3JlID0gMDtcblx0XHR0aGlzLmZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQoKTtcblx0fSxcblx0cmVtZW1iZXJDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50OiBmdW5jdGlvbigpIHtcblx0XHRpZiAoIXRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQpIHtcblx0XHRcdHRoaXMucmVtZW1iZXJlZENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQgPSB0aGlzLmNvbHVtbjtcblx0XHR9XG5cdH0sXG5cdGZvcmdldENvbHVtbkZvclZlcnRpY2FsTW92ZW1lbnQ6IGZ1bmN0aW9uKCkge1xuXHRcdGRlbGV0ZSB0aGlzLnJlbWVtYmVyZWRDb2x1bW5Gb3JWZXJ0aWNhbE1vdmVtZW50O1xuXHR9LFxuXHRzYXZlQ3VycmVudFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNhdmVkQ29sdW1uID0gdGhpcy5jb2x1bW47XG5cdFx0dGhpcy5zYXZlZFJvdyA9IHRoaXMucm93O1xuXHR9LFxuXHRyZXN0b3JlVG9TYXZlZFBvc2l0aW9uOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmNvbHVtbiA9IHRoaXMuc2F2ZWRDb2x1bW47XG5cdFx0dGhpcy5yb3cgPSB0aGlzLnNhdmVkUm93O1xuXHR9XG59OyJdfQ==
