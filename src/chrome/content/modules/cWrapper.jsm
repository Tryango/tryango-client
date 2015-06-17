/* A class to access the C library routines */
Components.utils.import("resource://gre/modules/ctypes.jsm");    //load external library
Components.utils.import("resource://gre/modules/Services.jsm");  //load resource
Components.utils.import("resource://gre/modules/FileUtils.jsm"); //for proofs.log file
Components.utils.import("resource://tryango_modules/pwmanager.jsm");
Components.utils.import("resource://tryango_modules/logger.jsm");
//ATTENTION: DO NOT INCLUDE prefs.jsm HERE. CYCLIC DEPENDENCY!

//constant
const QUERY_ARRAYSIZE = 256;

//exports
var EXPORTED_SYMBOLS = ["CWrapper"]


var CWrapper = {

  initLibrary : function(languagepack){
// To be removed - for debug only
    var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                 .getService(Components.interfaces.nsIXULRuntime);
      Logger.dbg("Architecture ABI: " + xulRuntime.OS + "_" + xulRuntime.XPCOMABI);
//--------------------
// Get current working directory

//     var file = Components.classes["@mozilla.org/file/directory_service;1"].
//        getService(Components.interfaces.nsIProperties).
//        get("CurProcD", Components.interfaces.nsIFile);
//     Logger.dbg("Current dir"+file.path);
    
    const ioService = Components
            .classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService);
    var protoUri = ioService.newURI( "resource://protobuf", null, null);
    try{
      if( protoUri instanceof Components.interfaces.nsIFileURL ) {
        Logger.dbg("Trying to load Library: " + protoUri.file.path);
        this.client = ctypes.open(protoUri.file.path);
      }
    }
    catch(e){
        
    }
    this.languagepack = languagepack;
    var uri = ioService.newURI( "resource://libclient", null, null);
    if( uri instanceof Components.interfaces.nsIFileURL ) {
      Logger.dbg("Trying to load Library: " + uri.file.path);
      this.client = ctypes.open(uri.file.path);
      this.certificateFile = uri.file.parent;
      Logger.dbg("Library OK loaded for directory:" + this.certificateFile.path );
      this.certificateFile.append("certificate.pem");

      var file = FileUtils.getFile("ProfD", ["proofs.log"]); //profile directory e.g. ~/.thunderbird/00abcdef.tryangotest/proofs.log
      //declare before calls
      this.initClient = this.client.declare("initClient" //method name
          , ctypes.default_abi //binary interface type 
          , ctypes.void_t   //return type
          , ctypes.char.ptr);   //param 1

      Logger.dbg("Logfile path: " + file.path);
      var c_logfilePath = ctypes.char.array()(file.path);
      this.initClient(c_logfilePath);

      this.signup = this.client.declare("signup"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t   //return type
          , ctypes.char.ptr   //param 1
          , ctypes.char.ptr   //param 2
          , ctypes.char.ptr); //param 3

      this.c_submitKey = this.client.declare("submitKey"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t   //return type
          , ctypes.char.ptr   //param 1 hexAp
          , ctypes.char.ptr   //param 2 identity
          , ctypes.char.ptr); //param 3 device

      this.c_revokeKey = this.client.declare("revokeKey"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t   //return type
          , ctypes.char.ptr   //param 1 hexAp
          , ctypes.char.ptr   //param 2 identity
          , ctypes.char.ptr   //param 3 device
          , ctypes.char.ptr); //param 4 password

      this.c_verifySignature = this.client.declare("verifySignature"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //result size
          , ctypes.char.ptr //param 3 - char* signed message
          , ctypes.char.ptr); //param 4 - char* sender

      this.freeString = this.client.declare("freeString"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.void_t   //return type
          , ctypes.char.ptr); //param 1

      this.checkMailAddr = this.client.declare("checkMailAddr"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t //return type
          , ctypes.char.ptr); //param1

      this.c_setServer = this.client.declare("setServer"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.bool       //return type
          , ctypes.char.ptr   //param 1
          , ctypes.uint32_t   //param 2
          , ctypes.char.ptr); //param 3

      this.c_getHostName = this.client.declare("getHostName"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.void_t   //return type
          , ctypes.char.ptr  
          , ctypes.uint32_t ); //param 2

      this.generateRsaKeys = this.client.declare("generateRsaKeys"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.bool     //return type
          , ctypes.char.ptr // param 1 userId
          , ctypes.char.ptr // param 2 - password 
          , ctypes.uint32_t ); //param 3 - size of the keys

      this.c_getDevices= this.client.declare("getDevices"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t   //return type
          , ctypes.char.ptr.ptr.ptr//pointer to array of strings - to be freed
          , ctypes.uint32_t.ptr   //param 2 - pointer to size of the array 
          , ctypes.char.ptr   //param 3 - hexAp to be updated
          , ctypes.char.ptr   //param 4 - identity
          , ctypes.char.ptr); //param 5 - device

      this.c_removeDevices = this.client.declare("removeDevices"// method name 
          , ctypes.default_abi  //binary interface type 
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr     //param 1 - hexAp to be updated
          , ctypes.char.ptr     //param 2 - identity
          , ctypes.char.ptr     // param 3 -device 
          , ctypes.char.ptr.ptr // param 4 -devices to be removed-  pointer to array of strings 
          , ctypes.uint32_t     // param 5 \ devices size
          );

      this.loadInfoKeysFromFile = this.client.declare("loadInfoKeysFromFile"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t   //return type
          , ctypes.char.ptr     //param 1 - identity/email
          , ctypes.char.ptr     //param 2 - file name
          );

      this.loadInfoKeysFromGpg = this.client.declare("loadInfoKeysFromGpg"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t   //return type
          , ctypes.char.ptr     //param 1 - identity
          );

      this.clearInfo = this.client.declare("clearInfo"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.void_t);   //return type

      this.c_getInfoKeys = this.client.declare("getInfoKeys"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t   //return type
          , ctypes.char.ptr.ptr.ptr//pointer to array of strings - to be freed
          , ctypes.uint32_t.ptr   //param 2 - pointer to size of the array 
          , ctypes.char.ptr     //param 3 - identity
          , ctypes.bool);  //param 4 - if import from keypurse (otherwise structure must have been precomputed

      this.transferKeysFromInfo = this.client.declare("transferKeysFromInfo"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t   //return type
          , ctypes.char.ptr     //param 1 - keyId
          );

      this.exportKeyPurse = this.client.declare("exportKeyPurse"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.bool  //return type
          , ctypes.char.ptr     //param 1 - path
          , ctypes.char.ptr);   //param 2 - password

      this.importKeyPurse = this.client.declare("importKeyPurse"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.bool  //return type
          , ctypes.char.ptr   //param 1 - path
          , ctypes.bool); //param 2 - if to clear keypurse before import
      
      this.removeKeyPurse = this.client.declare("removeKeyPurse"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.bool  //return type
          , ctypes.char.ptr);   //param 1 - path

      this.c_getServerInfo = this.client.declare("getServerInfo"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t //return type
          , ctypes.char.ptr //param 1
          , ctypes.uint32_t); //param 2
            
      this.c_encryptSignMail = this.client.declare("encryptSignMail"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //result size
          , ctypes.char.ptr //param 3 - char* mailBody
          , ctypes.char.ptr //param 4 - char* recipients
          , ctypes.char.ptr //param 5 - char* sender
          , ctypes.char.ptr //param 6 - char* password
          , ctypes.bool     //param 7 - bool sign
          , ctypes.bool);   //param 8 - bool encrypt

      this.c_encryptSignAttachment = this.client.declare("encryptSignAttachment"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t //return type
          , ctypes.char.ptr //param 1 - char* newfilepath
          , ctypes.char.ptr //param 3 - char* filepath
          , ctypes.char.ptr //param 4 - char* recipients
          , ctypes.char.ptr //param 5 - char* sender
          , ctypes.char.ptr //param 6 - char* password
          , ctypes.bool     //param 7 - bool sign
          , ctypes.bool);   //param 8 - bool encrypt

      this.c_getServer = this.client.declare("getServer"
          , ctypes.default_abi //binary interface type
          , ctypes.void_t   //return type
          , ctypes.char.ptr.ptr //param 1 - returned server name
          , ctypes.uint32_t.ptr //result size
          );

      this.c_removeKey = this.client.declare("removeKey"
          , ctypes.default_abi //binary interface type
          , ctypes.void_t   //return type
          , ctypes.char.ptr //param 1 - keyId
          );

      this.getPort = this.client.declare("getPort"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t //return type
          );   

      this.clearTempKey = this.client.declare("clearTempKey"
          , ctypes.default_abi //binary interface type
          , ctypes.void_t //return type
          );   
      
      this.c_decryptMail = this.client.declare("decryptMail"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t //return type - Confi_Status
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //param 2 result size
          , ctypes.uint8_t.ptr //param 3 - char* mailBody
          , ctypes.char.ptr //param 4 - char* sender
          , ctypes.char.ptr //param 5 - char* recipient
          , ctypes.char.ptr); //param 6 - char* password

      this.c_decryptAndSaveAttachment = this.client.declare("decryptAndSaveAttachment"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t //return type - Confi_Status
          , ctypes.uint8_t.ptr //param 1 - char* data
          , ctypes.uint32_t //param 2 - length of data
          , ctypes.char.ptr //param 3 - char* filepath
          , ctypes.char.ptr //param 4 - char* sender 
          , ctypes.char.ptr //param 5 - char* password
          );

      this.hasSecretKey = this.client.declare("hasSecretKey"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.bool     //return type
          , ctypes.char.ptr); //param 1

      this.checkPassword = this.client.declare("checkPassword"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t      //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //param 2  - result size
          , ctypes.char.ptr    // param 1 id/email
          , ctypes.char.ptr); //param 2 password

      this.c_checkDecrPassword = this.client.declare("checkDecrPassword"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t      //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //param 2  - result size
          , ctypes.uint8_t.ptr    // param 3 -  encrypted data
          , ctypes.uint32_t      //param 4 - encrypted data size
          , ctypes.char.ptr); //param 5  - password

      this.hasGpg = this.client.declare("hasGpg"// method name 
          , ctypes.default_abi //binary interface type 
          , ctypes.bool);   //return type

      this.c_getEncryptedSK = this.client.declare("getEncryptedSK"
          , ctypes.default_abi //binary interface type 
          , ctypes.uint32_t      //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //param 2  - result size
          , ctypes.char.ptr    // param 3 id/email
          , ctypes.char.ptr); //param 4 password
    }
  },


  removeKeys: function(fingerprints){
    Logger.dbg("to Remove keyIds length " + fingerprints.length);
    for(var i = 0; i < fingerprints.length; i++){
      var c_fingerprint = ctypes.char.array()(fingerprints[i]);
      Logger.dbg("to Remove fingerprint " + fingerprints[i]);
      this.c_removeKey(c_fingerprint);
    }
  },


  checkDecrPassword: function(keyIdStr, c_data, c_data_size, password){
    //types
    var keyId = new ctypes.char.ptr;
    var keyIdSize = new ctypes.uint32_t;
    //variables
    Logger.dbg("checkDecrPassword password: '"+password+"'");
    var c_password = ctypes.char.array()(password);

    var status = this.c_checkDecrPassword(keyId.address()
                                         , keyIdSize.address()
                                         , c_data
                                         , c_data_size
                                         , c_password);
    Logger.dbg("checkDecrPassword status:" + status);
    
    if((ctypes.uint32_t(0)<keyIdSize)){
      keyIdStr.str = keyId.readString();
      this.freeString(keyId);
    }
    else{
      keyIdStr.str = "";
    }
    return status;
  },

  getDataPassword: function(passValue, c_data, c_data_size){
    //from https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPromptService
    var pb = Components.classes["@mozilla.org/preferences-service;1"]//cannot use prefs.jsm because of cyclic dependancy
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.tryango.");
    var keyIdStr = {str : ""};

    var check = {value: pb.getBoolPref("savePW")};
    if(this.checkDecrPassword(keyIdStr, c_data, c_data_size, "") != 0){
      Logger.dbg("getdataPswd keyid" + keyIdStr.str);
      if(keyIdStr.str != ""){
        passValue.value = Pwmgr.getPass(keyIdStr.str);
        Logger.dbg("getdataPswd stored pw" + passValue.value);
        var result;
        while(this.checkDecrPassword(keyIdStr, c_data, c_data_size, passValue.value) != 0){
          Logger.dbg("Prompting for password");
          result = Logger.promptService.promptPassword(null, this.languagepack.getString("prompt_password_title") 
                                       , this.languagepack.getString("prompt_password") + keyIdStr.str
                                       , passValue, this.languagepack.getString("save_password"), check);
          if(!result) return false;
          pb.setBoolPref("savePW", check.value);
        }
        if(check.value){
          Logger.dbg("Setting password for "+ keyIdStr.str + " to "+passValue.value);
          Pwmgr.setPass(keyIdStr.str, passValue.value);
        }
        else{
          Logger.dbg("Removing password for "+ keyIdStr.str);
          Pwmgr.removePass(keyIdStr.str);
        }
        return true;
      }
      else{
        return false;
      }
    }
    else{
      return true
    }
  },

