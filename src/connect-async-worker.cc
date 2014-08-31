//helper class to perform async connection
#include "./addon.h"

ConnectAsyncWorker::ConnectAsyncWorker(char* paramString, Connection* conn, NanCallback* callback)
  : NanAsyncWorker(callback), conn(conn), paramString(paramString) { }

  ConnectAsyncWorker::~ConnectAsyncWorker() {}

  //this method fires within the threadpool and does not
  //block the main node run loop
  void ConnectAsyncWorker::Execute() {
    TRACE("ConnectAsyncWorker::Execute")
      conn->pq = PQconnectdb(paramString);
    delete[] paramString;

    ConnStatusType status = PQstatus(conn->pq);

    if(status != CONNECTION_OK) {
      SetErrorMessage(PQerrorMessage(conn->pq));
    }
  }

