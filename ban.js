// These are the commands used by the app.
// You can change these if you want to use any other firewall
//
// %% characters are needed for replacing content:
// - For create and add commands %% are replaced with log type
// - For ban commands first %% is replaced with log type, second is the ip/subnet to be banned,
//   you must keep the locations as is.
// - For destroy commands, both %% are replaced with log type.
global.COMMANDS = {
  CREATEIP  : "ipset create %%-ip hash:ip -exist", // create an ip list
  ADDIP     : "iptables -I INPUT -m set --match-set %%-ip src -p ALL -j DROP", // add ip list to iptables
  CREATENET : "ipset create %%-net hash:net -exist", // create a subnet list
  ADDNET    : "iptables -I INPUT -m set --match-set %%-net src -p ALL -j DROP", // add subnet list to iptables
  BANIP     : "ipset add %%-ip %%",
  BANNET    : "ipset add %%-net %%.0/24",
  DESTROYIP : "iptables -D INPUT -m set --match-set %%-ip src -p ALL -j DROP && ipset destroy %%-ip",
  DESTROYNET: "iptables -D INPUT -m set --match-set %%-net src -p ALL -j DROP && ipset destroy %%-net"
};

var fs        = require( "fs" );
var Lib       = require( __dirname + "/utils/lib" );
var Network   = require( __dirname + "/utils/network" );
var LogReader = require( __dirname + "/utils/logreader" );

// If DEBUG is true, app will not ban any ip or subnets
global.DEBUG = false;
process.argv.forEach( function ( val ) {
  if ( val.toLowerCase() === "debug" ) {
    console.log( "\n-- Debug is on!" );
    global.DEBUG = true;
  }
} );

var readers = [];

function trySimpleBan () {
  try {
    var simpleban = fs.readFileSync( __dirname + "/info", "utf8" );
    console.log( simpleban );
  } catch ( e ) {
    // Not important
  }
}

function tryReadContent () {
  var content;

  try {
    content = fs.readFileSync( __dirname + "/logs.json", "utf8" );
  } catch ( e ) {
    console.log( "Settings file is missing, or is not readable ---------------------------" );
    console.log( " Please check if the file exists, cannot continue without one" );
    console.log( " If not, look at the documentation for how to create one." );
    console.log( "------------------------------------------------------------------------" );
    process.exit( 1 );
  }

  return content;
}

function tryGlobalSafeList () {
  try {
    var safeIpList = fs.readFileSync( __dirname + "/safe.json", "utf8" );
    var ips        = JSON.parse( safeIpList );
    global.SAFEIPS = global.SAFEIPS.concat( ips );
    if ( global.DEBUG ) {
      console.log( "Defined Safe IPs are:", global.SAFEIPS.join( ", " ), "\n\n" );
    }
  } catch ( e ) {
    console.log( "There is no safe ip list -----------------------------------------------" );
    console.log( " Your local ips are safe, we are marking them." );
    console.log( " But you might make mistakes and ban yourself from the host." );
    console.log( " It would be nice if you added your own ip to system." );
    console.log( " For more information, look at the documentation for how to create one." );
    console.log( "------------------------------------------------------------------------" );
    process.exit( 1 );
  }
}

(function () {
  var content;

  trySimpleBan();
  tryGlobalSafeList();

  content = tryReadContent();

  var glob         = require( "glob" );
  var networker    = new Network();
  var pushToReader = function ( item, key ) {
    glob( item.file, function ( err, files ) {
      if ( err ) {
        global.logger( key, "While processing " + item.file + " an error occured." );
        console.log( err );
        return;
      }

      if ( !files.length ) {
        global.logger( key, "No files found regarding \"" + item.file + "\". Please check that pattern is ok." );
        return;
      }

      for ( var m = 0; m < files.length; m++ ) {
        item.file = files[ m ];
        if ( fs.lstatSync( item.file ).isFile() ) {
          readers.push( new LogReader( key, item, networker ) );
        }
      }
    } );
  };

  var settings = JSON.parse( content );
  var key;
  for ( key in settings ) {
    if ( settings.hasOwnProperty( key ) ) {
      pushToReader( settings[ key ], key );
    }
  }
})();

process.stdin.resume(); // So the program will not close instantly

function exitHandler ( options, err ) {
  if ( options.cleanup ) {
    global.logger( "EXIT", "Process stop received, terminating jobs, please wait..." );
    readers.map( function ( reader ) {
      reader.stop();
    } );
  }
  setTimeout( function () {
    global.logger( "EXIT", "Done" );
    if ( err ) {
      console.log( err );
    }
    process.exit();
  }, 1000 );
}

process.on( "exit", exitHandler.bind( null, { cleanup: true } ) );
process.on( "SIGINT", exitHandler.bind( null, {} ) );
process.on( "uncaughtException", exitHandler.bind( null, {} ) );