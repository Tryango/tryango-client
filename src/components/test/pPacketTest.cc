#include <vector>
#include <set>
#include <openssl/evp.h>

#include "common.hpp"
#include "packetParser.h"
#include "messageHandler.h"
#include "keyDb.h"
#include "angClient.h"
const std::string compressed = std::string (
"\xa3\x02\x78\x9c\x5b\x63\x98\xc4\x5b\x92\xef\x9a\x97\x5c\x54\x59\x50\xa2\x57\x52\x51\x12\x72\x61\xca\xb1\xe0\xfc\xdc\x54\x85\xdc\xd4\xe2\xe2\xc4\xf4\x54\x85\x92\x7c\x85\xa4\x54\x85\x54\x88\x8a\xd4\x14\x3d\x2e\x00\x16\x04\x13\xca"
, 57);

const std::string publicKeyBin = std::string (
                                              "\x99\x01\x0d\x04\x54\xd2\x0b\xcb\x01\x08\x00\xac\xc3\x23\x0a\xb0\x56\x82\x6c\xb3\x19\xdc\x77\xb6\x49\x7d\x45\x81\x35\x03\x59\x58\xbe\x06\x72\x6c\x29\xd0\xe7\x87\x8e\x29\x51\xc2\xd8\xc0\x66\x3e\x30\xa9\x95\x20\x1f\x53\x25\x58\x69\x36\xee\x88\x05\x5c\x5c\xd5\xfb\x4d\xbc\x2b\xda\x78\xc9\x8c\xcf\x41\xb4\x58\x35\x27\xd4\x8c\xef\x4c\x88\x2e\xcd\xef\x18\xb5\x51\x82\xe8\xbc\xde\x69\x41\xc2\xb9\xef\xd1\xb0\x6d\xf4\x9a\x55\x87\x59\x96\xfd\xc1\xf1\xb3\x8b\x13\x70\x07\x26\x30\x1f\x80\x57\xc0\xb2\x67\x2b\x0c\x96\x76\xe3\x30\xf1\xcd\x6b\x86\xc2\x29\x40\xa4\x6e\xac\xcf\xba\x5e\x89\x81\x87\x45\x9f\xe9\xf2\x76\x6b\xb1\xaf\x59\x15\x34\x42\xf3\x42\x3a\x4f\x09\x2b\xf1\x30\x64\xea\x5e\x0e\x82\x5a\x9a\x4e\x9a\x7a\xa4\x46\x03\x1f\x60\x93\xe0\x97\x6a\x7e\xd9\x0c\x64\xf0\x47\x2b\xb4\xa8\x24\xcc\x6c\x80\xab\xbc\x2f\x91\x98\x97\x31\x9e\xb1\x31\x6d\x41\x9c\xf2\xf7\x46\xcb\xc4\xed\x39\x2a\x48\xad\xa8\xab\xaf\x04\x18\x9e\xf8\x10\xec\x01\xa7\x0b\x7c\xc3\xba\x36\x1a\x62\xc4\x22\xd9\x0b\x1e\x0f\x72\xd8\x32\x49\x95\x2b\x57\xb9\x9a\xf0\xb4\xcf\xe1\xa3\x13\x19\x59\xc5\x9e\x78\xf5\x40\x17\x00\x11\x01\x00\x01\xb4\x15\x74\x65\x73\x74\x65\x72\x20\x3c\x74\x65\x73\x74\x65\x72\x40\x6f\x32\x2e\x70\x6c\x3e\x89\x01\x3e\x04\x13\x01\x02\x00\x28\x05\x02\x54\xd2\x0b\xcb\x02\x1b\x03\x05\x09\x00\x02\xa3\x00\x06\x0b\x09\x08\x07\x03\x02\x06\x15\x08\x02\x09\x0a\x0b\x04\x16\x02\x03\x01\x02\x1e\x01\x02\x17\x80\x00\x0a\x09\x10\xab\x0e\xdd\xfe\x2f\x53\xcf\x15\xbf\x78\x07\xfe\x2d\xbc\xf9\x04\x86\x74\xa4\x79\x3b\x71\xc3\x85\xaa\xc2\x9b\x03\xd9\xee\x0e\xd3\x01\x39\xb7\xf5\x62\xde\x4b\xfd\x28\xb7\x07\x63\x13\x56\xa7\xdb\x4e\xa3\xce\xcb\xda\xed\x83\xb0\x54\x2f\xe2\x8c\x5b\xa5\x7f\x63\x21\x39\x42\x2d\xeb\xd9\x53\x88\xcf\xc0\x17\xfc\xee\x21\x73\x21\x35\x8d\x87\x94\xd3\xd4\x96\x60\x0d\x6e\x8e\x07\x9d\x70\xda\xfc\xe5\xea\x6b\x92\xe5\x43\x44\x82\xe8\x01\x0f\x30\xf6\x66\x03\xcc\x0e\xde\xa4\x09\x92\x82\x89\x59\x1e\x9d\x41\x03\x6d\x7a\xee\x69\xdf\xf8\x1f\x9c\xf2\xf7\x31\xbc\x91\x25\x43\x55\x76\x53\xbd\x84\x94\xaf\x77\x8d\xa7\x4e\x5b\xc3\xa2\x69\x56\xa1\x27\x7e\x0c\x93\x99\xb5\x05\x44\x0a\xbc\xdd\x2c\xd8\x77\xc7\x58\x15\xfe\x40\xf5\xab\xe7\xd0\x27\x4f\xf4\xc2\x09\xd7\xb3\xee\xff\xd2\x2c\x1f\xb2\x9b\xc1\xc4\x97\x9a\x6a\x45\x9d\x96\xc0\xfb\x83\x55\x08\x58\x87\xcc\x43\x57\xb8\x4a\xfb\x5f\x5c\x13\x2a\x8a\xdb\x9a\x93\xea\xab\xa2\xc2\xe5\x96\x16\x34\xd6\x30\xad\x7d\xa7\xa5\x04\xac\xa2\xd0\xbc\x50\x1f\xef\xbb\x91\xe5\x1d\xda\x68\xba\xe7\xc9\x45\x8f\x68\x89\xf4\xa0\x7b\xf4\x28\x95\x4d\x1e\xc3\x80\xf7\xb9\x01\x0d\x04\x54\xd2\x0b\xcb\x01\x08\x00\xe4\x2b\x3f\x9d\xc9\xeb\xba\x9b\x8d\xc2\x25\xdf\x7b\x07\xd3\xb6\x82\xa2\x4c\x00\xb7\x01\x42\xaf\x60\x87\x7f\x2d\x80\x3b\xf7\xd5\xe1\x05\xf2\xc6\xac\x8b\xe7\xa0\x2e\xf0\x2e\x58\xf0\x74\x0d\x11\xc0\x53\x75\x39\x6e\xa6\x81\x0c\x78\x4f\x54\x0e\xc5\x5a\x5a\xbc\x4e\xf4\x52\x4a\xc4\x22\x1f\x0f\x7f\x47\xa3\x39\x28\x19\xb0\x3c\xa8\xeb\x58\x3f\x7c\xd2\xd1\xdc\x62\x8f\x23\x2b\x52\x1c\x6b\xe0\xb8\x34\x62\xd2\x18\xaf\x9c\x5d\x90\x9d\x47\x52\xfa\x22\x32\x71\x94\x83\x81\x51\x15\xf4\x8c\x62\xe5\xe0\x08\xfd\x86\x90\x2c\x09\x51\x23\x1e\x2d\x00\xf3\x84\x38\xb2\xd9\xbc\xa4\xa8\x3f\xf1\xb1\x6d\x94\xd7\xea\x72\xd9\xfb\x9a\xa7\xd8\xd7\x94\x45\xd4\xb6\x7b\x3c\x02\x08\x55\x78\x65\xfe\x79\xd1\x67\x81\x39\x54\x20\x10\x8a\xf8\x76\x1a\x17\xc2\x98\xd5\x68\xa6\x24\x5b\x7d\x32\xcd\x31\x78\x28\xb7\xcf\x82\xb5\xb8\x82\xfd\xd8\x87\x80\xd4\xcb\x4c\xa7\x22\xf3\x50\xe5\xd3\xd9\x3d\x62\xd5\xa6\x8f\x77\x0d\xcd\x92\xc1\x9a\x4d\xb9\x3c\x78\x27\xbd\xdf\x43\x20\xf8\x56\xf0\x24\xc6\x48\xb4\x11\x04\xd4\x6f\x2c\xe3\x19\x72\xbd\x91\xe9\x0a\x1e\xf0\x1b\xe3\x00\x11\x01\x00\x01\x89\x01\x25\x04\x18\x01\x02\x00\x0f\x05\x02\x54\xd2\x0b\xcb\x02\x1b\x0c\x05\x09\x00\x02\xa3\x00\x00\x0a\x09\x10\xab\x0e\xdd\xfe\x2f\x53\xcf\x15\xee\x18\x07\xfe\x23\x3f\x18\xf5\xe9\x39\xae\x31\xe9\xc6\x18\xbf\x69\xdc\xb5\x2e\xec\x4c\xd9\x13\x9b\x16\xf0\x1f\xee\xdd\x9b\x03\x71\x79\xf4\x66\xff\x8f\xe9\x4a\xa7\x46\x78\x13\xd2\x2d\xf8\x41\x44\xec\x20\x89\xc8\x7b\xc2\x16\x2a\xe0\x24\x93\xc6\x3b\xc0\x58\xdf\x35\xc1\x7e\x22\x62\x8a\x40\x75\x15\xfb\x11\x2f\x95\x68\x3e\xa7\x43\xb8\xad\xba\x00\x4d\x55\x7e\x2b\xf5\xb6\xd5\x7e\x75\x02\xc7\xf6\x32\x22\x54\x75\x8b\xc2\xcb\x1c\x64\x0c\xc4\x51\x3a\x2f\xdf\x03\x9e\x90\x20\xdb\x11\x15\x80\xf8\x6b\xef\x8e\x6c\x5b\xad\x8c\xd1\xb5\x45\x4e\xcf\x36\x39\x20\x39\x63\xbb\x34\xca\x81\x81\x9c\x7e\xd6\x4d\x03\xd9\x7e\x1f\x82\x64\xd2\x10\x9c\x79\x5f\xf6\x80\x07\x82\xc9\x94\x46\x90\x38\x44\xa9\xe6\x3a\x80\x2e\x14\x55\x34\xa3\xb4\xb2\x3e\xd6\x6d\xea\x9f\x5b\xf9\x49\x56\xee\xa3\xad\x2a\x83\xbd\xc2\x61\x90\x06\x8a\xac\x45\x14\xa5\x06\xdc\x5e\x85\xeb\xc2\x8e\xea\x94\xb4\xfc\x9f\x9d\xed\x0b\x6b\x0f\x53\x83\x1e\xc9\xb6\x0e\x40\x5f\x2b\x84\xef\x94\x72\x87\xfd\x29\x77\x01\x67\x16\x90\xcc\x7b\xaa\xbc\xd5\xe4\x04\x1e\xe2\xe7\x65\x7b\x30\x15\xde\x94\x6e\x5f"
, 1184);

