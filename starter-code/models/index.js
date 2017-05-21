var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/MI6');

module.exports.Agent = require('./agent.js');
