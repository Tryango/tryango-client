#include "common.hpp"
#include "angCommon.h"
#include "angClient.h"
#include "angWrapper.h"
#include "base64.hpp"

/**********************************************
 * Test of angClient
 **********************************************/

//wrapper class to give access to protected members

class WrapperConfiClient : public ConfiClient {
 public:
  FRIEND_TEST(ClientTest,GetServerInfo);
  WrapperConfiClient():ConfiClient(){
  }
  virtual ~WrapperConfiClient(){
  }
};

class ClientTest : public ::testing::Test {
 protected:
  std::string host = "localhost";
  const uint32_t port = 23456;
  Params params;

  WrapperConfiClient client;
  // Per-test-case set-up.
  // Called before the first test in this test case.
  // Can be omitted if not needed.
  static void SetUpTestCase() {
  }

  // Per-test-case tear-down.
  // Called after the last test in this test case.
  // Can be omitted if not needed.
  static void TearDownTestCase() {
  }

  virtual void SetUp() {
    pthread_cond_init(&params.serverStarted, NULL);
    pthread_mutex_init (&params.mutex, NULL);
    params.port=port;
    client.setServer(host, port, std::string("certificate.pem"));
    params.runSmtp=2;
    /* Obtain a lock.  */
    pthread_mutex_lock (&params.mutex);
  }

  virtual void TearDown() {
    pthread_cond_destroy(&params.serverStarted); 
    pthread_mutex_destroy(&params.mutex);
  }
};


TEST_F(ClientTest, ClientTest){
  pthread_t thread;
//   params.runSmtp=true;
  int iret = pthread_create( &thread, NULL, runPythonServer,(void*)&params);
  std::cout<<"thread done iret"<<std::to_string(iret)<<std::endl;
  ASSERT_TRUE(iret == 0);
  /* Give up the lock, wait till thread is 'done', then reacquire the lock.  */
  pthread_cond_wait (&params.serverStarted, &params.mutex);
  pthread_mutex_unlock(&params.mutex);
  std::string servInfo;
  Confi_Status status;
  status = client.getServerInfo(servInfo);
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(servInfo.compare("SHA-256") == 0);
  ASSERT_TRUE(client.selectRoot() == ANG_OK);
  TreeNode root = client.getRoot();
  ASSERT_TRUE(root.len == 1);
  ASSERT_TRUE(root.hash.length() == 32);
  TreeLeaf last;
  ASSERT_TRUE(client.getLast(&last) == ANG_OK);
  ASSERT_TRUE(client.proveExtend(root) == ANG_OK);
  ASSERT_TRUE(client.signup("alice@nomail.com","machine", "TESTRANDOM1234") == ANG_OK);
//   client.setAp(globalAp);
  TreeLeaf lastNew;
  Confi_Status stat = client.submit(globalAp, "alice@nomail.com", "machine", "certificate");
  if(stat != ANG_OK){
    std::cout<<"result of submit="<<stat<<std::endl;
  }
  ASSERT_TRUE(stat == ANG_OK);
  ASSERT_TRUE(client.getLast(&lastNew) == ANG_OK);
  ASSERT_TRUE(last.hash.compare(lastNew.hash) == 0);

  std::string lastKey;
  stat = client.find(lastKey, "alice@nomail.com");
  ASSERT_TRUE(stat == ANG_OK);
  ASSERT_TRUE(lastKey == "certificate");
  tryango::Entry_Type type;
  stat = client.find_last(lastKey, type, "alice@nomail.com");
  ASSERT_TRUE(stat == ANG_OK);
  ASSERT_TRUE(lastKey == "certificate");
  ASSERT_TRUE(type == tryango::PUBLISH);
  
  ASSERT_TRUE(root.len == 1);
  ASSERT_TRUE(client.proveExtend(root) == ANG_OK);
  ASSERT_TRUE(client.selectRoot() == ANG_OK);
  root = client.getRoot();
  ASSERT_TRUE(client.getLast(&lastNew) == ANG_OK);
  ASSERT_TRUE(last.hash.compare(lastNew.hash) != 0);
  ASSERT_TRUE(root.len == 2);
//   ASSERT_TRUE(
  ASSERT_TRUE(client.proveExtend(root) == ANG_OK);
  ASSERT_TRUE(root.hash.length() == 32);
  stat = client.submit(globalAp, "alice@nomail.com", "machine", "certificate2");
  if(stat!=ANG_OK){
    std::cout<<"result of submit="<<stat<<std::endl;
  }
  ASSERT_TRUE(stat == ANG_OK);
  ASSERT_TRUE(root.len == 2);
  ASSERT_TRUE(client.selectRoot() == ANG_OK);
  root = client.getRoot();
  ASSERT_TRUE(root.len == 3);
  ASSERT_TRUE(root.hash.length() == 32);

  stat = client.find_last(lastKey, type, "alice@nomail.com");
  if(stat!=ANG_OK){
    std::cout<<"result of find_last="<<stat<<std::endl;
  }
  ASSERT_TRUE(stat == ANG_OK);
  ASSERT_TRUE(lastKey == "certificate2");
  ASSERT_TRUE(type == tryango::PUBLISH);

  
  char** result=NULL;
  uint32_t resultSize=0;
  stat = client.getDevices(&result, &resultSize, globalAp, "alice@nomail.com", "machine");
  if(stat!=ANG_OK){
    std::cout<<"result of getDevices="<<stat<<std::endl;
  }
  ASSERT_TRUE(stat==ANG_OK);
  ASSERT_TRUE(resultSize==1);
  ASSERT_TRUE(std::string(result[0]).compare("machine")==0);
  ASSERT_TRUE(client.signup("alice@nomail.com","machine2", "TESTRANDOM2345") == ANG_OK);
  stat = client.getDevices(&result, &resultSize, globalAp, "alice@nomail.com", "machine2");
  ASSERT_TRUE(stat == ANG_OK);
  ASSERT_TRUE(resultSize==2);
  const char *devices[] = {"machine"};
  stat = client.removeDevices(globalAp, std::string("alice@nomail.com"), std::string("machine2"), devices, 1u );
  ASSERT_TRUE(stat == ANG_OK);

  stat = client.getDevices(&result, &resultSize, globalAp, "alice@nomail.com", "machine2");
  ASSERT_TRUE(stat == ANG_OK);
  ASSERT_TRUE(resultSize==1);
//   client.setAp(globalAp); - done in common.hpp
  
  free(result[0]);
  free(result);
//   std::cout<<"ap"<<int(*ap)<<std::endl;
  pthread_join(thread,NULL);
}

