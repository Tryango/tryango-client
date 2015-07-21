// importScripts('resource://gre/modules/workers/require.js');
importScripts("resource://gre/modules/osfile.jsm");

// var PromiseWorker = require('resource://gre/modules/workers/PromiseWorker.js');
// var PromiseWorker = require('chrome://promiseworker/content/modules/workers/PromiseWorker.js');
// require("resource://tryango_modules/logger.jsm");
// var worker = new PromiseWorker.AbstractWorker();
// worker.dispatch = function(method, args = []) {
//   return Agent[method](...args);
// };
// worker.postMessage = function(result, ...transfers) {
//   self.postMessage(result, ...transfers);
// };
// worker.close = function() {
//   self.close();
// };
//
// self.addEventListener('message', msg => worker.handleMessage(msg));

//var user32 = ctypes.open('user32.dll');

//var msgBox = user32.declare('MessageBoxW',
                         //ctypes.winapi_abi,
                         //ctypes.int32_t,
                         //ctypes.int32_t,
                         //ctypes.jschar.ptr,
                         //ctypes.jschar.ptr,
                         //ctypes.int32_t);
// let Agent = {
//   ask :function (msg) {
//     var x = 1;
//     for(var y = 1; y <1000000; y++){
//       for(var i = 1; i <1000; i+=2){
//         i--;
//       }
//     }
//
//     return 'user clicked yes!'; //resolve promise by returning
//     //     throw new Error('user clicked no so reject the promise'); //reject promise by throwing
//   }//,
// }
var Client = {
  client: null,

  _initCInterface: function(){
   this.initClient = this.client.declare("initClient" //method name
          , ctypes.default_abi //binary interface type
          , ctypes.void_t      //return type
          , ctypes.char.ptr);  //param 1

   this.c_signup = this.client.declare("signup"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr    //param 1 identity/email
          , ctypes.char.ptr    //param 2 device
          , ctypes.char.ptr    //param 3 hexAp
          );

   this.c_submitKey = this.client.declare("submitKey"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr    //param 1 hexAp
          , ctypes.char.ptr    //param 2 identity
          , ctypes.char.ptr    //param 3 device
          );

   this.c_revokeKey = this.client.declare("revokeKey"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr    //param 1 hexAp
          , ctypes.char.ptr    //param 2 identity
          , ctypes.char.ptr    //param 3 device
          , ctypes.char.ptr    //param 4 password
          );

   this.c_verifySignature = this.client.declare("verifySignature"
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //result size
          , ctypes.char.ptr     //param 3 - char* signed message
          , ctypes.char.ptr     //param 4 - char* sender
          );

   this.freeString = this.client.declare("freeString"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.void_t      //return type
          , ctypes.char.ptr    //param 1
          );

   this.c_checkMailAddr = this.client.declare("checkMailAddr"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr    //param1
          );

   this.c_setServer = this.client.declare("setServer"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.bool        //return type
          , ctypes.char.ptr    //param 1
          , ctypes.uint32_t    //param 2
          , ctypes.char.ptr    //param 3
          );

   this.c_getHostName = this.client.declare("getHostName"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.void_t      //return type
          , ctypes.char.ptr
          , ctypes.uint32_t    //param 2
          );

   this.c_generateRsaKeys = this.client.declare("generateRsaKeys"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.bool        //return type
          , ctypes.char.ptr    // param 1 userId
          , ctypes.char.ptr    // param 2 - password
          , ctypes.uint32_t    //param 3 - size of the keys
          );

   this.c_getDevices = this.client.declare("getDevices"// method name
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr.ptr.ptr//pointer to array of strings - to be freed
          , ctypes.uint32_t.ptr //param 2 - pointer to size of the array
          , ctypes.char.ptr     //param 3 - hexAp to be updated
          , ctypes.char.ptr     //param 4 - identity
          , ctypes.char.ptr     //param 5 - device
          );

   this.c_removeDevices = this.client.declare("removeDevices"// method name
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr     //param 1 - hexAp to be updated
          , ctypes.char.ptr     //param 2 - identity
          , ctypes.char.ptr     // param 3 -device
          , ctypes.char.ptr.ptr // param 4 -devices to be removed-  pointer to array of strings
          , ctypes.uint32_t     // param 5 \ devices size
          );

   this.c_loadInfoKeysFromFile = this.client.declare("loadInfoKeysFromFile"// method name
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr     //param 1 - identity/email
          , ctypes.char.ptr     //param 2 - file name
          );

   this.c_loadInfoKeysFromGpg = this.client.declare("loadInfoKeysFromGpg"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t   //return type
          , ctypes.char.ptr     //param 1 - identity
          );

   this.c_clearInfo = this.client.declare("clearInfo"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.void_t      //return type
          );

   this.c_getInfoKeys = this.client.declare("getInfoKeys"// method name
          , ctypes.default_abi     //binary interface type
          , ctypes.uint32_t        //return type
          , ctypes.char.ptr.ptr.ptr//pointer to array of strings - to be freed
          , ctypes.uint32_t.ptr    //param 2 - pointer to size of the array
          , ctypes.char.ptr        //param 3 - identity
          , ctypes.bool            //param 4 - if import from keypurse (otherwise structure must have been precomputed
          );

   this.c_transferKeysFromInfo = this.client.declare("transferKeysFromInfo"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr    //param 1 - hexFingerprint
          );

   this.checkIfCanAdd = this.client.declare("checkIfCanAdd"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr    //param 1 - path
          , ctypes.char.ptr    //param 2 - password
          );

   this.importSecretKey = this.client.declare("importSecretKey"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr    //param 1 - path
          , ctypes.char.ptr    //param 2 - password
          );

   this.c_exportKeyPurse = this.client.declare("exportKeyPurse"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.bool        //return type
          , ctypes.char.ptr    //param 1 - path
          , ctypes.char.ptr    //param 2 - password
          );

   this.c_importKeyPurse = this.client.declare("importKeyPurse"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr    //param 1 - path
          , ctypes.bool        //param 2 - if to clear keypurse before import
          );

   this.removeKeyPurse = this.client.declare("removeKeyPurse"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.bool        //return type
          , ctypes.char.ptr    //param 1 - path
          );

   this.c_getServerInfo = this.client.declare("getServerInfo"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr.ptr //param 1 - resulting string (needs to be freed)
          , ctypes.uint32_t.ptr //param 2 - size of the result
          );

   this.c_encryptSignMail = this.client.declare("encryptSignMail"
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //result size
          , ctypes.char.ptr     //param 3 - char* mailBody
          , ctypes.char.ptr     //param 4 - char* recipients
          , ctypes.char.ptr     //param 5 - char* sender
          , ctypes.char.ptr     //param 6 - char* password
          , ctypes.bool         //param 7 - bool sign
          , ctypes.bool         //param 8 - bool encrypt
          );

   this.c_encryptSignAttachment = this.client.declare("encryptSignAttachment"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          , ctypes.char.ptr    //param 1 - char* newfilepath
          , ctypes.char.ptr    //param 3 - char* filepath
          , ctypes.char.ptr    //param 4 - char* recipients
          , ctypes.char.ptr    //param 5 - char* sender
          , ctypes.char.ptr    //param 6 - char* password
          , ctypes.bool        //param 7 - bool sign
          , ctypes.bool        //param 8 - bool encrypt
          );


   this.c_removeKey = this.client.declare("removeKey"
          , ctypes.default_abi //binary interface type
          , ctypes.void_t      //return type
          , ctypes.char.ptr    //param 1 - keyId
          );


   this.c_clearTempKey = this.client.declare("clearTempKey"
          , ctypes.default_abi //binary interface type
          , ctypes.void_t      //return type
          );

   this.c_decryptMail = this.client.declare("decryptMail"
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type - Confi_Status
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //param 2 result size
          , ctypes.uint8_t.ptr  //param 3 - char* mailBody
          , ctypes.char.ptr     //param 4 - char* sender
          , ctypes.char.ptr     //param 6 - char* password
          );

   this.c_decryptAndSaveAttachment = this.client.declare("decryptAndSaveAttachment"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type - Confi_Status
          , ctypes.uint8_t.ptr //param 1 - char* data
          , ctypes.uint32_t    //param 2 - length of data
          , ctypes.char.ptr    //param 3 - char* filepath
          , ctypes.char.ptr    //param 4 - char* sender
          , ctypes.char.ptr    //param 5 - char* password
          );

   this.c_hasSecretKey = this.client.declare("hasSecretKey"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.bool        //return type
          , ctypes.char.ptr    //param 1
          );

   this.c_checkPassword = this.client.declare("checkPassword"// method name
          , ctypes.default_abi   //binary interface type
          , ctypes.uint32_t      //return type
          , ctypes.char.ptr.ptr  //param 1 - returned array
          , ctypes.uint32_t.ptr  //param 2  - result size
          , ctypes.char.ptr      // param 1 id/email
          , ctypes.char.ptr      //param 2 password
          );

   this.c_checkDecrPassword = this.client.declare("checkDecrPassword"// method name
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //param 2  - result size
          , ctypes.uint8_t.ptr  // param 3 -  encrypted data
          , ctypes.uint32_t     //param 4 - encrypted data size
          , ctypes.char.ptr     //param 5  - password
          );

   this.c_hasGpg = this.client.declare("hasGpg"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.bool        //return type
          );

//    this.getV = this.client.declare("getV"// method name
//           , ctypes.default_abi //binary interface type
//           , ctypes.uint32_t     //return type
//           );
// 
//    this.setV = this.client.declare("setV"// method name
//           , ctypes.default_abi //binary interface type
//           , ctypes.void_t        //return type
//           , ctypes.uint32_t    //param 1
//           );

   this.c_getEncryptedSK = this.client.declare("getEncryptedSK"
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //param 2  - result size
          , ctypes.char.ptr     //param 3 id/email
          , ctypes.char.ptr     //param 4 message to be added
          , ctypes.char.ptr     //param 5 password
          );

   this.c_synchronizeSK = this.client.declare("synchronizeSK"
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr     //param 1 - user id
          );

  },

  getMaxErrNum: function(){ //set it equal to ANG_UNKNOWN_ERROR - messages above are signature errors
    return 32;
  },

  openLibrary: function(path, logpath, certpath){
    this.client = ctypes.open(path);
    //declare before calls
    var c_logfilePath = ctypes.char.array()(logpath);
    this._initCInterface();
    this.initClient(c_logfilePath);
    this.certificatePath = certpath;
    return {method: "openLibrary", args: []};
  },

//   ggetV: function (){
//     var v = this.getV();
//     return {method: "ggetV", args: [v]};
//   },
//   ssetV: function (v){
//     this.setV(v); 
//     return {method: "ssetV", args: []};
//   },

  closeLibrary: function (){
    this.client.close(); //TODO: FIXME: this does not work sometimes
    return {method: "closeLibrary", args: []};
  },

  decryptMail: function(mailBody, sender, password){
    //types
    var result = new ctypes.char.ptr;
    var resultSize = new ctypes.uint32_t;
    var c_mailBody= ctypes.uint8_t.array()(mailBody.length)
    for(var i = 0; i < mailBody.length; i++){
      c_mailBody[i] = mailBody.charCodeAt(i);
    }

    var status = this.c_decryptMail(result.address()
                                     , resultSize.address()
                                     , c_mailBody
                                     , sender
                                     , password);
    //error check
    var decrypted = "";
    if((ctypes.uint32_t(0)<resultSize)){
      if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
        decrypted = result.readString();
      }
      this.freeString(result);
    }
    return {method: "decryptMail", args: [status, decrypted]};
  },

  verifySignature: function(mailBody, sender){
    var result = new ctypes.char.ptr;
    var resultSize = new ctypes.uint32_t;

    var c_mailBody = ctypes.char.array()(mailBody);
    var c_sender = ctypes.char.array()(sender);
    var status = this.c_verifySignature(result.address(), resultSize.address(),
                                  c_mailBody, c_sender);
    var cleanMail = "";
    if((ctypes.uint32_t(0) < resultSize)){
      if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
        cleanMail = result.readString();
      }
      this.freeString(result);
    }
    return {method: "verifySignature", args:[status, cleanMail]};
  },

  signup: function (identity, device, hexAp){
    var status = this.c_signup(identity, device, hexAp);
    return {method: "signup", args: [status]};
  },

  clearInfo: function (){
    this.c_clearInfo();
    return {method: "clearInfo", args: []};
  },

  clearTempKey: function (){
    this.c_clearTempKey();
    return {method: "clearTempKey", args: []};
  },

  hasGpg: function (){
    var success = this.c_hasGpg();
    return {method: "hasGpg", args: [success]};
  },

  generateRsaKeys: function (userId, password, keySize){
    var success = this.c_generateRsaKeys(userId, password, keySize);
    return {method: "generateRsaKeys", args: [success]};
  },

  importKeyPurse: function (keyPursePath, clearKP){
    var status = this.c_importKeyPurse(keyPursePath, clearKP);
    return {method: "importKeyPurse", args: [status]};
  },

  exportKeyPurse: function (keyPursePath, password){
    var success = this.c_exportKeyPurse(keyPursePath, password);
    return {method: "exportKeyPurse", args: [success]};
  },

  transferKeysFromInfo: function (hexFingerprint){
    var status = this.c_transferKeysFromInfo(hexFingerprint);
    return {method: "transferKeysFromInfo", args: [status]};
  },

  removeKeys: function(fingerprints){
    Logger.dbg("to Remove keyIds length " + fingerprints.length);
    for(var i = 0; i < fingerprints.length; i++){
      var c_fingerprint = ctypes.char.array()(fingerprints[i]);
      Logger.dbg("to Remove fingerprint " + fingerprints[i]);
      this.c_removeKey(c_fingerprint);
    }
    return {method: "removeKeys", args: []};
  },

  loadInfoKeysFromFile: function (identity, fileName){
    var status = this.c_loadInfoKeysFromFile(identity, fileName);
    return {method: "loadInfoKeysFromFile", args: [status]};
  },

  loadInfoKeysFromGpg: function (identity){
    var status = this.c_loadInfoKeysFromGpg(identity);
    return {method: "loadInfoKeysFromGpg", args: [status]};
  },

