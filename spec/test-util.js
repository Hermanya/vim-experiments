var fs = require('fs');
var cursor = require('../src/cursor.js');
var scene = require('../src/scene.js');

module.exports = {
	loadChamber: function(chamberNumber) {
		var data = fs.readFileSync(__dirname + '/../chambers/' + (chamberNumber || 0) + '.json', {
			encoding: 'utf8'
		});
		var chamber = JSON.parse(data);
		scene.fromArrayOfStrings(chamber.scene);
		scene.initialize();
	}
};