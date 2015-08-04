/* A class to access the C library routines */
Components.utils.import("resource://gre/modules/ctypes.jsm");    //load external library
Components.utils.import("resource://gre/modules/Services.jsm");  //load resource
// Components.utils.import("resource://gre/modules/Promise.jsm");  //promise interface
Components.utils.import("resource://gre/modules/FileUtils.jsm"); //for proofs.log file
Components.utils.import("resource://tryango_modules/pwmanager.jsm");
Components.utils.import("resource://tryango_modules/logger.jsm");
// Components.utils.import("resource://gre/modules/PromiseWorker.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm");
Components.utils.import("resource://tryango_modules/dialogs.jsm");

//ATTENTION: DO NOT INCLUDE prefs.jsm HERE. CYCLIC DEPENDENCY!
//constant
const QUERY_ARRAYSIZE = 256;

//exports
var EXPORTED_SYMBOLS = ["CWrapper"]

var CState = Object.freeze({uninitialised:0, idle:1, running:2});

/**
 * An implementation of queues (FIFO).
 *
 * The current implementation uses one array, runs in O(n ^ 2), and is optimized
 * for the case in which queues are generally short.
 */
function Queue() {
  this._array = [];
};
Queue.prototype = {
  pop: function pop() {
    return this._array.shift();
  },
  push: function push(x) {
    return this._array.push(x);
  },
  isEmpty: function isEmpty() {
    return this._array.length == 0;
  }
};

