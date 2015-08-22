Components.utils.import("resource://tryango_modules/prefs.jsm");
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/dialogs.jsm");

//exports (so that the preference system can be reused for sign-up)
var EXPORTED_SYMBOLS = ["displayPrefs", "prefOnLoad", "prefOnAccept"];


function displayPrefs(showDefault, showPrefs, setPrefs) {

  var obj = new Object;
  if (! Prefs.prefBranch) {
    Prefs.init();
  }

  var prefList = Prefs.prefBranch.getChildList("",obj);

  for (var prefItem in prefList) {
    var prefName=prefList[prefItem];
    var prefElement = document.getElementById("ang_"+prefName);

    if (prefElement) {
      var prefType = Prefs.prefBranch.getPrefType(prefName);
      var prefValue;
      if (showDefault) {
        prefValue = Prefs.getDefaultPref(prefName);
      }
      else {
        prefValue = Prefs.getPref(prefName);
      }

      switch (prefType) {
      case Prefs.prefBranch.PREF_BOOL:
        if (showPrefs) {
          if (prefValue) {
            prefElement.setAttribute("checked", "true");
          }
          else {
            prefElement.removeAttribute("checked");
          }
        }
        if (setPrefs) {
          if (prefElement.checked) {
            Prefs.setPref(prefName, true);
          }
          else {
            Prefs.setPref(prefName, false);
          }
        }

        break;

      case Prefs.prefBranch.PREF_INT:
        if (showPrefs) {
          prefElement.value = prefValue;
        }
        if (setPrefs) {
          try {
            Prefs.setPref(prefName, 0+prefElement.value);
          }
          catch (ex) {}
        }
        break;

      case Prefs.prefBranch.PREF_STRING:
        if (showPrefs) {
          prefElement.value = prefValue;
        }
        if (setPrefs) {
          Prefs.setPref(prefName, prefElement.value);
        }
        break;
      default:
        //Error
        Logger.dbg("Preference \""+ prefName + "\" has no type?");
      }
    }
  }
}

function prefOnLoad()
{
  //check if tryango is disabled, if so, stop
  if(Prefs.tryangoDisabled){
    Logger.dbg("Preferences loaded but Tryango is disabled!");
    Dialogs.info(document.getElementById("lang_file").getString("err_init_lib"));
    window.close();
    return;
  }

//   //cut token out of machineID before displaying machineID
//   var origMachineID = Prefs.getPref("machineID");
//   if(origMachineID.match(/^\S+_[0-9a-f]{32}$/) != null){
//     Prefs.setPref("machineID", origMachineID.substring(0, origMachineID.length-33));
//   }

  //display
  Logger.dbg("settings.js: prefOnLoad: loading preferences");
  displayPrefs(false, true, false);
  advancedClicked(document.getElementById("ang_advancedOptions"));

//   //restore machineID
//   Prefs.setPref("machineID", origMachineID);
}

function prefOnAccept()
{
  //handle updates of machineID
  //get original machineID
  var origMachineID = Prefs.getPref("machineID");
//   //extract ID/token of orig machineID
//   var ID = "";
//   var token = "";
//   //machineID has the format "<ID>_<token>"
//   if(origMachineID.match(/^\S+_[0-9a-f]{32}$/) != null){
//     ID = origMachineID.substring(0, origMachineID.length-33);
//     token = origMachineID.substring(origMachineID.length-33, origMachineID.length);
//
//     //only display ID until the end of this method
//     Prefs.setPref("machineID", ID);
//   }
//   else{
//     Logger.error("machineID destroyed");
//     //TODO: what to do here? => for now ignore error (if server reset of machineID is implemented below, we could reset the machineID here to getHostName(); setPref; token = generateToken)
//     ID = origMachineID;
//     token = "";
//   }

  //accept Prefs
  displayPrefs(false, false, true);

  //check if machineID changed
  var new_ID = Prefs.getPref("machineID");
  Logger.dbg("machineID :"+ new_ID);
  //make sure it is not empty
  if(!new_ID || new_ID.length == 0){
    Logger.dbg("machineID empty!");
    if(origMachineID.length != 0){
      new_ID = origMachineID;
      Logger.dbg("old machineID not empty!" + new_ID);
    }
    else{
      new_ID = Prefs.generateMachineID()
      Logger.dbg("machineID generated!" + new_ID);
    }
  }
  new_ID = new_ID.replace(/\s/g, ""); //remove whitespace from machineID
  Prefs.setPref("machineID", new_ID);
  document.getElementById("ang_machineID").value = new_ID;
  if(origMachineID != new_ID){
    Logger.dbg("machineID changed!");
    //TODO - implement id change on the server
    var addresses = Utils.getEmailAddresses();
    for each(var email in addresses){
      var ap = Pwmgr.getAp(email);
      if(ap != undefined && ap.length > 1){
        CWrapper.post("changeDevice", [email, origMachineID, new_ID], function(newHexAp2, status, identity, newDevice){
          if(status == 0 && newHexAp2 && newHexAp2.length > 2){
            Pwmgr.setAp(identity, newHexAp2);
          }
          else{
          }
          if(status != 0){//TODO - make better message
            Dialogs.error(document.getElementById("lang_file").getString("change_device_failed")+ " - " + email);
          }
        });
      }
    }

    //for now warn user
//     Dialogs.info(document.getElementById("lang_file").getString("warn_change_machineID"));
  }
//   else{
//     //reset machineID
//     Prefs.setPref("machineID", origMachineID);
//   }

  return true;
}

function advancedClicked(obj){
  activateDependent(obj, 'ang_port ang_server ang_machineID');
}

function activateDependent (obj, dependentIds) {
  var idList = dependentIds.split(/ /);
  var depId;

  for (depId in idList) {
    if (obj.checked) {
      document.getElementById(idList[depId]).removeAttribute("disabled");
    }
    else {
      document.getElementById(idList[depId]).setAttribute("disabled", "true");
    }
  }
  return true;
}
