#include <node.h>
#include <nan.h>
#include <libpq-fe.h>
//#include "./sync.h"
//#include "./async.h"


//#define LOG(msg) ;

#define LOG(msg) printf("%s\n", msg);
#define TRACEF(format, arg) printf(format, arg);

//#define TRACEF(format, arg) ;

#define TRACE(msg) LOG(msg)
#define THIS() ObjectWrap::Unwrap<Connection>(args.This());

#define str(a) #a

#define ENUM_TO_STRING(TYPE) \
  case TYPE: return #TYPE;

#define THROW_MISSING_RESULT_ERROR() NanThrowError("Missing last result");

using v8::FunctionTemplate;
using v8::Handle;
using v8::Object;
using v8::String;

class Connection : public node::ObjectWrap {
  public:

    Connection() : ObjectWrap() {
      TRACE("Connection::Constructor");
      pq = NULL;
      lastResult = NULL;
      read_watcher.data = this;
      write_watcher.data = this;
    }

    ~Connection() {
      LOG("Destructor");
      //if we forgot to clean things up manually
      //make sure we clean up all our data
      ClearLastResult();
      if(pq != NULL) {
        PQfinish(pq);
      }
    }

    static NAN_METHOD(Create) {
      NanScope();

      TRACE("Building new instance");
      Connection* conn = new Connection();
      conn->Wrap(args.This());

      NanReturnValue(args.This());
    }

    static NAN_METHOD(ConnectSync) {
      NanScope();
      TRACE("Connection::ConnectSync::begin");

      Connection *self = ObjectWrap::Unwrap<Connection>(args.This());

      char* paramString = NewCString(args[0]);

      TRACEF("Connection parameters: %s\n", paramString)
        self->pq = PQconnectdb(paramString);

      delete[] paramString;

      ConnStatusType status = PQstatus(self->pq);

      if(status != CONNECTION_OK) {
        NanReturnValue(NanFalse());
      }

      //self->Ref();

      int fd = PQsocket(self->pq);
      uv_poll_init(uv_default_loop(), &(self->read_watcher), fd);
      //uv_poll_init(uv_default_loop(), &(self->write_watcher), fd);

      //start reading to keep the event loop alive
      //self->ReadStart();

      TRACE("Connection::ConnectSync::Success");
      NanReturnValue(NanTrue());
    }

    static NAN_METHOD(Socket) {
      NanScope();
      TRACE("Connection::Socket");

      Connection *self = THIS();
      int fd = PQsocket(self->pq);
      TRACEF("Connection::Socket::fd: %d\n", fd);

      NanReturnValue(NanNew<v8::Number>(fd));
    }

    static NAN_METHOD(GetLastErrorMessage) {
      NanScope();

      Connection *self = THIS();
      char* errorMessage = PQerrorMessage(self->pq);

      NanReturnValue(NanNew(errorMessage));
    }

    static NAN_METHOD(Finish) {
      NanScope();
      TRACE("Connection::Finish::finish");

      Connection *self = THIS();

      self->ClearLastResult();
      PQfinish(self->pq);
      self->pq = NULL;

      NanReturnUndefined();
    }

    static NAN_METHOD(Exec) {
      NanScope();

      Connection *self = THIS();
      char* commandText = NewCString(args[0]);

      TRACEF("Connection::Exec: %s\n", commandText);
      PGresult* result = PQexec(self->pq, commandText);

      delete[] commandText;

      self->SetLastResult(result);

      NanReturnUndefined();
    }

    static NAN_METHOD(ExecParams) {
      NanScope();

      Connection *self = THIS();

      char* commandText = NewCString(args[0]);

      TRACEF("Connection::Exec: %s\n", commandText);

      v8::Local<v8::Array> jsParams = v8::Local<v8::Array>::Cast(args[1]);

      int numberOfParams = jsParams->Length();
      char** parameters = NewCStringArray(jsParams);

      PGresult* result = PQexecParams(
          self->pq,
          commandText,
          numberOfParams,
          NULL, //const Oid* paramTypes[],
          parameters, //const char* const* paramValues[]
          NULL, //const int* paramLengths[]
          NULL, //const int* paramFormats[],
          0 //result format of text
          );

      delete [] commandText;
      DeleteCStringArray(parameters, numberOfParams);

      self->SetLastResult(result);

      NanReturnUndefined();
    }

    static NAN_METHOD(Prepare) {
      NanScope();

      Connection *self = THIS();

      char* statementName = NewCString(args[0]);
      char* commandText = NewCString(args[1]);
      int numberOfParams = args[2]->Int32Value();

      TRACEF("Connection::Prepare: %s\n", statementName);

      PGresult* result = PQprepare(
          self->pq,
          statementName,
          commandText,
          numberOfParams,
          NULL //const Oid* paramTypes[]
          );

      delete [] statementName;
      delete [] commandText;

      self->SetLastResult(result);

      NanReturnUndefined();
    }

