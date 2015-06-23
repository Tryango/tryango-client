//own modules
Components.utils.import("resource://tryango_modules/pwmanager.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");
Components.utils.import("resource://tryango_modules/prefs.jsm")
Components.utils.import("resource://tryango_modules/logger.jsm");

//standard modules
Components.utils.import("resource:///modules/iteratorUtils.jsm"); //for fixIterator
Components.utils.import("resource://gre/modules/FileUtils.jsm"); //file operations
Components.utils.import("resource://gre/modules/NetUtil.jsm"); //reading file asynchonously

//exports
var EXPORTED_SYMBOLS = ["Utils"]; //only export Utils, not the rest


var Utils = new function()
{
  this.exportKeyPurse = function(window, languagepack){
    if(!(new FileUtils.File(Prefs.getPref("keyPursePath"))).exists()){
      //no keypurse => no export (this should never happen and be avoided by the
	  //function calling exportKeyPurse)
      Logger.infoPopup(languagepack.getString("exp_keypurse_fail"));
      return false;
    }

    //pick file to save to
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
      Components.interfaces.nsIFilePicker);
    //filters:
    fp.appendFilter("Keypurses", "*.purse"); //only key purses
    fp.appendFilter("All files", "*");
    fp.init(window, languagepack.getString("sel_keypurse_bak"),
            Components.interfaces.nsIFilePicker.modeSave);

    //check result
    var date = (new Date()).toISOString();
    date = date.substring(0, date.indexOf("T"));
    fp.defaultString = "tryango_" + date + "_key.purse";
    var res = fp.show();
    if(res != Components.interfaces.nsIFilePicker.returnCancel){
      //backup keypurse to selected location
      if(!CWrapper.exportKeyPurse(fp.file.path, "")){ //TODO: password?
        //error
        Logger.error("exportKeyPurse failed");
        Logger.infoPopup(languagepack.getString("bak_keypurese_fail"));
		return false;
      }
      //else: everything ok

	  //backup done
	  return true;
    }else{
	  //cancel
	  return false;
	}
  }

  this.removeAllDevicesAndRevokeKeys = function(window, languagepack){
    //function is called when plugin is deinstalled or user presses "reset"
    //a lot of pop-ups are ok, we have to make sure the user is aware what he/she
    //is doing
	var ret;

    //(local) remove keypurse (if it exists) => backup first
    if(Prefs.getPref("keyPursePath") !=  undefined &&
       (new FileUtils.File(Prefs.getPref("keyPursePath"))).exists()){

      //log
      Logger.dbg("keypurse exists => remove it");

      //BACKUP: export keypurse if user wants to
	  //all three buttons: yes/cancel/no buttons
	  //ATTENTION: cancel button has to be "button 1" since closing the window with
	  //           the close button in the titlebar always returns 1
	  var buttonFlags = (Components.interfaces.nsIPromptService.BUTTON_POS_0) *
		  (Components.interfaces.nsIPromptService.BUTTON_TITLE_YES) +
		  (Components.interfaces.nsIPromptService.BUTTON_POS_1) *
		  (Components.interfaces.nsIPromptService.BUTTON_TITLE_CANCEL) + //cancel needs to be 1!!!
		  (Components.interfaces.nsIPromptService.BUTTON_POS_2) *
		  (Components.interfaces.nsIPromptService.BUTTON_TITLE_NO);
	  var buttonResult = Logger.promptService.confirmEx(
		null, "Tryango", languagepack.getString("exp_keypurse"),
		buttonFlags,
		null, null, null, //button labels set above already
		null, new Object() //no checkbox
	  );
	  //0 = YES
      if(buttonResult == 0){
		Logger.dbg("Backup prompt: YES");

        Logger.dbg("Export keypurse");
        if(this.exportKeyPurse(window, languagepack)){
		  Logger.dbg("exportKeyPurse done");

		  //backup ok
		  ret = true;
		}else{
		  Logger.dbg("User abort exportKeyPurse");

		  //backup user cancelled or error
		  return false;
		}
      }
	  //1 = CANCEL
	  else if(buttonResult == 1){
		Logger.dbg("Backup prompt: CANCEL");

		//continue = false
		return false;
	  }
	  //2 = NO
	  else if(buttonResult == 2){
		Logger.dbg("Backup prompt: NO");

		//continue = true
		ret = true;
	  }else{
		//error => just warn and abort
		Logger.error("Backup keypurse prompt returned unexpected result: " + buttonResult);
		//continue = false
		return false;
	  }

      //remove keypurse
      Logger.dbg("removing keypurse...");
      if(!CWrapper.removeKeyPurse(Prefs.getPref("keyPursePath"))){
        Logger.error("Could not remove keypurse: " +
                     Prefs.getPref("keyPursePath"));
        Logger.infoPopup(languagepack.getString("rm_keypurse_fail"));
      }
    }else{
	  //no keypurse => everything good
	  ret = true;
	}

    //clear data on tryango server
    //(server) remove devices (will revoke keys if no device is signed up for it any more)
    var addresses = this.getEmailAddresses();
    var machineID = Prefs.getPref("machineID");
    if(machineID){
      for each(let identity in addresses){
        //check if identity/machineID is signed up
        var ap = Pwmgr.getAp(identity);
        if(ap != undefined && ap.length > 1){
          //remove identity/machineID if it is signed up
          Logger.dbg("Removing device " + identity + " " + machineID);
          removeDevices(identity, [machineID], languagepack, true); //doNotPrompt = true
        }
      }
    }

    return ret;
  }

  this.syncKeypurse = function(languagepack){
    var addresses = this.getEmailAddresses();
    var machineID = Prefs.getPref("machineID");
    if(machineID){
      for each(let identity in addresses){
        //check if identity/machineID is signed up
        var ap = Pwmgr.getAp(identity);
        if(ap != undefined && ap.length > 1){
          let status = CWrapper.synchronizeSK(identity);
          if(status != 0){
            Logger.error(languagepack.getString("no_corresponding_key") +": " + identity);
          }
          else{
            Logger.dbg("Keypurse synchronised successfully for id "+ identity);
          }
        }
      }
    }
  }

  this.getEmailAddresses = function(){
    // get all email addresses and check them for tryango (otherwise not possible,
    // we cannot store all tryango-email-addresses on this device since they
    // could come from another device)
    var addresses = [];
    var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = acctMgr.accounts;

    //iterate over accounts
    for each (let account in fixIterator(accounts,
                                         Components.interfaces.nsIMsgAccount)) {
      //get pretty names as "mail for foo@test.com" or "news on news.mozilla.org"
      var mailaddrs = account.incomingServer.constructedPrettyName;
      //filter for the ones which are mails
      if(mailaddrs.substring(0, 4) == "Mail" || mailaddrs.substring(0, 4) == "mail"){
        //cut "mail for " and save address
        mailaddrs = mailaddrs.substring(9, mailaddrs.length);
        addresses.push(mailaddrs);
      }
    }

    return addresses;
  }

  this.treeAppendRow = function (tree, keyRow, document, isOpen, lang){
    //REMARK: setting css text-wrap/word-break/overflow/etc. does not work
    //        for treecell.label! Apparently those cannot line-break!

    //set open
    var item = document.createElement("treeitem");
    item.setAttribute("container", "true");
    if(isOpen){
      item.setAttribute("open", "true");
    }

    //add sign key
    //primary column
    var row = document.createElement("treerow");
    var cell = document.createElement("treecell");
    cell.setAttribute("label", "Sign key");
    row.appendChild(cell);

    //email addresses
    cell = document.createElement("treecell");
    cell.setAttribute("label", keyRow.userIds);
    row.appendChild(cell);

    //creation date
    cell = document.createElement("treecell");
    var date = new Date(keyRow.signCreate);
    cell.setAttribute("label", date.toDateString());
    row.appendChild(cell);

    //expiry date
    cell = document.createElement("treecell");
    if(keyRow.signExpire == 0){
      cell.setAttribute("label", lang.getString("never"));
      cell.setAttribute("properties", "greenCell");
    }
    else{
      var expire = new Date(keyRow.signExpire);
      cell.setAttribute("label", expire.toDateString());
      //expired dates red
      if(expire.getTime() < Date.now()){
        cell.setAttribute("properties", "redCell");
      }else{
        cell.setAttribute("properties", "greenCell");
      }
    }
    row.appendChild(cell);

    //fingerprint
    cell = document.createElement("treecell");
    cell.setAttribute("label", keyRow.signId);
    row.appendChild(cell);

    //encrypted/plain text
    cell = document.createElement("treecell");
    cell.setAttribute("label", lang.getString(keyRow.signEncrypted));
    row.appendChild(cell);

    item.appendChild(row);

    //add encryption key
    /* Sign key
     *  |
     *  +----Encryption key
     */
    var subtree = document.createElement("treechildren");
    var subitem = document.createElement("treeitem");

    row = document.createElement("treerow");

    cell = document.createElement("treecell");
    cell.setAttribute("label", "Encryption key");
    row.appendChild(cell);

    cell = document.createElement("treecell");
    cell.setAttribute("label", "");
    row.appendChild(cell);

    cell = document.createElement("treecell");
    date = new Date(keyRow.encrCreate);
    cell.setAttribute("label", date.toDateString());
    row.appendChild(cell);

    cell = document.createElement("treecell");
    if(keyRow.encrExpire == 0){
      cell.setAttribute("label", lang.getString("never"));
      cell.setAttribute("properties", "greenCell");
    }
    else{
      var expire = new Date(keyRow.encrExpire);
      cell.setAttribute("label", expire.toDateString());
      //expired dates red
      if(expire.getTime() < Date.now()){
        cell.setAttribute("properties", "redCell");
      }else{
        cell.setAttribute("properties", "greenCell");
      }
    }
    row.appendChild(cell);

    cell = document.createElement("treecell");
    cell.setAttribute("label", keyRow.encrId);
    row.appendChild(cell);

    cell = document.createElement("treecell");
    cell.setAttribute("label", lang.getString(keyRow.encrEncrypted));
    row.appendChild(cell);

    subitem.appendChild(row);
    subtree.appendChild(subitem);
    item.appendChild(subtree);
    tree.appendChild(item);
  }

}//end of "Utils"




