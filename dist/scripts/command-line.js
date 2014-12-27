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
},{"./commands.js":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9mYWtlXzYyNTAxYmQ1LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29tbWFuZHMgPSB7fSxcblx0bWFpbkZ1bmN0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcztcblxuY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSA9IGZ1bmN0aW9uKGNoYW1iZXJOdW1iZXIpIHtcblx0dmFyIHhtbGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0eG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoeG1saHR0cC5yZWFkeVN0YXRlICE9PSA0KSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHZhciBkZWZhdWx0QWN0aW9uID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHdpbmRvdy5hbGVydCh4bWxodHRwLnN0YXR1cyk7XG5cdFx0XHR9LFxuXHRcdFx0YWN0aW9uID0ge1xuXHRcdFx0XHQnMjAwJzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0bG9jYWxTdG9yYWdlLmNoYW1iZXIgPSBjaGFtYmVyTnVtYmVyO1xuXHRcdFx0XHRcdG1haW5GdW5jdGlvbihKU09OLnBhcnNlKHhtbGh0dHAucmVzcG9uc2VUZXh0KSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdCc0MDQnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR3aW5kb3cuYWxlcnQoJ091dCBvZiBzdWNoIGNoYW1iZXJzJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1beG1saHR0cC5zdGF0dXNdIHx8IGRlZmF1bHRBY3Rpb247XG5cdFx0YWN0aW9uKCk7XG5cblx0fTtcblx0Y2hhbWJlck51bWJlciA9IGNoYW1iZXJOdW1iZXIgfHwgbG9jYWxTdG9yYWdlLmNoYW1iZXIgfHwgMDtcblx0eG1saHR0cC5vcGVuKCdHRVQnLCAnLi9jaGFtYmVycy8nICsgY2hhbWJlck51bWJlciArICcuanNvbicsIHRydWUpO1xuXHR4bWxodHRwLnNlbmQoKTtcbn07XG5cbmNvbW1hbmRzLmxvYWROZXh0Q2hhbWJlciA9IGZ1bmN0aW9uKCkge1xuXHR2YXIgbmV4dENoYW1iZXJOdW1iZXIgPSBOdW1iZXIobG9jYWxTdG9yYWdlLmNoYW1iZXIpICsgMTtcblx0Y29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXShuZXh0Q2hhbWJlck51bWJlcik7XG59O1xuXG5jb21tYW5kc1snaW5pdGlhbGl6ZSBjaGFtYmVyJ10gPSBmdW5jdGlvbihtYWluKSB7XG5cdG1haW5GdW5jdGlvbiA9IG1haW47XG5cdGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10oKTtcbn07IiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpO1xuXG52YXIgY29tbWFuZExpbmUgPSB7XG5cdGV4ZWN1dGU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBnaXZlbkNvbW1hbmQgPSB0aGlzLmVsZW1lbnQudmFsdWUuc2xpY2UoMSk7IC8vIHN0cmlwIGNvbG9uXG5cdFx0T2JqZWN0LmtleXMoY29tbWFuZHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHR2YXIgbWF0Y2hlcyA9IGdpdmVuQ29tbWFuZC5tYXRjaChuZXcgUmVnRXhwKGtleSkpO1xuXHRcdFx0aWYgKG1hdGNoZXMpIHtcblx0XHRcdFx0Y29tbWFuZHNba2V5XS5hcHBseSh0aGlzLCBtYXRjaGVzLnNsaWNlKDEpKTsgLy8gc3RyaXAgbWF0Y2hpbmcgbGluZVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG59O1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0Y29tbWFuZExpbmUuZWxlbWVudCA9IHdpbmRvdy5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjY29tbWFuZC1saW5lJyk7XG5cdGNvbW1hbmRMaW5lLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGZ1bmN0aW9uKCkge1xuXHRcdGlmIChjb21tYW5kTGluZS5lbGVtZW50LnZhbHVlKSB7XG5cdFx0XHRjb21tYW5kTGluZS5lbGVtZW50LmZvY3VzKCk7XG5cdFx0fVxuXHR9KTtcblx0Y29tbWFuZExpbmUuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlwcmVzcycsIGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoZS53aGljaCA9PT0gMTMpIHtcblx0XHRcdGNvbW1hbmRMaW5lLmV4ZWN1dGUoKTtcblx0XHRcdGNvbW1hbmRMaW5lLmRlYWN0aXZhdGUoKTtcblx0XHR9XG5cdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0fSk7XG5cdGNvbW1hbmRMaW5lLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbigpIHtcblx0XHRpZiAoY29tbWFuZExpbmUuZWxlbWVudC52YWx1ZSA9PT0gJycpIHtcblx0XHRcdGNvbW1hbmRMaW5lLmRlYWN0aXZhdGUoKTtcblx0XHR9XG5cdH0pO1xuXHRjb21tYW5kTGluZS5hY3RpdmF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuZWxlbWVudC5mb2N1cygpO1xuXHR9O1xuXHRjb21tYW5kTGluZS5kZWFjdGl2YXRlID0gZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5lbGVtZW50LnZhbHVlID0gJyc7XG5cdFx0dGhpcy5lbGVtZW50LmJsdXIoKTtcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kTGluZTsiXX0=
