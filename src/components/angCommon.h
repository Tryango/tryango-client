#ifndef angCommon_h
#define angCommon_h
#include <string>
#include <assert.h>
#include <iostream> //for std::cout
#include <sstream>
#include <openssl/sha.h>
#if defined(WIN32) || defined(_WIN32) || defined(__WIN32) && !defined(__CYGWIN__)
#include <stdlib.h>
#endif
#if defined(_MSC_VER)
typedef __int16 int16_t;
typedef __int32 int32_t;
typedef __int64 int64_t;
typedef unsigned __int8 uint8_t;
typedef unsigned __int16 uint16_t;
typedef unsigned __int32 uint32_t;
typedef unsigned __int64 uint64_t;
#endif
const unsigned int HASH_SIZE = SHA256_DIGEST_LENGTH; //32

struct TreeNode{
  int64_t len;
  std::string hash;
  TreeNode(): len(0) {}
};
struct TreeLeaf{
  std::string time;
  std::string hash;
};


// List of errors - keep in synch with cWrapper.jsm (also getMaxErrNum) and lang.properties
enum Confi_Status{
  ANG_OK = 0,
  ANG_PREV_NE_LATER = 1,
  ANG_PREV_PRESENT = 2,
  ANG_BAD_MERKLE_CHAIN= 3,
  ANG_NOT_ASC_CT_INDEX = 4,
  ANG_BAD_H_ID = 5,
  ANG_NO_ROOT = 6,
  ANG_NO_HOST = 7,
  ANG_FAIL_SEND = 8,
  ANG_FAIL_CONNECT = 9,
  ANG_FAIL_RECEIVE = 10,
  ANG_FAIL_ENCODE = 11,
  ANG_SERVER_ERROR = 12,
  ANG_WRONG_RESP = 13,
  ANG_WRONG_PROOF = 14,
  ANG_NO_ENTRIES = 15,
  ANG_NO_CERTIFICATE = 16,
  ANG_WRONG_CERTIFICATE = 17,
  ANG_ID_ALREADY_EXISTS = 18,
  ANG_KEY_NOT_SUPPORTED = 19,
  ANG_FAIL_GEN_SELFSIG = 20,
  ANG_NO_KEY_PRESENT = 21,
  ANG_NO_AP = 22,
  ANG_PARSE_ERROR = 23,
  ANG_KEY_ALG_NOT_SUPPORTED = 24,
  ANG_MESSAGE_MODIFIED = 25,
  ANG_COMPRESS_ERROR = 26,
  ANG_INPUT_TOO_LARGE = 27,
  ANG_WRONG_PASSWORD = 28,
  ANG_FAIL_MALLOC = 29,
  ANG_CANCEL = 30,
  ANG_ENCKEY_EXPIRED = 31,
  ANG_UNKNOWN_ERROR = 32,
  //SIGNATURE ERRORS - not critical
  ANG_NO_SIG = 33,
  ANG_WRONG_SIG = 34,
  ANG_NOPUBKEY_SIG = 35,
  ANG_SIG_EXPIRED = 36,
  ANG_SIGKEY_EXPIRED = 37
};

std::string hex_to_string(const std::string& in);

std::string string_to_hex(const std::string& input);

namespace patch
{
    template < typename T > std::string to_string( const T& n )
    {
        std::ostringstream stm ;
        stm << n ;
        return stm.str() ;
    }
}
#endif