    static NAN_METHOD(ExecPrepared) {
      NanScope();

      Connection *self = THIS();

      char* statementName = NewCString(args[0]);

      TRACEF("Connection::ExecPrepared: %s\n", statementName);

      v8::Local<v8::Array> jsParams = v8::Local<v8::Array>::Cast(args[1]);

      int numberOfParams = jsParams->Length();
      char** parameters = NewCStringArray(jsParams);

      PGresult* result = PQexecPrepared(
          self->pq,
          statementName,
          numberOfParams,
          parameters, //const char* const* paramValues[]
          NULL, //const int* paramLengths[]
          NULL, //const int* paramFormats[],
          0 //result format of text
          );

      delete [] statementName;
      DeleteCStringArray(parameters, numberOfParams);

      self->SetLastResult(result);

      NanReturnUndefined();
    }


    static NAN_METHOD(Clear) {
      NanScope();

      TRACE("Connection::Clear");
      Connection *self = THIS();

      self->ClearLastResult();

      NanReturnUndefined();
    }

    static NAN_METHOD(Ntuples) {
      NanScope();

      TRACE("Connection::Ntuples");
      Connection *self = THIS();
      PGresult* res = self->lastResult;
      int numTuples = PQntuples(res);

      NanReturnValue(NanNew<v8::Number>(numTuples));
    }

    static NAN_METHOD(Nfields) {
      NanScope();

      TRACE("Connection::Nfields");
      Connection *self = THIS();
      PGresult* res = self->lastResult;
      int numFields = PQnfields(res);

      NanReturnValue(NanNew<v8::Number>(numFields));
    }

    static NAN_METHOD(Fname) {
      NanScope();

      TRACE("Connection::Fname");
      Connection *self = THIS();

      PGresult* res = self->lastResult;

      char* colName = PQfname(res, args[0]->Int32Value());

      if(colName == NULL) {
        NanReturnNull();
      }

      NanReturnValue(NanNew<v8::String>(colName));
    }

    static NAN_METHOD(Ftype) {
      NanScope();

      TRACE("Connection::Ftype");
      Connection *self = THIS();

      PGresult* res = self->lastResult;

      int colName = PQftype(res, args[0]->Int32Value());

      NanReturnValue(NanNew<v8::Number>(colName));
    }

    static NAN_METHOD(Getvalue) {
      NanScope();

      TRACE("Connection::Getvalue");
      Connection *self = THIS();

      PGresult* res = self->lastResult;

      int rowNumber = args[0]->Int32Value();
      int colNumber = args[1]->Int32Value();

      char* rowValue = PQgetvalue(res, rowNumber, colNumber);

      if(rowValue == NULL) {
        NanReturnNull();
      }

      NanReturnValue(NanNew<v8::String>(rowValue));
    }

    static NAN_METHOD(Getisnull) {
      NanScope();

      TRACE("Connection::Getisnull");
      Connection *self = THIS();

      PGresult* res = self->lastResult;

      int rowNumber = args[0]->Int32Value();
      int colNumber = args[1]->Int32Value();

      int rowValue = PQgetisnull(res, rowNumber, colNumber);

      NanReturnValue(NanNew<v8::Boolean>(rowValue == 1));
    }


    static NAN_METHOD(ResultStatus) {
      NanScope();

      TRACE("Connection::ResultStatus");
      Connection *self = THIS();

      PGresult* res = self->lastResult;

      char* status = PQresStatus(PQresultStatus(res));

      NanReturnValue(NanNew<v8::String>(status));
    }

    static NAN_METHOD(ResultErrorMessage) {
      NanScope();

      TRACE("Connection::ResultErrorMessage");
      Connection *self = THIS();

      PGresult* res = self->lastResult;

      char* status = PQresultErrorMessage(res);

      NanReturnValue(NanNew<v8::String>(status));
    }

    static NAN_METHOD(Test) {
      NanScope();

      TRACE("Connection::Test");

      NanMakeCallback(args.This(), "callback", 0, NULL);

      NanReturnUndefined();
    }

    static NAN_METHOD(SendQuery) {
      NanScope();
      TRACE("Connection::SendQuery");

      Connection *self = THIS();
      char* commandText = NewCString(args[0]);

      TRACEF("Connection::SendQuery: %s\n", commandText);
      int success = PQsendQuery(self->pq, commandText);

      delete[] commandText;

      NanReturnValue(success == 1 ? NanTrue() : NanFalse());
    }

    static NAN_METHOD(GetResult) {
      NanScope();
      TRACE("Connection::GetResult");

      Connection *self = THIS();
      PGresult *result = PQgetResult(self->pq);

      if(result == NULL) {
        NanReturnValue(NanFalse());
      }

      self->SetLastResult(result);
      NanReturnValue(NanTrue());
    }

    static NAN_METHOD(ConsumeInput) {
      NanScope();
      TRACE("Connection::ConsumeInput");

      Connection *self = THIS();

      int success = PQconsumeInput(self->pq);
      NanReturnValue(success == 1 ? NanTrue() : NanFalse());
    }

    static NAN_METHOD(IsBusy) {
      NanScope();
      TRACE("Connection::IsBusy");

      Connection *self = THIS();

      int isBusy = PQisBusy(self->pq);

      NanReturnValue(isBusy == 1 ? NanTrue() : NanFalse());
    }