//function to initialise the info tabs
function infoOnLoad(){
  document.getElementById("tree_devices").view = devicesView;
  //check if tryango is disabled, if so, stop
  if(Prefs.tryangoDisabled){
    //no output, already done in settings.js
    return;
  }

  // load language
  var languagepack = document.getElementById("lang_file");

  //fill status
  fillStatus(languagepack);

  //fill random checking if advancedOptions is set
  fillAudit(languagepack);

  //fill keys from keypurse
  fillKeys(languagepack);

  //fill devices (might return an error => do it last)
  fillDevices(languagepack);
}

//helper functions
function fillStatus(languagepack){
  var tex_st = document.getElementById("tex_status");
  var str = "";
  var server = Prefs.getPref("server")
  var port = Prefs.getPref("port");
  if(server && port){
    str += new Date().toISOString() + "\n\n";
    str += "Server: " + CWrapper.getServer() + "\tPort: " + CWrapper.getPort() + "\n";

    //call C - server status etc.
    var serverinfo = CWrapper.getServerInfo();
    //get status from returned string (first element before space)
    var st = serverinfo.split(" ");
    str += languagepack.getString("info_connection") + " ";
    if(st[0] == 0){
      str += languagepack.getString("info_connected") + "\n\n";
    }
    else{
      str += languagepack.getString(CWrapper.getErrorStr(parseInt(st[0])));
      str += " (" + languagepack.getString("info_error") + " " + st[0] + ")\n\n";
    }
    st.shift(); //remove first element (status)...
    st = st.join();
    if(st == ""){
      str += languagepack.getString("info_unavailable") + "\n";
    }
    else{
      str += languagepack.getString("info_serverinfo") + "\n" + st; //...and display rest
    }
  }
  else{
    str = languagepack.getString("info_no_server_port");
  }
  tex_st.value = str;
  tex_st.readOnly = true;
}