//helper function for getSignPassword 
  checkSignPassword: function(keyIdStr, sender, password){
    var keyId = new ctypes.char.ptr;
    var keyIdSize = new ctypes.uint32_t;
    var c_password = ctypes.char.array()(password);
    var c_sender = ctypes.char.array()(sender);
    var status = this.checkPassword(keyId.address()
                                   , keyIdSize.address()
                                   , c_sender
                                   , c_password);
    Logger.dbg("checkSignPasswrod status:" + status);
    if((ctypes.uint32_t(0)<keyIdSize)){
      keyIdStr.str = keyId.readString();
      this.freeString(keyId);
    }
    else{
      keyIdStr.str = "";
    }
    return status;
  },

//checks (and prompts if wrong) password for secret sign key for the sender email
  getSignPassword: function(passValue, sender){
    var pb = Components.classes["@mozilla.org/preferences-service;1"]//cannot use prefs.jsm because of cyclic dependancy
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.tryango.");
    Logger.dbg("getSignPasswrod start for sender"+ sender);
    var keyIdStr = {str : ""};
    var check = {value: pb.getBoolPref("savePW")};
    passValue.value = "";
    var status = this.checkSignPassword(keyIdStr, sender, passValue.value) ;//to get keyId
    Logger.dbg("getSignPasswrod status1 for pw"+ passValue.value);
    if(status != 0){
      if(keyIdStr.str != ""){
        passValue.value = Pwmgr.getPass(keyIdStr.str);
        status = this.checkSignPassword(keyIdStr, sender, passValue.value);
        while(status != 0){
          result = Logger.promptService.promptPassword(null, this.languagepack.getString("prompt_password_title") 
                                       , this.languagepack.getString("prompt_password") + keyIdStr.str
                                       , passValue, this.languagepack.getString("save_password"), check);
          if(!result) return false; 
          pb.setBoolPref("savePW", check.value);
          status = this.checkSignPassword(keyIdStr, sender, passValue.value);
        }
        if(check.value){
          Pwmgr.setPass(keyIdStr.str, passValue.value);
        }
        else{
          Pwmgr.removePass(keyIdStr.str);
        }
      }
      else{
        Logger.dbg("getSignPasswrod noKeyid for sender" + sender);
        return false;
      }
    }
    return true;
  },


  getServer: function(){
    var serverName = new ctypes.char.ptr;
    var serverNameSize = new ctypes.uint32_t;
    this.c_getServer(serverName.address()
                    , serverNameSize.address());
    var server = serverName.readString();
    this.freeString(serverName);
    return server;
  },

 setServer: function(server, port){
    var oldServer = this.getServer();
    var oldPort = this.getPort();
    if (oldPort != port || oldServer != server){
      Logger.dbg("Setting server" + server + " port:"+port);
      var accMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
                   .getService(Components.interfaces.nsIMsgAccountManager);
      var accounts = accMgr.accounts;
      try{//TODO: should we give a warning that pending subscriptions are becoming invalid?
        //access preference system
        var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.tryango.");
        for (var i = 0; i < accounts.length; i++) {
          var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
          if(account != null && account.defaultIdentity != null){
            prefBranch.setCharPref("reqId_" + account.defaultIdentity.email, "");
            Logger.dbg("Resseting reqId_" + account.defaultIdentity.email);
          }
          // Prefs.setPref("reqid_" + account.email, "");// could not do it because of cyclic dependency
        }
      }
      catch(e){
        Logger.error("Could not initialise preference system when trying to reset pending submissions.");
        Logger.error(e.toString());
      }
      Logger.dbg("Certificate direcory:" + this.certificateFile.path)
      return this.c_setServer(server, port, this.certificateFile.path);
    }
    else{
      Logger.dbg("Not setting server" + server + " port:"+port);
      return true;
    }
  },
              
  getServerInfo: function(){
    let charArray = ctypes.ArrayType(ctypes.char);
    let myArray = new charArray(QUERY_ARRAYSIZE);
    let st = this.c_getServerInfo(myArray, QUERY_ARRAYSIZE); //TODO: improve this
    return st + " " + myArray.readString();
  },

  getDevices: function(identity, device){
    var ap = Pwmgr.getAp(identity);
    let output = [];
    if(ap!=undefined && ap.length > 1){
      var charAp = ctypes.char.array()(ap);
      var result = new ctypes.char.ptr.ptr;
      var resultSize = new ctypes.uint32_t;
      //REMARK: load nonce from Pwmgr is done in tryango::init
      //        (=once every start-up) afterwards it is just updated into Pwmgr
      //request
      let status = this.c_getDevices(result.address(), resultSize.address(), charAp, identity, device);
      var next = result;
      if(status==0 && (ctypes.uint32_t(0)<resultSize)){
        for (var i = 0; (ctypes.uint32_t(i) < resultSize); i++){
	        var str = next.contents.readString();
	        this.freeString(next.contents);
	        next = next.increment();
	        output[i]= str;
        }
        this.freeString(ctypes.cast(result, ctypes.char.ptr));
        //update nonce and store it securely
        Pwmgr.setAp(identity, charAp.readString());
      }
      else{//ap is outdated so we remove it - what about server down?
        if(status==12){//Error response from server
          Logger.dbg("Outdated AP, status:"+status);
          Pwmgr.setAp(identity, "");
        }
        else{
          Logger.error("Error getting list of devices: "+status);
        }
      }
    }
    else{
      Logger.dbg("Empty AP - signup needed.");
    }
    return output;
  },

  removeDevices: function(identity, device, devices, totalDevices, doNotPrompt){
    //init
    var arr_t = ctypes.ArrayType(ctypes.char.ptr);
    var c_devices = new arr_t(devices.length);
    var removeAp = false;
    for(var i = 0; i < devices.length; i++){
      c_devices[i] = ctypes.char.array()(devices[i]);
      if(devices[i] == device){
        removeAp = true;
      }
    }

    //revoke key?
    if(devices.length >= totalDevices){
      if(doNotPrompt ||
         Logger.promptService.confirm(
           null, "Trango",
           this.languagepack.getString("prompt_allRemoved_revoke")
         )
        ){
        var status = this.revokeKey(identity, device);
        if(status == 0){
          Logger.dbg("Key revocation was successful");
        }
        else{
          Logger.dbg("Could not revoke key - err no:"+status);
        }
        
      };
    }
      //request
    var ap = Pwmgr.getAp(identity);
    if(ap != undefined && ap.length > 1){
      var charAp = ctypes.char.array()(ap);
      var status = this.c_removeDevices(charAp, identity, device, c_devices, ctypes.uint32_t(devices.length));
      //check errors
      if(status == 0){
        //update nonce and store it securely
        if(removeAp){
          Pwmgr.setAp(identity, "");
        }
        else{
          Pwmgr.setAp(identity, charAp.readString());
        }
      }
      else if(status == 12){//ap is outdated so we remove it - what about server down?
        Logger.dbg("Outdated AP, status: "+status);
        Pwmgr.setAp(identity, "");
      }
      //else => just return status below

    }
    else{
      Logger.dbg("Empty AP - signup needed.");
      return 23; //ANG_NO_AP
    }

    return status;
  },
                 
  getInfoKeys: function(identity, fromKeypurse){
    var output = [];
    var result = new ctypes.char.ptr.ptr;
    var resultSize = new ctypes.uint32_t;

    //pass request to C
    var status = this.c_getInfoKeys(result.address(), resultSize.address(), identity, fromKeypurse);
    //iterate over results
    Logger.dbg("Info size:" + resultSize);
    var next = result;
    if(status==0 && (ctypes.uint32_t(0)<resultSize)){
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
    else if(status == 15){   // ANG_NO_ENTRIES
      //empty keypurse => just return output as empty
    }
    else{
      //error
      Logger.error("getKeyPurse: Error " + this.getErrorStr(status) + " (" + status + ")");
      return null; //TODO: really return null? not empty array?
    }

    return output;
  },


  getHostName: function(){
    let charArray= ctypes.ArrayType(ctypes.char);
    // POSIX standard says hostname is guaranteed not to exceed 255 bytes
    let size = 255;
    let myArray = new charArray(size);
    this.c_getHostName(myArray,size);
    return myArray.readString();
  },


  submitKey: function(identity, device){
    var hexAp = ctypes.char.array()(Pwmgr.getAp(identity)); //TODO: check Pwmgr return first
    if(hexAp != undefined && hexAp.length > 1){
      var result = this.c_submitKey(hexAp, identity, device);
      if(result == 0){ //ANG_OK is 0
        var newHexAp = hexAp.readString();
        Pwmgr.setAp(identity, newHexAp);
      }
      return result;
    }
    else{
      return 23; //ANG_NO_AP
    }
  },

  revokeKey: function(identity, device){
    var hexAp = ctypes.char.array()(Pwmgr.getAp(identity)); //TODO: check Pwmgr return first
    if(hexAp != undefined && hexAp.length > 1){
      var pass = {value : ""};
      if(!this.getSignPassword(pass, identity)){
        return 21; //ANG_NO_KEY_PRESENT
      }
      var c_password = ctypes.char.array()(pass.value);

      var result = this.c_revokeKey(hexAp, identity, device, c_password);
      if(result == 0){ //ANG_OK is 0
        var newHexAp = hexAp.readString();
        Pwmgr.setAp(identity, newHexAp);
      }
      return result;
    }
    else{
      return 23; //ANG_NO_AP
    }
  },

  verifySignature: function(message, signedMail, sender){
    var result = new ctypes.char.ptr;
    var resultSize = new ctypes.uint32_t;

    var c_signedMail = ctypes.char.array()(signedMail);
    var c_sender = ctypes.char.array()(sender);
    var status = this.c_verifySignature(result.address(), resultSize.address(),
                                  c_signedMail, c_sender);
    Logger.dbg("Signature verified status:"+status+ " Msg size:" + resultSize);

    if((ctypes.uint32_t(0) < resultSize)){
      if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
        message.str = result.readString();
        Logger.dbg("Signed msg:\n" + message.str);
      }
      this.freeString(result);
    }
    return status;
  },


  checkMailAddr: function(mailaddr){
    var c_mailaddr = ctypes.char.array()(mailaddr);
    var status = this.c_checkMailAddr(c_mailaddr);
    return status.toString();
  },


  getMaxErrNum: function(){ //set it equal to ANG_UNKNOWN_ERROR - messages above are signature errors
    return 32;
  },


  getErrorStr: function(error){
    switch(error){
      //rest of errors
      case 1:
      return "prev_ne_later";
      case 2:
      return "prev_present";
      case 3:
      return "bad_merkle_chain";
      case 4:
      return "not_asc_ct_index";
      case 5:
      return "bad_h_id";
      case 6:
      return "no_root";
      case 7:
      return "no_host";
      case 8:
      return "fail_send";
      case 9:
      return "fail_connect";
      case 10:
      return "fail_receive";
      case 11:
      return "fail_encode";
      case 12:
      return "server_error";
      case 13:
      return "wrong_resp";
      case 14:
      return "wrong_proof";
      case 15:
      return "no_entries";
      case 16:
      return "no_certificate";
      case 17:
      return "wrong_certificate";
      case 18:
      return "id_already_exists";
      case 19:
      return "key_not_supported";
      case 20:
      return "fail_gen_selfsig";
      case 21:
      return "no_key_present";
      case 22:
      return "no_ap";
      case 23:
      return "parse_error";
      case 24:
      return "key_alg_not_supported";
      case 25:
      return "message_modified";
      case 26:
      return "compress_error";
      case 27:
      return "input_too_large";
      case 28:
      return "wrong_password";
      case 29:
      return "fail_malloc"
      case 30:
      return "cancel";
      case 31:
      return "pub_expired";
      case 32:
      return "unknown_error";
      //signature errors
      case 32:
      return "no_sig";
      case 33:
      return "wrong_sig";
      case 34:
      return "nopubkey_sig";
      default:
      return "unknown_error";
    }
  },


  getEncryptedSK: function(encrKey, identity){
    var result = new ctypes.char.ptr;
    var resultSize = new ctypes.uint32_t;
    var c_id = ctypes.char.array()(identity);
    var pass = {value : ""};
    if(!this.getSignPassword(pass, identity)){
      return 21; //ANG_NO_KEY_PRESENT
    }
    var c_password = ctypes.char.array()(pass.value);
    var status =  this.c_getEncryptedSK(result.address()
                                     , resultSize.address()
                                     , c_id
                                     , c_password);
    if((ctypes.uint32_t(0)<resultSize)){
      if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
        encrKey.str = result.readString();  //TODO: we should return an object instead of this "hack". E.g. return {str: "bla", i: 0};
      }
      this.freeString(result);
    }
    return status;
  },


  encryptSignMail: function(encrypted, mailBody, recipients, sender,  sign, encrypt){
    //types
    var result = new ctypes.char.ptr;
    var resultSize = new ctypes.uint32_t;
    
    //TODO: remove spam output
    Logger.dbg(mailBody);
    Logger.dbg("Recipients:" + recipients + " sender:"+sender);

    //variables
    var c_mailBody = ctypes.char.array()(mailBody);
    var c_sender = ctypes.char.array()(sender);
    var c_recipients = ctypes.char.array()(recipients);
    var pass = {value : ""};
    if(sign){
      if(!this.getSignPassword(pass, sender)){
        return 21; //ANG_NO_KEY_PRESENT
      }
    }
    var c_password = ctypes.char.array()(pass.value);
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
    if((ctypes.uint32_t(0)<resultSize)){
      if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
        encrypted.str = result.readString();  //TODO: we should return an object instead of this "hack". E.g. return {str: "bla", i: 0};
      }
      this.freeString(result);
    }
    return status;
  },

  encryptSignAttachment: function(pathToEncryptedFile, filepath, recipients, sender, sign, encrypt){

    //init
    var status = 32; //unknown error
    //encrypt and/or sign
    if(sign || encrypt){
      Logger.dbg("Encrypt/Sign attachment: " + filepath);

      //variables
      var c_newfilepath = ctypes.char.array()(pathToEncryptedFile);
      var c_filepath = ctypes.char.array()(filepath);
      var c_sender = ctypes.char.array()(sender);
      var c_recipients = ctypes.char.array()(recipients);
      var pass = {value : ""};
      if(sign){
        if(!this.getSignPassword(pass, sender)){
          return 21;//ANG_NO_KEY_PRESENT;
        }
      }
      var c_password = ctypes.char.array()(pass.value);

      status = this.c_encryptSignAttachment(c_newfilepath
                                            , c_filepath
                                            , c_recipients
                                            , c_sender
                                            , c_password
                                            , sign
                                            , encrypt);
    }
    else{
      //shall not happen
      Logger.error("encryptSignAttachment called without sign or encrypt set to true!");
      //status is already set to unknown error
    }

    return status;
  },

  decryptMail: function(decrypted, mailBody, sender, recipient){
    //types
    var result = new ctypes.char.ptr;
    var resultSize = new ctypes.uint32_t;

    //variables
    var c_mailBody = ctypes.uint8_t.array()(mailBody.length)
    for(var i = 0; i< mailBody.length;i++){
      c_mailBody[i] = mailBody.charCodeAt(i);
    }
    var c_sender = ctypes.char.array()(sender);
    var c_recipient = ctypes.char.array()(recipient);
    
    //TODO: remove spam output
    Logger.dbg(mailBody);

    var pass = {value : ""};
    if(this.getDataPassword(pass, c_mailBody, mailBody.length)){
      var c_password = ctypes.char.array()(pass.value);

      Logger.dbg("c_decryptMail");
      var status = this.c_decryptMail(result.address()
                                     , resultSize.address()
                                     , c_mailBody
                                     , c_sender
                                     , c_recipient
                                     , c_password);
      Logger.dbg("Decrypted status:"+status+ " Decrypted size:"+resultSize);
      //error check
      if((ctypes.uint32_t(0)<resultSize)){
        if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
          decrypted.str = result.readString();
          Logger.dbg("Decrypted msg:\n" + decrypted.str);
//           Logger.dbg("Decrypted read:\n" + result.readString());
        }
        this.freeString(result);
      }
      return status;
    }
    else{
      return 21; //ANG_NO_KEY_PRESENT - should we return wrong password instead?
    }

    //query
