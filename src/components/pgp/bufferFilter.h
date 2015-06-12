#pragma once
#include <sstream>
#include <string>
#include <zlib.h>
#include <bzlib.h>
#include "angCommon.h"
#include "logger.h"


typedef unsigned char byte;
typedef char * cast_t;

class BufferFilter{
 private:
  const static signed char* base256;
  Logger* logger;
  std::string skipped;
  int doneRR;
  int foundRR;
  int doneDR;
  unsigned int availDR;
  byte *qDR;
  int doneIG;
  int doneIB;

  std::stringstream in;

#define CONBUFSIZ 8192
/*   byte tmpbuf[BUFSIZ]; */
  byte d_buf1[CONBUFSIZ];
  byte d_buf2[CONBUFSIZ];
  byte d_buf3[CONBUFSIZ];

  unsigned int MAGIC_COUNT;
  unsigned int AVAIL_COUNT;
  byte *NEXT_IN;

  int (BufferFilter::*d_func1)(byte *, unsigned int);
  int (BufferFilter::*d_func2)(byte *, unsigned int);
  int (BufferFilter::*d_func3)(byte *, unsigned int);

  int lineNotBlank(const std::string &);
  int readBinary(byte *p, unsigned int max);

  int inflate_gzip(byte *, unsigned int);
  z_stream z;

  int inflate_bzip2(byte *, unsigned int);
  bz_stream bz;

  int readRadix64(byte *, unsigned int);
  int decodeRadix64(byte *, unsigned int);
  void log(std::string msg);
  void setLogger(Logger* log);

 public:
  bool gotError;
  BufferFilter(const std::string& in_buff);
  int getC1();
  int getC();
  int getCGetlen();
  void getCResetlen();
  void setBinary(void);
  void setArmor(void);
  void compressedDataPacket(int len);
  void skip(int n);
  std::string getSkipped();

};