function fillAudit(languagepack){
  var tab = document.getElementById("tab_randomcheck");
  if(Prefs.getPref("advancedOptions")){
    //show random checking / proofs
    tab.hidden = false;

    //read file
    //https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
    var logfileName = Prefs.getPref("logfileName");
    var file = FileUtils.getFile("ProfD", [logfileName]); //profile directory e.g. ~/.thunderbird/00abcdef.tryangotest/proofs.log

    //set label
    document.getElementById("logfilePath").value = file.path;

    //get content of file
    NetUtil.asyncFetch(file, function(inputStream, status) {
      trc = document.getElementById("tex_randomcheck");
      if (!Components.isSuccessCode(status)) {
        //error
        trc.value = languagepack.getString("info_file_error") + " " + file.path;
        trc.readOnly = true;
        return; //quit before other things below
      }
      else{
        trc.value = languagepack.getString("info_log") + " " +
          NetUtil.readInputStreamToString(inputStream, inputStream.available());
        trc.readOnly = true;
      }
    });
  }
  else{
    tab.hidden = true;
  }
}

var treeView = {
    rowCount : 10000,
    getCellText : function(row, column){
      if (column.id == "namecol") return "Row "+row;
      else return "February 18";
    },
    setTree: function(treebox){ this.treebox = treebox; },
    isContainer: function(row){ return false; },
    isSeparator: function(row){ return false; },
    isSorted: function(){ return false; },
    getLevel: function(row){ return 0; },
    getImageSrc: function(row,col){ return null; },
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){}
};


