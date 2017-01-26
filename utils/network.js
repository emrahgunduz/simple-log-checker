function Network () {
  this.__fromList = [];
  this.__ipList   = {};
  this.__netList  = {};

  this.__exec          = require( "child_process" ).exec;
  this.__wait          = false;
  this.__waitingIpList = {};
}

Network.prototype.__createIpSetList = function ( from ) {
  global.logger( from, "Creating missing ipset tables for " + from );

  this.__wait   = true;
  var commandA1 = global.COMMANDS.CREATEIP.localizer( from );
  var commandA2 = global.COMMANDS.ADDIP.localizer( from );
  var commandB1 = global.COMMANDS.CREATENET.localizer( from );
  var commandB2 = global.COMMANDS.ADDNET.localizer( from );

  var that = this;

  var final = function () {
    that.__fromList.push( from );
    that.__wait = false;
  };

  var four = function ( call ) {
    that.__exec( commandB2, function ( error, stdout, stderr ) {
      if ( error ) if ( !global.DEBUG ) throw ("Could not write ipset table: " + commandB2);
      call();
    } );
  };

  var three = function ( call ) {
    that.__exec( commandB1, function ( error, stdout, stderr ) {
      if ( error ) if ( !global.DEBUG ) throw ("Could not write ipset table: " + commandB1);
      call();
    } );
  };

  var two = function ( call ) {
    that.__exec( commandA2, function ( error, stdout, stderr ) {
      if ( error ) if ( !global.DEBUG ) throw ("Could not write ipset table: " + commandA2);
      call();
    } );
  };

  var one = function ( call ) {
    that.__exec( commandA1, function ( error, stdout, stderr ) {
      if ( error ) if ( !global.DEBUG ) throw ("Could not write ipset table: " + commandA1);
      call();
    } );
  };

  one( function () {
    two( function () {
      three( function () {
        four( function () {
          final();
        } );
      } )
    } )
  } )
};

Network.prototype.__ip = function ( ip, from ) {
  if ( global.DEBUG ) return;
  var command = global.COMMANDS.BANIP.localizer( from, ip );
  this.__exec( command, function ( error, stdout, stderr ) {
    if ( error ) if ( !global.DEBUG ) global.logger( from, "ERROR: Could not write to ipset table: " + command );
  } );
};

Network.prototype.__net = function ( net, from ) {
  if ( global.DEBUG ) return;
  var command = global.COMMANDS.BANNET.localizer( from, net );
  this.__exec( command, function ( error, stdout, stderr ) {
    if ( error ) if ( !global.DEBUG ) global.logger( from, "ERROR: Could not write to ipset table: " + command );
  } );
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
      // if ( global.DEBUG ) global.logger( from, "IP %% is already banned on net level".localizer( ip.paddingLeft( "               " ) ) );
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

Network.prototype.ip = function ( ip, from, attemptLimit, ipLimit ) {
  // Do not check for safe ips
  if ( global.SAFEIPS.contains( ip ) ) return;

  // Wait for ipset lists creation, keep ips accessible
  if ( this.__wait ) {
    if ( !this.__waitingIpList.hasOwnProperty( from ) ) this.__waitingIpList[ from ] = [];
    this.__waitingIpList[ from ].push( { ip: ip, from: from, attemptLimit: attemptLimit, ipLimit: ipLimit } );
    return;
  }

  // If ipset lists are not set, create them
  if ( !global.DEBUG ) {
    if ( !this.__fromList.contains( from ) ) {
      this.__createIpSetList( from );
      return;
    }
  } else {
    if ( !this.__waitingIpList.hasOwnProperty( from ) ) this.__waitingIpList[ from ] = [];
  }

  // If there are waiting ips ban them first
  if ( this.__waitingIpList[ from ].length ) {
    for ( var m = 0; m < this.__waitingIpList[ from ].length; m++ ) {
      var current = this.__waitingIpList[ from ][ m ];
      this.ban( current.ip, current.from, current.attemptLimit, current.ipLimit );
    }
    this.__waitingIpList[ from ] = [];
  }

  this.ban( ip, from, attemptLimit, ipLimit );
};

module.exports = Network;