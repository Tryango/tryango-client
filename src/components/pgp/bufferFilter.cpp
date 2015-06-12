#include <cstring>
#include <cctype>
#include "bufferFilter.h"
#if defined(_MSC_VER)
#pragma comment(lib, "ws2_32.lib")
#endif
#define OOB -1
#define EOP -2
#define ELF -3
#define ECR -4

#define NUL '\0'
#define CR  '\r'
#define LF  '\n'

#define YES 1
#define NO  0

const static signed char base256Data[] = {
  OOB,OOB,OOB,OOB, OOB,OOB,OOB,OOB, OOB,OOB,ELF,OOB, OOB,ECR,OOB,OOB,

  OOB,OOB,OOB,OOB, OOB,OOB,OOB,OOB, OOB,OOB,OOB,OOB, OOB,OOB,OOB,OOB,
      /*                                                -                / */
  OOB,OOB,OOB,OOB, OOB,OOB,OOB,OOB, OOB,OOB,OOB, 62, OOB,OOB,OOB, 63,
      /*  0   1   2   3    4   5   6   7    8   9                =        */
   52, 53, 54, 55,  56, 57, 58, 59,  60, 61,OOB,OOB, OOB,EOP,OOB,OOB,
      /*      A   B   C    D   E   F   G    H   I   J   K    L   M   N   O*/
  OOB,  0,  1,  2,   3,  4,  5,  6,   7,  8,  9, 10,  11, 12, 13, 14,
      /*  P   Q   R   S    T   U   V   W    X   Y   Z                     */
   15, 16, 17, 18,  19, 20, 21, 22,  23, 24, 25,OOB, OOB,OOB,OOB,OOB,
      /*      a   b   c    d   e   f   g    h   i   j   k    l   m   n   o*/
  OOB, 26, 27, 28,  29, 30, 31, 32,  33, 34, 35, 36,  37, 38, 39, 40,
      /*  p   q   r   s    t   u   v   w    x   y   z                     */
   41, 42, 43, 44,  45, 46, 47, 48,  49, 50, 51,OOB, OOB,OOB,OOB,OOB,
  };
const signed char* BufferFilter::base256 = base256Data;

int BufferFilter::readBinary(byte *p, unsigned int max)
{
  in.read((cast_t)p,  max);
//   std::cout<<in.gcount()<<"**************************************************"<<std::endl;
//   std::cout<<string_to_hex(std::string((char*)p, in.gcount()))<<std::endl;
  /*number of characers read*/
  return in.gcount();
}

BufferFilter::BufferFilter(const std::string& buff){
  gotError = false;
  logger = NULL;
  in <<buff;
  doneRR = NO;
  foundRR = NO;
  doneDR = NO;
  doneIG = NO;
  doneIB = NO;
  availDR = 0;
  MAGIC_COUNT = 0;
  AVAIL_COUNT = 0;
  qDR = NULL;
  NEXT_IN = NULL;
}
void BufferFilter::log(std::string msg){
  if(logger!=NULL){
    (*logger)<<msg<<std::endl;
    logger->flush();
  }
  else{
    std::cout << msg << std::endl;
  }
}

int BufferFilter::readRadix64(byte *p, unsigned int max)
{
  char c;
  bool signedMsg = false;
  bool pendingLf = false;
  bool seenEmptyLine = false;
  int d, out = 0, lf = 0, cr = 0;
  byte *lim = p + max;
  std::string line;

  if (doneRR == YES) return 0;

  if (foundRR == NO) {

  again:
    do {
      std::getline(in, line);
      if(signedMsg){
        if(seenEmptyLine && "-----BEGIN PGP" != line.substr(0, 14)){
          // trim trailing spaces
          size_t endpos = line.find_last_not_of(" \t\r\n");
          if( std::string::npos != endpos ){
            line = line.substr(0, endpos + 1);
          }
          // dash unescape
          if(line.size()>1 &&(line.at(0) == '-' && line.at(1) == ' ')){
            line = line.substr(2);
          }
          if(pendingLf){
            skipped.push_back('\x0D');
            skipped.push_back('\x0A');
          }
          skipped.append(line);
          pendingLf = true;
        }
        else{
          if(lineNotBlank(line) != YES){
            seenEmptyLine = true;
          }
        }
      }
//       in.getline((cast_t)tmpbuf, BUFSIZ);
      if(in.fail() || in.eof()){
        gotError = true;
        log("can't find PGP armor boundary.\n");
        return out;
      }
    } while ("-----BEGIN PGP" != line.substr(0, 14));

    if ("-----BEGIN PGP SIGNED" == line.substr(0, 21)){
      signedMsg = true;
      goto again;
    }

    do {
//       in.getline((cast_t)tmpbuf, BUFSIZ);
      std::getline(in, line);
      if(in.fail() || in.eof()){
        gotError = true;
        log("can't find PGP armor.\n");
        return out;
      }
    } while (lineNotBlank(line) == YES);
    foundRR = YES;
  }

  while (p < lim) {
    in.get(c);
    if (c == EOF) {
      doneRR = YES;
      return out;
    }
    d = base256[(int)c];
    switch (d) {
    case OOB:
      gotError = true;
      log("illegal radix64 character.");
      goto skiptail;
    case EOP:
      /* radix64 surely matches this */
      goto skiptail;
    case ELF:
      if (++lf >= 2) goto skiptail;
      continue;
    case ECR:
      if (++cr >= 2) goto skiptail;
      continue;
    }
    lf = cr = 0;
    *p++ = d;
    out++;
  }
  return out;
 skiptail:
  while (in.get() != EOF);
  doneRR = YES;
  return out;
}