var devicesView = {
  rows : ["no devices"],
  isopen : [true],
  closedNo : [0],
  parent : [0],
  emails : {},
  rowCount : 1,
  rowRealCount : 1,
  treeBox: null,
  rowTranslate: function(row){
    return row - this.closedNo[row];
  },

  getCellText : function(row, column){
    row = this.rowTranslate(row);
    if(row >= this.rowRealCount){
      return "";
    }
    else
    {
      return this.rows[row];
    }
  },
  getLevel: function(row){
    if(this.parent[this.rowTranslate(row)] == -1) return 0;
    return 1;
  },

  setTree: function(treeBox){ this.treeBox = treeBox; },

  isContainer: function(row){
    return this.parent[this.rowTranslate(row)] == -1;
  },

  isContainerEmpty: function(row){
    row = this.rowTranslate(row);
    if(row == this.rowRealCount - 1) return true;
    return (this.parent[row] == this.parent[row+1]);
  },
  isContainerOpen: function(row){
    row = this.rowTranslate(row);
    return this.isopen[row];
  },

  hasNextSibling: function(row){
    row = this.rowTranslate(row);
    if(row == this.rowRealCount - 1) return false;
    if(this.parent[row] > -1) return this.parent[row] == this.parent[row+1];
    return false; //no siblings for top level
    },

  getParentIndex: function(row){
    row = this.rowTranslate(row);
    return this.parent[row];
  },

  toggleOpenState: function(row){
    var realRow = this.rowTranslate(row);
    var rowNo = 1;
    if(this.emails[this.rows[realRow]] > 0){
      rowNo = this.emails[this.rows[realRow]];
    }
    if(this.isopen[realRow]){
      rowNo = 0 - rowNo;
      var i = row + 1;
      while(i < this.rowCount + rowNo){
        this.closedNo[i] = this.closedNo[i - rowNo] + rowNo;
        i++;
      }
    }
    else{
      var i = this.rowCount + rowNo - 1;
      while(i > row + rowNo){
        this.closedNo[i] = this.closedNo[Math.max(i - rowNo, row)] + rowNo;
        i--;
      }
      for(var j = row + 1; j < row + 1 + rowNo; j++){
        this.closedNo[j] = this.closedNo[row];
      }
    }
//error here
    this.rowCount = this.rowCount + rowNo;
    this.treeBox.rowCountChanged(row + 1, rowNo);
    this.isopen[realRow] = !this.isopen[realRow];
    this.treeBox.invalidateRow(row);
  },

  incI: function(text, lastParent, i){
    this.rows[i] = text;
    this.parent[i] = lastParent;
    this.closedNo[i] = 0;
    return i+1;
  },
  isSeparator: function(row){ return false; },
  isSorted: function(){ return false; },
  getImageSrc: function(row,col){ return null; },
  getRowProperties: function(row,props){},
  getCellProperties: function(row,col,props){},
  getColumnProperties: function(colid,col,props){},
  cycleCell: function(idx, column) {},
  cycleHeader: function(col, elem) {}
};


