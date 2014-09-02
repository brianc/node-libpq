#ifndef NODE_LIBPQ_ADDON
#define NODE_LIBPQ_ADDON

#include <node.h>
#include <nan.h>
#include <libpq-fe.h>
#include "./connection.h"
#include "./connect-async-worker.h"


//#define LOG(msg) printf("%s\n", msg);
//#define TRACEF(format, arg) printf(format, arg);

#define LOG(msg) ;
#define TRACEF(format, arg) ;

#define TRACE(msg) LOG(msg);
#define THIS() ObjectWrap::Unwrap<Connection>(args.This());

#endif
