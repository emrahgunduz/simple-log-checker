Array.prototype.contains = function ( obj ) {
  var i = this.length;
  while ( i-- ) {
    if ( obj.contains( this[ i ] ) ) {
      return true;
    }
  }

  return false;
};

String.prototype.localizer = function () {
  function safeRegexEscape ( str ) {
    return str.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1" );
  }

  var current = this;
  for ( var i = 0; i < arguments.length; i++ ) {
    var arg = arguments[ i ];
    current = current.replace( new RegExp( safeRegexEscape( "%%" ) ), arg );
  }
  return current;
};

String.prototype.contains = function ( obj, doNotUseCase ) {
  if ( obj instanceof Array ) {
    var contains = false;
    var that     = doNotUseCase ? this.toLowerCase() : this;
    obj.map( function ( item ) {
      if ( that.indexOf( doNotUseCase ? item.toLowerCase() : item ) >= 0 ) contains = true;
    } );
    return contains;
  }

  if ( doNotUseCase )
    return this.toLowerCase().indexOf( obj.toLowerCase() ) >= 0;
  else
    return this.indexOf( obj ) >= 0;
};

String.prototype.paddingLeft = function ( paddingString ) {
  return String( paddingString + this ).slice( -paddingString.length );
};

var ipRegexPattern   = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
String.prototype.IPS = function () {
  var t = this.match( ipRegexPattern );
  return (!!t && t.length ? t : []);
};

function dateFormat () {
  var date = new Date();

  var months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
  var cDate  = date.getDate().toString().paddingLeft( "  " );
  var cMonth = date.getMonth();
  var cYear  = date.getFullYear();
  var cMin   = date.getMinutes().toString().paddingLeft( "00" );
  var cHr    = date.getHours().toString().paddingLeft( "00" );
  var cSc    = date.getSeconds().toString().paddingLeft( "00" );

  return months[ cMonth ] + " " + cDate + " " + cYear + " - " + cHr + ":" + cMin + ":" + cSc;
}

var logger = function ( key, string ) {
  console.log( ("%% - %% - %%").localizer( key.paddingLeft( "               " ), dateFormat(), string ) );
};

var getLocalIps = function () {
  var os     = require( "os" );
  var ifaces = os.networkInterfaces();
  var ips    = [];

  for ( var ifname in ifaces ) {
    if ( ifaces.hasOwnProperty( ifname ) ) {
      var arr = ifaces[ ifname ];
      for ( var m = 0; m < arr.length; m++ ) {
        if ( arr[ m ].family.toLowerCase() === "ipv4" ) {
          ips.push( arr[ m ].address );
        }
      }
    }
  }

  return ips;
};

global.logger  = logger;
global.SAFEIPS = getLocalIps();