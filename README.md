# node-libpq

[![Build Status](https://travis-ci.org/brianc/node-libpq.svg?branch=master)](https://travis-ci.org/brianc/node-libpq)

Node native bindings to the PostgreSQL [libpq](http://www.postgresql.org/docs/9.3/interactive/libpq.html) C client library.  This module attempts to mirror _as closely as possible_ the C API provided by libpq and provides the absolute minimum level of abstraction.  It is intended to be extremely low level and allow you the same access as you would have to libpq directly from C, except in node.js! The obvious trade-off for being "close to the metal" is having to use a very non-idomatic node module.

If you have a good understanding of libpq or used it before hopefully the methods within node-libpq will be familiar; otherwise, you should probably spend some time reading [the official libpq C library documentation](http://www.postgresql.org/docs/9.3/interactive/libpq.html) to become a bit familiar. Referencing the libpq documentation directly should also provide you with more insight into the methods here. I will do my best to explain any differences from the C code for each method.

## install

You need libpq installed & the `pg_config` program should be in your path.  You also need [node-gyp](https://github.com/TooTallNate/node-gyp) installed.

```bash
$ npm install libpq
```

## use

```js
var Libpq = require('libpq');
var pq = new Libpq();
```

## API

### connection functions

Libpq provides a few different connection functions, some of which are "not preferred" anymore.  I've opted to simplify this interface a bit into a single __async__ and single __sync__ connnection function.  The function accepts an  connection string formatted as outlined [in this documentation in section 31.1.1](http://www.postgresql.org/docs/9.3/static/libpq-connect.html). If the parameters are not supplied, libpq will automatically use environment variables, a pgpass file, and other options.  Consult the libpq documentation for a better rundown of all the ways it tries to determine your connection parameters.

I personally __always__ connect with environment variables and skip supplying the optional `connectionParams`.  Easier, more 12 factor app-ish, and you never risk hard coding any passwords. YMMV. :smile:

##### `pq.connect([connectionParams:string], callback:function)`

Asyncronously attempts to connect to the postgres server. 

- `connectionParams` is an optional string
- `callback` is mandatory. It is called when the connection has successfully been established.

This function actually calls the `PQconnectdb` blocking connection method in a background thread within node's internal thread-pool. There is a way to do non-blocking network I/O for some of the connecting with libpq directly, but it still blocks when your local file system looking for config files, SSL certificates, .pgpass file, and doing possible dns resolution.  Because of this, the best way to get _fully_ non-blocking is to juse use `libuv_queue_work` and let node do it's magic.

##### `pq.connectSync([connectionParams:string])`

Attempts to connect to a PostgreSQL server. __BLOCKS__ until it either succeedes, or fails.  If it fails it will throw an exception.

- `connectionParams` is an optional string

##### `pq.finish()`

Disconnects from the backend and cleans up all memory used by the libpq connection.

### Connection Status Functions

##### `pq.errorMessage():string`

Retrieves the last error message from the connection.  This is intended to be used after most functions which return an error code to get more detailed error information about the connection.  You can also check this _before_ issuing queries to see if your connection has been lost.

##### `pq.socket():int`

Returns an int representing the file descriptor for the socket used internally by the connection

### Sync Command Execution Functions

##### `pq.exec(commandText:string)`

__sync__ sends a command to the backend and blocks until a result is received.

- `commandText` is a required string of the query.

##### `pq.execParams(commandText:string, parameters:array[string])`

__snyc__ sends a command and parameters to the backend and blocks until a result is received.

- `commandText` is a required string of the query.
- `parameters` is a required array of string values corresponding to each parameter in the commandText.

##### `pq.prepare(statementName:string, commandText:string, nParams:int)`
__sync__ sends a named statement to the server to be prepared for later execution. blocks until a result from the prepare operation is received.

- `statementName` is a required string of name of the statement to prepare.
- `commandText` is a required string of the query.
- `nParams` is a count of the number of parameters in the commandText.

##### `pq.execPrepared(statementName:string, parameters:array[string])`
__sync__ sends a command to the server to execute a previously prepared statement. blocks until the results are returned.

- `statementName` is a required string of the name of the prepared statement.
- `parameters` are the parameters to pass to the prepared statement.

### Async Command Execution Functions

In libpq the async command execution functions _only_ dispatch a reqest to the backend to run a query.  They do not start result fetching on their own.  Because libpq is a C api there is a somewhat complicated "dance" to retrieve the result information in a non-blocking way.  node-libpq attempts to do as little as possible to abstract over this; therefore, the following functions are only part of the story.  For a complete tutorial on how to dispatch & retrieve results from libpq in an async way you can [view the complete approach here](https://github.com/brianc/node-pg-native/blob/master/index.js#L105) 

##### `pq.sendQuery(commandText:string):boolean`
__async__ sends a query to the server to be processed.

- `commandText` is a required string containing the query text.

Returns `true` if the command was sent succesfully or `false` if it failed to send.

##### `pq.sendQueryParams(commandText:string, parameters:array[string]):boolean`
__async__ sends a query and to the server to be processed.

- `commandText` is a required string containing the query text.
- `parameters` is an array of parameters as strings used in the parameterized query.

Returns `true` if the command was sent succesfully or `false` if it failed to send.

##### `pq.sendPrepare(statementName:string, commandText:string, nParams:int):boolean`
__async__ sends a request to the backend to prepare a named statement with the given name.

- `statementName` is a required string of name of the statement to prepare.
- `commandText` is a required string of the query.
- `nParams` is a count of the number of parameters in the commandText.

Returns `true` if the command was sent succesfully or `false` if it failed to send.

##### `pq.sendQueryPrepared(statementName:string, parameters:array[string]):boolean`
__async__ sends a request to execute a previously prepared statement.

- `statementName` is a required string of the name of the prepared statement.
- `parameters` are the parameters to pass to the prepared statement.

##### `pq.getResult():boolean`
Parses received data from the server into a `PGresult` struct and sets a pointer internally to the connection object to this result.  __warning__: this function will __block__ if libpq is waiting on async results to be returned from the server.  Call `pq.isBusy()` to determine if this command will block.

Returns `true` if libpq was able to read buffered data & parse a result object.  Returns `false` if there are no results waiting to be parsed.
