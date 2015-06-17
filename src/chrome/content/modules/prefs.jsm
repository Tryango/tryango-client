/** A class to access the Thunderbird preferences */

// own imports
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm"); //for keypurse default location

//exports
var EXPORTED_SYMBOLS = ["Prefs"]


// Basic Class for accessing the Thunderbird preferences
var Prefs = new function()
{
  //variables
  var prefBranch = null;
  var tryangoDisabled = false;
  var languagepack = null;

  /**
   * Initialise the preference system
   */
  this.init = function(languagepack){
    this.languagepack = languagepack;

    try{
      //access preference system
      this.prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
                   .getService(Components.interfaces.nsIPrefService)
                   .getBranch("extensions.tryango.");
    }
    catch(e){
      Logger.error("Could not initialise preference system");
      Logger.error(e.toString());
    }

    //initialize machineID to the hostname
    if(!this.isPref("machineID")){
      hostName=CWrapper.getHostName();
      this.setPref("machineID", hostName);
    }
    //initialize keyPursePath to the file name of database with keys
    if(!this.isPref("keyPursePath")){
      var keyPurseFile = FileUtils.getFile("ProfD", ["key.purse"]); //profile directory e.g. ~/.thunderbird/00abcdef.tryangotest/key.purse
      this.setPref("keyPursePath", keyPurseFile.path);
    }

    if(!this.isPref("savePW")){
      this.setPref("savePW", true);
    }

    if(!CWrapper.setServer(this.getPref("server"), this.getPref("port"))){
      Logger.error("Could not initialize library");
    }
    else{
      Logger.dbg("Library initialised with server="+this.getPref("server")+" and port"+ this.getPref("port"));  
    }
  }

  this.getDefaultPref = function(prefName) {
    var prefValue=null;
    try {
      this.prefBranch.lockPref(prefName);
      prefValue = getPref(prefName);
      this.prefBranch.unlockPref(prefName);
    }
    catch (ex) {}
    return prefValue;
  }

  this.isPref = function(prefName){
    if (! this.prefBranch){
      this.init();
    }
    try{
      var prefType = this.prefBranch.getPrefType(prefName);
      switch(prefType){
        case this.prefBranch.PREF_BOOL:
        case this.prefBranch.PREF_INT:
        case this.prefBranch.PREF_STRING:
          return true;
        default:
          return false;
      }
    }
    catch(e){
      return false;
    }
  }
  
  /**
   * Get a preference from the storage
   *  @param String  prefName    the name of the variable to get
   */
  this.getPref = function(prefName){
    if (! this.prefBranch){
      this.init();
    }

    return this._getPref(prefName, this.prefBranch);
  }

  /**
   * Store a user preference.
   * @param String prefName    the name of the variable to set
   * @param  any     value     The value to be stored. Allowed types: Boolean OR Integer OR String.
   *
   * @return Boolean Was the value stored successfully?
   */
  this.setPref = function (prefName, value)
  {
    if (! this.prefBranch) {
      this.init();
    }

    return this._setPref(prefName, this.prefBranch, value);
  }

  /**
   * Remove all preferences of Tryango
   */
  this.removeAllTryangoPrefs = function(){
    Logger.dbg("Removing all prefs");

    //remove the whole tryango pref-branch starting from "" (=everything)
    this.prefBranch.deleteBranch("");
  }


  /**
   * Get a preference from the storage FOR NON-TRYANGO preferences!
   *  @param String  prefName          the name of the variable to get
   *  @param String  prefBranchString  the branch in which the variable is located (needs to be opened - see openPrefBranch(...) )
   */
  this.getPrefByString = function(prefName, prefBranchString){
    var p = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService)
      .getBranch(prefBranchString);

    return this._getPref(prefName, p);
  }

  /**
   * Get a preference from the storage FOR NON-TRYANGO preferences!
   *  @param String  prefName          the name of the variable to get
   *  @param String  prefBranchString  the branch in which the variable is located (needs to be opened - see openPrefBranch(...) )
   */
  this.setPrefByString = function(prefName, prefBranchString, value){
    var p = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService)
      .getBranch(prefBranchString);

    return this._setPref(prefName, p, value);
  }

  /**
   * Get a preference from the storage FOR NON-TRYANGO preferences!
   *  @param String         prefName    the name of the variable to get
   *  @param nsiPrefBranch  pb          the branch in which the variable is located (needs to be opened - see openPrefBranch(...) )
   */
  this._getPref = function(prefName, pb){
    var prefValue;
    //switch for type
    try{
      var prefType = pb.getPrefType(prefName);
      switch(prefType){
      case pb.PREF_BOOL:
        prefValue = pb.getBoolPref(prefName);
        break;
      case pb.PREF_INT:
        prefValue = pb.getIntPref(prefName);
        break;
      case pb.PREF_STRING:
        prefValue = pb.getCharPref(prefName);
        break;
      default:
	//Error
        Logger.error("Unknown preference type of \"" + prefName + "\" (" + prefType + ")");
        prefValue = undefined;
        return prefValue;
      }
    }
    catch(e){
      Logger.error("Unknown preference \"" + prefName + "\"");
      Logger.error(e.toString());
      prefValue = undefined;
    }

    return prefValue;
  }

  /**
   * Get a preference from the storage FOR NON-TRYANGO preferences!
   *  @param String         prefName    the name of the variable to get
   *  @param nsiPrefBranch  pb          the branch in which the variable is located (needs to be opened - see openPrefBranch(...) )
   */
  this._setPref = function(prefName, pb, value){
    // Discover the type of the preference, as stored in the user preferences.
    // If the preference identifier doesn't exist yet, it returns 0. In that
    // case the type depends on the argument "value".
    var prefType;
    prefType = pb.getPrefType(prefName);
    if (prefType === 0) {
      switch (typeof value) {
      case "boolean":
        prefType = pb.PREF_BOOL;
        break;
      case "number":
        prefType = pb.PREF_INT;
        break;
      case "string":
        prefType = pb.PREF_STRING;
        break;
      default:
        Logger.dbg("Wrong preference type of \"" + name );
        prefType = 0;
        break;
      }
    }
    var retVal = false;

    // Save the preference only and if only the type is bool, int or string.
    switch (prefType) {
    case pb.PREF_BOOL:
      pb.setBoolPref(prefName, value);
      retVal = true;
      break;

    case pb.PREF_INT:
      pb.setIntPref(prefName, value);
      retVal = true;
      break;

    case pb.PREF_STRING:
      pb.setCharPref(prefName, value);
      retVal = true;
      break;

    default:
      Logger.dbg("Could not set preference \"" + name );
      break;
    }

    //check if some special prefs were set that need to be told to C
    this._checkNotifyC(prefName, pb, value);

    return retVal;
  }

  this._checkNotifyC = function(prefName, pb, value){
    //check for update of server/port
    if(prefName == "server" || prefName == "port"){
      Logger.dbg("checkNotifyC: " + prefName);

      //update server/port
      var server = this.getPref("server");
      var port = this.getPref("port");
      result = CWrapper.setServer(server, port); //C will not update if server/port are the same
      //check errors
      if(!result){
        var errorStr = this.languagepack.getString("info_update_server_port");
        Logger.error(errorStr);
        Logger.infoPopup(errorStr);
      }
    }
    //fill else if's as needed
  }

  /* Locates string in TEXT occurring only at the beginning of a line
   */
  this.IndexOfArmorDelimiter = function(text, str, offset) {
    while (offset < text.length) {
      var loc = text.indexOf(str, offset);

      if ((loc < 1) || (text.charAt(loc-1) == "\n") || (text.charAt(loc-1) == "\r"))
        return loc;

      offset = loc + str.length;
    }

    return -1;
  }


  /* 
   * Locates offsets bracketing PGP armored block in text,
   * starting from given offset, and returns block type string.
   * beginIndex = offset of first character of block
   * endIndex = offset of last character of block (newline)
   * If block is not found, the null string is returned;
   */

  this.locateArmoredBlock = function (text, offset, indentStr, beginIndexObj, endIndexObj,
            indentStrObj) {

    beginIndexObj.value = -1;
    endIndexObj.value = -1;
    var beginIndex = this.IndexOfArmorDelimiter(text, indentStr+"-----BEGIN PGP ", offset);

    if (beginIndex == -1) {
      var blockStart=text.indexOf("-----BEGIN PGP ");
      if (blockStart>=0) {
        var indentStart=text.search(/\n?.*\-\-\-\-\-BEGIN PGP /)+1;
        indentStrObj.value=text.substring(indentStart, blockStart);
        indentStr=indentStrObj.value;
        beginIndex = this.IndexOfArmorDelimiter(text, indentStr+"-----BEGIN PGP ", offset);
      }
    }
    
    if (beginIndex < 0)
      return "";

    // Locate newline at end of armor header
    offset = text.indexOf("\n", beginIndex);
    
    if (offset == -1)
      return "";

    
    var endIndex = this.IndexOfArmorDelimiter(text, indentStr+"-----END PGP ", offset);
    if(endIndex < 0){
      //buggy: sometimes "...BEGIN PGP" is prefixed with a space but the rest of
      //the email is NOT! => try again without prefix
      endIndex = this.IndexOfArmorDelimiter(text, "-----END PGP ", offset);
    }
    
    if (endIndex < 0)
      return "";

    // Locate newline at end of PGP block
    endIndex = text.indexOf("\n", endIndex);

    if (endIndex == -1) {
      // No terminating newline
      endIndex = text.length - 1;
    }

    var blockHeader = text.substr(beginIndex, offset - beginIndex + 1);

    var blockRegex = new RegExp("^" + indentStr +
                                "-----BEGIN PGP (.*)-----\\s*\\r?\\n");

    var matches = blockHeader.match(blockRegex);

    var blockType = "";
    if (matches && (matches.length > 1)) {
        blockType = matches[1];
    }

    if (blockType == "UNVERIFIED MESSAGE") {
      // Skip any unverified message block
      return this.locateArmoredBlock(text, endIndex+1, indentStr,
                                     beginIndexObj, endIndexObj, indentStrObj);
    }

    beginIndexObj.value = beginIndex;
    endIndexObj.value = endIndex;

    return blockType;
  }
}