const std::string publicKey = std::string (
"-----BEGIN PGP PUBLIC KEY BLOCK-----\n"
"Version: GnuPG v1\n"
"\n"
"mQENBFTSC8sBCACswyMKsFaCbLMZ3He2SX1FgTUDWVi+BnJsKdDnh44pUcLYwGY+\n"
"MKmVIB9TJVhpNu6IBVxc1ftNvCvaeMmMz0G0WDUn1IzvTIguze8YtVGC6LzeaUHC\n"
"ue/RsG30mlWHWZb9wfGzixNwByYwH4BXwLJnKwyWduMw8c1rhsIpQKRurM+6XomB\n"
"h0Wf6fJ2a7GvWRU0QvNCOk8JK/EwZOpeDoJamk6aeqRGAx9gk+CXan7ZDGTwRyu0\n"
"qCTMbICrvC+RmJcxnrExbUGc8vdGy8TtOSpIrairrwQYnvgQ7AGnC3zDujYaYsQi\n"
"2QseD3LYMkmVK1e5mvC0z+GjExlZxZ549UAXABEBAAG0FXRlc3RlciA8dGVzdGVy\n"
"QG8yLnBsPokBPgQTAQIAKAUCVNILywIbAwUJAAKjAAYLCQgHAwIGFQgCCQoLBBYC\n"
"AwECHgECF4AACgkQqw7d/i9TzxW/eAf+Lbz5BIZ0pHk7ccOFqsKbA9nuDtMBObf1\n"
"Yt5L/Si3B2MTVqfbTqPOy9rtg7BUL+KMW6V/YyE5Qi3r2VOIz8AX/O4hcyE1jYeU\n"
"09SWYA1ujgedcNr85eprkuVDRILoAQ8w9mYDzA7epAmSgolZHp1BA2167mnf+B+c\n"
"8vcxvJElQ1V2U72ElK93jadOW8OiaVahJ34Mk5m1BUQKvN0s2HfHWBX+QPWr59An\n"
"T/TCCdez7v/SLB+ym8HEl5pqRZ2WwPuDVQhYh8xDV7hK+19cEyqK25qT6quiwuWW\n"
"FjTWMK19p6UErKLQvFAf77uR5R3aaLrnyUWPaIn0oHv0KJVNHsOA97kBDQRU0gvL\n"
"AQgA5Cs/ncnrupuNwiXfewfTtoKiTAC3AUKvYId/LYA799XhBfLGrIvnoC7wLljw\n"
"dA0RwFN1OW6mgQx4T1QOxVpavE70UkrEIh8Pf0ejOSgZsDyo61g/fNLR3GKPIytS\n"
"HGvguDRi0hivnF2QnUdS+iIycZSDgVEV9Ixi5eAI/YaQLAlRIx4tAPOEOLLZvKSo\n"
"P/GxbZTX6nLZ+5qn2NeURdS2ezwCCFV4Zf550WeBOVQgEIr4dhoXwpjVaKYkW30y\n"
"zTF4KLfPgrW4gv3Yh4DUy0ynIvNQ5dPZPWLVpo93Dc2SwZpNuTx4J73fQyD4VvAk\n"
"xki0EQTUbyzjGXK9kekKHvAb4wARAQABiQElBBgBAgAPBQJU0gvLAhsMBQkAAqMA\n"
"AAoJEKsO3f4vU88V7hgH/iM/GPXpOa4x6cYYv2nctS7sTNkTmxbwH+7dmwNxefRm\n"
"/4/pSqdGeBPSLfhBROwgich7whYq4CSTxjvAWN81wX4iYopAdRX7ES+VaD6nQ7it\n"
"ugBNVX4r9bbVfnUCx/YyIlR1i8LLHGQMxFE6L98DnpAg2xEVgPhr745sW62M0bVF\n"
"Ts82OSA5Y7s0yoGBnH7WTQPZfh+CZNIQnHlf9oAHgsmURpA4RKnmOoAuFFU0o7Sy\n"
"PtZt6p9b+UlW7qOtKoO9wmGQBoqsRRSlBtxehevCjuqUtPyfne0Law9Tgx7Jtg5A\n"
"XyuE75Ryh/0pdwFnFpDMe6q81eQEHuLnZXswFd6Ubl8=\n"
"=qjM/\n"
"-----END PGP PUBLIC KEY BLOCK-----\n");

