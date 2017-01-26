# Simple Log Checker

Simple Log Picker is a javascript node application for reading defined logs and banning ips or subnets, if log contains defined string(s). Simply create a configuration file, and a safe ip list file. App does the rest.

Depends on "ipset" and "iptables".

Here is a simple configuration file (logs.json)
```json
{
  "exim": {
    "file": "/var/log/exim/mainlog",
    "attemptlimit": 3,
    "iplimit": 20,
    "lookfor": [
      "535 Incorrect authentication data",
      "Bad HELO - Blocked due to abuse"
    ]
  },
  "named": {
    "file": "/var/named/data/named.run",
    "attemptlimit": 50,
    "iplimit": 10,
    "lookfor": [
      "denied"
    ]
  },
  "mywebapp": {
    "file": "/var/log/httpd/somedomain.com.log",
    "attemptlimit": 1,
    "iplimit": 10,
    "lookfor": [
      "wrong password",
      "wrong username and password"
    ]
  }
}
```
So, what is what in here?

* Write the name of the app, or what you want to call it as the key.
* file: Name of the log file.
* attemptlimit: Limit for any ip. If limit is exceeded, ip gets banned
* iplimit: This is a limit for subnet banning. If same subnet ip list gets bigger than this, subnet is banned.
* lookfor: An array of strings to search for. On every new log file, if any is found, a ban is called.

Here is a simple safe ip list file (safe.json)
```json
[
  "10.0.0.5",
  "64.233.160.0",
  "216.239.32.0"
]
```
Enter a single IP in each line. These IP addesses will not be banned on any flood or attempt.

If you want to do a dry-run to see what is going on, simply run the application with "debug" argument. This will stop banning of ips and subnets but will continue to check logs and dump information on screen.

You can use "ipset list" to see what is currently banned.

App does not make the ipset lists permanent, so a restart will clear all.

If you are using a different firewall then iptables and ipset, you can alter commands which the app executes. These are located in the "ban.js" file and documented right at the beginning of the file.