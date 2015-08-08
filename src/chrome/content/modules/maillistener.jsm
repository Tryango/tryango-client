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
  this.window = null;

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
   * function to add a callback in case we are saving a draft
   *  @param    the function callback to call (if we find a draft)
   *
   *  see also: maillistener.jsm::msgAdded and mailwindow.js::send_handler
   *            both marked with "DRAFTCALLBACK:"
   */
  this.addDraftCallback = function(func){
    Logger.dbg("adding draftCallback");
    //just store the callback for now
    this.draftCallback = func;
  };

  /**
   * function to handle incoming emails
   *  @param  header header of type "nsIMsgDBHdr"
   *    see http://doxygen.db48x.net/comm-central/html/
   *    "nsIMsgFolderListener::msgAdded" and "...::msgsClassified"
   */
  this.msgAdded = function(header){
    //assert
    if(!header){
      return;
    }

    //get identity
    var acc = this.findAccountFromHeader(header, true);
    if(acc == ""){
      //print folder and subject of message for debug purposes
      var mimeConvert = Components.classes["@mozilla.org/messenger/mimeconverter;1"]
            .getService(Components.interfaces.nsIMimeConverter);
      var subject =  mimeConvert.decodeMimeHeader(header.subject, null, false, true);
      Logger.error("Could not identify receiving email address (" +
                   header.folder.prettiestName + "/" + subject + ")");
      return;
    }
    if(!acc.mail){
      Logger.error("Implementation error, findAccountFromHeader returned not an object with drafts=true");
      return;
    }
    var identity = acc.mail;
    Logger.dbg("msgAdded " + identity + " " + header.folder.prettiestName);


    //check for drafts
    //DRAFTCALLBACK: this is a helper. If a draft is saved, it gets encrypted but
    //stays open. To decrypt the open compose-mail-window again, we need to get
    //the event when the draft WAS saved. This is done by adding a callback
    //when we find a new Draft message/a Draft message gets updated. In both
    //cases msgAdded is called.
    // => if msgAdded to "Drafts", we call the callback-function
    // (see also mailwindow.js::send_handler - marked with DRAFTCALLBACK)
    if(header.folder && header.folder.URI == acc.draftfolder){
      //URI of message matches the draftfolder of this account => it is a draft
      Logger.dbg("found a new draft");
      if(this.draftCallback){
        //new draft and we are waiting for a draft (callback != null)
        //=> call callback-function and reset
        Logger.dbg("calling draftCallback");
        this.draftCallback();
        this.draftCallback = null;
      }
    }
    //search email for AP (then it's a confirmation email of the server and we need to process it)
//searchAP aborts immediatelly if we are not in "searching" mode (Prefs)
    else if(this.searchAP(header, identity)){
      this.submitKey(identity);
    }
    else{
      // Disable until implemented
//       if(!this.searchNewKey(header, identity)){
//         this.searchOldKey(header, identity);
//       }
    }
  };

  this.searchNewKey = function(header, identity){
    Logger.dbg("serchNewKey for " + identity);
    var reqDevice = header.getStringProperty(this.XHEADER_NEWKEY.toLowerCase());
    let device = Prefs.getPref("machineID");
    var sender = header.author.substring(header.author.indexOf("<") + 1,
                                           header.author.indexOf(">"));
    if(reqDevice && (reqDevice.length > 0) && reqDevice != device ){
      MsgHdrToMimeMessage(header, null, function (aMsgHdr, aMimeMessage) {
        // do something with aMimeMessage:
        let keyStr = aMimeMessage.coerceBodyToPlaintext();
        let start = keyStr.search("-----BEGIN PGP MESSAGE-----");
        let end = keyStr.search("-----END PGP MESSAGE-----");
//         var decryptedMail = {str : ""};
        if(start != -1 && end != -1){
          Logger.dbg("PGP message found");
          CWrapper.decryptMail(keyStr.substr(start, end - start + 25), sender, "", function(status, decrypted){
            Logger.dbg("Decrypt result:" + status);
            if(status == 0){
              start = decrypted.search("-----BEGIN PGP MESSAGE-----");
              end = decrypted.search("-----END PGP MESSAGE-----");
              if(start != -1 && end != -1){
                keyStr = decrypted.substr(start, end - start + 25);
                CWrapper.post("checkIfCanAdd", [keyStr, sender], function(status2){
                  Logger.dbg("checkIfCanAdd result:" + status);
                  var message = MailListener.languagepack.getString("key_add_question");
                  if(status2 == 0 && Logger.promptService.confirm(null, "Tryango", message)){
                    CWrapper.post("importSecretKey", [keyStr, sender], function(status3){
                      Logger.dbg("Added key with status" + status3);
                    });
                  }
                });
              }
            }
          });
        }
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
    let hexAp = Pwmgr.getAp(identity);
    MailListener._dosendEmail = false;
    if(hexAp != undefined && hexAp.length > 1){
      MailListener._runningGetDev = true;
      //ap will be added in CWrapper.post - current one may get outdated
      CWrapper.post("submitKey", [identity, device], function(newHexAp, status){
        MailListener._dosendEmail = false;
        if(newHexAp.length > 2){
          Pwmgr.setAp(identity, newHexAp);
        }

        if(status == 0){
          Logger.dbg("Added identity: " + identity);
          try{
            var ap = Pwmgr.getAp(identity);
            if(ap != undefined && ap.length > 1){
              CWrapper.post("getDevices", [identity, device], function(newHexAp2, status, devices){
                if(newHexAp2.length > 2){
                  Pwmgr.setAp(identity, newHexAp2);
                }
                if(status == 0 && devices.length > 1){
                  MailListener._dosendEmail = true;
                }
                MailListener._runningGetDev = false;
              });
            }
            else{
              MailListener._runningGetDev = false;
            }
          }
          catch(err){
            MailListener._runningGetDev = false;
          }
          CWrapper.post("synchronizeSK", [identity], function(status){
            if(status != 0){
              Logger.error(CWrapper.languagepack.getString("no_corresponding_key") +": " + identity);
            }
            else{
              Logger.dbg("Keypurse synchronised successfully for id "+ identity);
            }
          });
          Dialogs.info(MailListener.languagepack.getString("signup_done") + " (" + identity + ")");
          //signup is done, so ask user to back up tryango credentials now
          this.askUserToBackup();
        }
        else if(status == 18){//ANG_ID_ALREADY_EXISTS
          Logger.dbg("Added ap but no need to sumbit new key for identity: " + identity + " got ap:" + newHexAp +  " new ap:" + Pwmgr.getAp(identity));
          Dialogs.info(MailListener.languagepack.getString("signup_done") + " (" + identity + ")");
          MailListener._runningGetDev = false;
        }
        else{
          let errorStr = CWrapper.getErrorStr(status);
          let err = this.languagepack.getString("signup_failed") + ": " +
            this.languagepack.getString(errorStr) + " (" + status + ")";
          Dialogs.error(err + "\n(" + errorStr + ")");
          MailListener._runningGetDev = false;
        }
      }.bind(this));
      let mediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
                       .getService(Components.interfaces.nsIWindowMediator);
      var window = mediator.getMostRecentWindow("mail:3pane");//getOuterWindowWithId("messengerWindow")
      window.setTimeout(MailListener._tryToSendEmail, 2000, identity);
        //           Logger.dbg("Encrytped key to send:" + encrKey.str);
    }
    else{
      Dialogs.error(this.languagepack.getString("no_ap"));
    }
  };

  this._tryToSendEmail = function(identity){
    //TODO: disable it for the time being..
    return;
    Logger.dbg(" Try to send ");
    if(MailListener._runningGetDev){
      let mediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
                       .getService(Components.interfaces.nsIWindowMediator);
      var window = mediator.getMostRecentWindow("mail:3pane");//getOuterWindowWithId("messengerWindow")
      window.setTimeout(MailListener._tryToSendEmail, 2000, identity);
      return;
    }
    else{
      let device = Prefs.getPref("machineID");
      Logger.dbg(" Sending**************************************** id:"+identity);
      //sending mail
      var message = MailListener.languagepack.getString("mail_question_p1") + "\n\n" +
        MailListener.languagepack.getString("mail_question_p2");
      if(MailListener._dosendEmail && (!Prefs.getPref("advancedOptions")
                                             || Logger.promptService.confirm(null, "Tryango", message) )){
        let encrKey = {str : ""};
        message = MailListener.languagepack.getString("mail_explanation_newkey").replace("$DEVICE", device) + "\n\n\n";
//         let status =  CWrapper.getEncryptedSK(encrKey, identity, message); //TODO finish
        CWrapper.getEncryptedSK(identity, message, function(status, encrKey){
          if(status == 0 && encrKey.length > 0){
            message = MailListener.languagepack.getString("mail_explanation_newkey").replace("$DEVICE", device)
                    + "\n\n\n" + encrKey;
            let custom_headers = {};
            custom_headers[MailListener.XHEADER_NEWKEY] =  device;
            sendMessage(identity, MailListener.languagepack.getString("mail_subject_newkey"), message, null, custom_headers);
          }
          else{
            Logger.dbg("Failed to get key to encrypt, status:" + status + " identity:" + identity);
          }
        });
      }
      else{
        CWrapper.post("clearTempKey",[], null);
      }
    }
  };

  this.askUserToBackup = function(){
    //ask user to do backup only if we generated new key - otherwise user have key in some form
    if(CWrapper.keyPurseNeedsBackup){
      if(Logger.promptService.confirm(null, "Tryango",
                                      this.languagepack.getString("prompt_user_backup"))){
        //backup
        Logger.dbg("backing up keys");
        Utils.exportKeyPurse(this.languagepack);
      }
      else{
        //no backup
        Logger.log("user refused to do a backup of Tryango credentials");
      }
      delete CWrapper.keyPurseNeedsBackup;
    }
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
  };


  this.getPgpMessage = function(body){
    if(!body) return {ciphertext: ""};
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
  this.onMsgDisplay = function(window, event){
//     //explanation: hooked messagepane and overload "onpageshow" function (see tryango.js)
//     //event is pageshow-Event on target messagepane
//************************EXPERIMET VV
    //reset gui
//     let mediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
//                   .getService(Components.interfaces.nsIWindowMediator);
//     var win = mediator.getMostRecentWindow("mail:3pane");//getOuterWindowWithId("messengerWindow")
//     Logger.dbg("curr msg uri:"+ gCurrentMessageUri);
    MailListener.updateToolBar(-1);//processing

    // find mail body
    var msgHdr = null;
    try{
      let messageURI = window.gFolderDisplay.view.dbView.URIForFirstSelectedMessage;
//       Logger.dbg("msgHeader:" + messageURI);

      let messenger = Components.classes["@mozilla.org/messenger;1"]
                      .createInstance(Components.interfaces.nsIMessenger);
      msgHdr = messenger.msgHdrFromURI(messageURI);
    }
    catch(e){
      msgHdr = MailListener.gFolderDisplay.selectedMessage;
    }
    Logger.dbg("msgHeader:" + msgHdr);

    if(msgHdr){
      var sender = msgHdr.author.substring(msgHdr.author.indexOf("<") + 1,
                                             msgHdr.author.indexOf(">"));
      if(!sender || sender.length < 1){//fallback method to find sender
        var msgPane = null;
        for (var j = 0; j < window.frames.length && msgPane == null; j++) {
          if (window.frames[j].name == "messagepane") {
            msgPane =  window.frames[j];
          }
        }
        let box = window.document.getElementById("expandedfromBox");
        if(box){
          let child = msgPane.document.getAnonymousNodes(box)[0];
          if(child && child.firstChild && child.firstChild.firstChild){
            sender = msgPane.document.getAnonymousNodes(box)[0].firstChild.firstChild.getAttribute("emailAddress");
          }
        }
      }
      if(!sender || sender.length < 1){
        Logger.error("Could not find sender");
        return;
      }

      this.currDoc = event.currentTarget.contentDocument;
      MsgHdrToMimeMessage(msgHdr, null, function (aMsgHdr, aMimeMessage) {
        let msgStr;
        try{
          msgStr = aMimeMessage.coerceBodyToPlaintext();
        }
        catch(e){
          msgStr = MailListener.currDoc.body.textContent;
          Logger.log("Could not get text content of the email:" + e + " - trying to recover html");
          msgStr = MailListener.recoverHtml(msgStr);
          var isHtml = msgStr.search("<html") != -1;
          MailListener.insertEmail(MailListener.currDoc, msgStr, isHtml);
          return;
        }
        var msgObj = MailListener.getPgpMessage(msgStr);
        if(msgObj.ciphertext != ""){
          var sender = msgHdr.author.substring(msgHdr.author.indexOf("<") + 1,
                                               msgHdr.author.indexOf(">"));
          if(!sender || sender.length < 1){//fallback method to find sender
            var msgPane = null;
            for (var j = 0; j < window.frames.length && msgPane == null; j++) {
              if (window.frames[j].name == "messagepane") {
                msgPane =  window.frames[j];
              }
            }
            let box = window.document.getElementById("expandedfromBox");
            if(box){
              let child = msgPane.document.getAnonymousNodes(box)[0];
              if(child && child.firstChild && child.firstChild.firstChild){
                sender = msgPane.document.getAnonymousNodes(box)[0].firstChild.firstChild.getAttribute("emailAddress");
              }
            }
          }

          if(msgObj.blockType=="MESSAGE"){
            Logger.dbg("decrypting email without checking signature.");

            if(CWrapper.libraryLoaded){
              var ret = CWrapper.synchDecryptMail(msgObj.ciphertext);
              if(ret.status > 0 && ret.status <= CWrapper.getMaxErrNum()){
                Dialogs.error(MailListener.languagepack.getString("mail_dec_failed") + "\nError: "
                             + MailListener.languagepack.getString(CWrapper.getErrorStr(ret.status)));
                MailListener.updateToolBar(ret.status);
              }
              else{
                var isHtml = ret.decrypted.search("<html") != -1;
                MailListener.insertEmail(MailListener.currDoc, ret.decrypted, isHtml);
                //getting sender
                if(status != 33){//ANG_NO_SIG)
                  if(sender && sender.length > 0){
                    MailListener.updateToolBar(-3);//veryfing signature
                    CWrapper.decryptMail(msgObj.ciphertext, sender, ret.password,
                                         function(status, decrypted){
                                           MailListener.updateToolBar(status);
                                         });
                  }
                  else{
                    Logger.error("Could not find sender");
                    MailListener.updateToolBar(-4);//no_sender
                  }
                }
                else{
                  MailListener.updateToolBar(ret.status);
                }
              }
            }
            else{//library not loaded yet - we cannot do sych calls
              Logger.log("Library not loaded yet - we cannot do sych calls");
              CWrapper.decryptMail(msgObj.ciphertext, sender, "",
                function(status, decrypted){
                  if(status > 0 && status <= CWrapper.getMaxErrNum()){
                    Dialogs.error(MailListener.languagepack.getString("mail_dec_failed") + "\nError: "
                                 + MailListener.languagepack.getString(CWrapper.getErrorStr(status)));
                  }
                  else{
                    var isHtml = decrypted.search("<html") != -1;
                    MailListener.insertEmail(MailListener.currDoc, decrypted, isHtml);

                  }
                  MailListener.updateToolBar(status);
              });

            }
          }
          else{
            //"SIGNED MESSAGE"
            Logger.dbg("veryfing signature for msg" + msgObj.ciphertext);
            var status = CWrapper.post("verifySignature", [msgObj.ciphertext, sender],
              function(status, message){
                Logger.dbg("verified signature for sender:"+sender + " with status:"+status);
                if(status != 0 && CWrapper.getErrorStr(status) != "no_sig"){
                  //error
                  Logger.error("signature check failed: " + status + "\n" +
                               MailListener.languagepack.getString(CWrapper.getErrorStr(status)));

                  //message could not be decrypted => only display ciphertext (and show
                  //the error to the user)
                  if(status > 0 && status <= CWrapper.getMaxErrNum()){
                    Dialogs.error(MailListener.languagepack.getString(CWrapper.getErrorStr(status)));
                  }
                }
                MailListener.updateToolBar(status);
                //update message
                if(message.length > 0){
                  var isHtml = message.search("<html") != -1;
                  MailListener.insertEmail(MailListener.currDoc, message, isHtml);
                }
              });
          }
        }
        else{
          Logger.dbg("Empty ciphertext");
          MailListener.updateToolBar(-2);
        }
      }, true);
    }
    else{
      Logger.error("Could not get message header!");
      MailListener.updateToolBar(-5); //hide toolbar - if we cannot get message header then message is e. g. welcome page of Thunderbird
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
    // => solution: we only replace the "body" of the document (i.e. the encrypted text)
    //    and merge the rest
    // => watch out, the "body" holds info too, so we need to alter the "pre" or "div"
    //    element in that body.
    //    ATTENTION: if attachments are displayed there are multiple DIV elements and PRE
    //               holds the attachment, not the email!

    //assert
    if(!document.body){
      Logger.error("Document body does not exist! (this should be provided by Thunderbird)");
      return;
    }

    //get email <body> element
    var newBody = "";
    if(bool_html){
      //html email
      Logger.dbg("html email arrived, merging with document");

      //cut body out of email
      var parser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
          .createInstance(Components.interfaces.nsIDOMParser);
      var newDOM = parser.parseFromString(email, "text/html");

      //recreate meta-data if View->Message Body As->Plain Text is NOT text
      if(Prefs.getPrefByString("html_as", "mailnews.display.") != 1){
        //merge document.head and newDOM.head
        document.head.innerHTML += newDOM.head.innerHTML;
        Logger.dbg("merged head:\n" + document.head.outerHTML);

        //overwrite attributes of document.body with the ones of newDOM.body
        for each(var att in newDOM.body.attributes){
          //is att defined?
          if(att && att.value != undefined){
            //replace document.body.<att> with newDOM.body.<att>
            Logger.log("replacing: " + att.name + " " + att.value);
            document.body.setAttribute(att.name, att.value);
          }
        }
        Logger.dbg("merged body attributes:\n" + document.body.outerHTML);
      }

      //set body
      newBody = newDOM.body.innerHTML;
    }
    else{
      //plaintext email
      newBody = email;
    }

    //if message is html BUT View->Message Body As->Plain Text is text
    if(bool_html && Prefs.getPrefByString("html_as", "mailnews.display.") == 1){
      //strip html a bit
      newBody = Utils.stripHTML(newBody);
    }

    Logger.dbg("Inserting email:\n" + newBody);

    //get elements
    var pre = document.body.getElementsByTagName("pre");
    var div = document.body.getElementsByTagName("div");

    //search for "-----BEGIN PGP MESSAGE-----" and replace it
    //search PRE tags
    for(var p in pre){
      if(p.search("-----BEGIN PGP") != -1 || p.search("----TRYANGO START----") != -1){
        Logger.dbg("Found correct <PRE>");
        p.innerHTML = newBody;
        return;
      }
    }
    //search DIV tags
    for(var d in div){
      if(d.search("-----BEGIN PGP") != -1){
        Logger.dbg("Found correct <DIV>");
        d.innerHTML = newBody;
        return;
      }
    }

    //try to create DIV if no DIV/PRE exists
    if(document.body.textContent.search("-----BEGIN PGP") != -1 || document.body.textContent.search("----TRYANGO START----") != -1){
      //log
      Logger.dbg("Recreating <DIV>");
      //clear
      document.body.textContent = "";
      //create new
      div = document.createElement("div");
      //check html vs text
      //if message NOT html or View->Message Body As->Plain Text => text
      if(!bool_html || Prefs.getPrefByString("html_as", "mailnews.display.") == 1){
        Logger.dbg("Recreating <PRE>");
        //display email as text
        //add pre tag to achieve pure text...
        div.textContent = "";
        pre = document.createElement("pre");
        pre.textContent = newBody;
        div.appendChild(pre);
      }
      else{
        Logger.dbg("display email as html");
        //display email as HTML
        div.innerHTML = newBody;
      }
      document.body.appendChild(div);
      return;
    }

    //could not find PGP message
    //write decrypted content as pure-text... (at least)
    document.body.textContent = newBody;
  };

  //helper function to colorize verification toolbar
  this.updateToolBar = function(status){
    if(status == -5){ //hide verification toolbar
      this.cmToolbar.setAttribute("hidden", "true");
      return;
    }
    else{
      this.cmToolbar.removeAttribute("hidden");
    }
    if(status == -4){ //no_sender
      this.cmToolbar.setAttribute("style", "background-color: orange;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar") + ": " +this.languagepack.getString("no_sender"));
      this.cmToolbar.children[0].setAttribute("style", "color: black;");
    }
    if(status == -3){ //decrypted waiting for signature verification
      this.cmToolbar.setAttribute("style", "background-color: transparent;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar") + ": " +this.languagepack.getString("veryfing_signature"));
      this.cmToolbar.children[0].setAttribute("style", "color: black;");
    }
    else if(status == -2){ //no encrypted email
      this.cmToolbar.setAttribute("style", "background-color: transparent;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar") + ": " +this.languagepack.getString("not_encrypted"));
      this.cmToolbar.children[0].setAttribute("style", "color: black;");
    }
    else if(status == -1){ //decryption in progress
      this.cmToolbar.setAttribute("style", "background-color: transparent;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar") + ": " +this.languagepack.getString("processing"));
      this.cmToolbar.children[0].setAttribute("style", "color: black;");
    }
    else if(status == 0){
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
    else if(CWrapper.getErrorStr(status) == "no_key_present"){
      //no sig => grey
      this.cmToolbar.setAttribute("style", "background-color: orange;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar")+ ": " + this.languagepack.getString("no_key_present"));
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
    else if(CWrapper.getErrorStr(status) == "cancel"){
      //no sig => grey
      this.cmToolbar.setAttribute("style", "background-color: orange;");
      this.cmToolbar.children[0].setAttribute("value", this.languagepack.getString("verifytoolbar")+ ": " + this.languagepack.getString("cancel"));
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
  this.findAccountFromHeader = function(msgHdr, drafts = false){
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
            if(drafts){
              return {"mail": account.email,
                      "draftfolder": account.draftFolder};
            }
            else{
              return account.email;
            }
          }
        }

        //TODO: FIXME: could not identify receiving email address when encrypted mail arrives (is this line the error?)
        Logger.error("msgHdr.accountKey does not match any account.key");
        return "";
      }
      else{
        //message has NOT been moved and (ATTENTION!) accountKey is empty
        //=> get account via the folder the email is in
        var ret = this.findAccountFromFolder(msgHdr.folder);
        if(ret != null){
          if(drafts){
            return {"mail": ret.defaultIdentity.email,
                    "draftfolder": ret.defaultIdentity.draftFolder};
          }
          else{
            return ret.defaultIdentity.email;
          }
        }
        else{
          Logger.error("Find account account from header did not find email address");
          return "";
        }
      }
    }
    else{
      Logger.error("Find account account from header did not find email addres - msgHeader is null");
      return "";
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