const std::string secretKey = std::string (
"-----BEGIN PGP PRIVATE KEY BLOCK-----\n"
"Version: GnuPG v1\n"
"\n"
"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\n"
"OwdOrhpGSk+HwBuQ92dsMrbp7IBn8FCSdHae8Sc=\n"
"=TYEy\n"
"-----END PGP PRIVATE KEY BLOCK-----\n");

const std::string clearSignMsg = std::string (
"-----BEGIN PGP SIGNED MESSAGE-----\n"
"Hash: SHA1\n"
"\n"
"some message   \n"
"that has \n"
"From: field\n"
"and \n"
"- - dash\n"
"- -- some more dash\n"
"-----BEGIN PGP SIGNATURE-----\n"
"Version: GnuPG v1\n"
"\n"
"iQIcBAEBAgAGBQJU/T8yAAoJEEAXxmBnxPqWKsgP/1ikV9YMDwzXKKyaNZdTT7Us\n"
"k+kgcMcwNC+ipX9ZsrrultBasrqV1TYBqo7hTHyZIjWFeyBUkBMndnsZ0jcI+Z56\n"
"ourG2vPvu/WKU+7pb6xeTZYRTJ7BhojMeEr+/iR6FJ0xWB4FG1UTTVLjLpvzF1KH\n"
"LGapSN4WJX6WGIi4bOpX6mFaDQDNa4DqkIXkxfEoie/ugpWm6k1yCie1bWWLeeSU\n"
"8h4R2l8FJrzWxuoV2MS7GqsG+Cf3qn3KYDcsZ2glo0ewEvgbp4kcffiLgT2Om5Oc\n"
"vngHwCGdbQpIjalQr7DI6OJNR5cgZ56+tMdMQdP/vv8PlDlLVxW9xBuynjwo/vaI\n"
"8JOGAEF5WkVsjbKcUiXipe1VAVp0n7JIbr4K4U3DFXZibyeAXUf3Meg3XI9D1mFf\n"
"0sRTwv8lvCZ9gvh7GBXImziEhxHlADD6DkIXtm+mGA/z0ayfGyipuw6qUO8gSM+J\n"
"4HoCANOxGWfoLXqwqvb5MHbmyvXu1OcFsrZfDetFiE2C8DBRoo0MgqwxN1rM6eWh\n"
"MP6BFtLQWghjmpSQH+0Z/pxA3nrJRDFjQtdU1WjBIaB+1JFAw4imw22yvVUVNoKI\n"
"UdpWIV2B2PLQSAhO6l7oX4WkfhFUiPpvEnwNQ9KeNuuVcndRlZrz2acwOcGWAwU8\n"
"UTJavUFU10+fO/ez4GwA\n"
"=iw6W\n"
"-----END PGP SIGNATURE-----\n");
const std::string threeKeys = std::string (
"-----BEGIN PGP PRIVATE KEY BLOCK-----\n"
"Version: GnuPG v1\n"
"\n"
"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\n"
"qb3zWWODfBEYmXCJzyr/Y0r16pfAqhPTJFy297m5laCh1/OuWx62Sa1Twl73+MkS\n"
"oLSTbt2b9mwPh5uOaK52A/RrNW0Zaeppkta1rLJj9YjujgCL/5YjB0nTJ9CwnaPR\n"
"ZYIoZwgAlJ3ngCLewprsN5CEo6eS9nMVwmv3LuqAomJMPkijc/tB8qDK2SKTbZDk\n"
"9NMaXHNMoyzXF9dwaPkdP3jxpWSDYZ6T8Eyi3JROirpr/8jHZfWbMxp2oBKThEwe\n"
"oYIxIWWos/v59BE7FDUGbEGgaqFuiVIpqO6sxWMGU80z7uWfnLNJE5wPUEzz2UiH\n"
"G60U3LshfLlDdbnd+BP5OYqPsHyxVpCSSOAabbKY/YyXG+2RWyAxY0Xytm4oZZW0\n"
"MugoT74xs3uTTxvG+d8SBS38csqyni8XXWBWZMwfBUM5Vphk5umtffO4Klx4wJZr\n"
"L8ONNqdnQwapyr9kqNdHbsMgXY+P3Y1oiQIfBBgBAgAJBQJVWkikAhsMAAoJENqw\n"
"Ad3GFO+96yoP/0T9Ewnh0EvawtwPWFMq9Lslv1kRNRvELDESSCrtrtA6A6RwsHao\n"
"eTG9U66rN2p83RgNWsIcrOu52otbPblQO1baiEV3P7C61pVPQyTKGbS6GmgoS55+\n"
"SocunbAvb0cYYkZ+vug6+ZtkXZV/0C5WphrEBOWdaaR7BoHGr62A9dSNuJB1uPxf\n"
"k+rx2Qn6e5JXIjAgJg91kXXokE5CT4HZ8eVBK1SOexPCcnJkIJlJdNQNF08EduF8\n"
"3qu9uk+knYnuyHkloUMmz9ov7Xd/P9KPZQqgOo6+ggz28FFkouScAuFwKf+oj2Bw\n"
"k9m1xsivUXA1YVmgcR3g2/NEFt2roSnFBIJV5O6L8m0rPUoVtosdsn79XJga5VXN\n"
"p8Va+sJP2orh9GX17fiPU8sOXl7SdLLV6nYvFHMP3Qt0549uY/sWqCLp5iERDNdw\n"
"gVCWznnvPW/TLVezaUG14lF2lRlWBfd973W2t3FJcwnFr3bmN0srOy/1D4FNftl4\n"
"SPqA2eOEVrjdAlOE2Y/GyRLEUOBWbcySkPamS7gYZwAUfE0csA1x+8/uLeMcSF/e\n"
"I92i6OGEVyRrjeuM+S/qvd8/z2STmUNDLUSt4N1Lv4i0n39IW8Iakpl61TtDnSzp\n"
"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\n"
"faSoDnnYNUI7dLTrsmAV\n"
"=PJ31\n"
"-----END PGP PRIVATE KEY BLOCK-----\n"
);