//helper function for getDataPassword
  checkDataPassword: function(data, password, ask){
    //types
    var keyId = new ctypes.char.ptr;
    var keyIdSize = new ctypes.uint32_t;
    var c_data = ctypes.uint8_t.array()(data.length)
    for(var i = 0; i < data.length; i++){
      c_data[i] = data.charCodeAt(i);
    }

    var status = this.c_checkDecrPassword(keyId.address()
                                         , keyIdSize.address()
                                         , c_data
                                         , c_data.length
                                         , password);
    var keyIdStr;
    if((ctypes.uint32_t(0)<keyIdSize)){
      keyIdStr = keyId.readString();
      this.freeString(keyId);
    }
    else{
      keyIdStr = "";
    }
    return {method: "checkDataPassword", args: [status, keyIdStr, ask, password]};
  },

//helper function for getSignPassword
  checkSignPassword: function(sender, password, ask){
    var keyId = new ctypes.char.ptr;
    var keyIdSize = new ctypes.uint32_t;
    var c_password = ctypes.char.array()(password);
    var c_sender = ctypes.char.array()(sender);
    var status = this.c_checkPassword(keyId.address()
                                   , keyIdSize.address()
                                   , c_sender
                                   , c_password);
    var keyIdStr;
    if((ctypes.uint32_t(0) < keyIdSize)){
      keyIdStr = keyId.readString();
      this.freeString(keyId);
    }
    else{
      keyIdStr = "";
    }
    return {method: "checkSignPassword", args: [status, keyIdStr, ask, password]};
  },

  setServer: function(server, port){
    var status =  this.c_setServer(server, port, this.certificatePath);
    return {method: "setServer", args: [status]};
  },

  hasSecretKey: function(identity){
    var success =  this.c_hasSecretKey(identity)
    return {method: "hasSecretKey", args: [success]};
  },

  checkMailAddr: function(mailaddr, i){
    var c_mailaddr = ctypes.char.array()(mailaddr);
    var status = this.c_checkMailAddr(c_mailaddr);
    return {method: "checkMailAddr", args: [status, i]};
  },

  checkRecipients: function(recipients){
    var r = recipients.split(",");
    var status = 0;
    for(var k = 0; k < r.length && status == 0; k++){
      var c_mailaddr = ctypes.char.array()(r[k]);
      status = this.c_checkMailAddr(c_mailaddr);
    }
    if(status != 0 && k < r.length){
      return {method: "checkRecipients", args: [status, r[k]]};
    }
    return {method: "checkRecipients", args: [status, ""]};
  },

  getEncryptedSK: function(identity, message, password){
    var result = new ctypes.char.ptr;
    var resultSize = new ctypes.uint32_t;
    var c_id = ctypes.char.array()(identity);
    var c_message= ctypes.char.array()(message);
    var c_password = ctypes.char.array()(password);
    var status =  this.c_getEncryptedSK(result.address()
                                      , resultSize.address()
                                      , c_id
                                      , c_message
                                      , c_password);
    var encrKey;
    if((ctypes.uint32_t(0)<resultSize)){
      if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
        encrKey = result.readString();  //TODO: we should return an object instead of this "hack". E.g. return {str: "bla", i: 0};
      }
      this.freeString(result);
    }
    return {method: "getEncryptedSK", args: [status, encrKey]};
  },

  encryptSignMail: function(mailBody, recipients, sender,  sign, encrypt, password){
    //types
    var result = new ctypes.char.ptr;
    var resultSize = new ctypes.uint32_t;

    //variables
    var c_mailBody = ctypes.char.array()(mailBody);
    var c_sender = ctypes.char.array()(sender);
    var c_recipients = ctypes.char.array()(recipients);
    var c_password = ctypes.char.array()(password);
    //query
    var status =  this.c_encryptSignMail(result.address()
                                     , resultSize.address()
                                     , c_mailBody
                                     , c_recipients
                                     , c_sender
                                     , c_password
                                     , sign
                                     , encrypt);
    //error check
    var encrypted = "";
    if((ctypes.uint32_t(0) < resultSize)){
      if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
        encrypted = result.readString();
      }
      this.freeString(result);
    }
    return {method: "encryptSignMail", args:[status, encrypted]};
  },

  encryptSignAttachment: function(pathToEncryptedFile, filepath, recipients, sender, sign, encrypt, password, isLast){
    var c_newfilepath = ctypes.char.array()(pathToEncryptedFile);
    var c_filepath = ctypes.char.array()(filepath);
    var c_sender = ctypes.char.array()(sender);
    var c_recipients = ctypes.char.array()(recipients);
    var c_password = ctypes.char.array()(password);
    var status = this.c_encryptSignAttachment(c_newfilepath
                                            , c_filepath
                                            , c_recipients
                                            , c_sender
                                            , c_password
                                            , sign
                                            , encrypt);

    return {method: "encryptSignAttachment", args: [status, isLast]};
  },
    
  getServerInfo: function(){
    let result = new ctypes.char.ptr;
    let resultSize = new ctypes.uint32_t;
    var message = "";
    let status = this.c_getServerInfo(result.address(), resultSize.address());
    if((ctypes.uint32_t(0) < resultSize)){
      if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
        message = result.readString();
      }
      this.freeString(result);
    }
    return {method: "getServerInfo", args:[status, message]};
