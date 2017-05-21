var express = require( 'express' ),
  bodyParser = require( 'body-parser' ),
  morgan = require( 'morgan' ),
  app = express();


app.use( morgan( 'dev' ) );
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( { extended: true } ) );

var routes = require( './config/routes' );

app.use( '/api', routes );

app.listen( 3000 );