class PPacketTest : public ::testing::Test {
 protected:

  virtual void SetUp() {
  }

  virtual void TearDown() {
  }
 public:
};

TEST_F(PPacketTest, ClearSignTest){
  const std::string userId = "PPPPP <pkordy@gmail.com>";
  Confi_Status status;
  KeyDb keyDb;
  status = keyDb.readFromStr(secretKey, true, "");
  ASSERT_TRUE(status == ANG_OK);
  SecretKeyPair* secret = keyDb.getCurrentKey(PktDo::stripId(userId));
  ASSERT_TRUE(secret != NULL);
  
  ConfiClient client;
  PublicKeyDb pubDb(&client);
  std::string pubKey;
  secret->exportPair(pubKey);
  pubDb.importKey(pubKey, userId);
  std::string message;
  status = MessageHandler::clearSignVerify(message, clearSignMsg, userId, &pubDb);
  ASSERT_TRUE(status == ANG_OK);
  message.clear();
  status = MessageHandler::clearSign(message, std::string("- some message \n-- oo"), &keyDb, userId, "" );
  ASSERT_TRUE(status == ANG_OK);
  std::string temp;
  status = MessageHandler::clearSignVerify(temp, message, userId, &pubDb);
  ASSERT_TRUE(status == ANG_OK);

  status = keyDb.readFromStr(threeKeys, false, "");
  secret = keyDb.getCurrentKey(PktDo::stripId(userId));
  ASSERT_TRUE(secret != NULL);
  char** keysInfo;
  uint32_t noKeys;
  status = keyDb.getKeysInfo(&keysInfo, &noKeys, "pkordy@gmail.com");
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(noKeys == 4);
//   std::cout<<"no keys ="<<noKeys<<std::endl;
//   std::cout<<"1="<<*keysInfo<<std::endl;
//   std::cout<<"2="<<*(keysInfo+1)<<std::endl;
//   std::cout<<"3="<<*(keysInfo+2)<<std::endl;
//   std::cout<<"4="<<*(keysInfo+3)<<std::endl;
  free(*keysInfo);
  free(*(keysInfo+1));
  free(*(keysInfo+2));
  free(*(keysInfo+3));
  free(keysInfo);
  
  status = keyDb.getKeysInfo(&keysInfo, &noKeys, "noemail@gmail.com");
  ASSERT_TRUE(status == ANG_NO_ENTRIES);
  ASSERT_TRUE(noKeys == 0);

  status = keyDb.readFromStr(threeKeys, true, "");
  secret = keyDb.getCurrentKey(PktDo::stripId(userId));
  ASSERT_TRUE(secret != NULL);
  secret = keyDb.getCurrentKey(PktDo::stripId("no@mail.com"));
  ASSERT_TRUE(secret == NULL);
  status = keyDb.getKeysInfo(&keysInfo, &noKeys, "pkordy@gmail.com");
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(noKeys == 3);
//   std::cout<<"no keys ="<<noKeys<<std::endl;
//   std::cout<<"1="<<*keysInfo<<std::endl;
//   std::cout<<"2="<<*(keysInfo+1)<<std::endl;
//   std::cout<<"3="<<*(keysInfo+2)<<std::endl;
//   std::cout<<"4="<<*(keysInfo+3)<<std::endl;
  free(*keysInfo);
  free(*(keysInfo+1));
  free(*(keysInfo+2));
  free(keysInfo);
  status = keyDb.readFromStr("", true, "");
  ASSERT_TRUE(status == ANG_NO_ENTRIES);
  
}

