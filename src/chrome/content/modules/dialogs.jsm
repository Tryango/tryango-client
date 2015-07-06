Components.utils.import("resource://tryango_modules/logger.jsm");

var EXPORTED_SYMBOLS = ["Dialogs"]

if (! Dialogs){
  var Dialogs = {signupOpen:false
                , settingsOpen:false
                , aboutOpen:false
                , helpOpen:false
                };
}

Dialogs.signup = function(window){
  Logger.dbg("signup dialog = " + this.signupOpen);
  if(this.settingsOpen){
    this.settingsDialog.close();
    this.settingsOpen = false;
  }
  if(this.signupOpen){
    this.signupDialog.focus();
  }
  else{
    this.signupDialog = window.open("chrome://tryango/content/dialogs/signup.xul",
		                               "", "chrome,centerscreen,resizable");
    this.signupOpen = true;
    Logger.dbg("signup open dialog after = " + this.signupDialog);

  }
}

Dialogs.signupEnd = function(window){
  this.signupOpen = false;
  Logger.dbg("signup dialog after close = " + this.signupOpen);
  return true;
}

Dialogs.settings = function(window){
  if(this.signupOpen){
    this.signupDialog.close();
    this.signupOpen = false;
  }
  if(this.settingsOpen){
    this.settingsDialog.focus();
  }
  else{
    this.settingsDialog = window.open("chrome://tryango/content/dialogs/settings.xul",
		                                  "", "chrome,centerscreen,resizable");
    this.settingsOpen = true;
  }
}

Dialogs.settingsEnd = function(){
  Logger.dbg("settings end");
  this.settingsOpen = false;
  return true;
}

Dialogs.about = function(window){
  if(this.aboutOpen){
    this.aboutDialog.focus();
  }
  else{
    this.aboutDialog = window.open("chrome://tryango/content/dialogs/about.xul",
		                              "", "chrome,centerscreen,resizable");
    this.aboutOpen = true;
  }
}

Dialogs.aboutEnd = function(window){
  this.aboutOpen = false;
  Logger.dbg("Help end");
  return true;
}

Dialogs.help = function(window){
  if(this.helpOpen){
    this.helpDialog.focus();
  }
  else{
    this.helpDialog = window.open("chrome://tryango/content/dialogs/help.xul",
		                              "", "chrome,centerscreen,resizable");
    this.helpOpen = true;
  }
}

Dialogs.helpEnd = function(window){
  this.helpOpen = false;
    Logger.dbg("Help end");
  return true;
}

Dialogs.info = function(message){
  let mediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
                  .getService(Components.interfaces.nsIWindowMediator);
  var window = mediator.getMostRecentWindow("mail:3pane");//getOuterWindowWithId("messengerWindow")
  Logger.log(window);
  if(window){
    let doc = window.document;
    let box = doc.getElementById("mail-notification-box");
//     Buttons :
//     The buttons argument is an array of button descriptions. Each description is an object with the following properties:
//
//     accessKey - the accesskey to appear on the button
//     callback - function to be called when the button is activated. This function is passed two arguments:
//         the <notification> the button is associated with
//         the button description as passed to appendNotification.
//     label - the label to appear on the button
//     popup - the id of a popup for the button. If null, the button is a button popup.
    let buttons = [];
//   var buttons = [{
//     label: 'Button',
//     accessKey: 'B',
//     popup: 'blockedPopupOptions',
//     callback: null
//   }];
    let priority = box.PRIORITY_INFO_MEDIUM;
//     Priority Levels :
//
//     PRIORITY_INFO_LOW
//     PRIORITY_INFO_MEDIUM
//     PRIORITY_INFO_HIGH
//     PRIORITY_WARNING_LOW
//     PRIORITY_WARNING_MEDIUM
//     PRIORITY_WARNING_HIGH
//     PRIORITY_CRITICAL_LOW
//     PRIORITY_CRITICAL_MEDIUM
//     PRIORITY_CRITICAL_HIGH
//     PRIORITY_CRITICAL_BLOCK
	//TODO: this spams the box and only old messages are shown => maybe prepend not append?
    box.appendNotification(message, 'tryango-notify',
                           'chrome://tryango/skin/cm_logo.png',
                           priority, buttons);

  }
  else{
    Logger.error("Could not get the main window.");
    Logger.infoPopup(message);
  }
}