var CWrapper = {
  _state: CState["uninitialised"],
  /**
   * The queue of deferred, waiting for the completion of their
   * respective job by the worker.
   */
  _queue: new Queue(),
  _callback: null,
  _server: "",
  _port: -1,
  libraryLoaded: false,

  run: function(toRun, callback){
    CWrapper._state = CState["running"];
    CWrapper._callback = callback;
    if(CWrapper.hasAp(toRun.method)){
      var hexAp = Pwmgr.getAp(toRun.args[0]); //assuming identity is the first parameter
      if(hexAp == undefined || hexAp.length < 2){
        //we need to set ap to a fake one to get error
        hexAp = "FFFF";
      }
      toRun.args = [hexAp].concat(toRun.args);
      Logger.dbg("adding ap:" + hexAp + " to method:"+toRun.method + " new args:"+toRun.args);
    }
//     Logger.dbg("Running 2 method:"+toRun.method+ " args:" + toRun.args + " callback:" + toRun.callback);
    CWrapper.angWorker.postMessage({method:toRun.method, args:toRun.args}); //TODO - dynamically update ap in params
  },

  post:function(method, args, callback){
   Logger.dbg("+++++++++++++++++++++++post:"+method +" args:"+args +" callback:"+ callback);
   if(this._state == CState["idle"]){
     this.run({method:method, args:args}, callback);
   }
   else{
     Logger.dbg("pushing to queue:"+ "method:"+method+ " args:" + args);
     this._queue.push({method:method, args:args, callback:callback});
   }
  },

  handleMsg: function(e){
    if(!e.data.method){
      Logger.error('Exception in worker:'+ e.data);
    }

//TODO - remove spam--v
    if(!e.data){
      Logger.error('-----------------------error incoming from worker, event type:'+ e + e.type);
    }
    else{
      Logger.dbg('--------------------------------incoming message from worker, msg1:'+ e.data.method + " args:"+ e.data.args);
      if(e.data.method == "openLibrary"){
        Logger.dbg("Library OK loaded.");
      }
    }
//TODO - remove spam --^

    if(CWrapper._state == CState["running"]){
      var toRun;
      if(!CWrapper._queue.isEmpty()){
        toRun  = CWrapper._queue.pop();
//         Logger.dbg("Popping queue 1"+ "method:"+toRun.method+ " args:" + toRun.args + " callback:" + toRun.callback);
      }
      else{
        toRun = null;
      }
      var oldCallback = CWrapper._callback;
      if(oldCallback != null && e.data && e.data.args){
        Logger.dbg("************************** calling callback with args:" + e.data.args);
        oldCallback(...e.data.args);
      }
      else{
        Logger.dbg("***************************** no callback - calling is null or no args");
      }

      if(CWrapper._queue.isEmpty() && toRun == null){
        Logger.dbg("Idling");
        CWrapper._state = CState["idle"];
      }
      else{
        if(toRun == null){
          toRun  = CWrapper._queue.pop();
//           Logger.dbg("Popping queue 2"+ "method:"+toRun.method+ " args:" + toRun.args + " callback:" + toRun.callback);
        }
//         Logger.dbg("Running 1 method:"+toRun.method+ " args:" + toRun.args + " callback:" + toRun.callback);
        CWrapper.run({method:toRun.method, args:toRun.args}, toRun.callback);
      }
    }
    else{
      Logger.error("Not expecting message from worker. Function:"+e.data.method);
    }
    Logger.log('====================================end incoming message from worker state:' + CWrapper._state);
  },

  hasAp: function(method){
    switch(method){
//       case "submit":- we do not add submit as it fresh token and not (yet) ap
      case "submitKey":
      case "revokeKey":
      case "getDevices":
      case "removeDevices":
        return true;
      default:
        return false;
    }
  },

  _initSynchronusInterface: function(){

    this.c_getServer = this.client.declare("getServer"
          , ctypes.default_abi  //binary interface type
          , ctypes.void_t       //return type
          , ctypes.char.ptr.ptr //param 1 - returned server name
          , ctypes.uint32_t.ptr //result size
          );

    this.c_getPort = this.client.declare("getPort"
          , ctypes.default_abi //binary interface type
          , ctypes.uint32_t    //return type
          );

    this.freeString = this.client.declare("freeString"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.void_t      //return type
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

   this.c_decryptMail = this.client.declare("decryptMail"
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type - Confi_Status
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //param 2 result size
          , ctypes.uint8_t.ptr  //param 3 - char* mailBody
          , ctypes.char.ptr     //param 4 - char* sender
          , ctypes.char.ptr     //param 6 - char* password
          );

    this.c_clearSignMail = this.client.declare("clearSignMail"
          , ctypes.default_abi  //binary interface type
          , ctypes.uint32_t     //return type
          , ctypes.char.ptr.ptr //param 1 - returned array
          , ctypes.uint32_t.ptr //result size
          , ctypes.char.ptr     //param 3 - char* mailBody
          , ctypes.char.ptr     //param 5 - char* sender
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

   this.c_getHostName = this.client.declare("getHostName"// method name
          , ctypes.default_abi //binary interface type
          , ctypes.void_t      //return type
          , ctypes.char.ptr
          , ctypes.uint32_t    //param 2
          );

    Logger.dbg("Initialized Synch library");

//     this.getV = this.client.declare("getV"// method name
//           , ctypes.default_abi //binary interface type
//           , ctypes.uint32_t     //return type
//           );
// 
//     this.setV = this.client.declare("setV"// method name
//           , ctypes.default_abi //binary interface type
//           , ctypes.void_t        //return type
//           , ctypes.uint32_t    //param 1
//           );
  },

//constructor
  initLibrary : function(languagepack){
    this._server = "";
    this._port = -1;
    this._state = CState["idle"];
    this.languagepack = languagepack;
///------------------------------------
// To be removed - for debug only --v
    var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                 .getService(Components.interfaces.nsIXULRuntime);
      Logger.dbg("Architecture ABI: " + xulRuntime.OS + "_" + xulRuntime.XPCOMABI);
//-------------------- to be removed --^
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
        ctypes.open(protoUri.file.path);
      }
    }
    catch(e){}
    var uri = ioService.newURI( "resource://libclient", null, null);
    if( uri instanceof Components.interfaces.nsIFileURL ) {
      var certificateFile = uri.file.parent;
      certificateFile.append("certificate.pem");
      //load logfileName from prefs (without calling Prefs!)
      var pb = Components.classes["@mozilla.org/preferences-service;1"]//cannot use prefs.jsm because of cyclic dependancy
          .getService(Components.interfaces.nsIPrefService)
          .getBranch("extensions.tryango.");
      var logfileName = pb.getCharPref("logfileName");
      var file = FileUtils.getFile("ProfD", [logfileName]); //profile directory e.g. ~/.thunderbird/00abcdef.tryangotest/proofs.log

      try{
        this.angWorker = new ChromeWorker('resource://tryango/wrapperWorker.js');
	      this.angWorker.addEventListener('message', this.handleMsg);
        Logger.dbg("Logfile path: " + file.path);
        Logger.dbg("Trying to load Library: " + uri.file.path);
        this.post("openLibrary", [uri.file.path, file.path, certificateFile.path], null);
        this.client = ctypes.open(uri.file.path);
        this._initSynchronusInterface();
      }
      catch(e){
        Logger.error("Error initializing library:" + e);
      }
    }
  },

  synchGetDataPassword: function(data){
    var pb = Components.classes["@mozilla.org/preferences-service;1"]//cannot use prefs.jsm because of cyclic dependancy
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.tryango.");
    Logger.dbg("synchGetDataPassword data: " + data);
    var check = {value: pb.getBoolPref("savePW")};
    var keyIdStr = "";
    var passValue = {value: ""};

    var keyId = new ctypes.char.ptr;
    var keyIdSize = new ctypes.uint32_t;
    var c_data = ctypes.uint8_t.array()(data.length)
    for(var i = 0; i < data.length; i++){
      c_data[i] = data.charCodeAt(i);
    }
    var status;
    status = this.c_checkDecrPassword(keyId.address()
                                     , keyIdSize.address()
                                     , c_data
                                     , c_data.length
                                     , passValue.value);
    if((ctypes.uint32_t(0) < keyIdSize)){
      keyIdStr = keyId.readString();
      this.freeString(keyId);
      if(passValue.value == ""){
        passValue.value = Pwmgr.getPass(keyIdStr);
      }
    }
    else{
      return {status: status, password: ""};
    }

    if(status == 0){
      return {status: status, password: passValue.value};
    }
    
    do{
      status = this.c_checkDecrPassword(keyId.address()
                                         , keyIdSize.address()
                                         , c_data
                                         , c_data.length
                                         , passValue.value);
      if((ctypes.uint32_t(0) < keyIdSize)){
        keyIdStr = keyId.readString();
        this.freeString(keyId);
        if(passValue.value == ""){
          passValue.value = Pwmgr.getPass(keyIdStr);
        }
      }
      else{
        return {status: status, password: ""};
      }
      if(status != 0){
        var result = true;
        do {
          result = Logger.promptService.promptPassword(null, this.languagepack.getString("prompt_password_title")
                                       , this.languagepack.getString("prompt_password") + keyIdStr
                                       , passValue, this.languagepack.getString("save_password"), check);
        }
        while(result && passValue.value == "");
        if(!result){
          return {status: 30, password: ""};//ANG_CANCEL
        }
        pb.setBoolPref("savePW", check.value);
        if(check.value){
          Logger.dbg("Setting password for "+ keyIdStr + " to " + passValue.value);
          Pwmgr.setPass(keyIdStr, passValue.value);
        }
        else{
          Pwmgr.removePass(keyIdStr);
        }
      }
    }
    while(status != 0)
    return {status: status, password: passValue.value};
  },

  getDataPassword: function(data, callback){
    //from https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPromptService
//     this._keyId = "";
    var pb = Components.classes["@mozilla.org/preferences-service;1"]//cannot use prefs.jsm because of cyclic dependancy
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.tryango.");
    Logger.dbg("getDataPassword data: "+ data);
    var check = {value: pb.getBoolPref("savePW")};

    function dataPwCallback(status, keyId, ask, password){
      if(status != 0){
        if(keyId != ""){
          var passValue = {};
          passValue.value = Pwmgr.getPass(keyId);
          if(ask){
            let result = Logger.promptService.promptPassword(null, CWrapper.languagepack.getString("prompt_password_title")
                                       , CWrapper.languagepack.getString("prompt_password") + keyId
                                       , passValue, CWrapper.languagepack.getString("save_password"), check);
            if(!result){
              callback(30, ""); //ANG_CANCEL
              return;
            }
            pb.setBoolPref("savePW", check.value);
            if(check.value){
              Pwmgr.setPass(keyId, passValue.value);
            }
            else{
              Pwmgr.removePass(keyId);
            }
          }
          CWrapper.post("checkDataPassword", [data, passValue.value, true], dataPwCallback);
        }
        else{
          callback(status, "");
        }
      }
      else{
        callback(status, password);
      }
    }
//     Logger.dbg("getDataPassword start");
    this.post("checkDataPassword", [data, "", false],  dataPwCallback);
  },

  _checkSignPassword: function(sender, password){
    var pb = Components.classes["@mozilla.org/preferences-service;1"]//cannot use prefs.jsm because of cyclic dependancy
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.tryango.");
    var check = {value: pb.getBoolPref("savePW")};

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
    return {status: status, keyId: keyIdStr};
  },


  synchGetSignPassword: function(sender){
     var pb = Components.classes["@mozilla.org/preferences-service;1"]//cannot use prefs.jsm because of cyclic dependancy
                           .getService(Components.interfaces.nsIPrefService)
                           .getBranch("extensions.tryango.");
    Logger.dbg("synchGetSignPassword start for sender "+ sender);
    var check = {value: pb.getBoolPref("savePW")};
    var passValue = {value: ""};
    var ret = this._checkSignPassword(sender, passValue.value);//to get keyId
    Logger.dbg("syncGetSignPassword status for empty pw  status:" + ret.status);
    if(ret.status != 0){
      if(ret.keyId != ""){
        passValue.value = Pwmgr.getPass(ret.keyId);
        ret = this._checkSignPassword(sender, passValue.value);
        while(ret.status != 0){
          var result = Logger.promptService.promptPassword(null, this.languagepack.getString("prompt_password_title")
                                       , this.languagepack.getString("prompt_password") + ret.keyId
                                       , passValue, this.languagepack.getString("save_password"), check);
          if(!result){
            return {status:30, password: ""}; //ANG_CANCEL
           }
          pb.setBoolPref("savePW", check.value);
          ret = this._checkSignPassword(sender, passValue.value);
        }
        if(check.value){
          Pwmgr.setPass(ret.keyId, passValue.value);
         }
         else{
          Pwmgr.removePass(ret.keyId);
         }
       }
       else{
        Logger.dbg("getSignPassword noKeyid for sender " + sender);
        return {status:21, password: ""};//ANG_NO_KEY_PRESENT
       }
    }
    return {status:0, password: passValue.value};
   },
 
 
//checks (and prompts if wrong) password for secret sign key for the sender email
  getSignPassword: function(sender, callback){
    var pb = Components.classes["@mozilla.org/preferences-service;1"]//cannot use prefs.jsm because of cyclic dependancy
                          .getService(Components.interfaces.nsIPrefService)
                          .getBranch("extensions.tryango.");
    var check = {value: pb.getBoolPref("savePW")};
    function signPwCallback(status, keyId, ask, password){
      if(status != 0){
        if(keyId != ""){
          var passValue = {};
          passValue.value = Pwmgr.getPass(keyId);
          if(ask){
            let result = Logger.promptService.promptPassword(null, CWrapper.languagepack.getString("prompt_password_title")
                                       , CWrapper.languagepack.getString("prompt_password") + keyId
                                       , passValue, CWrapper.languagepack.getString("save_password"), check);
            if(!result){
              callback(false, "");
              return;
            }
            pb.setBoolPref("savePW", check.value);
            if(check.value){
              Pwmgr.setPass(keyId, passValue.value);
            }
            else{
              Pwmgr.removePass(keyId);
            }
          }
          CWrapper.post("checkSignPassword", [sender, passValue.value, true], signPwCallback);
        }
        else{
          callback(false, "");
        }
      }
      else{
        callback(true, password);
      }
    }
//     Logger.dbg("getSignPassword start for sender "+ sender);
    this.post("checkSignPassword", [sender, "", false],  signPwCallback);
  },

  getPort: function(){
//     return this._port;
    return this.c_getPort();
  },

  getServer: function(){
//     return this._server;
    var serverName = new ctypes.char.ptr;
    var serverNameSize = new ctypes.uint32_t;
    this.c_getServer(serverName.address()
                    , serverNameSize.address());
    var server = serverName.readString();
    this.freeString(serverName);
    return server;
  },

  setServer: function(server, port){
    var oldServer = this._server;
    var oldPort = this._port;
    var running = false;
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
      running = true;
      var status = false;
      this.post("setServer", [server, port], function(status){
        if(status){
          CWrapper._server = server;
          CWrapper._port = port;
          Logger.log("Setting server to:" + server + " and port to:" + port + " succedded.");
        }
        else{
          Logger.error("Failed to set the server and port");
        }
        running = false;
      });
      return true;
    }
    else{
      Logger.dbg("Not setting server" + server + " port:"+port);
      return true;
    }
  },


  removeDevices: function(identity, device, devices, totalDevices, doNotPrompt, callback){
    var hexAp = Pwmgr.getAp(identity);
    if(hexAp == undefined || hexAp.length <= 1){
      callback(23);
    }
    else{
      if(devices.length >= totalDevices){
        if(doNotPrompt ||
           Logger.promptService.confirm(
             null, "Trango",
             this.languagepack.getString("prompt_allRemoved_revoke")
           )
          ){
          this.revokeKey(identity, device, function(status){
            if(status == 0){
              Logger.dbg("Key revocation was successful");
            }
            else{
            Logger.dbg("Could not revoke key - err no:" + status);
            }
         });
        }
      }
      CWrapper.post("removeDevices", [identity, device, devices], function(newHexAp, status, id){
        if(status == 12){//ap is outdated so we remove it - what about server down?
          Logger.dbg("Outdated AP, status: " + status);
          Pwmgr.setAp(id, "");
        }
        else if(newHexAp.length >2){
          Pwmgr.setAp(id, newHexAp);
        }
        callback(status);
      });
    }
    //request
  },


  getHostName: function(){
    let charArray= ctypes.ArrayType(ctypes.char);
    // POSIX standard says hostname is guaranteed not to exceed 255 bytes
    let size = 255;
    let myArray = new charArray(size);
    this.c_getHostName(myArray,size);
    return myArray.readString();
  },


  revokeKey: function(identity, device, callback){
    var hexAp = ctypes.char.array()(Pwmgr.getAp(identity)); //TODO: check Pwmgr return first
    if(hexAp != undefined && hexAp.length > 1){
      var pass = {value : ""};
      CWrapper.post("synchronizeSK", [identity], function(status){
        if(status != 0){
          callback(21);
        }
        else{
          this.getSignPassword(identity, function(success, password){
            if(success){
              CWrapper.post("revokeKey",[identity, device, password], function(newHexAp, status){
                if(newHexAp.length >2){
                  Pwmgr.setAp(identity, newHexAp);
                }
                callback(status);
              });
            }
            else{
              callback(21);//ANG_NO_KEY_PRESENT
            }
          });
        }
      });
    }
    else{
      callback(23); //ANG_NO_AP
    }
  },

