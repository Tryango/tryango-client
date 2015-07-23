#include "common.hpp"
#include "angSsl.h"

/**********************************************
 * Test of angSsl
 **********************************************/
static int genrsa_cb(int p, int n, BN_GENCB *cb);

//wrapper class to give access to protected members
class WrapperConfiSsl : public ConfiSsl {
 public:
  FRIEND_TEST(SslTest,Resolve);
  FRIEND_TEST(SslTest,Connect);

  WrapperConfiSsl():ConfiSsl(){
  }
  virtual ~WrapperConfiSsl(){
  }
};

class SslTest : public ::testing::Test {
 protected:
  WrapperConfiSsl ssl;
  Params confParams;

  virtual void SetUp() {
    pthread_cond_init(&confParams.serverStarted, NULL);
    pthread_mutex_init (&confParams.mutex, NULL);
    confParams.port=23456;
    /* Obtain a lock.  */
    pthread_mutex_lock (&confParams.mutex);
  }

  virtual void TearDown() {
    pthread_cond_destroy(&confParams.serverStarted); 
    pthread_mutex_destroy (&confParams.mutex);
  }
};

TEST_F(SslTest,hexToString){
  std::string input("48656c6c6f");
  ASSERT_TRUE(hex_to_string(input)=="Hello");
  input=std::string("4800");
  ASSERT_TRUE(hex_to_string(input)==std::string("H\0",2));
  ASSERT_TRUE(!hex_to_string(input).empty());
  input=std::string("48q000");
  ASSERT_TRUE(hex_to_string(input).empty());
  input=std::string("\0\0\0",3);
  ASSERT_TRUE(string_to_hex(input)=="000000");
}

TEST_F(SslTest,Connect){
  pthread_t thread;
  int iret = pthread_create( &thread, NULL, runPythonServer,(void*)&confParams);
  ASSERT_TRUE(iret==0);
  pthread_cond_wait (&confParams.serverStarted, &confParams.mutex);
  std::string buffer("test");
  int written = ssl.send(buffer);
  ASSERT_TRUE(written == -2);
  ASSERT_FALSE(ssl.connect("localhost",confParams.port)==ANG_OK);
  ASSERT_FALSE(ssl.initCertificate("certificateSome.pem"));
  ASSERT_TRUE(ssl.initCertificate("certificate.pem"));
  ASSERT_TRUE(ssl.connect("localhost",confParams.port)==ANG_OK);
  ASSERT_TRUE(ssl.send(buffer));
  pthread_cancel(thread);
}

// callback function to print progress of rsa generation 
// see http://www.eng.lsu.edu/mirrors/openssl/docs/crypto/BN_generate_prime.html
static int genrsa_cb(int p, int n, BN_GENCB *cb){
  char c='*';
  if (p == 0) c='.';
  if (p == 1) c='+';
  if (p == 2) c='*';
  if (p == 3) c='\n';
  BIO_write((BIO*)cb->arg,&c,1);
  (void)BIO_flush((BIO*)cb->arg);
#ifdef LINT
  p=n;
#endif
  return 1;
}


TEST_F(SslTest,genKey){
	BN_GENCB cb;
  BIO *bio_err=NULL;
  bio_err = BIO_new_fp (stderr, BIO_NOCLOSE);
	BN_GENCB_set(&cb, genrsa_cb, bio_err);

  RSA* rsa= RSA_new();
  BIGNUM *e = BN_new();
  BN_set_word(e, RSA_F4);
  ASSERT_TRUE(RSA_generate_key_ex(rsa, 4096, e, &cb)!=NULL);
  ASSERT_TRUE(RSA_check_key(rsa)==1);
  BN_clear_free(e);
}
