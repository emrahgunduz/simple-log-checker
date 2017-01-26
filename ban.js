var fs        = require( "fs" );
var lib       = require( __dirname + "/utils/lib" );
var network   = require( __dirname + "/utils/network" );
var logReader = require( __dirname + "/utils/logreader" );

// If DEBUG is true, app will not ban any ip or subnets
global.DEBUG = false;
process.argv.forEach( function ( val ) {
  if ( val.toLowerCase() == "debug" ) {
    console.log( "\n-- Debug is on!" );
    global.DEBUG = true;
  }
} );

var readers = [];
function Run () {
  var content;

  try {
    var simpleban = fs.readFileSync( __dirname + "/info", "utf8" );
    console.log( simpleban );
  } catch ( e ) {
    // not important
  }

  try {
    content = fs.readFileSync( __dirname + "/logs.json", "utf8" );
  } catch ( e ) {
    console.log( "Settings file is missing, or is not readable ---------------------------" );
    console.log( " Please check if the file exists, cannot continue without one" );
    console.log( " If not, look at the documentation for how to create one." );
    console.log( "------------------------------------------------------------------------" );
    process.exit( 1 );
  }

  try {
    var safeIpList = fs.readFileSync( __dirname + "/safe.json", "utf8" );
    var ips        = JSON.parse( safeIpList );
    global.SAFEIPS = global.SAFEIPS.concat( ips );
    if ( global.DEBUG ) console.log( "Defined Safe IPs are:", global.SAFEIPS );
  } catch ( e ) {
    console.log( "There is no safe ip list -----------------------------------------------" );
    console.log( " Your local ips are safe, we are marking them." );
    console.log( " But you might make mistakes and ban yourself from the host." );
    console.log( " It would be nice if you added your own ip to system." );
    console.log( " For more information, look at the documentation for how to create one." );
    console.log( "------------------------------------------------------------------------" );
  }

  var networker = new network();
  var settings  = JSON.parse( content );
  var key;
  for ( key in settings ) {
    if ( settings.hasOwnProperty( key ) ) {
      if ( !fs.existsSync( settings[ key ].file ) ) {
        console.log( settings[ key ].file + " does not exist" );
        process.exit( 1 );
      }
    }
  }
  for ( key in settings ) {
    if ( settings.hasOwnProperty( key ) ) readers.push( new logReader( key, settings[ key ], networker ) );
  }
}

Run();

process.stdin.resume();//so the program will not close instantly

function exitHandler ( options, err ) {
  if ( options.cleanup ) {
    global.logger( "EXIT", "Process stop received, terminating jobs, please wait..." );
    readers.map( function ( reader ) {
      reader.stop();
    } );
  }
  setTimeout( function () {
    if ( err ) console.log( err.stack );
    process.exit();
  }, 250 );
}

process.on( "exit", exitHandler.bind( null, { cleanup: true } ) );
process.on( "SIGINT", exitHandler.bind( null, {} ) );
process.on( "uncaughtException", exitHandler.bind( null, {} ) );