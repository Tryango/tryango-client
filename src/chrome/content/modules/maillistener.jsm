/* A class to check incoming e-mails */

//imports
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/mailServices.js");
Components.utils.import("resource://gre/modules/iteratorUtils.jsm");
Components.utils.import("resource:///modules/gloda/mimemsg.js");//for MsgHdrToMimeMessage

//own imports
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/dialogs.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");
Components.utils.import("resource://tryango_modules/prefs.jsm");
Components.utils.import("resource://tryango_modules/pwmanager.jsm");
Components.utils.import("resource://tryango_modules/send.jsm");
Components.utils.import("resource://tryango_modules/utils.jsm");

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
  this.gFolderDisplay = null;
  this.languagepack = null;
  this.cmToolbar = null;

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
        let start = keyStr.search("-----BEGIN PGP");
//         if(document.body.textContent.search("-----BEGIN PGP") != -1){
//         }
        
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
      Dialogs.info(this.languagepack.getString("att_dec_failed") + " " + this.path +
                               "\n(" + this.languagepack.getString(CWrapper.getErrorStr(status)) +
                               ")");

      Dialogs.info(err);
    }
    else{
      if(result == 18 ){ //ANG_ID_ALREADY_EXISTS
        Logger.dbg("Added ap but no need to sumbit new key for identity: " + identity);
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
        var message = this.languagepack.getString("mail_question_p1") + "\n\n" +
          this.languagepack.getString("mail_question_p2");
        if(sendEmail && Logger.promptService.confirm(null, "Tryango", message)){
          let encrKey = {str : ""};
          let status =  CWrapper.getEncryptedSK(encrKey, identity);
          Logger.dbg("Encrytped key to send:" + encrKey.str);
          if(status == 0 && encrKey.str.length > 0){
            message = this.languagepack.getString("mail_explanation_newkey").replace("$DEVICE", device) + "\n\n\n" + encrKey.str;
            let custom_headers = {};
            custom_headers[this.XHEADER_NEWKEY] =  device;
            sendMessage(identity, this.languagepack.getString("mail_subject_newkey"), message, null, custom_headers);
          }
          else{
            Logger.dbg("Failed to get key to encrypt, status:" + status + " identity:" + identity);
          }
        }
        else{
          CWrapper.clearTempKey();
        }
      }
      if(CWrapper.synchronizeSK(identity) != 0){
        Logger.error(this.languagepack.getString("no_corresponding_key") +": " + identity);
      }
      Dialogs.info(this.languagepack.getString("signup_done") + " (" + identity + ")");
    }
    //ap is updated in submitKey, no need to do it here
  };


  this.recoverHtml = function(body){
    var htmlStart = body.indexOf("<html>");
    if(htmlStart < 0){
      return body;
    }
    var htmlEnd = body.indexOf("</html>");
    if(htmlEnd < 0 || htmlEnd < htmlStart){
      return body;
    }
    return body.substr(htmlStart,  htmlEnd + 7 - htmlStart);
  }


  this.getPgpMessage = function(body){
    var PGPstart = body.indexOf("-----BEGIN PGP ");
    if(PGPstart < 0){
      Logger.dbg("Unencrypted email");
      return {ciphertext:"", blockType:""};
    }

    var indent = body.substring(body.substr(0, PGPstart).lastIndexOf("\n") + 1, PGPstart);
    var beginIndexObj = new Object();
    var endIndexObj = new Object();
    var indentStrObj = new Object();
    var blockType = Prefs.locateArmoredBlock(body, 0, indent,
        beginIndexObj, endIndexObj,
        indentStrObj);
    Logger.dbg("block type \"" + blockType + "\"" + " indent\"" + indent + "\"");

    if ((blockType != "MESSAGE") && (blockType != "SIGNED MESSAGE")){
      Logger.dbg("wrong block type \"" + blockType + "\"");
      return {ciphertext:"", blockType:blockType};
    }

    var beginIndex = beginIndexObj.value;
    var endIndex   = endIndexObj.value;

    var head = body.substr(0, beginIndex);
    var tail = body.substr(endIndex + 1);
    var ciphertext = body.substr(beginIndex, endIndex - beginIndex + 1);

    var indentRegexp;
    if (indent) {
      Logger.dbg("indent:\"" + indent + "\"");
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

    return{
      ciphertext: ciphertext,
      blockType: blockType
    }
  };

  //messaged to be called when a mail is displayed => check for PGP header
  //and decrypt/verify if necessary
  this.onMsgDisplay = function(event){
    //explanation: hooked messagepane and overload "onpageshow" function (see tryango.js)

    //reset
    this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar"));
    this.cmToolbar.setAttribute("style", "background-color: transparent;");
    this.cmToolbar.children[0].setAttribute("style", "color: black;");
    var msgHdr = this.gFolderDisplay.selectedMessage;
    if(!msgHdr){
      //no message selected
      Logger.dbg("no message header");
      return;
    }

    //search for signed/encrypted (BEGIN PGP MESSAGE/BEGIN PGP SIGNED MESSAGE?)
    if(event.currentTarget.contentDocument.body != null){
      //get sender
      var sender = msgHdr.author.substring(msgHdr.author.indexOf("<") + 1,
                                           msgHdr.author.indexOf(">"));

      this.currDoc = event.currentTarget.contentDocument;
      MsgHdrToMimeMessage(msgHdr, null, function (aMsgHdr, aMimeMessage) {
        let keyStr;
        try{
          keyStr = aMimeMessage.coerceBodyToPlaintext();
        }
        catch(e){
          keyStr = MailListener.currDoc.body.textContent;
          Logger.log("Could not get text content of the email:" + e + " - trying to recover html");
          keyStr = MailListener.recoverHtml(keyStr);
          var isHtml = keyStr.search("<html") != -1;
          MailListener.insertEmail(MailListener.currDoc, keyStr, isHtml);
          return;
        }

        // do something with aMimeMessage:
//         Logger.dbg("Get new key\""+keyStr+ "\"");
        var msgObj = MailListener.getPgpMessage(keyStr);

        if(msgObj.ciphertext != ""){
          var decryptedMail = {str : ""};
          if(msgObj.blockType=="MESSAGE"){
            var recipient = MailListener.findAccountFromHeader(msgHdr);
            Logger.dbg("decrypting email for " + recipient + " from " + sender);
            var status = CWrapper.decryptMail(decryptedMail, msgObj.ciphertext, sender, recipient);
            if(status > 0 && status <= CWrapper.getMaxErrNum()){
              Logger.error("Decrypt failed with error: " + MailListener.languagepack.getString(CWrapper.getErrorStr(status)));
              //tell user
              Dialogs.info(MailListener.languagepack.getString("mail_dec_failed") + "\nError: " + MailListener.languagepack.getString(CWrapper.getErrorStr(status)));
              return;
            }
            MailListener.updateToolBar(status);
            //searching for <html> works since in the body it becomes &lt;html&gt;
            //so if finding a <html> tag, it is a "real" one and not text of the email
            var isHtml = decryptedMail.str.search("<html") != -1;
            MailListener.insertEmail(MailListener.currDoc, decryptedMail.str, isHtml);
          }
          else{
          //"SIGNED MESSAGE"
            Logger.dbg("display dbg 11");
            Logger.dbg("veryfing signature for msg" + msgObj.ciphertext);
            var status = CWrapper.verifySignature(decryptedMail, msgObj.ciphertext, sender);
            Logger.dbg("verified signature for sender:"+sender + " with status:"+status);
            Logger.dbg("display dbg 12");
            let message = decryptedMail.str;
            
            //signature failed if NOT (status is 0 or no_sig)
            //user has to be notified if any non-signature errors happen
            if(status != 0 && CWrapper.getErrorStr(status) != "no_sig"){
              //error
              Logger.error("signature check failed: " + status + "\n" +
                           MailListener.languagepack.getString(CWrapper.getErrorStr(status)));
              
              //message could not be decrypted => only display ciphertext (and show
              //the error to the user)
              if(status > 0 && status <= CWrapper.getMaxErrNum()){
                Dialogs.info(MailListener.languagepack.getString(CWrapper.getErrorStr(status)));
//                 Logger.infoPopup(MailListener.languagepack.getString(CWrapper.getErrorStr(status)));
                //critical error
                message = msgObj.ciphertext;
              }
            }
            MailListener.updateToolBar(status);
            
            //update message
            var isHtml = message.search("<html") != -1;
            MailListener.insertEmail(MailListener.currDoc, message, isHtml);
          }

        }
        else{
          Logger.dbg("Empty ciphertext");
        }
        return;
      }, true);
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
    if(email.search("<html") != -1){
      //cut body out of email
      var re = new RegExp("<body [^>]*>(.*)</body>");
      let emailBody = email.match(re);
      if(emailBody == null || emailBody.length != 2){ // 2 cause decryptedMailPureText is an array: ["<body...> email </body>", "email"]
        Logger.error("Could not find body in email!"+ email);
      }
      else{
        Logger.dbg("Found body in email!");
        email = emailBody[1]; //get only the email = regex part "(.*)"
      }
    }

    Logger.dbg("Inserting email:\n" + email); //XXX: remove

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
	  //if message not html or View->Message Body As->Plain Text => text
      if(!bool_html || Prefs.getPrefByString("html_as", "mailnews.display.") == 1){
		Logger.dbg("Recreating <PRE>");
        //display email as text
		//add pre tag to achieve pure text...
		div.textContent = "";
		pre = document.createElement("pre");
		pre.textContent = email;
		div.appendChild(pre);
      }else{
		Logger.dbg("display email as html");
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
    if(msgHdr){
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
          Logger.error("Find account account from header did not find email addres");
	        return "";
        }
      }
    }
    else{
        Logger.error("Find account account from header did not find email addres - mshHeader is null");
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