TEST_F(PPacketTest, HashTest){
  std::string toHash = "Message to be hashed";
  std::string md=SignKey::hash(toHash, DIGEST_ALGO_SHA1);
  ASSERT_TRUE(md.size() == 20);
  ASSERT_TRUE(md == std::string("\x3d\xaa\x8c\xcf\x42\x9c\x2a\xa7\x83\xf3\x4d\xb8\x97\x5b\xf1\x88\x07\x50\xde\x00", 20));
  md = SignKey::hash(toHash, DIGEST_ALGO_MD5);
  ASSERT_TRUE(md == std::string("\x41\x6b\x15\x8b\x5c\x70\x6c\xa6\x73\x01\xc2\xdb\xec\xaa\xf2\x35", 16));
  md = SignKey::hash(toHash, DIGEST_ALGO_SHA512);
  ASSERT_TRUE(md == std::string("\xe6\x80\xdc\xcb\xf0\xc4\xe1\xa8\xa6\x58\x1c\x6a\x85\x56\x45\xfb\x89\x4e\xf1\xac\x42\xd3\x0c\x8f\x33\xf6\x54\x6f\x7c\x88\xde\x70\x6e\x26\x44\xc6\x60\x5b\x12\xbc\x29\x7e\x91\xd5\x3b\x09\xfc\x15\x3d\x1b\x16\x45\x24\xb8\x86\xcd\x4c\xd3\x5e\x62\xfc\x39\xa5\x7e", 64));
  md = SignKey::hash(toHash, DIGEST_ALGO_RMD160);
  ASSERT_TRUE(md == std::string("\xbf\xf3\xaa\x90\x47\x6e\x2d\x5b\xc3\x15\x2a\xd0\x4c\x94\xff\xde\x04\x5f\x6d\x6b", 20));
}

TEST_F(PPacketTest, CompressedPacket){
  std::vector<PACKET> packets;
  Confi_Status ret = PacketParser::parsePackets(packets, compressed);
  ASSERT_TRUE(ret == ANG_OK);
  packets.clear();
  std::string data;
  std::string input = "some message\n";
  ret = MessageHandler::data2LitrStr(data, input, false, "_CONSOLE");
  ASSERT_TRUE(ret == ANG_OK);
  input = data;
  data.clear();
  ret = MessageHandler::data2ComprStr(data, input);
  ASSERT_TRUE(ret == ANG_OK);
  ret = PacketParser::parsePackets(packets, data);
  ASSERT_TRUE(ret == ANG_OK);
  ASSERT_TRUE(packets.size() == 1);
  ASSERT_TRUE(packets.at(0).pkttype == PKT_PLAINTEXT);
  ASSERT_TRUE(packets.at(0).pkt.plaintext->data == "some message\x0D\x0A");
  ret = MessageHandler::data2LitrStr(data, input, false, "_CONSOLE");
  ASSERT_TRUE(ret == ANG_OK);
  input = data;
  data.clear();
  ret = MessageHandler::data2ComprStr(data, input, COMPRESS_ALGO_BZIP2);
  ASSERT_TRUE(ret == ANG_OK);
  packets.clear();
  ret = PacketParser::parsePackets(packets, data);
  ASSERT_TRUE(ret == ANG_OK);
  ASSERT_TRUE(packets.size() == 1);
  ASSERT_TRUE(packets.at(0).pkttype == PKT_PLAINTEXT);
  ASSERT_TRUE(packets.at(0).pkt.plaintext->data == "some message\x0D\x0A");
}