function fillDevices(languagepack){
  //fill devices
  Utils.syncKeypurse(languagepack);
  //set date for last update
  Logger.dbg("filling devices");
  document.getElementById("tree_devices_updated").value = new Date().toISOString();

  var addresses = Utils.getEmailAddresses();

  //get actual device
  var device = Prefs.getPref("machineID");
  devicesView.emails = {};
  devicesView.levels = [];
  devicesView.rows = [];
  var i = 0;
  var lastParent = 0;
  for each(let identity in addresses){
    devicesView.emails[identity] = 0;
    devicesView.isopen[i] = true;
    lastParent = i;
    i = devicesView.incI(identity, -1, i);
    if(device){
      var ap = Pwmgr.getAp(identity);
      if(ap != undefined && ap.length > 1){
        try{
          var ret = CWrapper.getDevices(identity, device);
        }
        catch(err){
          //this exception might happen if the server is not available or device is not signed up with tryango
          //for getDevices this is not a critical error => catch it
          Logger.error("CWrapper exception (" + identity + "," + device + "):\n" +
                       err + "\n\nreturn: " + ret);

          var errMsg = languagepack.getString("info_unavailable");
          i = devicesView.incI(errMsg, lastParent, i);
          continue;
        }

        if(ret.length > 0){
          devicesView.emails[identity] = ret.length;
          for each(let device in ret){
            i = devicesView.incI(device, lastParent, i);
          }
        }
        else{
          i = devicesView.incI(languagepack.getString("info_empty_return"), lastParent, i);
	        Logger.dbg("Account " + identity + " not with tryango (getDevices(...) empty)");
        }
      }
      else{
        i = devicesView.incI(languagepack.getString("not_signedup"), lastParent, i);
	      Logger.dbg("Account " + identity + " no ap");
      }
    }
    else{
      i = devicesView.incI(languagepack.getString("no_device"), lastParent, i);
	    Logger.dbg("Account " + identity + " no device");
    }
  }

  if(i == 0){
    devicesView.rows[0] = languagepack.getString("info_empty_return");
    i = i + 1;
  }
  devicesView.rowCount = i;
  devicesView.rowRealCount = i;
  Logger.dbg("Row count:" + devicesView.rowCount);
  document.getElementById("tree_devices").view = devicesView;
}

function fillKeys(languagepack){
  //set date for last update
  document.getElementById("tree_keys_updated").value = new Date().toISOString();

  //get tree
  var tree = document.getElementById("tree_keys_content");
  //clear tree
  //ATTENTION: the tree is altered while iterating over it, thus "normal" iterators break!
  while(tree.childNodes.length != 0){
    tree.removeChild(tree.childNodes[0]);
  }

  //get addresses
  var addresses = Utils.getEmailAddresses();

  //check all identities
  for each(let identity in addresses){
    var keys = CWrapper.getInfoKeys(identity, true);
    if(keys == null || keys.length <= 0){
      //just a warning, might be correct if there is no keypurse etc.
      Logger.log("Error: Keypurse for " + identity + " is empty/length <= 0: " + keys);

      //leave identity/key-row empty
    }
    else{
      Logger.dbg("Keypurse (" + identity + "): " + keys);
      var item = document.createElement("treeitem");
      item.setAttribute("container", "true");
      item.setAttribute("open", "true");
      var row = document.createElement("treerow");
      var cell = document.createElement("treecell");
      cell.setAttribute("label", identity);
      row.appendChild(cell);
      item.appendChild(row);

      //add keys as sub-tree (= children)
      var subtree = document.createElement("treechildren");
      for each(let key in keys){
        Utils.treeAppendRow(subtree, key, document, false, languagepack);
      }
      item.appendChild(subtree);
      tree.appendChild(item);
    }
  }
}


/*TODO: not used?
function treeAppend(tree, id, string, container, op=false){
  //create item
  var item = document.createElement("treeitem");
  item.setAttribute("container", container);
  if(container){
    item.setAttribute("open", op);
  }
  //create row and cell
  var row = document.createElement("treerow");
  var cell = document.createElement("treecell");
  cell.setAttribute("id", id);
  cell.setAttribute("label", string);
  //append everything to tree
  row.appendChild(cell);
  item.appendChild(row);
  tree.appendChild(item);

  return item;
}
*/

