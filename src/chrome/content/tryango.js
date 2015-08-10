/* Basic file for main JavaScript code */

// Imports
Components.utils.import("resource:///modules/gloda/mimemsg.js"); //to view messages
Components.utils.import("resource://gre/modules/Services.jsm");  //load resource
Components.utils.import("resource://gre/modules/FileUtils.jsm"); //file operations
Components.utils.import("resource://gre/modules/AddonManager.jsm"); //uninstall

// own modules
// explanation for "resource://" see chrome.manifest
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/dialogs.jsm");
Components.utils.import("resource://tryango_modules/prefs.jsm");
Components.utils.import("resource://tryango_modules/pwmanager.jsm");
Components.utils.import("resource://tryango_modules/maillistener.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");
Components.utils.import("resource://tryango_modules/attachmentManager.jsm");
Components.utils.import("resource://tryango_modules/utils.jsm");

// (Singleton) Basic Tryango class
// "main" class for all Tryango functions
if (!Tryango){
  var Tryango = {};
  Tryango.isInit = false;
}

/*
 * Function to close/shutdown/clean-up
 */
Tryango.cleanup = function(event) {
  Logger.log("Tryango cleanup");
  CWrapper.closeLibrary();
  Logger.cleanup();
  this.isInit = false;
}

/*
 * "Constructor" for Tryango
 */
Tryango.init = function(){
  // initialisation function to set up extension module, called on "load" of Thunderbird
  // log
  var cmd = (Components.utils.import(
	  "resource://gre/modules/devtools/Console.jsm", {})).console;
  Logger.init(cmd);
  Logger.log("Main init");

  // load language
  this.languagepack = document.getElementById("lang_file");
  var lang = this.languagepack.getString("language");
  Logger.log("Language: " + lang);

  //init utils
  Utils.init(window);

  //init C interface
  try{
    CWrapper.initLibrary(this.languagepack);
  }catch(ex){
    //could not initialise C-lib => failsafe: disable Tryango
    Logger.error(ex);
    Dialogs.info(this.languagepack.getString("err_init_lib"));
    this.disable();
    return;
  }

  // load preference system
  Prefs.init(this.languagepack);
  Logger.log("Preferences initialised");

  //check offline status
  if(this.checkOfflineStatus()){
    Dialogs.info(this.languagepack.getString("warn_offline"));
  }

  //load password manager
  Pwmgr.init();
  Logger.log("Password manager initialised");
  CWrapper.post("importKeyPurse", [Prefs.getPref("keyPursePath"), true], function(status){
    if(status == 0){
      Utils.syncKeypurse();
      Logger.dbg("Keypurse loaded succesfully");
    }
    else{
      Logger.log("Keypurse does not exists or is invalid");
    }
  });
  //init attachmentManager
  this.gFolderDisplay = gFolderDisplay; //needed to get sender for attachments
  AttachmentManager.init(window, this.languagepack);

  //watch incoming mail for "X-Tryango" header and PGP mails
  var cmToolbar = document.getElementById("tryango-verification-toolbar");
  MailListener.init(gFolderDisplay, this.languagepack, cmToolbar);
  var notificationService = Components.classes[
	  "@mozilla.org/messenger/msgnotificationservice;1"]
	                          .getService(Components.interfaces.nsIMsgFolderNotificationService);
  notificationService.addListener(MailListener, notificationService.msgAdded);

  //events to hook: https://developer.mozilla.org/en-US/docs/Web/Events
  //watch incoming mails for encryption/signature
  var msgPane = document.getElementById("messagepane");
  msgPane.addEventListener(
    "pageshow", MailListener.onMsgDisplay.bind(MailListener, window), true);

  //after loading everything: check if this is the first start, if so, display setup wizard
  var firstStartup = Prefs.getPref("firstStartup");
  if(firstStartup){
    Logger.dbg("firstStartup");
    this.handleEvent("menu-signup");
    Prefs.setPref("firstStartup", false);
  }

  //set bool to indicate that init is done
  this.isInit = true;

}

// --- Functionality ---

/*
 * function to disable Tryango in case of really serious errors
 */
Tryango.disable = function(){
  //if C cannot be loaded => disable plugin (we cannot start!)
  Logger.log("Failsafe: Disabling Tryango");
  Prefs.tryangoDisabled = true;

  //disable the two tryango-buttons and two menues
  document.getElementById("button-cm").setAttribute("disabled", "true");
  document.getElementById("tryango-menu").setAttribute("hidden", "true");

  /* ATTENTION: getting the addon via AddonManager.getAddonByID and disabling it will
   * only get set upon next Thunderbird start, therefore useless => disable buttons instead
   */
}

/*
 * function to check offline status
 *  @return	boolean indicating status (true = offline, false = online)
 */
Components.utils.import("resource://gre/modules/Services.jsm");
Tryango.checkOfflineStatus = function(){
  return (Services.io.offline);
}

/*
 * function to be called when user clicks "menu-xxx" menu entry.
 *  @param  event     the event that happened to call this function
 */
