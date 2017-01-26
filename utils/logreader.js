function LogReader ( key, information, currentNetwork ) {
  this.__key         = key;
  this.__information = information;
  this.__network     = currentNetwork;

  this.__startReading();
  this.__stopped = false;
}

LogReader.prototype.stop = function () {
  this.__network.destroy( this.__key );
  global.logger( this.__key, "Stopping..." );
  this.__stopped = true;
};

LogReader.prototype.__startReading = function () {
  var fs        = require( "fs" );
  var bite_size = 256;
  var readbytes = 0;
  var file;
  var lastLineFeed;
  var lineArray;

  var that = this;

  var processBuffer = function ( err, bytecount, buff ) {
    lastLineFeed = buff.toString( "utf-8", 0, bytecount ).lastIndexOf( "\n" );

    if ( lastLineFeed > -1 ) {
      lineArray = buff.toString( "utf-8", 0, bytecount ).slice( 0, lastLineFeed ).split( "\n" );

      for ( var i = 0; i < lineArray.length; i++ ) {
        var line = lineArray[ i ];
        if ( line.contains( that.__information.lookfor ) ) {
          if ( global.DEBUG ) global.logger( that.__key, "DEBUG : Found IP " + line.IP() );
          that.__network.ip( line.IP(), that.__key, that.__information.attemptlimit, that.__information.iplimit );
        }
      }

      readbytes += lastLineFeed + 1;
    } else {
      readbytes += bytecount;
    }

    process.nextTick( readFile );
  };

  var readFile = function () {
    if ( that.__stopped ) return;
    var stats = fs.fstatSync( file );
    if ( stats.size < readbytes + 1 ) {
      setTimeout( readFile, 250 );
    } else {
      fs.read( file, new Buffer( bite_size ), 0, bite_size, readbytes, processBuffer );
    }
  };

  try {
    global.logger( this.__key, "Opening file for reading " + this.__information.file );
    fs.open( this.__information.file, "r", function ( err, fd ) {
      file = fd;
      readFile();
    } );
  } catch ( e ) {
    global.logger( this.__key, "Could not open the log file " + this.__information.file );
  }
};

module.exports = LogReader;