function removeSelectedDevices(){
  var lang = document.getElementById('lang_file');
  //nsITreeSelection: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeSelection
  //nsITreeView: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeView#getCellText%28%29
  var start = new Object();
  var end = new Object();
  var selected = document.getElementById("tree_devices").view.selection;
  if(selected.getRangeCount() <= 0){
	//no devices selected
	return;
  }
  //ask user if they really want to remove the devices
  if(!Logger.promptService.confirm(null, "Trango", lang.getString("prompt_remove_device"))){
    return;
  }

  //iterate over all selections
  var num = selected.getRangeCount();
  for(var i = 0; i < num; i++){
    //get selected indices
    selected.getRangeAt(i, start, end);
    var col = document.getElementById("tree_devices").columns.getColumnAt(0);

    //iterate over selected indices
    //var view = document.getElementById("tree_devices").view;
    for(var j = start.value; j <= end.value; j++){
      var parent = "";
      var elements = [];
      var parentindex = devicesView.getParentIndex(j);
      if(parentindex == -1){
        //a parent element was selected!
        //=> store selection as parent and get all children
        parent = devicesView.getCellText(j, col);
        for (var k=0; k<devicesView.emails[parent]; k++){
          elements[k]=devicesView.rows[devicesView.rowTranslate(j) + 1 + k];
        }
      }
      else{
        //get parent
        parent = devicesView.getCellText(parentindex, col);
        elements[0] = devicesView.getCellText(j, col);
      }

	  //TODO: FIXME: this removes all devices not just the selected ones!

      //remove the devices
      if(devicesView.emails[parent] > 0){
        removeDevices(parent, elements, lang, false); //doNotPrompt = false => DO prompt
        //update list
        fillDevices(lang);
      }
    }
  }
}

function removeDevices(identity, devices, lang, doNotPrompt){
  Logger.dbg("removeDevices: " + identity + " " + devices);

  //call C to remove devices
  var status = CWrapper.removeDevices(identity, Prefs.getPref("machineID"), devices,
                                      devicesView.emails[identity], doNotPrompt);
  if(status != 0){
    //error
    Logger.error("CWrapper exception removeDevice (" + identity + "," + devices + "): " + status);
    Logger.infoPopup(
      lang.getString("remove_device_failed") +
        "\n(" + identity + ": " + devices + ")\n" +
        lang.getString(CWrapper.getErrorStr(status))
    );
  }

  //DONE in CWrapper: (remDev) remove ap from Pwmgr too if this device was deleted too.
}

function removeSelectedKeys(){
  var lang = document.getElementById('lang_file');
  var start = new Object();
  var end = new Object();

  //nsITreeSelection: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeSelection
  //nsITreeView: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeView#getCellText%28%29
  var selected = document.getElementById("tree_keys").view.selection;
  if(selected.getRangeCount() <= 0){
	//no keys selected
	return;
  }
  //ask user if they really want to remove the devices
  if(!Logger.promptService.confirm(null, "Trango", lang.getString("prompt_remove_key"))){
    return;
  }

  //iterate over all selections
  var elements = [];
  var num = selected.getRangeCount();
  for(var i = 0; i < num; i++){
    //get selected indices
    selected.getRangeAt(i, start, end);
    var col = document.getElementById("tree_keys").columns.key_id;

    //iterate over selected indices
    var view = document.getElementById("tree_keys").view;
    for(var j = start.value; j <= end.value; j++){
      var parent = "";
      var pIndex = view.getParentIndex(j);
      if(pIndex != -1){
        var index = j;
        pIndex = view.getParentIndex(pIndex);
        if(pIndex != -1){
          index = view.getParentIndex(j);
        }
        var keyId = view.getCellText(index, col);
        if(elements.length == 0 || (elements[elements.length - 1]!=keyId)){
          elements.push(keyId);
          Logger.dbg("to Remove keyId " + keyId);
        }
      }
    }
  }
  if(elements.length>0){
    CWrapper.removeKeys(elements);
    CWrapper.exportKeyPurse(Prefs.getPref("keyPursePath"), ""); //TODO: shouldn't that have password?
    fillKeys(document.getElementById('lang_file'));
  }
}
