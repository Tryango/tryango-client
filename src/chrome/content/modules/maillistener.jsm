/* A class to check incoming e-mails */

//imports
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/mailServices.js");
Components.utils.import("resource://gre/modules/iteratorUtils.jsm");
Components.utils.import("resource:///modules/gloda/mimemsg.js");//for MsgHdrToMimeMessage

//own imports
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");
Components.utils.import("resource://tryango_modules/prefs.jsm");
Components.utils.import("resource://tryango_modules/pwmanager.jsm");
Components.utils.import("resource://tryango_modules/send.jsm");

//exports
var EXPORTED_SYMBOLS = ["MailListener"]

function addHeader(header){
  var customHeaders = Services.prefs.getCharPref("mailnews.customDBHeaders").split(" ");
  //ATTENTION: lowercase!
  if(customHeaders.length == 0 ||
     customHeaders.indexOf(header.toLowerCase()) < 0){
    customHeaders.push(header.toLowerCase());
    Services.prefs.setCharPref("mailnews.customDBHeaders",
                               customHeaders.join(" ").trim());
  }
}

function removeHeader(header){
  var customHeaders = Services.prefs.getCharPref("mailnews.customDBHeaders").split(" ");
  //ATTENTION: lowercase!
  var index = customHeaders.indexOf(header.toLowerCase());
  if(index >= 0){
    customHeaders.splice(index, 1);
    Logger.dbg(header);
    Logger.dbg(customHeaders.join(" ").trim());
    Services.prefs.setCharPref("mailnews.customDBHeaders",
                               customHeaders.join(" ").trim());
  }
}

