//own modules
Components.utils.import("resource://tryango_modules/pwmanager.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");
Components.utils.import("resource://tryango_modules/prefs.jsm")
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/dialogs.jsm");

//standard modules
Components.utils.import("resource:///modules/iteratorUtils.jsm"); //for fixIterator
Components.utils.import("resource://gre/modules/FileUtils.jsm"); //file operations
Components.utils.import("resource://gre/modules/NetUtil.jsm"); //reading file asynchonously

//exports
var EXPORTED_SYMBOLS = ["Utils"]; //only export Utils, not the rest


var Utils = new function()
{
  this.window = null;

  this.init = function(window){
    this.window = window;
  }

  this.convertFromUnicode = function(text, charset) {
    Logger.dbg("convertFromUnicode: " + charset + "\n");

    if(!text){
      return "";
    }

    if(!charset){
      charset = "utf-8";
    }

    // Encode plaintext
    try{
      var unicodeConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].getService(Components.interfaces.nsIScriptableUnicodeConverter);

      unicodeConv.charset = charset;
      return unicodeConv.ConvertFromUnicode(text);

    }
    catch(ex) {
      Logger.dbg("convertFromUnicode: caught an exception\n");
      return text;
    }
  }

  this.writeFile = function(file, data) {
    Components.utils.import("resource://gre/modules/NetUtil.jsm");
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    var ostream = FileUtils.openSafeFileOutputStream(file)
    var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
    createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var istream = converter.convertToInputStream(data);
    NetUtil.asyncCopy(istream, ostream, function(status) {
        if (!Components.isSuccessCode(status))
            return;
    });
},

  this.readFile = function(file){
    var data = "";
    var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
    var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
    fstream.init(file, -1, 0, 0);
    cstream.init(fstream, "UTF-8", 0, 0);
    {
	  let str = {};
      let read = 0;
      do {
        read = cstream.readString(0xffffffff, str);
        data += str.value;
      } while (read != 0);
    }
    cstream.close();
    return data;
  }

  this.convertToUnicode = function (text, charset) {
    Logger.dbg("converToUnicode: "+ charset + "\n");

    if (!text || !charset /*|| (charset.toLowerCase() == "iso-8859-1")*/)
      return text;

  // Encode plaintext
    try {
      var unicodeConv = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].getService(Components.interfaces.nsIScriptableUnicodeConverter);

      unicodeConv.charset = charset;
      return unicodeConv.ConvertToUnicode(text);

    }
    catch (ex) {

      Logger.dbg("convertToUnicode: caught an exception while converting'"+text+"' to "+charset+"\n");
      return text;
    }
  }

  this.importKeyPurse = function(){
    if(!this.window){
      Dialogs.error(CWrapper.languagepack.getString("imp_keypurse_fail"));
    }
    else{
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
      Components.interfaces.nsIFilePicker);
    //filters:
      fp.appendFilter("Keypurses", "*.purse; *.gpg; *.pgp; *.asc; *,txt"); //only key purses
      fp.appendFilter("All files", "*");
      var nsIFilePicker = Components.interfaces.nsIFilePicker;
      fp.init(this.window, CWrapper.languagepack.getString("sel_keypurse_imp"), nsIFilePicker.modeOpen);
      
      //check result
      var res = fp.show();
      if(res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace){
        CWrapper.post("importKeyPurse", [fp.file.path, false], function(status){
          if(status == 0){
            Utils.syncKeypurse();
            CWrapper.post("exportKeyPurse", [Prefs.getPref("keyPursePath"), ""], function(success){ //TODO: password?
              if(status == 0){
                Dialogs.info(CWrapper.languagepack.getString("imp_keypurse_ok"));
              }
              else{
                Dialogs.error(CWrapper.languagepack.getString("wizard_importKeyPage_errorWritingKP"));
              }
            });
          }
          else{
            Dialogs.error(CWrapper.languagepack.getString("imp_keypurse_fail"));
          }
        });
      }

    }
  }

  this.exportKeyPurse = function(){
    if(!this.window || !(new FileUtils.File(Prefs.getPref("keyPursePath"))).exists()){
	  //no window => no export
      //no keypurse => no export (this should never happen and be avoided by the
	  //function calling exportKeyPurse)
      Dialogs.error(CWrapper.languagepack.getString("exp_keypurse_fail"));
//       Logger.infoPopup(CWrapper.languagepack.getString("exp_keypurse_fail"));
    }
    else{
      //pick file to save to
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
        Components.interfaces.nsIFilePicker);
      //filters:
      fp.appendFilter("Keypurses", "*.purse"); //only key purses
      fp.appendFilter("All files", "*");
      fp.init(this.window, CWrapper.languagepack.getString("sel_keypurse_bak"),
              Components.interfaces.nsIFilePicker.modeSave);

      //check result
      var date = (new Date()).toISOString();
      date = date.substring(0, date.indexOf("T"));
      fp.defaultString = "tryango_" + date + "_key.purse";
      var res = fp.show();
      if(res != Components.interfaces.nsIFilePicker.returnCancel){
        //backup keypurse to selected location
        CWrapper.post("exportKeyPurse", [fp.file.path, ""], function(success){ //TODO: password?
          if(success){
            Dialogs.info(CWrapper.languagepack.getString("bak_keypurse_ok"));
            Logger.dbg("Keypurse saved");
          }
          else{
            Logger.error("exportKeyPurse failed");
            Dialogs.error(CWrapper.languagepack.getString("bak_keypurse_fail"));
          }
        });
        //backup done
      }
    }
  }

  this.removeAllDevicesAndRevokeKeys = function(){
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
        null, "Tryango", CWrapper.languagepack.getString("exp_keypurse"),
        buttonFlags,
        null, null, null, //button labels set above already
        null, new Object() //no checkbox
      );
      //0 = YES
      if(buttonResult == 0){
        Logger.dbg("Backup prompt: YES");

        Logger.dbg("Export keypurse");
        if(Utils.exportKeyPurse()){
          Logger.dbg("exportKeyPurse done");
          //backup ok
          ret = true;
        }
        else{
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
      }
      else{
        //error => just warn and abort
        Logger.error("Backup keypurse prompt returned unexpected result: " + buttonResult);
        //continue = false
        return false;
      }

      //remove keypurse
      Logger.dbg("removing keypurse...");
      CWrapper.post("removeKeyPurse", [Prefs.getPref("keyPursePath")], function(success){
        if(!success){
          Logger.error("Could not remove keypurse: " +
                       Prefs.getPref("keyPursePath"));
          Dialogs.error(CWrapper.languagepack.getString("rm_keypurse_fail"));
        }
      });
    }
    else{
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
          removeDevices(identity, [machineID],  true); //doNotPrompt = true
        }
      }
      CWrapper.post("synchStub", [], function(){fillDevices();});
    }

    return ret;
  }

  this.syncKeypurse = function(){
    var addresses = this.getEmailAddresses();
    var machineID = Prefs.getPref("machineID");
    if(machineID){
      var i = 0;
      for each(let identity in addresses){
        i++;
        //check if identity/machineID is signed up
        var ap = Pwmgr.getAp(identity);
        if(ap != undefined && ap.length > 1){
          CWrapper.post("synchronizeSK", [identity], function(status){
            if(status != 0){
              Logger.error(CWrapper.languagepack.getString("no_corresponding_key") +": " + identity);
            }
            else{
              Logger.dbg("Keypurse synchronised successfully for id "+ identity);
            }
            if(i == addresses.length){
              CWrapper.libraryLoaded = true;
              Logger.dbg("Done synchronising keypurse");
            }
          });
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

  this.treeAppendRow = function (tree, keyRow, document, isOpen){
    //REMARK: setting css text-wrap/word-break/overflow/etc. does not work
    //        for treecell.label! Apparently those cannot line-break!
    var lang = CWrapper.languagepack;
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
      }
      else{
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
  //fill keys from keypurse - first as it does not need connect to server
  fillKeys();

  //fill status
  fillStatus();

  //fill random checking if advancedOptions is set
  fillAudit();

  //fill devices (might return an error => do it last)
  fillDevices();
}

//helper functions
function fillStatus(){
  var button = document.getElementById("fillStatusBtn");
  button.disabled = true;
  var tex_st = document.getElementById("tex_status");
  tex_st.value = CWrapper.languagepack.getString("info_waiting");
  tex_st.readOnly = true;
  var str = "";
  var server = Prefs.getPref("server")
  var port = Prefs.getPref("port");
  if(server && port){
    str += new Date().toISOString() + "\n\n";
    str += "Server: " + CWrapper.getServer() + "\tPort: " + CWrapper.getPort() + "\n";

    //call C - server status etc.
    CWrapper.post("getServerInfo", [], function(status, info){
      str += CWrapper.languagepack.getString("info_connection") + " ";
//       status = parseInt(status);
      if(status == 0){
        str += CWrapper.languagepack.getString("info_connected") + "\n\n";
      }
      else{
        str += CWrapper.languagepack.getString(CWrapper.getErrorStr(status));
        str += " (" + CWrapper.languagepack.getString("info_error") + " " + status + ")\n\n";
      }
      if(info == undefined || info == ""){
        str += CWrapper.languagepack.getString("info_unavailable") + "\n";
      }
      else{
        str += CWrapper.languagepack.getString("info_serverinfo") + "\n" + info; //...and display rest
      }
      tex_st.value = str;
      button.disabled = false;
    });
  }
  else{
    tex_st.value = CWrapper.languagepack.getString("info_no_server_port");
    button.disabled = false;
  }
}

function fillAudit(){
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
      let trc = document.getElementById("tex_randomcheck");
      if (!Components.isSuccessCode(status)) {
        //error
        trc.value = CWrapper.languagepack.getString("info_file_error") + " " + file.path;
        trc.readOnly = true;
        return; //quit before other things below
      }
      else{
        trc.value = CWrapper.languagepack.getString("info_log") + " " +
          NetUtil.readInputStreamToString(inputStream, inputStream.available());
        trc.readOnly = true;
      }
    });
  }
  else{
    tab.hidden = true;
  }
}

// var treeView = {
//     rowCount : 10000,
//     getCellText : function(row, column){
//       if (column.id == "namecol") return "Row "+row;
//       else return "February 18";
//     },
//     setTree: function(treebox){ this.treebox = treebox; },
//     isContainer: function(row){ return false; },
//     isSeparator: function(row){ return false; },
//     isSorted: function(){ return false; },
//     getLevel: function(row){ return 0; },
//     getImageSrc: function(row,col){ return null; },
//     getParentIndex: function(row){
//       row = this.rowTranslate(row);
//       return this.parent[row];
//     },
//     getRowProperties: function(row,props){},
//     getCellProperties: function(row,col,props){},
//     getColumnProperties: function(colid,col,props){}
// };


var devicesView = {
  rows : ["no devices"], //string for a given row
  isopen : [true],       //set if given row is open
  closedNo : [0],        //number of closed rows above given row before translation
  parent : [-1],         //index of parent of current row - if -1 then top level
  emails : {},           //number of emails for given identity
  rowCount : 1,          //number of rows minus closed rows
  rowRealCount : 1,      //number of rows including closed ones
  treeBox: null,         //treeBox that needs to be notified of row changes etc.
  canOpen: false,

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
//     Logger.dbg("get level row:"+row + "translate:" + this.rowTranslate(row));
//     Logger.dbg("this.parent:" + this.parent[this.rowTranslate(row)]);
    var i = this.parent[this.rowTranslate(row)];
//     Logger.dbg("i:" + i);
    if(i == -1) return 0;
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
    if(!this.canOpen) return;
    var realRow = this.rowTranslate(row);
    var rowNo = 1; //assuming each identity has at least info row
    if(this.emails[this.rows[realRow]] > 0){
      rowNo = this.emails[this.rows[realRow]];
    }
    if(this.isopen[realRow]){
      rowNo = 0 - rowNo;
      var i = row + 1;
      while(i < this.rowCount + rowNo){
        this.closedNo[i] = this.closedNo[i - rowNo] + rowNo;
        let realI = this.rowTranslate[i];
        if(this.parent[realI] != -1){
          this.parent[realI] = this.parent[realI] - rowNo;
        }
        i++;
      }
    }
    else{
      var i = this.rowCount + rowNo - 1;
      while(i > row + rowNo){
        this.closedNo[i] = this.closedNo[Math.max(i - rowNo, row)] + rowNo;
        let realI = this.rowTranslate[i];
        if(this.parent[realI] != -1){
          this.parent[realI] = this.parent[realI] - rowNo;
        }
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

//   incI: function(text, lastParent, i){
//     this.rows[i] = text;
//     this.parent[i] = lastParent;
//     this.closedNo[i] = 0;
//     return i + 1;
//   },

  isSeparator: function(row){ return false; },
  isSorted: function(){ return false; },
  getImageSrc: function(row,col){ return null; },
  getRowProperties: function(row){ },
  getCellProperties: function(row, col){
    if(this.rows[row] == Prefs.getPref("machineID")){
      return 'redCell';
    }
    else return '';
  },
  getColumnProperties: function(colid,col){return ''},
  cycleCell: function(idx, column) {},
  cycleHeader: function(col, elem) {},

  addIdentity: function(identity, infoText){
//     Logger.dbg("AddIdentity:" + identity + " text:" + infoText);
//     Logger.dbg("RealRowCount:" + this.rowRealCount + " rowCount:"+ this.rowCount);
    this.isopen[this.rowRealCount] = true;
    this.emails[identity] = 0;
    this.rows[this.rowRealCount] = identity;
    this.parent[this.rowRealCount] = -1;
    if(this.rowCount > 1){
      this.closedNo[this.rowCount] = this.closedNo[this.rowCount - 1];
    }
    else{
      this.closedNo[this.rowCount] = 0;
    }

    this.isopen[this.rowRealCount + 1] = true;
    this.rows[this.rowRealCount + 1] = infoText;
//     Logger.dbg("row[i]:" + this.rows[this.rowRealCount]);
//     Logger.dbg("row[i+1]:" + this.rows[this.rowRealCount+1]);
    this.parent[this.rowRealCount + 1] = this.rowCount;
    this.closedNo[this.rowCount + 1] = this.closedNo[this.rowCount];

    this.rowCount += 2;
    this.rowRealCount += 2;
    if(this.treeBox != null){
      this.treeBox.rowCountChanged(this.rowCount - 2, 2);
    }

  },

//   openAll: function(){
//     var lastParent = 0;
//     this.parent[lastParent] = -1; //first cell must be a parent
//     for(var i = 0; i < this.rowRealCount; i++){
//       this.isopen[i] = true;
//       if(this.parent[i] == -1){
//         lastParent = i;
//       }
//       else{
//         this.parent[i] = lastParent;
//       }
//       this.closedNo[i] = 0;
//     }
//     var added = this.rowRealCount - this.rowCount;
//     this.rowCount = this.rowRealCount;
//     if(added != 0 && this.treeBox != null){
//       this.treeBox.rowCountChanged(this.rowCount - added, added);
//     }
//   },

  setIdentityContent: function(identity, content){
//     this.openAll();
    var parent = this.rowRealCount - 1;
    Logger.log("last parent:" + parent + " identity:"+identity);
    if(this.parent[parent] != -1){
      parent = this.parent[parent];
    }
    while(parent > -1 && identity != this.rows[parent]){
      Logger.log("next step parent:" + parent + 'row[parent'+ this.rows[parent]);
      parent--;
      if(parent > 0 && this.parent[parent] != -1){
        parent = this.parent[parent];
      }
    }
    if(parent > -1){
//       Logger.dbg("content length:"+content.length + " rowRealCount:"+this.rowRealCount);
      this.emails[this.rows[parent]] = content.length;
      var lastChild = parent + 1;
      while (lastChild < this.rowRealCount && this.parent[lastChild] != -1 ){
        lastChild++;
      }
      lastChild--;
//       Logger.dbg("Last child:" + lastChild);
      for(var r = 0; r + parent < lastChild && r < content.length; r++){
        this.rows[r + parent + 1] = content[r];
        if(this.treeBox){
          this.treeBox.invalidateRow(r + parent + 1);
        }
      }
      var added = (content.length - lastChild + parent);
//       Logger.dbg("Added:" + added);
      //shift
      if(((r + parent + 1) != this.rowRealCount - 1) && added != 0){
//         Logger.dbg("In loop r + parent + 1 :" + (r + parent + 1)+ " rowRealCount:"+this.rowRealCount);
        let i;
        if(added > 0){
          for(i = this.rowRealCount - 1; i > lastChild; i--){
            this.rows[i + added] = this.rows[i];
            this.parent[i + added] = this.parent[i];
            if(this.parent[i] > lastChild + 1){
              this.parent[i] += added;
            }
            this.isopen[i + added] = true;
            this.closedNo[i + added] = 0;
          }
        }
        else{
          for(i = lastChild + 1; i < (this.rowRealCount + added); i++){
            this.rows[i] = this.rows[i - added];
            this.parent[i] = this.parent[i - added];
            if(this.parent[i] > lastChild + 1){
              this.parent[i] += added;
            }
            this.isopen[i] = true;
            this.closedNo[i] = 0;
          }
        }
      }
      //just add
      for(var i = r; i < content.length; i++){
        if(this.treeBox){
          this.treeBox.invalidateRow(i + parent + 1);
        }
        this.rows[i + parent + 1] = content[i];
        this.parent[i + parent + 1] = parent;
        this.closedNo[i + parent + 1] = 0;
      }
      this.rowRealCount += added;
      this.rowCount += added;
      if(this.treeBox != null){
        this.treeBox.rowCountChanged(this.rowCount - added, added);
      }
    }
    else{ //no identitiy
      Logger.error("We tried to add devices to non existing identity");
    }
  },

  changeIdentityText: function(identity, text){//assume we have only one child
    Logger.log("Changing identity text id:"+identity + " text:"+text);
    var realParent = this.rowRealCount - 1;
    var parent = this.rowCount - 1;
    if(this.parent[realParent] != -1){
      parent = this.parent[parent];
      realParent = this.rowTranslate(parent);
    }
    while(parent > -1 && identity != this.rows[realParent]){
      realParent--;
      parent--;
      if(realParent > 0 && this.parent[realParent] != -1){
        parent = this.parent[realParent];
        realParent = this.rowTranslate(parent);
      }
    }
    if(parent > -1){
      this.rows[realParent + 1] = text;
      if(this.treeBox){
        this.treeBox.invalidateRow(parent + 1);
      }
    }
  },

  setEmpty: function(text){
    this.isopen[this.rowRealCount] = true;
    this.rowRealCount = 1;
    this.rowCount = 1;
    this.rows[0] = text;
    this.parent[0] = -1;
    this.closedNo[0] = 0;
    if(this.treeBox){
      this.treeBox.invalidateRow(0);
    }
    this.emails = {};
  }

};


function fillDevices(languagepack){
  var button = document.getElementById("fillDevicesBtn");
  button.disabled = true;
  //fill devices
  Utils.syncKeypurse();
  //set date for last update
  Logger.dbg("filling devices");
  document.getElementById("tree_devices_updated").value = new Date().toISOString();

  var addresses = Utils.getEmailAddresses();

  //get actual device
  var device = Prefs.getPref("machineID");
  devicesView.emails = {};
  devicesView.levels = [];
  devicesView.rows = [];
  devicesView.rowCount = 0;
  devicesView.rowRealCount = 0;
  devicesView.canOpen = false;

  var identity;
  if(device){
    for each(identity in addresses){
      var ap = Pwmgr.getAp(identity);
      if(ap != undefined && ap.length > 1){
        devicesView.addIdentity(identity, CWrapper.languagepack.getString("info_waiting"));
      }
      else{
        devicesView.addIdentity(identity, CWrapper.languagepack.getString("not_signedup"));
        Logger.dbg("Account " + identity + " no ap");
      }
    }
//     i = 0;
    for each(identity in addresses){
      var ap = Pwmgr.getAp(identity);
      if(ap != undefined && ap.length > 1){
        try{
          Logger.dbg("Getting devices for identity:" + identity);
          CWrapper.post("getDevices", [identity, device], function(newHexAp, status, devices, id){
            Logger.dbg("***filling devices for identity:" + id );
            if(newHexAp.length > 2){
              Pwmgr.setAp(id, newHexAp);
            }
            if(devices.length > 0){
              devicesView.setIdentityContent(id, devices);
            }
            else{
              devicesView.changeIdentityText(id, CWrapper.languagepack.getString("no_devices"));
            }
          });
        }
        catch(err){
          //this exception might happen if the server is not available or device is not signed up with tryango
          //for getDevices this is not a critical error => catch it
          Logger.error("CWrapper exception (" + identity + "," + device + "):\n" +
                       err + "\n\n" );
          devicesView.changeIdentityText(identity, CWrapper.languagepack.getString("info_error") + " " + err);
        }
      }
    }
  }
  else{
    Logger.dbg("No device stored in preferences");
    for each(identity in addresses){
      devicesView.addIdentity(identity, CWrapper.languagepack.getString("no_device_set"));
    }
  }
  Logger.dbg("Setting devices view");
  document.getElementById("tree_devices").view = devicesView;
  CWrapper.post("synchStub", [], function(){
    devicesView.canOpen = true
    button.disabled = false;
  });
}

function fillKeys(){
  var button = document.getElementById("fillKeysBtn");
  button.disabled = true;
  //set date for last update
  document.getElementById("tree_keys_updated").value = CWrapper.languagepack.getString("wizard_importKeyPage_lbl_waiting");


  //get tree
  var tree = document.getElementById("tree_keys_content");
  //clear tree
//   while(tree.childNodes.length != 0){
//     tree.removeChild(tree.childNodes[0]);
//   }

  //get addresses
  var addresses = Utils.getEmailAddresses();

  //check all identities
  CWrapper.post("synchStub", [], function(status, keys){
  //ATTENTION: the tree is altered while iterating over it, thus "normal" iterators break!
    while(tree.childNodes.length != 0){
      tree.removeChild(tree.childNodes[0]);
    }
  });

  for each(let identity in addresses){
    CWrapper.post("getInfoKeys", [identity, true], function(status, keys){
      if(keys == null || keys.length <= 0){
        //just a warning, might be correct if there is no keypurse etc.
        Logger.log("Error: Keypurse for " + identity + " is empty/length <= 0: " + keys);
        //leave identity/key-row empty
      }
      else{
        Logger.dbg("Keypurse (" + identity + "): " + keys );
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
          Utils.treeAppendRow(subtree, key, document, false, CWrapper.languagepack);
        }
        item.appendChild(subtree);
        tree.appendChild(item);
      }
    });
    CWrapper.post("synchStub", [], function(status, keys){
      document.getElementById("tree_keys_updated").value = new Date().toISOString();
      button.disabled = false;
    });
  }
  if(addresses.length <1){
    button.disabled = false;
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
function _getDevicesToRemove(){
  var start = new Object();
  var end = new Object();
  var selected = document.getElementById("tree_devices").view.selection;
  var toRemove = {};
  if(selected.getRangeCount() <= 0){
    //no devices selected
    return toRemove;
  }
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
      //remove the devices
      if(devicesView.emails[parent] > 0){
        toRemove[parent]= elements;
      }
    }
  }
  return toRemove;
}

function removeSelectedDevices(){
  //nsITreeSelection: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeSelection
  //nsITreeView: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeView#getCellText%28%29
  var toRemove = this._getDevicesToRemove();
  Logger.dbg("remove devices size:" + Object.keys(toRemove).lengnth);
  if(Object.keys(toRemove).length < 1){
    //no devices selected
    return;
  }
  //ask user if they really want to remove the devices
  if(!Logger.promptService.confirm(null, "Trango", CWrapper.languagepack.getString("prompt_remove_device"))){
    return;
  }

  for(var parent in toRemove){
    removeDevices(parent, toRemove[parent], false); //doNotPrompt = false => DO prompt
  }
  CWrapper.post("synchStub", [], function(){fillDevices();});
}

function removeDevices(identity, devices,  doNotPrompt){
  Logger.dbg("removeDevices: " + identity + " " + devices);

  //call C to remove devices
  var status = CWrapper.removeDevices(identity, Prefs.getPref("machineID"), devices,
                                      devicesView.emails[identity], doNotPrompt,
    function(status){
      if(status != 0){
        //error
        Logger.error("CWrapper exception removeDevice (" + identity + "," + devices + "): " + status);
        Dialogs.error(
          //     Logger.infoPopup(
          CWrapper.languagepack.getString("remove_device_failed") +
            "\n(" + identity + ": " + devices + ")\n" +
            CWrapper.languagepack.getString(CWrapper.getErrorStr(status))
        );
        //update list
      }
    });
  //DONE in CWrapper: (remDev) remove ap from Pwmgr too if this device was deleted too.
}

function removeSelectedKeys(){
  var button = document.getElementById("removeKeysBtn");
  button.disabled = true;

  var lang = document.getElementById('lang_file');
  var start = new Object();
  var end = new Object();

  //nsITreeSelection: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeSelection
  //nsITreeView: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsITreeView#getCellText%28%29
  var selected = document.getElementById("tree_keys").view.selection;
  if(selected.getRangeCount() <= 0){
    //no keys selected
    button.disabled = false;
    return;
  }
  //ask user if they really want to remove the devices
  if(!Logger.promptService.confirm(null, "Trango", CWrapper.languagepack.getString("prompt_remove_key"))){
    button.disabled = false;
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

  if(elements.length > 0){
    CWrapper.post("removeKeys", [elements], function(){
      Logger.dbg("Filling keys after remeving selected Keys()");
      fillKeys(document.getElementById('lang_file'));
      CWrapper.post("exportKeyPurse", [Prefs.getPref("keyPursePath"), ""], function(success){//TODO: shouldn't that have password?
        if(!success){
          Dialogs.error(CWrapper.languagepack.getString("bak_keypurse_fail"));
        }
      });
    });
  }
  CWrapper.post("synchStub", [], function(){
    button.disabled = false;
  });
}
