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
var commands = require('./commands.js');
module.exports = {
	score: 0,
	reactOnCurrentCellOnScene: function(scene) {
		var cell = scene.getCurrentCell(this);
		if (cell.isText) {
			return;
		}
		switch (cell.character) {
			case '*':
				cell.character = '&nbsp;';
				this.score++;
				break;
			case 'O':
				var numberOfPieces;
				switch (this.score) {
					case 0:
						numberOfPieces = 'no';
						break;
					case 1:
						numberOfPieces = 'a piece of';
						break;
					default:
						numberOfPieces = this.score + ' pieces of';
				}
				this.isDone = true;
				this.forgetColumn();
				if (typeof window !== 'undefined'){
					window.setTimeout(function() {
						window.alert('get ' + numberOfPieces + ' cake');
						commands['load chamber'](Number(window.localStorage.chamber) + 1);
					}, 0); 
				}
				break;

		}
	},

	rememberColumn: function() {
		if (!this.rememberedColumn) {
			this.rememberedColumn = this.column;
		}
	},

	forgetColumn: function() {
		delete this.rememberedColumn;
	},

	save: function() {
		this.savedColumn = this.column;
		this.savedRow = this.row;
	},
	restore: function() {
		this.column = this.savedColumn;
		this.row = this.savedRow;
	}
};
},{"./commands.js":1}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9oc3Rhcmlrb3Yvd29ya3NwYWNlL3ZpbS1leHBlcmltZW50cy9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS92aW0tZXhwZXJpbWVudHMvc3JjL2NvbW1hbmRzLmpzIiwiL1VzZXJzL2hzdGFyaWtvdi93b3Jrc3BhY2UvdmltLWV4cGVyaW1lbnRzL3NyYy9mYWtlXzE1NWU3ZWIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGNvbW1hbmRzID0ge30sIG1haW5GdW5jdGlvbjtcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZHM7XG5cbmNvbW1hbmRzWydjaGFtYmVyIChcXFxcZCspJ10gPSBmdW5jdGlvbihjaGFtYmVyTnVtYmVyKSB7XG5cdHZhciB4bWxodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cdHhtbGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKHhtbGh0dHAucmVhZHlTdGF0ZSA9PT0gNCkge1xuXHRcdFx0aWYgKHhtbGh0dHAuc3RhdHVzID09PSAyMDApIHtcblx0XHRcdFx0aWYgKHdpbmRvdykge1xuXHRcdFx0XHRcdHdpbmRvdy5sb2NhbFN0b3JhZ2UuY2hhbWJlciA9IGNoYW1iZXJOdW1iZXI7XG5cdFx0XHRcdH1cblx0XHRcdFx0bWFpbkZ1bmN0aW9uKEpTT04ucGFyc2UoeG1saHR0cC5yZXNwb25zZVRleHQpKTtcblx0XHRcdH0gZWxzZSBpZiAoeG1saHR0cC5zdGF0dXMgPT09IDQwNCkge1xuXHRcdFx0XHR3aW5kb3cuYWxlcnQoJ091dCBvZiBjaGFtYmVycycpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0d2luZG93LmFsZXJ0KHhtbGh0dHAuc3RhdHVzKTtcblx0XHRcdH1cblx0XHR9XG5cdH07XG5cblx0Y2hhbWJlck51bWJlciA9IGNoYW1iZXJOdW1iZXIgfHwgMDtcblxuXHRpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRjaGFtYmVyTnVtYmVyID0gY2hhbWJlck51bWJlciB8fCB3aW5kb3cubG9jYWxTdG9yYWdlLmNoYW1iZXIgfHwgMDtcblx0fVxuXHR4bWxodHRwLm9wZW4oJ0dFVCcsICcuL2NoYW1iZXJzLycgKyBjaGFtYmVyTnVtYmVyICsgJy5qc29uJywgdHJ1ZSk7XG5cdHhtbGh0dHAuc2VuZCgpO1xufTtcblxuY29tbWFuZHNbJ2xvYWQgY2hhbWJlciddID0gY29tbWFuZHNbJ2NoYW1iZXIgKFxcXFxkKyknXTtcblxuY29tbWFuZHNbJ2luaXRpYWxpemUgY2hhbWJlciddID0gZnVuY3Rpb24obWFpbikge1xuXHRtYWluRnVuY3Rpb24gPSBtYWluO1xuXHRjb21tYW5kc1snY2hhbWJlciAoXFxcXGQrKSddKCk7XG59ICIsInZhciBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMuanMnKTtcbm1vZHVsZS5leHBvcnRzID0ge1xuXHRzY29yZTogMCxcblx0cmVhY3RPbkN1cnJlbnRDZWxsT25TY2VuZTogZnVuY3Rpb24oc2NlbmUpIHtcblx0XHR2YXIgY2VsbCA9IHNjZW5lLmdldEN1cnJlbnRDZWxsKHRoaXMpO1xuXHRcdGlmIChjZWxsLmlzVGV4dCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRzd2l0Y2ggKGNlbGwuY2hhcmFjdGVyKSB7XG5cdFx0XHRjYXNlICcqJzpcblx0XHRcdFx0Y2VsbC5jaGFyYWN0ZXIgPSAnJm5ic3A7Jztcblx0XHRcdFx0dGhpcy5zY29yZSsrO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ08nOlxuXHRcdFx0XHR2YXIgbnVtYmVyT2ZQaWVjZXM7XG5cdFx0XHRcdHN3aXRjaCAodGhpcy5zY29yZSkge1xuXHRcdFx0XHRcdGNhc2UgMDpcblx0XHRcdFx0XHRcdG51bWJlck9mUGllY2VzID0gJ25vJztcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgMTpcblx0XHRcdFx0XHRcdG51bWJlck9mUGllY2VzID0gJ2EgcGllY2Ugb2YnO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdG51bWJlck9mUGllY2VzID0gdGhpcy5zY29yZSArICcgcGllY2VzIG9mJztcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLmlzRG9uZSA9IHRydWU7XG5cdFx0XHRcdHRoaXMuZm9yZ2V0Q29sdW1uKCk7XG5cdFx0XHRcdGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyl7XG5cdFx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR3aW5kb3cuYWxlcnQoJ2dldCAnICsgbnVtYmVyT2ZQaWVjZXMgKyAnIGNha2UnKTtcblx0XHRcdFx0XHRcdGNvbW1hbmRzWydsb2FkIGNoYW1iZXInXShOdW1iZXIod2luZG93LmxvY2FsU3RvcmFnZS5jaGFtYmVyKSArIDEpO1xuXHRcdFx0XHRcdH0sIDApOyBcblx0XHRcdFx0fVxuXHRcdFx0XHRicmVhaztcblxuXHRcdH1cblx0fSxcblxuXHRyZW1lbWJlckNvbHVtbjogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCF0aGlzLnJlbWVtYmVyZWRDb2x1bW4pIHtcblx0XHRcdHRoaXMucmVtZW1iZXJlZENvbHVtbiA9IHRoaXMuY29sdW1uO1xuXHRcdH1cblx0fSxcblxuXHRmb3JnZXRDb2x1bW46IGZ1bmN0aW9uKCkge1xuXHRcdGRlbGV0ZSB0aGlzLnJlbWVtYmVyZWRDb2x1bW47XG5cdH0sXG5cblx0c2F2ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zYXZlZENvbHVtbiA9IHRoaXMuY29sdW1uO1xuXHRcdHRoaXMuc2F2ZWRSb3cgPSB0aGlzLnJvdztcblx0fSxcblx0cmVzdG9yZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5jb2x1bW4gPSB0aGlzLnNhdmVkQ29sdW1uO1xuXHRcdHRoaXMucm93ID0gdGhpcy5zYXZlZFJvdztcblx0fVxufTsiXX0=