    static NAN_METHOD(StartRead) {
      NanScope();
      TRACE("Connection::StartRead");

      Connection* self = THIS();

      self->ReadStart();

      NanReturnUndefined();
    }

    static NAN_METHOD(StopRead) {
      NanScope();
      TRACE("Connection::StopRead");

      Connection* self = THIS();

      self->ReadStop();

      NanReturnUndefined();
    }

  private:
    PGconn* pq;
    PGresult* lastResult;
    uv_poll_t read_watcher;
    uv_poll_t write_watcher;

    static void on_io_readable(uv_poll_t* handle, int status, int revents) {
      LOG("Readable!");
      Connection* self = (Connection*) handle->data;
      self->ReadStop();
      self->Emit("readable");
    }

    static void on_io_writable(uv_poll_t* handle, int status, int revents) {
      LOG("Writable!!");
    }

    void ReadStart() {
      LOG("Connection::ReadStart:starting read watcher")
      uv_poll_start(&read_watcher, UV_READABLE, on_io_readable);
      LOG("Connection::ReadStart:started read watcher");
    }

    void ReadStop() {
      LOG("Connection::ReadStop:stoping read watcher");
      uv_poll_stop(&read_watcher);
    }

    void ClearLastResult() {
      LOG("Connection::ClearLastResult");
      if(lastResult == NULL) return;
      PQclear(lastResult);
      lastResult = NULL;
    }

    void SetLastResult(PGresult* result) {
      LOG("Connection::SetLastResult");
      ClearLastResult();
      lastResult = result;
    }

    static char* NewCString(v8::Handle<v8::Value> val) {
      NanScope();

      v8::Local<v8::String> str = val->ToString();
      int len = str->Utf8Length() + 1;
      char* buffer = new char[len];
      str->WriteUtf8(buffer, len);
      return buffer;
    }

    static char** NewCStringArray(v8::Handle<v8::Array> jsParams) {
      NanScope();

      int numberOfParams = jsParams->Length();

      char** parameters = new char*[numberOfParams];

      for(int i = 0; i < numberOfParams; i++) {
        v8::Handle<v8::Value> val = jsParams->Get(i);
        if(val->IsNull()) {
          parameters[i] = NULL;
          continue;
        }
        //expect every other value to be a string...
        //make sure aggresive type checking is done
        //on the JavaScript side before calling
        parameters[i] = NewCString(val);
      }

      return parameters;
    }

    static void DeleteCStringArray(char** array, int length) {
      for(int i = 0; i < length; i++) {
        delete [] array[i];
      }
      delete [] array;
    }

    void Emit(const char* message) {
      NanScope();

      v8::Local<v8::Value> emit_v = NanObjectWrapHandle(this)->Get(NanNew<v8::String>("emit"));
      assert(emit_v->IsFunction());
      v8::Local<v8::Function> emit_f = emit_v.As<v8::Function>();

      v8::Handle<v8::Value> args[1] = { v8::String::New(message) };

      v8::TryCatch tc;
      emit_f->Call(NanObjectWrapHandle(this), 1, args);
      if(tc.HasCaught()) {
        node::FatalException(tc);
      }
    }
};


// Initialize the node addon
void InitAddon(Handle<Object> exports) {

  v8::Local<v8::FunctionTemplate> tpl = NanNew<v8::FunctionTemplate>(Connection::Create);
  tpl->SetClassName(NanNew("PQ"));
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  NODE_SET_PROTOTYPE_METHOD(tpl, "$test", Connection::Test);

  //connection initialization & management functions
  NODE_SET_PROTOTYPE_METHOD(tpl, "$connectSync", Connection::ConnectSync);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$finish", Connection::Finish);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$getLastErrorMessage", Connection::GetLastErrorMessage);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$socket", Connection::Socket);

  //sync query functions
  NODE_SET_PROTOTYPE_METHOD(tpl, "$exec", Connection::Exec);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$execParams", Connection::ExecParams);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$prepare", Connection::Prepare);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$execPrepared", Connection::ExecPrepared);

  //async query functions
  NODE_SET_PROTOTYPE_METHOD(tpl, "$sendQuery", Connection::SendQuery);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$getResult", Connection::GetResult);

  //async i/o control functions
  NODE_SET_PROTOTYPE_METHOD(tpl, "$startRead", Connection::StartRead);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$stopRead", Connection::StopRead);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$consumeInput", Connection::ConsumeInput);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$isBusy", Connection::IsBusy);

  //result accessor functions
  NODE_SET_PROTOTYPE_METHOD(tpl, "$clear", Connection::Clear);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$ntuples", Connection::Ntuples);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$nfields", Connection::Nfields);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$fname", Connection::Fname);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$ftype", Connection::Ftype);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$getvalue", Connection::Getvalue);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$getisnull", Connection::Getisnull);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$resultStatus", Connection::ResultStatus);
  NODE_SET_PROTOTYPE_METHOD(tpl, "$resultErrorMessage", Connection::ResultErrorMessage);

  exports->Set(NanNew<String>("PQ"), tpl->GetFunction());
}

NODE_MODULE(addon, InitAddon)
