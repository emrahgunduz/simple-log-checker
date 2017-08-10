function Network () {
  this.__fromList = [];
  this.__ipList   = {};
  this.__netList  = {};

  this.__exec          = require( "child_process" ).execSync;
  this.__wait          = false;
  this.__waitingIpList = {};
}

Network.prototype.__createIpSetList = function ( from ) {
  global.logger( from, "Creating missing ipset tables for " + from );

  this.__wait = true;
  var that = this;

  var commands = [
    global.COMMANDS.CREATEIP.localizer( from ),
    global.COMMANDS.ADDIP.localizer( from ),
    global.COMMANDS.CREATENET.localizer( from ),
    global.COMMANDS.ADDNET.localizer( from )
  ];

  for ( var m = 0; m < commands.length; m++ ) {
    that.__exec( commands[ m ], function ( error, stdout, stderr ) {
      if ( error ) if ( !global.DEBUG ) throw ("Could not write ipset table: " + commandB2);
    } );
  }

  that.__fromList.push( from );
  that.__wait = false;
};

Network.prototype.__runCommand = function ( command ) {
  this.__exec( command, function ( error, stdout, stderr ) {
    if ( error ) {
      if ( !global.DEBUG ) {
        global.logger( from, "ERROR: Could not write to ipset table: " + command );
      }
    }
  } );
};

Network.prototype.__ip = function ( ip, from ) {
  if ( global.DEBUG ) return;
  var command = global.COMMANDS.BANIP.localizer( from, ip );
  this.__runCommand( command );
};

Network.prototype.__net = function ( net, from ) {
  if ( global.DEBUG ) return;
  var command = global.COMMANDS.BANNET.localizer( from, net );
  this.__runCommand( command );
};

Network.prototype.destroy = function ( from ) {
  this.__exec( global.COMMANDS.DESTROYIP.localizer( from, from ) );
  this.__exec( global.COMMANDS.DESTROYNET.localizer( from, from ) );
};

Network.prototype.ban = function ( ip, from, attemptLimit, ipLimit ) {
  var subnets = ip.split( "." );
  subnets.pop();
  var net = subnets.join( "." );

  if ( this.__ipList.hasOwnProperty( ip ) ) {
    if ( this.__netList.hasOwnProperty( net ) && this.__netList[ net ].b ) {
      // This IP is banned in net level already
      this.__ipList[ ip ].b = true;
      if ( global.DEBUG ) {
        global.logger( from, "IP %% is already banned on net level".localizer( ip.paddingLeft( "               " ) ) );
      }
    } else {
      // Increasing denied counter for ip
      this.__ipList[ ip ].c++;

      if ( attemptLimit > 0 && !this.__ipList[ ip ].b && this.__ipList[ ip ].c >= attemptLimit ) {
        global.logger( from, "IP BAN  - %% : %% denies".localizer( ip.paddingLeft( "               " ), this.__ipList[ ip ].c.toString().paddingLeft( "   " ) ) );

        this.__ipList[ ip ].b = true;
        this.__ip( ip, from );
      }
    }
  } else {
    // First time seen
    this.__ipList[ ip ] = { c: 1, b: false };
  }

  if ( this.__netList.hasOwnProperty( net ) ) {
    if ( !this.__netList[ net ].c.contains( ip ) ) {
      // Adding ip to network list
      this.__netList[ net ].c.push( ip );

      if ( ipLimit > 0 && !this.__netList[ net ].b && this.__netList[ net ].c.length >= ipLimit ) {
        global.logger( from, "NET BAN - %%.0/24 : %% ip adresses".localizer( net.paddingLeft( "          " ), this.__netList[ net ].c.length.toString().paddingLeft( "   " ) ) );

        this.__netList[ net ].b = true;
        this.__net( net, from );
      }
    }
  } else {
    // First time seen
    this.__netList[ net ] = { c: [ ip ], b: false };
  }
};

Network.prototype.ip = function ( ips, from, attemptLimit, ipLimit ) {
  // If there are waiting ips check them too
  if ( !this.__wait && this.__waitingIpList.hasOwnProperty( from ) ) {
    for ( var m = 0; m < this.__waitingIpList[ from ].length; m++ ) {
      var current = this.__waitingIpList[ from ][ m ];
      this.ban( current.ip, current.from, current.attemptLimit, current.ipLimit );
    }
    delete this.__waitingIpList[ from ];
  }

  // Remove safe ips from found list
  var i = ips.length;
  while ( i-- ) {
    if ( global.SAFEIPS.contains( ips[ i ] ) ) ips.splice( i, 1 );
  }

  // No ips left?
  if ( !ips.length ) {
    return;
  }

  {
    i = ips.length;
    while ( i-- ) {
      var ip = ips[ i ];

      if ( !this.__waitingIpList.hasOwnProperty( from ) ) {
        this.__waitingIpList[ from ] = [];
      }

      // Wait for ipset lists creation, keep ips accessible
      if ( this.__wait ) {
        this.__waitingIpList[ from ].push( { ip: ip, from: from, attemptLimit: attemptLimit, ipLimit: ipLimit } );
        continue;
      }

      // If ipset lists are not set, create them
      if ( !global.DEBUG ) {
        if ( !this.__fromList.contains( from ) ) {
          this.__createIpSetList( from );
          continue;
        }
      } else {
        if ( !this.__waitingIpList.hasOwnProperty( from ) ) {
          this.__waitingIpList[ from ] = [];
        }
      }

      this.ban( ip, from, attemptLimit, ipLimit );
    }
  }
};

module.exports = Network;