//     return st + " " + myArray.readString();
  },

  getDevices: function(identity, device, hexAp){
    let devices = [];
    var c_hexAp = ctypes.char.array()(hexAp);
    var result = new ctypes.char.ptr.ptr;
    var resultSize = new ctypes.uint32_t;
    let status = this.c_getDevices(result.address(), resultSize.address(), c_hexAp, identity, device);
    var next = result;
    var newHexAp = "";
    if(status == 0 && (ctypes.uint32_t(0) < resultSize)){
      newHexAp = c_hexAp.readString();
      for (var i = 0; (ctypes.uint32_t(i) < resultSize); i++){
        var str = next.contents.readString();
        this.freeString(next.contents);
        next = next.increment();
        devices[i]= str;
      }
      this.freeString(ctypes.cast(result, ctypes.char.ptr));
    }
    return {method: "getDevices", args:[status, devices, newHexAp]};
  },

  synchronizeSK: function(identity){
    var status =  this.c_synchronizeSK(identity);
    return {method: "synchronizeSK", args: [status]};
  },

  submitKey: function(hexAp, identity, device){
    var c_hexAp = ctypes.char.array()(hexAp);
    var newHexAp = "";
    if(c_hexAp != undefined && c_hexAp.length > 1){
      var status = this.c_submitKey(c_hexAp, identity, device);
      if(status == 0){ //ANG_OK is 0
        newHexAp = c_hexAp.readString();
      }
      return {method: "submitKey", args: [status, newHexAp]};
    }
    else{
      return {method: "submitKey", args: [22, ""]}; //ANG_NO_AP
    }
  },

  getInfoKeys: function(identity, fromKeypurse){
    var output = [];
    var result = new ctypes.char.ptr.ptr;
    var resultSize = new ctypes.uint32_t;

    //pass request to C
    var status = this.c_getInfoKeys(result.address(), resultSize.address(), identity, fromKeypurse);
    //iterate over results
    var next = result;
    if(status == 0 && (ctypes.uint32_t(0) < resultSize)){
      for (var i = 0; (ctypes.uint32_t(i) < resultSize); i++){
        //copy strings and free them
	      var str = next.contents.readString();
// 	      this.freeString(next.contents);
	      next = next.increment();
//  Structure of result (separated by "\x1F"
//  0 Sign/Main key id
//  1          timestamp as the number of seconds since 00:00:00 UTC on January 1, 1970
//  2          expiration as the number of seconds since 00:00:00 UTC on January 1, 1970
//  3          encrypted
//  4 Encryption key id
//  5          timestamp as the number of seconds since 00:00:00 UTC on January 1, 1970
//  6          expiration as the number of seconds since 00:00:00 UTC on January 1, 1970
//  7          encrypted
//  8 ...      user ids
        var res = str.split("\x1f");
        var row = {};
        str = "Main key - id:"+ res[0] + " timestamp:" + res[1];
        row['signId'] = res[0];
        row['signCreate'] = parseInt(res[1])*1000;
        row['signExpire'] = parseInt(res[2])*1000;
        row['signEncrypted'] = res[3];
        row['encrId'] = res[4];
        row['encrCreate'] = parseInt(res[5])*1000;
        row['encrExpire'] = parseInt(res[6])*1000;
        row['encrEncrypted'] = res[7];
        var emails = "";
        if(res.length > 8){
          emails = res[8];
          for(var j = 9; j < res.length; j++){
            emails = emails+ ";"+ res[j];
          }
        }
        row['userIds'] = emails;

	      output.push(row);
      }
    }
//     else if(status == 15){   // ANG_NO_ENTRIES
//       //empty keypurse => just return output as empty
//     }
//     else{
//       //error
//       Logger.error("getKeyPurse: Error " + this.getErrorStr(status) + " (" + status + ")");
//       return null; //TODO: really return null? not empty array?
//     }

    return {method: "getInfoKeys", args:[status, output]};
  },

// to remove ---V        
  msg: function(){
    return "tralaal";
  }
}
// to remove ---^        


self.onmessage = function(e){
                   //   c.console.log("one*********************************************");
                   //   Logger.log("test**************************************************");
                   var result = Client[e.data.method](...e.data.args);
                   self.postMessage(result);
                 }


self.onerror = function(e) {
          //   c.console.log("two*********************************************");
          self.postMessage(e);
        }
//self.addEventListener("message", msg => self.handleMessage(msg));
