var fs = require('fs');
var cursor = require('../src/cursor.js');
var chamber = require('../src/chamber.js');

module.exports = {
	loadChamber: function(chamberNumber) {
		var data = fs.readFileSync(__dirname + '/../chambers/' + (chamberNumber || 0) + '.json', {
			encoding: 'utf8'
		});
		chamber.fromJSON(JSON.parse(data));
		chamber.initialize();
	}
};