//     Logger.error("decryption: Error " + this.getErrorStr(status) + " (" + status + ")");
//     throw "Decryption failed (return: " + this.getErrorStr(status) + ")";
  },


  decryptAndSaveAttachment: function(data, filepath, sender){
    //variables
//     Logger.dbg(this.promptPassword(sender, ""));

    var c_data = ctypes.uint8_t.array()(data.length)
    for(var i = 0; i< data.length;i++){
      c_data[i] = data.charCodeAt(i);
    }
//     var c_data = ctypes.char.array()(data.split(''));
//     Logger.dbg(data);
    var c_filepath = ctypes.char.array()(filepath);
    var c_sender = ctypes.char.array()(sender);
    Logger.dbg("decrypting attachment with size of data:" + data.length);
    var pass = {value : ""};
    if(this.getDataPassword(pass, c_data, data.length)){
      var c_password = ctypes.char.array()(pass.value);
      Logger.dbg("password:"+pass.value);
      //query
      return this.c_decryptAndSaveAttachment(c_data, c_data.length, c_filepath, c_sender, c_password);
    }
    else{
      return 21; //ANG_NO_KEY_PRESENT - should we return wrong password instead? or nothing?
    }
    return 0;
  },

  closeLibrary : function(){
    this.client.close(); //TODO: FIXME: this does not work sometimes
  }
}

CWrapper.QuestionEnum = {
  NO : 0,
  YES : 1,
  ASK : 2
}

