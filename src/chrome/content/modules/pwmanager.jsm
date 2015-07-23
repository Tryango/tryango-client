/** A class to access the Thunderbird password manager */

// own imports
Components.utils.import("resource://tryango_modules/logger.jsm");

//exports
var EXPORTED_SYMBOLS = ["Pwmgr"]

// Basic Class for accessing the Thunderbird password manager
var Pwmgr = new function()
{
  /**
   * Initialise the password manager
   */
  this.init = function(){
    //initialize password manager to store ap etc.
    this.passwordManager = Components.classes["@mozilla.org/login-manager;1"].getService(
      Components.interfaces.nsILoginManager
    );
    this.nsLoginInfo = new Components.Constructor(
      "@mozilla.org/login-manager/loginInfo;1",
      Components.interfaces.nsILoginInfo,
      "init"
    );
  }

  this.storeEncValue = function(id, secret){
    //create field
    var data = new this.nsLoginInfo(
      "chrome://tryango",
      null,
      "tryango secure storage",
      id,
      secret,
      "",
      ""
    );

    //store in passwordmanager
    var oldValue = this.getEntry(id);
    if(oldValue == null){
      this.passwordManager.addLogin(data);
    }
    else{
      this.passwordManager.modifyLogin(oldValue, data);
    }
  }

  this.removeEncValue = function(id){
    //remove from passwordmanager
    var oldValue = this.getEntry(id);
    if(oldValue != null){
      this.passwordManager.removeLogin(oldValue);
    }
  }

  this.retrieveEncValue = function(id){
    var ret = this.getEntry(id);
    if(ret != null){
      return ret.password;
    }
    else{
      return "";
    }
  }

  //remove all values added by tryango
  this.removeAllTryangoPWs = function(){
    //log
    Logger.dbg("Pwmgr: removing all tryango logins");

    //search for all logins of tryango
    //https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsILoginManager#findLogins%28%29
    //   findLogins({}, Hostname, ActionURL, HttpRealm)
    var logins = this.passwordManager.findLogins(
      {}, "chrome://tryango", null, "tryango secure storage"
    );

    Logger.dbg("#logins: " + logins.length);

    //iterate over all found logins and remove them
    for(var i = 0; i < logins.length; i++){
      Logger.dbg("Removing password: " + logins[i].username);
      //remove password
      this.passwordManager.removeLogin(logins[i]);
    }
  }

  //helper function
  this.getEntry = function(id){
    //init
    var logins = this.passwordManager.findLogins({}
                             , "chrome://tryango"
                             , null
                             , "tryango secure storage");

    //search correct value
    for(var i = 0; i < logins.length; i++){
      if(logins[i].username == id){
	      return logins[i];
      }
    }
    return null;
  }

  this.getAp = function(identity){
    return this.retrieveEncValue("tryango-ap_" + identity);
  }

  this.setAp = function(identity, ap){
    if(ap!=""){
//       Logger.dbg("Storing ap for identity:" + identity + " ap:" + ap);
      this.storeEncValue("tryango-ap_" + identity, ap);
    }
    else{
//       Logger.dbg("Removing ap for identity:" + identity);
      this.storeEncValue("tryango-ap_" + identity, "*");
    }
  }

  this.getPass = function(keyId){
    return this.retrieveEncValue("tryango-keypass_" + keyId);
  }

  this.setPass = function(keyId, pass){
    this.storeEncValue("tryango-keypass_" + keyId, pass);
  }

  this.removePass = function(keyId){
    this.removeEncValue("tryango-keypass_" + keyId);
  }

}