//   checkMailAddr: function(mailaddr){
//     var c_mailaddr = ctypes.char.array()(mailaddr);
//     var status = this.c_checkMailAddr(c_mailaddr);
//     return status.toString();
//   },


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
      case 33:
      return "no_sig";
      case 34:
      return "wrong_sig";
      case 35:
      return "nopubkey_sig";
      case 36:
      return "sig_expired";
      case 37:
      return "sigkey_expired";
      default:
      return "unknown_error";
    }
  },


  getEncryptedSK: function(identity, message, callback){
    this.getSignPassword(identity, function(success, password){
      if(success){
        CWrapper.post("getEncryptedSK", [identity, message, password], callback);
      }
      else{
        callback(21, "");//ANG_NO_KEY_PRESENT
      }
    }.bind(this));
  },

  synchClearSignMail: function(mailBody, sender, password){
//     var ret = this.synchGetSignPassword( sender);
//     if(ret.status != 0){
//       Logger.dbg("Failed to get password for private key of:" + sender);
//       return {status: ret.status, signed: mailBody}; //ANG_NO_KEY_PRESENT
//     }
    var result = new ctypes.char.ptr;
    var resultSize = new ctypes.uint32_t;
    var c_mailBody = ctypes.char.array()(mailBody);
    var c_sender = ctypes.char.array()(sender);
    var c_password = ctypes.char.array()(password);

    var status =  this.c_clearSignMail(result.address()
                                     , resultSize.address()
                                     , c_mailBody
                                     , c_sender
                                     , c_password);
    var signed = mailBody;
    if((ctypes.uint32_t(0)<resultSize)){
      if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
        signed = result.readString();
      }
      this.freeString(result);
    }
    return {status: status, signed: signed};
  },


  encryptSignAttachment: function(pathToEncryptedFile, filepath, recipients, sender, sign, encrypt, callback){

    //init
    var status = 32; //unknown error
    //encrypt and/or sign
    if(sign || encrypt){
      Logger.dbg("Encrypt/Sign attachment: " + filepath);

      //variables
      var pass = {value : ""};
      if(sign){
        this.getSignPassword(sender, function(success, password){
          if(success){
            CWrapper.post("encryptSignAttachment", [pathToEncryptedFile, filepath, recipients, sender, sign, encrypt, password], callback);
          }
          else{
            callback(21, "");//ANG_NO_KEY_PRESENT
          }
        }.bind(this));
      }
      else{
        CWrapper.post("encryptSignAttachment", [pathToEncryptedFile, filepath, recipients, sender, sign, encrypt, ""], callback);
      }
    }
    else{
      //shall not happen
      Logger.error("encryptSignAttachment called without sign or encrypt set to true!");
      callback(status, "");//ANG_NO_KEY_PRESENT
      //status is already set to unknown error
    }
  },

