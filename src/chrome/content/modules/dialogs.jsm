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
  Logger.dbg("sinup dialog = " + this.signupOpen);
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
  Logger.dbg("sinup dialog after close = " + this.signupOpen);
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

