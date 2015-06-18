/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
#ifndef common_hpp
#define common_hpp

/* common routines for tests */
// #include <prnetdb.h>
#include <Python.h>
#include <stdio.h>  /* defines FILENAME_MAX */
#include <pthread.h> /* for threads*/

#include "gtest/gtest.h"
#include "angCommon.h"
#define FRIEND_TEST(test_case_name, test_name)\
friend class test_case_name##_##test_name##_Test

#ifdef WINDOWS
    #include <direct.h>
    #define GetCurrentDir _getcwd
#else
    #include <unistd.h>
    #define GetCurrentDir getcwd
 #endif


struct Params{
  int port;
  pthread_cond_t serverStarted;
  pthread_mutex_t mutex;
  int runSmtp;
};

/* Python callback stuff*/
static Params* params;
static std::string globalAp;
static PyObject *angtest_serverStarted( PyObject *self ) {
  pthread_mutex_unlock(&params->mutex);
  pthread_cond_signal (&params->serverStarted);
  Py_RETURN_NONE;
}

static PyObject *angtest_setAp( PyObject *self, PyObject *args) {
  char  *dest;
  if(PyArg_ParseTuple(args, "s", &dest)){
    globalAp = hex_to_string(std::string(dest, 2*HASH_SIZE));
  }
  Py_RETURN_NONE;
}

static PyMethodDef angtest_funcs[] = {
   { "serverStarted", (PyCFunction)angtest_serverStarted, METH_NOARGS, NULL },
   { "setAp", (PyCFunction)angtest_setAp, METH_VARARGS, 
     "Set ap received in the email" },
   { NULL, NULL, 0, NULL }
};

void initangtest(void) {
  Py_InitModule("angtest", angtest_funcs);
}


void* runPythonServer(void* args){
  globalAp.clear();
  Py_Initialize();
  params=&(*(Params*)(args));

  char cCurrentPath[FILENAME_MAX];
  if (GetCurrentDir(cCurrentPath, sizeof(cCurrentPath))){
    Py_SetProgramName(cCurrentPath);
    pthread_mutex_lock(&params->mutex);
    initangtest();
    PyRun_SimpleString("import sys\nsys.path.append(\"../../../../src/\")");
    PyRun_SimpleString("import startserver");
    PyRun_SimpleString("from angtest import serverStarted");
    PyRun_SimpleString("from angtest import setAp");
    PyRun_SimpleString("from twisted.internet import reactor");
    PyRun_SimpleString("import sys\nsys.path.append(\"../../../../src/\")");
    PyRun_SimpleString("import startserver");
    char setPort[40];
    sprintf(setPort, "args['port']=%d\n",params->port);
    PyRun_SimpleString("args={'database':\"temp.db\"}\n\
args['certificate']=\"../../../../confimail/certs/tryango.pem\"\n\
args['reset']=1\n\
args['cachesize']=1000\n\
args['smtp_server']=\"localhost\"\n\
args['smtp_port']=5587\n\
args['smtp_login']=None\n\
args['immediate_sumbit']=True\n\
args['smtp_pass']=None");

    PyRun_SimpleString(setPort);
    PyRun_SimpleString("import sys\nsys.path.append(\"../../../../src/\")");
    if(&params->runSmtp){
      std::stringstream toRun;

      toRun<< "import threading\n\
import asyncore\n\
import email\n\
import sys\n\
import time\n\
sys.argv = [\"test\"]\n\
from smtpd import SMTPServer\n\
def closeR():\n\
    print \"Closing reactor\"\n\
    reactor.stop()\n\
    \n\
\n\
class EmlServer(SMTPServer):\n\
    smtpRun="<<std::to_string(params->runSmtp)<<"\n\
    def process_message(self, peer, mailfrom, rcpttos, data):\n\
        email_msg = email.message_from_string(data)\n\
        ap = email_msg['X-TRYANGO']\n\
        setAp(ap)\n\
        self.smtpRun=self.smtpRun-1\n\
        if self.smtpRun <= 0:\n\
            print \"Closing smtp\"\n\
            asyncore.close_all()\n\
\n\
class ServerThread(threading.Thread):\n\
    def __init__(self, threadID, host, port):\n\
        threading.Thread.__init__(self)\n\
        self.host = host\n\
        self.port = port\n\
    def run(self):\n\
        self.server = EmlServer((self.host, self.port), None)\n\
        try:\n\
            asyncore.loop()\n\
        except:\n\
            pass\n\
        print \"exited smtp\"\n\
sThread = ServerThread(1, \"localhost\", 5587)\n\
sThread.start()\n\
time.sleep(1)\n\
";
      PyRun_SimpleString(toRun.str().c_str());
    }
    PyRun_SimpleString("reactor.callLater(3, closeR)");
    PyRun_SimpleString("reactor.callWhenRunning(serverStarted)");
    PyRun_SimpleString("startserver.main(args)\n");
    if(&params->runSmtp){
      PyRun_SimpleString("sThread.join()");
    }

  }
  Py_Finalize();
  return NULL;
}
#endif
