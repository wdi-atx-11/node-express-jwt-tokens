var express = require('express'),
bodyParser  = require('body-parser'),
mongoose    = require('mongoose'),
expressJWT  = require('express-jwt'),
jwt         = require('jsonwebtoken'),
app         = express();

mongoose.connect('mongodb://localhost:27017/MI6');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));


// our secret phrase, to help us make sure everything's encrypted the same way
var secret = "onhermajestyssecretservice";

// JWT access control. Important to have these before our routes, so it can run first!
app.use('/api/agents/:id', expressJWT({secret: secret}));
app.use(function (error, request, response, next) {
  if (error.name === 'UnauthorizedError') {
    response.status(401).json({message: 'You need an authorization token to view confidential information.'});
  }
});

app.post('/api/authorizations', function(request,response){
  // if (!(req.body.username === 'john.doe' && req.body.password === 'foobar')) {
  //     res.send(401, 'Wrong user or password');
  //     return;
  // }

    var myInfo = {
        name: 'James Bond', // or whatever your user's name is
        codename: "007", // or whatever
        id: '55c65c300bb7305be9517c4d' // or whatever
    }

    // We are sending the profile inside the token
    var token = jwt.sign(myInfo, secret, { expiresInMinutes: 60*5 });

    response.json({ agent: myInfo, token: token });
});

var routes = require('./config/routes');
app.use('/api', routes);

app.listen(3000);