Tryango.handleEvent = function(id){
  Logger.log("Menu => " + id);
  switch(id){
  case "menu-signup":
    //check offline status
    if(this.checkOfflineStatus()){
      Dialogs.info(this.languagepack.getString("warn_go_online"));
      return;
    }
    else{
      Logger.dbg("Thunderbird is in online mode");
    }
    // display the sign-up wizard, it's result is handled
    // by a callback function (see signup.xul / signup.js)
    Dialogs.signup(window);
    break;

  case "menu-settings":
    //display the settings window (see settings.xul)
    Dialogs.settings(window);
    break;

  case "menu-about":
    //displays the about window (see about.xul)
    Dialogs.about(window);
    break;

  case "menu-help":
    Dialogs.help(window);
    break;

  case "menu-reset":
    //warn user
    if(Logger.promptService.confirm(null, "Tryango", this.languagepack.getString("tryango_reset"))){
      this.reset();
    }
    else{
      //user abort
      Logger.dbg("user abort");
    }
    break;

  case "menu-import":
    Utils.importKeyPurse();
    break;

  case "menu-export":
    Utils.exportKeyPurse();
    break;

  case "button-cm-decrypt":
    //XXX: debug
    Logger.log("decrypt attachments");

    //get attachmentList
    var attachmentList = document.getElementById('attachmentList');
    if(!attachmentList){
      Logger.error("Could not get attachmentList!");
      break;
    }

    //get sender (for signature)
    var sender = "";
    var msgHdr = this.gFolderDisplay.selectedMessage;
    if(msgHdr != null){
      sender = msgHdr.author.substring(msgHdr.author.indexOf("<") + 1,
                                           msgHdr.author.indexOf(">"));
    }
    else{
      //else: error will result in signature to fail, decrypt should be possible anyway
      Logger.error("decrypt attachment: gFolderDisplay.selectedMessage is empty => no sender => signature verify will fail");
    }

    //store attachments
    AttachmentManager.decryptAndSave(attachmentList, sender);
    break;

  default:
      Logger.error("Unknown event: " + id);
  }
}

Tryango.reset = function(removeEverything = false){
  Logger.dbg("Reset");

  //remove devices and keys from server as well as locally
  //this also asks if the user wants to backup the keypurse
  Utils.removeAllDevicesAndRevokeKeys();
  //clear XHEADERS
  CWrapper.post("synchStub", [], function(){MailListener.removeAllTryangoXHEADERS();});
  //clear passwords
  CWrapper.post("synchStub", [], function(){Pwmgr.removeAllTryangoPWs();});

  if(removeEverything){
    //clear preferences
    CWrapper.post("synchStub", [], function(){Prefs.removeAllTryangoPrefs();
                                              //log
                                              Logger.dbg("reset(removeEverything) done");});

  }
  else{
    //only reset preferences (rest can stay)
    CWrapper.post("synchStub", [], function(){
      Prefs.reset();
      Prefs.init();
      Prefs.setPref("firstStartup", false);
      Logger.dbg("reset done");
    });
    //log
  }
  //ATTENTION: no Tryango.cleanup() here yet! we are still running!

  return;
}


/*
 * ------------- helper class (for uninstall) -------------
 */

//listener for removing the extension
//https://developer.mozilla.org/en-US/docs/Observer_Notifications#Application_shutdown
//http://xulsolutions.blogspot.co.uk/2006/07/creating-uninstall-script-for.html
var TryangoCleaner = {
  //variables
  isInit: false,
  uninstall: false,

  init: function(){
    //init
    AddonManager.addAddonListener(TryangoCleaner);
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(TryangoCleaner, "quit-application-granted", false);

    //save var
    this.isInit = true;

    //output
    Logger.dbg("TryangoCleaner installed");
  },

  //1. listen if extension is set to uninstall in "Addons" => save it
  onUninstalling: function(addon, needsRestart){
    if(addon.name == "Tryango" && addon.id == "tryango@cs.bham.ac.uk"){
      Logger.dbg("TryangoCleaner: uninstall set");
      this.uninstall = true;
    }
  },

  //1. listen if uninstall is cancelled again
  onOperationCancelled: function(addon){
    if(addon.name == "Tryango" && addon.id == "tryango@cs.bham.ac.uk"){
      Logger.dbg("TryangoCleaner: uninstall cancelled");
      this.uninstall = false;
    }
  },

  //interface
  //https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIObserver
  observe: function(subject, topic, data){
    Logger.dbg("TryangoCleaner: " + topic);

    //2. if we shutdown AND extension is set to uninstall => uninstall
    if(topic == "quit-application-granted"){
      Logger.dbg("TryangoCleaner: shutdown");
      if(this.uninstall){
        //remove the extension
        Logger.log("TryangoCleaner: uninstalling...");
        Tryango.reset(true); //removeEverything = true
      }

      //clean up
      Tryango.cleanup(null);

      //clean up observer
      AddonManager.removeAddonListener(TryangoCleaner);
      var observerService =
        Components.classes["@mozilla.org/observer-service;1"].
        getService(Components.interfaces.nsIObserverService);
      observerService.removeObserver(this,"quit-application-granted");
      //reset variable
      this.isInit = false;
    }
  }
}



/*
 * ------------- Eventlisteners -------------
 */

// setup the Eventlisteners
if(typeof window == 'undefined'){ // main window MUST (and should) always exist!
  throw "Tryango: main window does not exist!";
}
else{
  window.addEventListener(
    "load",
    function initload(event){
      //initialisation done => remove listener (avoid memory leak)
      window.removeEventListener("load", initload, false);

      // the outer function is needed in order to switch the context of "this"
      // without "function(event)" "this" would point to ChromeWindow instead
      // of Tryango
      if(!Tryango.isInit){
	/*
	 * First function to be called (~like "main")
	 */
        Tryango.init();
      }

      //initialise uninstall-listener
      if(!TryangoCleaner.isInit){
        TryangoCleaner.init();
      }
    },
    false);
}
