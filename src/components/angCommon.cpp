#include "angCommon.h"

std::string hex_to_string(const std::string& in) {
    std::string output("");
    unsigned long int r;
    char threeCh[3];
    char* pEnd;
    threeCh[2]='\0';
    if(in.length()%2){
      output.clear();
      return output;
    }
    size_t cnt = in.length() / 2;
    for (size_t i = 0; cnt > i; ++i) {
      threeCh[0]=*(in.c_str()+2*i);
      threeCh[1]=*(in.c_str()+2*i+1);
      r=strtoul(threeCh, &pEnd, 16);
      if (pEnd!=(char*)(threeCh+2)) {
        output.clear();
        return output;
      }
      else{
        output.push_back((unsigned char)r);
      }
    }
    return output;
}

std::string string_to_hex(const std::string& input)
{
  static const char* const lut = "0123456789ABCDEF";
  size_t len = input.length();

  std::string output;
  output.reserve(2 * len);
  for (size_t i = 0; i < len; ++i){
    const unsigned char c = input[i];
    output.push_back(lut[c >> 4]);
    output.push_back(lut[c & 15]);
  }
  return output;
}

