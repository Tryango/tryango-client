/* A simple logger to print to commandline and Thunderbird's Error Console */


//exports
var EXPORTED_SYMBOLS = ["Logger"]


// (Singleton) Logger class
var Logger = new function()
{
  // a basic logger class to display debug messages and errors

  // constants
  const prefix = "Tryango: ";
  
  //variables
  this.App = null;
  this.console = null;
  this.promptService = null;
  /*
   * function representing a "constructor"
   *	@param	console		a handle to window.console
   */
  this.init = function(console) {
    this.App = Components.classes["@mozilla.org/steel/application;1"]
      .getService(Components.interfaces.steelIApplication);
    this.promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Components.interfaces.nsIPromptService);
    this.console = console;
    this.log("Logger initialized");
  }

  this.cleanup = function(){
    //avoid memory leaks
    this.App = null;
    this.console = null;
    this.promptService = null;
  }
  //TO be made empty
  this.dbg = function(string){
    // create prefix for log output
    let s = new Error().stack.split("\n");
    if(s.length >= 2){
      s = s[1];
      s = s.substring(s.lastIndexOf("/")+1, s.length);
      s = prefix + s + "\t" + string;
    }
    else{
      s = prefix + "\t" + string;
    }
    
    // display a string in Linux Console and Thunderbird Error Console
    if(this.console != null){
      this.console.log(s); //log to Linux console
    }
    this.App.console.log(s); //log to "Error Console Ctrl+Shift+j" in Thunderbird
  }
  // functions
  /*
   * basic function to log a debug-string
   *	@param string string to be shown on commandline and Thunderbird's Error
   *	Console
   */
  this.log = function(string){
    // create prefix for log output
    var s = new Error().stack.split("\n");
    if(s.length >= 2){
      s = s[1];
      s = s.substring(s.lastIndexOf("/")+1, s.length);
      s = prefix + s + "\t" + string;
    }
    else{
      s = prefix + "\t" + string;
    }
    
    // display a string in Linux Console and Thunderbird Error Console
    if(this.console != null){
      this.console.log(s); //log to Linux console
    }
    this.App.console.log(s); //log to "Error Console Ctrl+Shift+j" in Thunderbird
  };
  
  /*
   * function to display stacktrace and an error- string in Linux Console and in
   * Thunderbird's Error Console
   *	@param	string		the error-string to display
   */
  this.error = function(string){
    // create prefix for log output
    string = prefix + string;
    
    // create stacktrace
    var err = new Error();
    string = err.stack + "\n" + string 
    
    // print error
    if(this.console != null){
      this.console.error(string);
    }
    Components.utils.reportError(string);
  };
  
  /*
   * function to display a debug-string JUST to the Linux console
   * (use this function for long outputs)
   *	@param	string		the debug-string to display
   */
  this.toCmdLine = function(string){
    // create prefix for log output
    s = new Error().stack.split("\n");
    if(s.length >= 2){
      s = s[1];
      s = s.substring(s.lastIndexOf("/")+1, s.length);
      s = prefix + s + "\t" + string;
    }
    else{
      s = prefix + "\t" + string;
    }
    
    // print
    if(this.console != null){
      this.console.log(string);
    }
  }
  
  /*
   * function opening Thunderbird's Error Console to the user
   */
  this.openErrorConsole = function(){
    // open "Error Console" in Thunderbird
    this.App.console.open();
  };

  /*
   * function to display a window to the user, informing about something
   */
  this.infoPopup = function(string){
    this.log("infoPopup: " + string);
    this.promptService.alert(null, "Tryango: Info", string);
  }
}