//sychronous decryption without signature verification - should be fast as we do not contact server
  synchDecryptMail: function(mailBody){
    var ret = this.synchGetDataPassword(mailBody);
    if(ret.status == 0){
      var result = new ctypes.char.ptr;
      var resultSize = new ctypes.uint32_t;
      var c_mailBody= ctypes.uint8_t.array()(mailBody.length)
      for(var i = 0; i < mailBody.length; i++){
        c_mailBody[i] = mailBody.charCodeAt(i);
      }
      var status = this.c_decryptMail(result.address()
                                     , resultSize.address()
                                     , c_mailBody
                                     , ""
                                     , ret.password);
      Logger.dbg("Synch decrypting mail returned with status:" + status);
      var decrypted = "";
      if((ctypes.uint32_t(0) < resultSize)){
        if(status == 0 || status > this.getMaxErrNum()){ //ANG_OK
          decrypted = result.readString();
        }
        this.freeString(result);
      }
      return {status:status, decrypted: decrypted, password: ret.password};
    }
    return {status:ret.status, decrypted: "", password: ""};
  },

  decryptMail: function(mailBody, sender, aPassword, callback){
    if(aPassword.length < 1){
      this.getDataPassword(mailBody, function(status, password){
        if(status == 0){
          CWrapper.post("decryptMail", [mailBody, sender, password], function(status, decrypted){
            callback(status, decrypted);
          });
        }
        else{
          callback(status, "");
        }
      });
    }
    else{// we have a password already
      CWrapper.post("decryptMail", [mailBody, sender, aPassword], function(status, decrypted){
        callback(status, decrypted);
      });
    }
  },


  decryptAndSaveAttachment: function(data, filepath, sender){
    //variables
//     Logger.dbg(this.promptPassword(sender, ""));

//     var c_data = ctypes.char.array()(data.split(''));
    Logger.dbg("decrypt attachment data:" + data );
    var c_filepath = ctypes.char.array()(filepath);
    var c_sender = ctypes.char.array()(sender);
    Logger.dbg("decrypting attachment with size of data:" + data.length);
    var pass = {value : ""};
    this.getDataPassword(data, function(status, password){
      if(status == 0){
        var c_data = ctypes.uint8_t.array()(data.length)
        for(var i = 0; i< data.length;i++){
          c_data[i] = data.charCodeAt(i);
        }
        var c_password = ctypes.char.array()(password);
        Logger.dbg("password:"+ password);
        //query
        var status2 = CWrapper.c_decryptAndSaveAttachment(c_data, c_data.length, c_filepath, c_sender, c_password);
        if(status2 > CWrapper.getMaxErrNum()){
          //signature failed
          Dialogs.error(CWrapper.languagepack.getString(CWrapper.getErrorStr(status2)) +
                      ":\n\t" + filepath);
        }
        else if(status2 != 0){
          //error => tell user
          Dialogs.error(CWrapper.languagepack.getString("att_dec_failed") + " " + filepath +
                       "\n(" + CWrapper.languagepack.getString(CWrapper.getErrorStr(status2)) +
                       ")");
        }
        else{
          //debug output
          Logger.dbg("Attachment " + filepath + " decryption/signature ok or cancelled");
        }

      }
      else{
        Dialogs.error(CWrapper.languagepack.getString(CWrapper.getErrorStr(status)) + ":\n\t" + filepath);
      }
    });
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
