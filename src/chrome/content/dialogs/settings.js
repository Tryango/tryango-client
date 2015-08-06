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

      //if advancedOptions is true => set readonly fields to writable
//       if(Prefs.getPref("advancedOptions")){
//     //check own attribute "advOption"
//         if(prefElement.getAttribute("advOption")){
//           prefElement.removeAttribute("readonly");
//         }
//       }
//       else{
//         if(prefElement.getAttribute("advOption")){
//           prefElement.setAttribute("readonly", "true");
//         }
//       }

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

  Logger.dbg("settings.js: prefOnLoad: loading preferences");
  displayPrefs(false, true, false);
  advancedClicked(document.getElementById("ang_advancedOptions"));
}

function prefOnAccept()
{
  //handle updates of machineID, those have to be sent to server
  //get "old" machineID
  var mID = Prefs.getPref("machineID")
  displayPrefs(false, false, true);
  //check if machineID changed
  if(mID != Prefs.getPref("machineID")){
    Logger.dbg("machineID changed!");
    //TODO: (machineID) maybe allow in the future to change machineID
  }
  return true;
}

function advancedClicked(obj){
  activateDependent(obj, 'ang_port ang_server');
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
