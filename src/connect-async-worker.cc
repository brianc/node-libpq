//helper class to perform async connection
#include "addon.h"

ConnectAsyncWorker::ConnectAsyncWorker(v8::Local<v8::String> paramString, Connection* conn, Nan::Callback* callback)
  : Nan::AsyncWorker(callback), conn(conn), paramString(paramString) { }

  ConnectAsyncWorker::~ConnectAsyncWorker() { }

  //this method fires within the threadpool and does not
  //block the main node run loop
  void ConnectAsyncWorker::Execute() {
    TRACE("ConnectAsyncWorker::Execute");

    bool success = conn->ConnectDB(*paramString);

    if(!success) {
      SetErrorMessage(conn->ErrorMessage());
    }
  }

  void ConnectAsyncWorker::HandleOKCallback() {
    Nan::HandleScope scope;

    conn->InitPollSocket();
    callback->Call(0, NULL, async_resource);
}
