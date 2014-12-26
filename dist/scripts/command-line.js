(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var commands = {}, mainFunction;
module.exports = commands;

commands['chamber (\\d+)'] = function(chamberNumber) {
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState === 4) {
			if (xmlhttp.status === 200) {
				if (window) {
					window.localStorage.chamber = chamberNumber;
				}
				mainFunction(JSON.parse(xmlhttp.responseText));
			} else if (xmlhttp.status === 404) {
				window.alert('Out of chambers');
			} else {
				window.alert(xmlhttp.status);
			}
		}
	};

	chamberNumber = chamberNumber || 0;

	if (typeof window !== 'undefined') {
		chamberNumber = chamberNumber || window.localStorage.chamber || 0;
	}
	xmlhttp.open('GET', './chambers/' + chamberNumber + '.json', true);
	xmlhttp.send();
};

commands['load chamber'] = commands['chamber (\\d+)'];

commands['initialize chamber'] = function(main) {
	mainFunction = main;
	commands['chamber (\\d+)']();
} 
},{}],2:[function(require,module,exports){
var commands = require('./commands.js'),
	newLineCharacter = String.fromCharCode(13);

var commandLine = {
	isActive: false,
	commands: commands,
	activate: function() {
		this.isActive = true;
		this.element.focus();
		this.value = ':';
	},
	input: function(character) {
		if (character === newLineCharacter) {
			this.execute();
			this.clear();
		}
	},
	execute: function() {
		var givenCommand = this.element.value.slice(1);
		Object.keys(this.commands).every(function(key) {
			var matches = givenCommand.match(new RegExp(key));
			if (!matches) {
				return true;
			}
			commands[key].apply(this, matches.slice(1));
		});
	},
	clear: function() {
		this.isActive = false;
		this.element.blur();
		this.element.value = '';
	}
};

if (typeof window !== 'undefined') {
	commandLine.element = window.document.querySelector('#command-line');

	commandLine.element.addEventListener('blur', function(e) {
		if (commandLine.isActive) {
			commandLine.element.focus();
		}
	});
}



module.exports = commandLine;
},{"./commands.js":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9mYWtlXzE2NjVjZDk3LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29tbWFuZHMgPSB7fSwgbWFpbkZ1bmN0aW9uO1xubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcztcblxuY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXSA9IGZ1bmN0aW9uKGNoYW1iZXJOdW1iZXIpIHtcblx0dmFyIHhtbGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0eG1saHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcblx0XHRpZiAoeG1saHR0cC5yZWFkeVN0YXRlID09PSA0KSB7XG5cdFx0XHRpZiAoeG1saHR0cC5zdGF0dXMgPT09IDIwMCkge1xuXHRcdFx0XHRpZiAod2luZG93KSB7XG5cdFx0XHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZS5jaGFtYmVyID0gY2hhbWJlck51bWJlcjtcblx0XHRcdFx0fVxuXHRcdFx0XHRtYWluRnVuY3Rpb24oSlNPTi5wYXJzZSh4bWxodHRwLnJlc3BvbnNlVGV4dCkpO1xuXHRcdFx0fSBlbHNlIGlmICh4bWxodHRwLnN0YXR1cyA9PT0gNDA0KSB7XG5cdFx0XHRcdHdpbmRvdy5hbGVydCgnT3V0IG9mIGNoYW1iZXJzJyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR3aW5kb3cuYWxlcnQoeG1saHR0cC5zdGF0dXMpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHRjaGFtYmVyTnVtYmVyID0gY2hhbWJlck51bWJlciB8fCAwO1xuXG5cdGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGNoYW1iZXJOdW1iZXIgPSBjaGFtYmVyTnVtYmVyIHx8IHdpbmRvdy5sb2NhbFN0b3JhZ2UuY2hhbWJlciB8fCAwO1xuXHR9XG5cdHhtbGh0dHAub3BlbignR0VUJywgJy4vY2hhbWJlcnMvJyArIGNoYW1iZXJOdW1iZXIgKyAnLmpzb24nLCB0cnVlKTtcblx0eG1saHR0cC5zZW5kKCk7XG59O1xuXG5jb21tYW5kc1snbG9hZCBjaGFtYmVyJ10gPSBjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddO1xuXG5jb21tYW5kc1snaW5pdGlhbGl6ZSBjaGFtYmVyJ10gPSBmdW5jdGlvbihtYWluKSB7XG5cdG1haW5GdW5jdGlvbiA9IG1haW47XG5cdGNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10oKTtcbn0gIiwidmFyIGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy5qcycpLFxuXHRuZXdMaW5lQ2hhcmFjdGVyID0gU3RyaW5nLmZyb21DaGFyQ29kZSgxMyk7XG5cbnZhciBjb21tYW5kTGluZSA9IHtcblx0aXNBY3RpdmU6IGZhbHNlLFxuXHRjb21tYW5kczogY29tbWFuZHMsXG5cdGFjdGl2YXRlOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmlzQWN0aXZlID0gdHJ1ZTtcblx0XHR0aGlzLmVsZW1lbnQuZm9jdXMoKTtcblx0XHR0aGlzLnZhbHVlID0gJzonO1xuXHR9LFxuXHRpbnB1dDogZnVuY3Rpb24oY2hhcmFjdGVyKSB7XG5cdFx0aWYgKGNoYXJhY3RlciA9PT0gbmV3TGluZUNoYXJhY3Rlcikge1xuXHRcdFx0dGhpcy5leGVjdXRlKCk7XG5cdFx0XHR0aGlzLmNsZWFyKCk7XG5cdFx0fVxuXHR9LFxuXHRleGVjdXRlOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgZ2l2ZW5Db21tYW5kID0gdGhpcy5lbGVtZW50LnZhbHVlLnNsaWNlKDEpO1xuXHRcdE9iamVjdC5rZXlzKHRoaXMuY29tbWFuZHMpLmV2ZXJ5KGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0dmFyIG1hdGNoZXMgPSBnaXZlbkNvbW1hbmQubWF0Y2gobmV3IFJlZ0V4cChrZXkpKTtcblx0XHRcdGlmICghbWF0Y2hlcykge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdGNvbW1hbmRzW2tleV0uYXBwbHkodGhpcywgbWF0Y2hlcy5zbGljZSgxKSk7XG5cdFx0fSk7XG5cdH0sXG5cdGNsZWFyOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmlzQWN0aXZlID0gZmFsc2U7XG5cdFx0dGhpcy5lbGVtZW50LmJsdXIoKTtcblx0XHR0aGlzLmVsZW1lbnQudmFsdWUgPSAnJztcblx0fVxufTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdGNvbW1hbmRMaW5lLmVsZW1lbnQgPSB3aW5kb3cuZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2NvbW1hbmQtbGluZScpO1xuXG5cdGNvbW1hbmRMaW5lLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGZ1bmN0aW9uKGUpIHtcblx0XHRpZiAoY29tbWFuZExpbmUuaXNBY3RpdmUpIHtcblx0XHRcdGNvbW1hbmRMaW5lLmVsZW1lbnQuZm9jdXMoKTtcblx0XHR9XG5cdH0pO1xufVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kTGluZTsiXX0=