TEST_F(PPacketTest, PublicKey){
  std::vector<PACKET> packets;
  Confi_Status status;

  status = PacketParser::parsePackets(packets, publicKeyBin);
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(packets.size() == 5);
  packets.clear();

  status = PacketParser::parsePackets(packets, publicKey);
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(packets.size() == 5);
  ASSERT_TRUE(packets.at(0).pkttype == PKT_PUBLIC_KEY);
  ASSERT_TRUE(packets.at(1).pkttype == PKT_USER_ID);
  ASSERT_TRUE(packets.at(1).pkt.user_id->id == "tester <tester@o2.pl>");
  ASSERT_TRUE(packets.at(2).pkttype == PKT_SIGNATURE);
  PKT_signature* sig = packets.at(2).pkt.signature;
  ASSERT_TRUE(sig != NULL);
  ASSERT_TRUE(sig->keyid == "\xAB\x0E\xDD\xFE\x2F\x53\xCF\x15");
  ASSERT_TRUE(sig->version == 4);
  ASSERT_TRUE(sig->sig_class == SGN_CERT_POS);
  ASSERT_TRUE(sig->best_cipher_algo.size() == 5);
  ASSERT_TRUE(sig->best_cipher_algo.at(0) == CIPHER_ALGO_AES256);
  ASSERT_TRUE(sig->best_cipher_algo.at(1) == CIPHER_ALGO_AES192);
  ASSERT_TRUE(sig->best_cipher_algo.at(2) == CIPHER_ALGO_AES);
  ASSERT_TRUE(sig->best_cipher_algo.at(3) == CIPHER_ALGO_CAST5);
  ASSERT_TRUE(sig->best_cipher_algo.at(4) == CIPHER_ALGO_3DES);
  ASSERT_TRUE(sig->best_hash_algo.size() == 5);
  ASSERT_TRUE(sig->best_hash_algo.at(0) == DIGEST_ALGO_SHA256);
  ASSERT_TRUE(sig->best_hash_algo.at(1) == DIGEST_ALGO_SHA1);
  ASSERT_TRUE(sig->best_hash_algo.at(2) == DIGEST_ALGO_SHA384);
  ASSERT_TRUE(sig->best_hash_algo.at(3) == DIGEST_ALGO_SHA512);
  ASSERT_TRUE(sig->best_hash_algo.at(4) == DIGEST_ALGO_SHA224);
  ASSERT_TRUE(sig->best_pack_algo.size() == 3);
  ASSERT_TRUE(sig->best_pack_algo.at(0) == COMPRESS_ALGO_ZLIB);
  ASSERT_TRUE(sig->best_pack_algo.at(1) == COMPRESS_ALGO_BZIP2);
  ASSERT_TRUE(sig->best_pack_algo.at(2) == COMPRESS_ALGO_ZIP);
  ASSERT_TRUE(packets.at(3).pkttype == PKT_PUBLIC_SUBKEY);
  ASSERT_TRUE(packets.at(4).pkttype == PKT_SIGNATURE);
  sig = packets.at(4).pkt.signature;
  ASSERT_TRUE(sig != NULL);
  ASSERT_TRUE(sig->keyid == "\xAB\x0E\xDD\xFE\x2F\x53\xCF\x15");
  ASSERT_TRUE(sig->version == 4);
  ASSERT_TRUE(sig->sig_class == SGN_SUBKEY);
  packets.clear();

  status = PacketParser::parsePackets(packets, secretKey);
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(packets.size() == 5);
  ASSERT_TRUE(packets.at(0).pkttype == PKT_SECRET_KEY);
  ASSERT_TRUE(packets.at(0).pkttype == PKT_SECRET_KEY);
  PKT_secret_key* skey = packets.at(0).pkt.secret_key;
  ASSERT_TRUE(skey->csum == ((0x81<<8) + 0xf5));
  time_t tempTime = skey->pkey.timestamp;  
  ASSERT_TRUE(packets.at(1).pkttype == PKT_USER_ID);
  ASSERT_TRUE(packets.at(1).pkt.user_id->id == "PPPPP <pkordy@gmail.com>");
  ASSERT_TRUE(packets.at(2).pkttype == PKT_SIGNATURE);
  sig = packets.at(2).pkt.signature;
  ASSERT_TRUE(sig != NULL);
  ASSERT_TRUE(sig->keyid == "\x40\x17\xC6\x60\x67\xC4\xFA\x96");
  ASSERT_TRUE(sig->version == 4);
  ASSERT_TRUE(sig->sig_class == SGN_CERT_POS);
  ASSERT_TRUE(sig->best_cipher_algo.size() == 5);
  ASSERT_TRUE(sig->best_cipher_algo.at(0) == CIPHER_ALGO_AES256);
  ASSERT_TRUE(sig->best_cipher_algo.at(1) == CIPHER_ALGO_AES192);
  ASSERT_TRUE(sig->best_cipher_algo.at(2) == CIPHER_ALGO_AES);
  ASSERT_TRUE(sig->best_cipher_algo.at(3) == CIPHER_ALGO_CAST5);
  ASSERT_TRUE(sig->best_cipher_algo.at(4) == CIPHER_ALGO_3DES);
  ASSERT_TRUE(sig->best_hash_algo.size() == 5);
  ASSERT_TRUE(sig->best_hash_algo.at(0) == DIGEST_ALGO_SHA256);
  ASSERT_TRUE(sig->best_hash_algo.at(1) == DIGEST_ALGO_SHA1);
  ASSERT_TRUE(sig->best_hash_algo.at(2) == DIGEST_ALGO_SHA384);
  ASSERT_TRUE(sig->best_hash_algo.at(3) == DIGEST_ALGO_SHA512);
  ASSERT_TRUE(sig->best_hash_algo.at(4) == DIGEST_ALGO_SHA224);
  ASSERT_TRUE(sig->best_pack_algo.size() == 3);
  ASSERT_TRUE(sig->best_pack_algo.at(0) == COMPRESS_ALGO_ZLIB);
  ASSERT_TRUE(sig->best_pack_algo.at(1) == COMPRESS_ALGO_BZIP2);
  ASSERT_TRUE(sig->best_pack_algo.at(2) == COMPRESS_ALGO_ZIP);
  ASSERT_TRUE(sig->hashed.size() == 7);
  ASSERT_TRUE(sig->unhashed.size() == 1);
  ASSERT_TRUE(sig->timestamp == tempTime);
  
  ASSERT_TRUE(packets.at(3).pkttype == PKT_SECRET_SUBKEY);
  ASSERT_TRUE(packets.at(4).pkttype == PKT_SIGNATURE);
  sig = packets.at(4).pkt.signature;
  ASSERT_TRUE(sig != NULL);
  ASSERT_TRUE(sig->keyid == "\x40\x17\xC6\x60\x67\xC4\xFA\x96");
  ASSERT_TRUE(sig->version == 4);
  printf("class %d\n", sig->sig_class);
  ASSERT_TRUE(sig->sig_class == SGN_SUBKEY);
  packets.clear();
  KeyDb keyDb;
  status = keyDb.readFromStr(secretKey, false, "");
  ASSERT_TRUE(status == ANG_OK);
  SecretKeyPair* secret = keyDb.getCurrentKey("PPPPP <pkordy@gmail.com>");
  ASSERT_TRUE(secret != NULL);
  std::string pubKey;
  secret->exportPair(pubKey, true);
  status = PacketParser::parsePackets(packets, pubKey);
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(packets.size() == 5);
  ASSERT_TRUE(packets.at(0).pkttype == PKT_SECRET_KEY);
  skey = packets.at(0).pkt.secret_key;
  ASSERT_TRUE(skey->csum == ((0x81<<8) + 0xf5));
  skey->pkey.fingerprint == PktDo::getFingerprint(&(skey->pkey));
  ASSERT_TRUE(packets.at(1).pkttype == PKT_USER_ID);
  ASSERT_TRUE(packets.at(1).pkt.user_id->id == "PPPPP <pkordy@gmail.com>");
  ASSERT_TRUE(packets.at(2).pkttype == PKT_SIGNATURE);
  sig = packets.at(2).pkt.signature;
  ASSERT_TRUE(sig != NULL);
  ASSERT_TRUE(sig->keyid == "\x40\x17\xC6\x60\x67\xC4\xFA\x96");
  ASSERT_TRUE(sig->version == 4);
  ASSERT_TRUE(sig->sig_class == SGN_CERT_POS);
  ASSERT_TRUE(sig->best_cipher_algo.size() == 5);
  ASSERT_TRUE(sig->best_cipher_algo.at(0) == CIPHER_ALGO_AES256);
  ASSERT_TRUE(sig->best_cipher_algo.at(1) == CIPHER_ALGO_AES192);
  ASSERT_TRUE(sig->best_cipher_algo.at(2) == CIPHER_ALGO_AES);
  ASSERT_TRUE(sig->best_cipher_algo.at(3) == CIPHER_ALGO_CAST5);
  ASSERT_TRUE(sig->best_cipher_algo.at(4) == CIPHER_ALGO_3DES);
  ASSERT_TRUE(sig->best_hash_algo.size() == 5);
  ASSERT_TRUE(sig->best_hash_algo.at(0) == DIGEST_ALGO_SHA256);
  ASSERT_TRUE(sig->best_hash_algo.at(1) == DIGEST_ALGO_SHA1);
  ASSERT_TRUE(sig->best_hash_algo.at(2) == DIGEST_ALGO_SHA384);
  ASSERT_TRUE(sig->best_hash_algo.at(3) == DIGEST_ALGO_SHA512);
  ASSERT_TRUE(sig->best_hash_algo.at(4) == DIGEST_ALGO_SHA224);
  ASSERT_TRUE(sig->best_pack_algo.size() == 3);
  ASSERT_TRUE(sig->best_pack_algo.at(0) == COMPRESS_ALGO_ZLIB);
  ASSERT_TRUE(sig->best_pack_algo.at(1) == COMPRESS_ALGO_BZIP2);
  ASSERT_TRUE(sig->best_pack_algo.at(2) == COMPRESS_ALGO_ZIP);
  
  ASSERT_TRUE(packets.at(3).pkttype == PKT_SECRET_SUBKEY);
  ASSERT_TRUE(packets.at(4).pkttype == PKT_SIGNATURE);
  sig = packets.at(4).pkt.signature;
  ASSERT_TRUE(sig != NULL);
  ASSERT_TRUE(sig->keyid == "\x40\x17\xC6\x60\x67\xC4\xFA\x96");
  ASSERT_TRUE(sig->version == 4);
  
}

