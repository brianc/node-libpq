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

#### `pq.connect([connectionParams:string], callback:function)`