// E-Mail Listener
var MailListener = new function() {
  //declare XHEADER so it is stored in Thunderbird's DB-Headers
  this.XHEADER = "X-TRYANGO"; //ATTENTION: when searching one has to use LOWERCASE!!!!
  this.XHEADER_REQID = "X-TRYANGO-REQID";
  this.XHEADER_NEWKEY = "X-TRYANGO-NEWKEY";
  this.XHEADER_OLDKEY = "X-TRYANGO-OLDKEY";
  this.gFolderDisplay;
  this.languagepack;
  this.cmToolbar;

  this.init = function(gFolderDisplay, languagepack, cmToolbar){
    addHeader(this.XHEADER);
    addHeader(this.XHEADER_REQID);
    addHeader(this.XHEADER_NEWKEY);
    addHeader(this.XHEADER_OLDKEY);
    //folder access
    this.gFolderDisplay = gFolderDisplay;

    //language
    this.languagepack = languagepack;

    //toolbar access
    this.cmToolbar = cmToolbar;
    //reset
    this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar"));
    this.cmToolbar.setAttribute("style", "background-color: transparent;");
    this.cmToolbar.children[0].setAttribute("style", "color: black;");

    Logger.dbg("MailListener init done: " + Services.prefs.getCharPref("mailnews.customDBHeaders").trim());
  };
  
  
  /**
   * function to be called when Tryango is uninstalled
   */
  this.removeAllTryangoXHEADERS = function(){
    Logger.dbg("Removing XHEADERS");
    
    //remove all x-headers again
    removeHeader(this.XHEADER);
    removeHeader(this.XHEADER_REQID);
    removeHeader(this.XHEADER_NEWKEY);
    removeHeader(this.XHEADER_OLDKEY);
  };

  // functions
  /**
   * function to handle incoming emails
   *  @param  header header of type "nsIMsgDBHdr"
   *    see http://doxygen.db48x.net/comm-central/html/
   *    "nsIMsgFolderListener::msgAdded" and "...::msgsClassified"
   */
  this.msgAdded = function(header){
    var identity = this.findAccountFromHeader(header);
    if(identity == ""){
      //print folder and subject of message for debug purposes
      var mimeConvert = Components.classes["@mozilla.org/messenger/mimeconverter;1"]
            .getService(Components.interfaces.nsIMimeConverter);
      var subject =  mimeConvert.decodeMimeHeader(header.subject, null, false, true);
      Logger.error("Could not identify receiving email address (" +
                     header.folder.prettiestName + "/" + subject + ")");
      return;
    }

    if(this.searchAP(header, identity)){
      this.submitKey(identity);
    }
    else{
      if(!this.searchNewKey(header, identity)){
        this.searchOldKey(header, identity);
      }
    }
  };

  this.searchNewKey = function(header, identity){
    var reqDevice = header.getStringProperty(this.XHEADER_NEWKEY.toLowerCase());
    let device = Prefs.getPref("machineID");
    if(reqDevice == device){
      MsgHdrToMimeMessage(header, null, function (aMsgHdr, aMimeMessage) {
        // do something with aMimeMessage:
        let keyStr = aMimeMessage.coerceBodyToPlaintext();
        Logger.dbg("Get new key"+keyStr);
      }, true);
      return true;
    }
    return false;
  };

  this.searchOldKey = function(header, identity){
    var reqDevice = header.getStringProperty(this.XHEADER_OLDKEY.toLowerCase());
    let device = Prefs.getPref("machineID");
    if(reqDevice == device){
      MsgHdrToMimeMessage(header, null, function (aMsgHdr, aMimeMessage) {
        // do something with aMimeMessage:
        let keyStr = aMimeMessage.coerceBodyToPlaintext();
        Logger.dbg("Get old key"+keyStr);
      }, true);
      return true;
    }
    return false;
  };

  this.searchAP = function(header, identity){
    //TODOTODO: could not identify receiving email address when encrypted mail arrives (maybe since email is not clicked on findAccountFromHeader does not work?)
    //see also:
    //  https://developer.mozilla.org/en-US/Add-ons/Thunderbird/HowTos/Common_Thunderbird_Extension_Techniques/Filter_Incoming_Mail
    //  http://kewisch.wordpress.com/2012/10/11/executing-js-code-when-receiving-an-email-with-a-specific-header-set/
    //  https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIMsgDBHdr#getStringProperty.28.29
    //check that email is unread
    if(!header.isRead){
      //check that we tried to sign up, if not, stop processing
      //remark: gCurrentIdentity is not defined here, so no gCurrentIdentity.email
      let searched_reqId = Prefs.getPref("reqId_" + identity);
      Logger.dbg("email received: " + identity + " " + searched_reqId);
      if(searched_reqId == ""){
        //we are not searching, stop processing
        return false;
      }

      //get XHeader
      //ATTENTION: lowercase!!!
      let reqId = header.getStringProperty(this.XHEADER_REQID.toLowerCase());
      Logger.dbg("reqId: '" + reqId + "' searched: '" + searched_reqId + "'");
      if(reqId != searched_reqId){
        //not what we are looking for...
        return false;
      }
      else{
        //we found it => terminate "searching reqId" mode
        Prefs.setPref("reqId_" + identity, "");
      }
      let xheader = header.getStringProperty(this.XHEADER.toLowerCase());
      if(xheader){
        Pwmgr.setAp(identity, xheader);
        Logger.dbg("Initial nonce set successfully:\nC:    "
                   + Pwmgr.getAp(identity) + "\nX-header: "
                   + xheader + " for identity "+ identity);

        //mark message as read, so it won't get processed another time
        //(does not work with gmail though, but we have the reqId to solve that)
        header.markRead(true);
        return true;
      }
    }
    return false;
  };

  
  this.submitKey = function(identity){
    //submit our key
    let device = Prefs.getPref("machineID");
    let result = CWrapper.submitKey(identity, device);
    if (result != 0 && result != 18){//18 = ANG_ID_ALREADY_EXISTS
      let errorStr = CWrapper.getErrorStr(result);
      let err = this.languagepack.getString("signup_failed") + ": " +
          this.languagepack.getString(errorStr) + " (" + result + ")";
      Logger.error(err);
      Logger.infoPopup(err);
    }
    else{
      if(result == 18 ){ //ANG_ID_ALREADY_EXISTS
        Logger.dbg("Added ap but no need to sumbit new key for identity: " + identity);
//         sendMessage(identity, "subject", "test body", null, this.XHEADER_NEWKEY +": test header\n");
      }
      else{
        Logger.dbg("Added identity: " + identity);
        let sendEmail = false;
        try{
          var ret = CWrapper.getDevices(identity, device);
          if(ret.length > 1){//it makes sense to send encryped key when there is more than 1 device
           sendEmail = true;
          }
        }
        catch(err){
        }
        let message = this.languagepack.getString("send_encrypted_key");
        if(sendEmail && Logger.promptService.confirm(null, "Tryango", message)){
          let encrKey = {str : ""};
          let status =  CWrapper.getEncryptedSK(encrKey, identity);
          Logger.dbg("Encrytped key to send:" + encrKey.str);
          if(status == 0 && encrKey.str.length > 0){
            sendMessage(identity, "Encrypted private key for Tryango", encrKey.str, null, this.XHEADER_NEWKEY +": " + device + "\n");
          }
        }
        else{
          CWrapper.clearTempKey();
        }
      }
      if(CWrapper.synchronizeSK(identity) != 0){
        Logger.err(this.languagepack.getString("no_corresponding_key") +": " + identity);
      }
      Logger.infoPopup(this.languagepack.getString("signup_done") + " (" + identity + ")");
    }
    //ap is updated in submitKey, no need to do it here
  };


  //messaged to be called when a mail is displayed => check for PGP header
  //and decrypt/verify if necessary
  this.onMsgDisplay = function(event){
    //explanation: hooked messagepane and overload "onpageshow" function (see tryango.js)
    
    //reset
    this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar"));
    this.cmToolbar.setAttribute("style", "background-color: transparent;");
    this.cmToolbar.children[0].setAttribute("style", "color: black;");
    
    //search for signed/encrypted (BEGIN PGP MESSAGE/BEGIN PGP SIGNED MESSAGE?)
    if(event.currentTarget.contentDocument.body != null)
    {
      //get mailbody
      var body = event.currentTarget.contentDocument.body.textContent;
      //get sender
      var msgHdr = this.gFolderDisplay.selectedMessage;
      if(msgHdr == null){
        //no message selected
        return;
      }
      var sender = msgHdr.author.substring(msgHdr.author.indexOf("<") + 1,
                                           msgHdr.author.indexOf(">"));
      var PGPstart = body.indexOf("-----BEGIN PGP ");
      if(PGPstart < 0){
        Logger.dbg("Unencrypted email");
        return;
      }
      Logger.dbg("Found body email:\""+body+"\"");
      
      var indent = body.substring(body.substr(0, PGPstart).lastIndexOf("\n") + 1, PGPstart);
      
      var beginIndexObj = new Object();
      var endIndexObj = new Object();
      var indentStrObj = new Object();
      var blockType = Prefs.locateArmoredBlock(body, 0, indent,
                                               beginIndexObj, endIndexObj,
                                               indentStrObj);
      Logger.dbg("block type \"" + blockType + "\"");
      
      if ((blockType != "MESSAGE") && (blockType != "SIGNED MESSAGE"))
        return;
      
      var beginIndex = beginIndexObj.value;
      var endIndex   = endIndexObj.value;
      
      var head = body.substr(0, beginIndex);
      var tail = body.substr(endIndex + 1);
      var ciphertext = body.substr(beginIndex, endIndex - beginIndex + 1);
      var indentRegexp;
      if (indent) {
        // MULTILINE MATCHING ON
        RegExp.multiline = true;
        
        if (indent == "> ") {
          // replace ">> " with "> > " to allow correct quoting
          ciphertext = ciphertext.replace(/^>>/g, "> >");
        }

        // Delete indentation
        indentRegexp = new RegExp("^"+indent, "g");

        ciphertext = ciphertext.replace(indentRegexp, "");
        //tail     =     tail.replace(indentRegexp, "");

        if (indent.match(/[ \t]*$/)) {
          indent = indent.replace(/[ \t]*$/g, "");
          indentRegexp = new RegExp("^"+indent+"$", "g"); ciphertext = ciphertext.replace(indentRegexp, "");}


        // Handle blank indented lines
        ciphertext = ciphertext.replace(/^[ \t]*>[ \t]*$/g, "");
        //tail     =     tail.replace(/^[ \t]*>[ \t]*$/g, "");

        // Trim leading space in tail
        tail = tail.replace(/^\s*\n/, "\n");

        // MULTILINE MATCHING OFF
        RegExp.multiline = false;
      }

      //check mail for PGP headers
      if(blockType=="MESSAGE"){
        //encrypted email
        //         Logger.dbg("Found encrypted email:\n" + ciphertext);

        //get account (which received the email)
        var recipient = this.findAccountFromHeader(msgHdr);

        //decrypt
        Logger.dbg("decrypting email for " + recipient + " from " + sender);
        var decryptedMail = {str : ""};
        var status = CWrapper.decryptMail(decryptedMail, ciphertext, sender, recipient);
        if(status > 0 && status <= CWrapper.getMaxErrNum()){
          Logger.error("Decrypt failed with error: " + this.languagepack.getString(CWrapper.getErrorStr(status)));
          //tell user
          Logger.infoPopup(this.languagepack.getString("mail_dec_failed") + "\nError: " + this.languagepack.getString(CWrapper.getErrorStr(status)));
          return;
        }

        this.updateToolBar(status);//showing verification result
        //show decrypted mail
        //searching for <html> works since in the body it becomes &lt;html&gt;
        //so if finding a <html> tag, it is a "real" one and not text of the email
        if(decryptedMail.str.search("<html>") != -1){
          //cut body out of email
          var re = new RegExp("<body [^>]*>(.*)</body>");
          var decryptedMailPureText = decryptedMail.str.match(re);
          if(decryptedMailPureText == null || decryptedMailPureText.length != 2){ // 2 cause decryptedMailPureText is an array: ["<body...> email </body>", "email"]
            Logger.error("Could not find body in email!");

            //write decrypted content as text... (at least)
            this.insertEmail(event.currentTarget.contentDocument, decryptedMail.str, true);
          }else{
            decryptedMailPureText = decryptedMailPureText[1]; //get only the email = regex part "(.*)"
            this.insertEmail(event.currentTarget.contentDocument, decryptedMailPureText, true);
          }
        }else{
          //no html content, write decrypted content as pure-text output only (no pre-processing needed)
          this.insertEmail(event.currentTarget.contentDocument, decryptedMail.str, false);
        }
      }
      else {
        //"SIGNED MESSAGE"
        ciphertext = ciphertext.replace(/[^\S\r\n]+$/gm, "")
        var message = {str : ""};
        var status = CWrapper.verifySignature(message, ciphertext, sender);
        Logger.dbg("veryfied signature for sender:"+sender + " with status:"+status);
        message= message.str;
        this.updateToolBar(status);

        //signature failed if NOT (status is 0 or no_sig)
        //user has to be notified if any non-signature errors happen
        if(status != 0 && CWrapper.getErrorStr(status) != "no_sig"){
          //error
          Logger.error("signature check failed: " + status + "\n" +
                       this.languagepack.getString(CWrapper.getErrorStr(status)));

          //message could not be decrypted => only display ciphertext (and show
          //the error to the user)
          if(status > 0 && status <= CWrapper.getMaxErrNum()){
            Logger.infoPopup(this.languagepack.getString(CWrapper.getErrorStr(status)));
            //critical error
            message = ciphertext;
          }
        }

        //update message
        var isHtml = message.search("<html>") != -1;
        this.insertEmail(event.currentTarget.contentDocument, message, isHtml);
      }
    }
    else{
      //error: body is null (this should never happen, Thunderbird should supply us with the email)
      Logger.error("event.currentTarget.contentDocument.body is null");
    }
  };

  //helper function to insert email into documentBody
  this.insertEmail = function(document, email, bool_html){
    //EXPLANATION: 
    // event.currentTarget.contentDocument.documentElement.innerHTML holds the
    // "original" (encrypted) email document. This document already includes
    // some info (e.g. title = email-subject...).
    // That means replacing the Thunderbird email-document with the decrypted
    // email content document would kill these infos.
    // => solution: we only replace the "body" of the document (i.e. the encrypted text).
    // => watch out, the "body" holds info too, so we need to alter the "pre" or "div"
    //    element in that body.
    //    ATTENTION: if attachments are displayed there are multiple DIV elements and PRE holds the attachment, not the email!

    Logger.dbg(email); //XXX: remove

    //get elements
    var pre = document.body.getElementsByTagName("pre");
    var div = document.body.getElementsByTagName("div");

    //search for "-----BEGIN PGP MESSAGE-----" and replace it
    //search PRE tags
    for(var p in pre){
      if(p.search("-----BEGIN PGP") != -1){
        Logger.dbg("Found correct <PRE>");
        p.innerHTML = email;
        return;
      }
    }
    //search DIV tags
    for(var d in div){
      if(d.search("-----BEGIN PGP") != -1){
        Logger.dbg("Found correct <DIV>");
        d.innerHTML = email;
        return;
      }
    }

    //try to create DIV if no DIV/PRE exists
    if(document.body.textContent.search("-----BEGIN PGP") != -1){
      //log
      Logger.dbg("Recreating <DIV>");
      //clear
      document.body.textContent = "";
      //create new
      div = document.createElement("div");
      //check html vs text
      if(Prefs.getPrefByString("html_as", "mailnews.display.") == 1){
        //display email as text
        div.textContent = email;
      }else{
        //display email as HTML
        div.innerHTML = email;
      }
      document.body.appendChild(div);
      return;
    }
    
    //could not find PGP message
    //write decrypted content as pure-text... (at least)
    document.body.textContent = email;
  };

  //helper function to colorize verification toolbar
  this.updateToolBar = function(status){
    if(status == 0){
      //ok => green
      this.cmToolbar.setAttribute("style", "background-color: green;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar_ok"));
      this.cmToolbar.children[0].setAttribute("style", "color: white;");
    }
    else if(CWrapper.getErrorStr(status) == "no_sig"){
      //no sig => grey
      this.cmToolbar.setAttribute("style", "background-color: transparent;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar")+ ": " + this.languagepack.getString("no_sig"));
      this.cmToolbar.children[0].setAttribute("style", "color: black;");
    }
    else if(CWrapper.getErrorStr(status) == "nopubkey_sig"){
      //no key present => orange
      this.cmToolbar.setAttribute("style", "background-color: orange;");
      this.cmToolbar.children[0].setAttribute(
        "value", this.languagepack.getString("verifytoolbar") + ": " + this.languagepack.getString("nopubkey_sig"));
      this.cmToolbar.children[0].setAttribute("style", "color: black;");
    }
    else if(CWrapper.getErrorStr(status) == "sig_expired"){
      //no sig => grey
      this.cmToolbar.setAttribute("style", "background-color: orange;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar")+ ": " + this.languagepack.getString("sig_expired"));
      this.cmToolbar.children[0].setAttribute("style", "color: black;");
    }
    else if(CWrapper.getErrorStr(status) == "sigkey_expired"){
      //no sig => grey
      this.cmToolbar.setAttribute("style", "background-color: orange;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar")+ ": " + this.languagepack.getString("sigkey_expired"));
      this.cmToolbar.children[0].setAttribute("style", "color: black;");
    }
    else if(CWrapper.getErrorStr(status) == "wrong_sig"){
      //no sig => grey
      this.cmToolbar.setAttribute("style", "background-color: red;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar_fail") + ":" +
                                             this.languagepack.getString("wrong_sig"));

      this.cmToolbar.children[0].setAttribute("style", "color: black;");
    }
    else{
      //error => red
      this.cmToolbar.setAttribute("style", "background-color: red;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar_fail"));
      this.cmToolbar.children[0].setAttribute("style", "color: white;");
    }
  };


  //helper function to find account from a message header
  this.findAccountFromHeader = function(msgHdr){
    if(msgHdr.accountKey){
      //message has been moved and the original account is specified by accountKey
      //=> search for accountKey in accounts and get the email-address
      var accMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
          .getService(Components.interfaces.nsIMsgAccountManager);
      var accounts = accMgr.accounts;
      //iterate over accounts and search for the right key
      for(var i = 0; i < accounts.length; i++){
	      var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
	      if(account.key == msgHdr.accountKey){
	        return account.email;
	      }
      }
      return "";
    }
    else{
      //message has NOT been moved and (ATTENTION!) accountKey is empty
      //=> get account via the folder the email is in
      var ret = this.findAccountFromFolder(msgHdr.folder);
      if(ret != null){
	    return ret.defaultIdentity.email;
      }
      else{
	    return "";
      }
    }
  };

  //helper function to find an account from the folder a message is in
  //https://github.com/protz/thunderbird-stdlib
  this.findAccountFromFolder = function(searchFolder) {
    //check
    if (!searchFolder){
      return null;
    }

    //init
    var accMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
        .getService(Components.interfaces.nsIMsgAccountManager);
    var accounts = accMgr.accounts;

    //search for account
    for (var i = 0; i < accounts.length; i++) {
      var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
      var rootFolder = account.incomingServer.rootFolder;
      //search subfolders
      if(rootFolder == searchFolder.rootFolder){
	      return account.QueryInterface(Components.interfaces.nsIMsgAccount);
      }
    }
    //didn't find anything
    return null;
  };
  
} //end of MailListener
