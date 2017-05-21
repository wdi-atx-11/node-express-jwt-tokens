var express = require('express'),
bodyParser  = require('body-parser'),
mongoose    = require('mongoose'),
expressJWT  = require('express-jwt'),
jwt         = require('jsonwebtoken');
app         = express();

var secret = "theworldisnotenough";

mongoose.connect('mongodb://localhost:27017/MI6');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use('/api/agents/:id', expressJWT({secret: secret}));
app.use(function(error, request, response, next) {
  // send an appropriate status code & JSON object saying there was an error, if there was one.
  if(error.name === 'UnauthorizedError'){
    response.status(401).json({message: error.message});
  }
});

var routes = require('./config/routes');

app.use('/api', routes);

app.post('/api/authorizations', function( request, response ) {
  // some code to check that a user's credentials are right (bcrypt?)

  // collect any information we want to include in the token, like user information
  // collect any information we want to include in the token, like that user's info
  var myInfo = {
    name: 'James Bond', // or whatever your user's name is
    codename: "007", // or whatever
    id: '55c65c300bb7305be9517c4d' // or whatever
  }
  // make a token already & send it as json
  var token = jwt.sign(myInfo, secret);
  response.json({agent: myInfo, token: token})

});

app.listen(3000);
