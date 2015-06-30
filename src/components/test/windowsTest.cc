#include "angWrapper.h"
int main (){
    initClient("test.txt");
    if(!importKeyPurse("noPath", true)){
        printf("No keypurse\n");
    }
    char* serverName;
    uint32_t size;
    getServer(&serverName, &size);
    int serverPort = getPort();
    printf("Server Name %s %d\n", serverName, serverPort);
    freeString(serverName);
    if(setServer("localhost", 1234, "certificate.pem")){
        printf("Set server TRUE\n");
    }
    exit(0);
}