TEST_F(PPacketTest, EncryptDecrypt){
  const std::string userId = "PPPPP <pkordy@gmail.com>";
  std::vector<PACKET> packets;
  Confi_Status status;
  status = PacketParser::parsePackets(packets, secretKey);
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(packets.size() == 5);
  ASSERT_TRUE(packets.at(0).pkttype == PKT_SECRET_KEY);
  ASSERT_TRUE(packets.at(1).pkttype == PKT_USER_ID);
  ASSERT_TRUE(packets.at(1).pkt.user_id->id == "PPPPP <pkordy@gmail.com>");
  ASSERT_TRUE(packets.at(2).pkttype == PKT_SIGNATURE);
  PKT_signature* sig = packets.at(2).pkt.signature;
  ASSERT_TRUE(sig != NULL);
  ASSERT_TRUE(sig->keyid == "\x40\x17\xC6\x60\x67\xC4\xFA\x96");
  ASSERT_TRUE(sig->version == 4);
  ASSERT_TRUE(sig->sig_class == SGN_CERT_POS);
  ASSERT_TRUE(sig->best_cipher_algo.size() == 5);
  KeyDb keyDb;
  status = keyDb.readFromStr(secretKey, true, "");
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(sig->best_cipher_algo.size() == 5);
  ASSERT_TRUE(status == ANG_OK);
  SecretKeyPair* secret = keyDb.getCurrentKey(userId);
  ASSERT_TRUE(secret != NULL);
  ConfiClient client;
  PublicKeyDb pubDb(&client);
  std::string pubKey;
  secret->exportPair(pubKey, false);
  pubDb.importKey(pubKey, userId);
  std::string encrypted;
  std::vector<PKT_public_key*> keys;
  keys.push_back(pubDb.getKey(userId)->getPEKey());
  
  status = MessageHandler::encryptData(encrypted, "someą message", keys, CIPHER_ALGO_AES256
                                       , &keyDb, userId,  false, "email.txt", "", false, true);
//   std::cout<<"enc:"<<encrypted<<std::endl;
  ASSERT_TRUE(status == ANG_OK);
  std::string decrypted;
//   static Confi_Status decryptText(std::string& decrypted
//                                   , const std::string& input
//                                   , const std::string& sender
//                                   , KeyDb* keyDb
//                                   , PublicKeyDb& pubDb
  
  status = MessageHandler::decryptText(decrypted, encrypted, userId, &pubDb, &keyDb, "");
  ASSERT_TRUE(status == ANG_NO_SIG);
  ASSERT_TRUE(decrypted == "someą message");
  encrypted.clear();
  status = MessageHandler::encBase64(encrypted, "someą message");
  ASSERT_TRUE(status == ANG_OK);
  ASSERT_TRUE(encrypted == "c29tZcSFIG1lc3NhZ2U=");
  std::string message = std::string(
"-----BEGIN PGP MESSAGE-----\n"
"Charset: utf-8\n"
"Version: GnuPG v1\n"
"\n"
"hQIMA63YoEPJNoRoAQ/+N93vevbo8F544NAgz7EiSP9wolt0nUYGf+K2Dr2T5CNc\n"
"bjKiOKJPL8AckOLefP1bXdaUAKz/8qwx1TiSnUlp9xngsrnK+vF9P+h+n2lE471D\n"
"zOEcW0TQNdySo6E+eLJ48KU94iCZGWm5ri+1w7I6OeCFQ0mQG1tK7qNsjrg3FZVw\n"
"k7vl8FoSdJsy5ry8LVY5Wu/hf1U8KFklfNiEbF69ZZGSh4QmvBf7UXUQcTFQeeMZ\n"
"ctPCI7uDcDZxfufvf89QirO46puA0+5FNQGmcDn/DXa3fgcjriKvT+H5c2dbXFp3\n"
"G5HPsOzuinnTitQqXhUCxeQUExxrF+KneGs3h9SuSjjWxArZfv/edNV3OgzwlcJu\n"
"p+aEJMDIL0b7to0fKYzK5kZrZPx5bERlP9hYuSTASL3xm60EY1LkYLOhC7PJqUap\n"
"UJZL2UNajYGFC8qsN9AY+m4sEbnFOpRLRzliIhvfIX9fY10tZltab+yx4u4Cc7mQ\n"
"+B7aUyTgCFwMqx0hGWwmV841hKKrDMG+YjNxup6vmrD8UCaI1h1i7P7Ko730Djq4\n"
"Ex9f1psMuptQSsFJUQge+7Jt19ic9DiaL4tADio3E5Z26hDvIg0Mnx785ZcvXxAz\n"
"HFU7EUaW3b7FET6yTSgj4I9Ef+x8RQ1yVlcoBPM3gHX9QjllsSW7U5Lm6j2YwA7S\n"
"6QGwMkGeyN/z2utG8WoxahS6ZJB3Jw18WS0b4b5HXGQRDAA/oqJvER43CohN3Qa/\n"
"Ta04uZIeZ2wyrBdrKlemkrzzGWeETt0702x/VR3+cNLuGyxoJ5l74b0Cfr+J2Gkk\n"
"7wMSbFy/tWRGWy1ka1TqI4ca/Yoc/IagBiUQg+oN6JypVIJkJ1lkmy65JBzn0D33\n"
"zyRLLIYTWqgKJbx040oAAq09B6NlYm700uhtzGEr0BXGohYRYDaWc2RlfJWSIBeH\n"
"vgBZs+wLnGmpqcXT/4EffPMHy76QcqqU0w3LnF9/vBmr9v/O+2udJS2yWmYys27b\n"
"jsCEEoQyIVsz5F+uB+UOPXxQamw42rz+el8NMzDBjf3GG0YbkeYt5jfrMrpsTR95\n"
"nUOAMCeZIHaidzFiVlMZKIfhK7VKbO/WOPRNeFR8HEW2QqvCW1AiKxMIRSCs9IX8\n"
"KWUxf9zfgVPCDfyUDycLGhj/kCU8qoqDEQ1qyb0n4GY2Sygv55+3DLYml/SUCsW0\n"
"LnVMxHYlNJCVFVZc+B/X+eEf4HohWt7GQm0Y16QQDi3/tgf5Zq0XipsLTzUjFig0\n"
"OJvC06EuHEt9QLjUAamMfR/0r1e1GAHYXsE0jvM0LbUyV9uZ1LAMHq2SlEdlbhfW\n"
"EfFewG5KP0vmkhhxTr7VSgH543BvCrtSS1l92L4BTrq3cv5md6jCnAk3LcE4AzkU\n"
"0xQHCuNjXz7ymdByN92N0RYyQ7Mc9WTMQkv1ad7vuuqvPjDzO9nkqoAF76eNpEKo\n"
"rJDnNwBooV/asmNcaX7VOk/UtO6OtKN7KH425MAfnFryqYzS9NSIYTlYqsVKP9vi\n"
"JMEWzQ==\n"
"=i/9G\n"
"-----END PGP MESSAGE-----\n");
  decrypted.clear();
  status = MessageHandler::decryptText(decrypted, message, userId, &pubDb, &keyDb, "");
  ASSERT_TRUE(status == ANG_OK);
}