int BufferFilter::decodeRadix64(byte *p, unsigned int max)
{
  unsigned int i, size, out = 0;
  byte c1, c2, c3, c4, *r, *lim = p + max;

  if (doneDR == YES) return 0;


  while (p + 3 < lim) {
    if (availDR < 4) {
      r = qDR;
      qDR = d_buf1;
      for (i = 0; i < availDR; i++)
        *qDR++ = *r++;
      size = (this->*d_func1)(qDR, sizeof(d_buf1) - availDR);
      
      qDR = d_buf1;
      availDR += size;
      if (size == 0) {
        doneDR = YES;
        switch (availDR) {
        case 0:
          return out;
        case 1:
          gotError = true;
          log("illegal radix64 length.");
          return out; /* anyway */
        case 2:
          c1 = *qDR++;
          c2 = *qDR++;
          *p++ = (c1 << 2) | ((c2 & 0x30) >> 4);
          return out + 1;
        case 3:
          c1 = *qDR++;
          c2 = *qDR++;
          c3 = *qDR++;
          *p++ = (c1 << 2) | ((c2 & 0x30) >> 4);
          *p++ = ((c2 & 0x0f) << 4) |
            ((c3 & 0x3c) >> 2);
          return out + 2;
        }
      }
    }

    if (availDR >= 4) {
      c1 = *qDR++;
      c2 = *qDR++;
      c3 = *qDR++;
      c4 = *qDR++;
      *p++ = (c1 << 2) | ((c2 & 0x30) >> 4);
      *p++ = ((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2);
      *p++ = ((c3 & 0x03) << 6) | c4;
      availDR -= 4;
      out += 3;
    }
  }
  return out;
}

int BufferFilter::lineNotBlank(const std::string& line)
{
  char *s = (char*)line.c_str();
  while ((*s)=='\x00' || isspace(*s) ) {
    if ((*s)=='\x00' || *s == CR || *s == LF ){
      return NO;
    }
    s++;
  }
  return YES;
}


void BufferFilter::setLogger(Logger* log){
  logger = log;
};

int BufferFilter::inflate_gzip(byte *p, unsigned int max)
{
  int err, size, inflated = 0, old;

  if (doneIG == YES) return 0;

  z.next_out = p;
  z.avail_out = max;

  while (z.avail_out != 0) {
    if (z.avail_in == 0) {
      size = (this->*d_func2)(d_buf2, sizeof(d_buf2));
      z.next_in  = d_buf2;
      z.avail_in = size;
    }

    old = z.avail_out;
    err = inflate(&z, Z_SYNC_FLUSH);

    if (err != Z_OK && err != Z_STREAM_END){
      log("zlib inflate error.");
      return -1;
    }

    inflated = max - z.avail_out;

    if ((unsigned int)old == z.avail_out && z.avail_in != 0)
      break;

    if (err == Z_STREAM_END) {
      doneIG = YES;
      /* 8 bytes (crc and isize) are left. */
      if (inflateEnd(&z) != Z_OK){
        log("zlib inflateEnd error.");
        return -1;
      }
      break;
    }
  }
  return inflated;
}

int BufferFilter::inflate_bzip2(byte *p, unsigned int max)
{
  int err, size, inflated = 0, old;

  if (doneIB == YES) return 0;

  bz.next_out = (cast_t)p;
  bz.avail_out = max;

  while (bz.avail_out != 0) {
    if (bz.avail_in == 0) {
      size = (this->*d_func2)(d_buf2, sizeof(d_buf2));
      bz.next_in  = (cast_t)d_buf2;
      bz.avail_in = size;
    }

    old = bz.avail_out;
    err = BZ2_bzDecompress(&bz);

    if (err != BZ_OK && err != BZ_STREAM_END) {
      log("bzip2 BZ2_bzDecompress error.");
      return -1;
    }

    inflated = max - bz.avail_out;

    if ((unsigned int)old == bz.avail_out && bz.avail_in != 0)
      break;

    if (err == BZ_STREAM_END) {
      doneIB = YES;
      /* 8 bytes (crc and isize) are left. */
      if (BZ2_bzDecompressEnd(&bz) != BZ_OK){
        log("bzip2 BZ2_bzDecompressEnd error.");
        return -1;
      }
      break;
    }
  }

  return inflated;
}

int BufferFilter::getC1()
{
  byte c;

  if (AVAIL_COUNT == 0) {
    AVAIL_COUNT = (this->*d_func3)(d_buf3, sizeof(d_buf3));
//     std::cout<<"Avai:"<<AVAIL_COUNT<<std::endl;
    if (AVAIL_COUNT == 0)
      return EOF;
    NEXT_IN = d_buf3;
  }

  AVAIL_COUNT--;
  MAGIC_COUNT++;
  c = *NEXT_IN;
//   printf("%02x", c);
  NEXT_IN++;

  return c;
}


int BufferFilter::getC()
{
//   std::cout<<"************************************"<<std::endl;
//   std::cout<<" Avail count:"<<AVAIL_COUNT<<" NEXT_IN:"<<(void*)NEXT_IN<<" buff3:"<<(void*)(d_buf3+1819)<<std::endl;
  int c = getC1();
//   printf("%02x", *(d_buf3+1817));
//   printf("%02x", *(d_buf3+1818));
//   printf("%02x", *(d_buf3+1819));
  if (c == EOF){
    log("unexpected end of file.");
    gotError = true;
    return EOF;
  }
//   std::cout<<" Avail count:"<<AVAIL_COUNT<<" NEXT_IN:"<<(void*)NEXT_IN<<" buff3:"<<(void*)(d_buf3+1819)<<std::endl;
  return c;
}

int BufferFilter::getCGetlen()
{
  return MAGIC_COUNT;
}

void BufferFilter::getCResetlen()
{
  MAGIC_COUNT = 0;
}

void BufferFilter::setArmor(void)
{
  d_func1 = &BufferFilter::readRadix64;
  d_func2 = NULL;
  d_func3 = &BufferFilter::decodeRadix64;
}

void BufferFilter::setBinary(void)
{
  d_func1 = NULL;
  d_func2 = NULL;
  d_func3 = &BufferFilter::readBinary;
}

/*
 * Assuming Compressed_Data_Packet ends at the end of file
 */

void BufferFilter::compressedDataPacket(int len)
{
  unsigned int alg = getC();
//   printf("Compressed by alg no %d\n",alg);
  int err = Z_OK;
  int (BufferFilter::*func)(byte *, unsigned int);

  z.zalloc =NULL;// (alloc_func)0;
  z.zfree =  NULL;//(free_func)0;
  z.opaque = NULL;//(voidpf)0;
  bz.bzalloc=NULL;// (void *)0;
  bz.bzfree =NULL;// (void *)0;
  bz.opaque =NULL;// (void *)0;

  /*
   * 0 uncompressed
   * 1 ZIP without zlib header (RFC 1951)
   *  inflateInit2 (strm, -13)
   * 2 ZLIB with zlib header (RFC 1950)
   *  inflateInit  (strm)
   * 3 BZIP2 (http://sources.redhat.com/bzip2/)
   */

  switch (alg) {
  case 0:
    return;
  case 1:
    err = inflateInit2(&z, -13);
    if (err != Z_OK){
      log("zlib inflateInit error.");
      return;
    }
    func = &BufferFilter::inflate_gzip;
    break;
  case 2:
    err = inflateInit(&z);
    if (err != Z_OK){
      log("zlib inflateInit error.");
      return;
    }
    func = &BufferFilter::inflate_gzip;
    break;
  case 3:
    err = BZ2_bzDecompressInit(&bz, 0, 0);
    if (err != BZ_OK){
      log("bzip2 BZ2_bzDecompressInit error.");
    }
    func = &BufferFilter::inflate_bzip2;
    break;
  default:
    log("unknown compress algorithm.");
  }

  z.next_in  = d_buf2;
  z.avail_in = AVAIL_COUNT;
  z.next_out = 0;
  z.avail_out = sizeof(d_buf2);
  bz.next_in  = (cast_t)d_buf2;
  bz.avail_in = AVAIL_COUNT;
  bz.next_out = 0;
  bz.avail_out = sizeof(d_buf2);
  memcpy(d_buf2, NEXT_IN, AVAIL_COUNT);
  AVAIL_COUNT = 0;

  if (d_func1 == NULL) {
    d_func1 = NULL;
    d_func2 = &BufferFilter::readBinary;
    d_func3 = func;
  } else {
    d_func1 = &BufferFilter::readRadix64;
    d_func2 = &BufferFilter::decodeRadix64;
    d_func3 = func;
  }
}


void BufferFilter::skip(int len)
{
  int i;
  for (i = 0; i < len; i++){
    if(getC() == EOF)
      return; 
  }
}

std::string BufferFilter::getSkipped()
{
    return skipped;
}


