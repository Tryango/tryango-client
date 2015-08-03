//TODO: (machineID) make sure machineID is not signing up the same device twice


/* Basic file for JavaScript code on composing a new e-mail */

// own modules
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");
Components.utils.import("resource://tryango_modules/maillistener.jsm");
Components.utils.import("resource://tryango_modules/prefs.jsm");
Components.utils.import("resource://tryango_modules/attachmentManager.jsm");
Components.utils.import("resource://tryango_modules/utils.jsm");
Components.utils.import("resource://tryango_modules/dialogs.jsm");

//NO exports, do not import this file!

// class for handling the "compose" window of Thunderbird
// ATTENTION:   for every new "compose" window a new class will be created
//      in order to identify them, an ID was added
var MailWindow = new function(){
  // constants
  this.COLOUR_APPROVED = "#AAFFAA";
  this.COLOUR_REJECTED = "#FFAAAA";
  this.DEFAULT_COLOUR = "transparent";
  this.RECIPIENTSFIELD_PREFIX = "addressCol2#";
  // generate a unique ID for each window (not automatically done!)
  // use miliseconds of time for it
  Logger.dbg("Previous id:"+this.id);
  this.id = "id" + Date.now();
  // variables
  this.encrypt = null;
  this.sign = null;

  /*
   * onload function, called when new mail is created
   *  @param  event     the associated event
   */
  this.onload = function(event){
    // log
    Logger.dbg("mailwindow " + this.id + " onload");

    // language pack
    this.languagepack = document.getElementById("lang_file");

    //check if tryango is disabled => disable buttons
    if(Prefs.tryangoDisabled){
      document.getElementById("button-cm-send").setAttribute("disabled", "true");
      document.getElementById("tryango-menu-send").setAttribute("hidden", "true");
      return;
    }

    // hook "recipients" field
    var addrCol = document.getElementById("addressCol2#1");
    if (addrCol) {
      //var attr = adrCol.getAttribute("oninput");
      //adrCol.setAttribute("oninput", "MailWindow.recipientsChange();" + attr);
      var attr = addrCol.getAttribute("onchange");
      addrCol.setAttribute("onchange", "MailWindow.recipientsChange(this);" + attr);
      attr = addrCol.getAttribute("onfocus");
      addrCol.setAttribute("onfocus", onfocus + "MailWindow.recipientsOnFocus(this);");
    }
    else{
      Logger.error("Could not hook recepients-field of mailwindow " + this.id);
    }
  }

  this.reload = function(){
    Logger.dbg("Reloading prefs of window " + this.id);

    //reload encrypt from prefs
    this.encrypt = Prefs.getPref("encryptMessages");
    //update menu entries
    if(this.encrypt){
      document.getElementById("menu-encrypt").setAttribute("checked", true);
      document.getElementById("button-encrypt").setAttribute("checked", true);
    }
    else{
      document.getElementById("menu-encrypt").removeAttribute("checked");
      document.getElementById("button-encrypt").removeAttribute("checked");
    }

    //reload sign from prefs
    this.sign = Prefs.getPref("signMessages");
    //update menu entries
    if(this.sign){
      document.getElementById("menu-sign").setAttribute("checked", true);
      document.getElementById("button-sign").setAttribute("checked", true);
    }
    else{
      document.getElementById("menu-sign").removeAttribute("checked");
      document.getElementById("button-sign").removeAttribute("checked");
    }

    //recheck recipients
    if(this.encrypt || this.sign){
      // recheck all fields and colour them
      this.recheckRecipientColours();
    }
    else{
      //reset colours
      this.clearRecipientColours();
    }
  }

  // --- Functionality ---

  this.handleEvent = function(handler){
    Logger.log("mailwindow " + this.id + " handler: " + handler);

    //update value
    //get sign and encrypt value
    if(handler == "button-encrypt"){
      this.encrypt = document.getElementById("button-encrypt").hasAttribute("checked");
    }
    else if(handler == "button-sign"){
      this.sign = document.getElementById("button-sign").hasAttribute("checked");
    }
    else if(handler == "menu-encrypt"){
      this.encrypt = document.getElementById("menu-encrypt").hasAttribute("checked");
    }
    else if(handler == "menu-sign"){
      this.sign = document.getElementById("menu-sign").hasAttribute("checked");
    }
    else{
      //error and stop
      Logger.error("Unknown event: " + id);
      return;
    }

    //redo/undo colouring
    //set encrypt
    if(this.encrypt){
      document.getElementById("menu-encrypt").setAttribute("checked", true);
      document.getElementById("button-encrypt").setAttribute("checked", true);
    }
    else{
      document.getElementById("menu-encrypt").removeAttribute("checked");
      document.getElementById("button-encrypt").removeAttribute("checked");
    }

    //set sign
    if(this.sign){
      document.getElementById("menu-sign").setAttribute("checked", true);
      document.getElementById("button-sign").setAttribute("checked", true);
    }
    else{
      document.getElementById("menu-sign").removeAttribute("checked");
      document.getElementById("button-sign").removeAttribute("checked");
    }

    if(this.encrypt || this.sign){
      // recheck all fields and colour them
      this.recheckRecipientColours();
    }
    else{
      //reset colours
      this.clearRecipientColours();
    }
  }

  /*
   * resetColours   helper function, resets all colours in the mailwindow for recipients
   */
  this.clearRecipientColours = function(){
    // reset all colours
    var i = 1;
    var addrCol = document.getElementById(MailWindow.RECIPIENTSFIELD_PREFIX + i);
    while(addrCol){
      //set default colour
      addrCol.style.backgroundColor = MailWindow.DEFAULT_COLOUR;

      //next element
      i++;
      addrCol = document.getElementById(MailWindow.RECIPIENTSFIELD_PREFIX + i);
    }
  }

  /*
   * recheckRecipientColours  helper function, checks all recipients again and colourizes
   *        their field according to check
   */
  this.recheckRecipientColours = function(){
    var i = 1; //recipientsfield starts with 1!!!
    var addrCol = document.getElementById(MailWindow.RECIPIENTSFIELD_PREFIX + i);
    while(addrCol){
      // empty fields
      if(addrCol.value.length == 0){
        addrCol.style.backgroundColor = MailWindow.DEFAULT_COLOUR;
      }
      else{
        // send to c interface for check => set colour
        CWrapper.post("checkMailAddr",[addrCol.value, i], function(status, seq){
          var addrColLocal = document.getElementById(MailWindow.RECIPIENTSFIELD_PREFIX + seq);
          if(status == 0){
            addrColLocal.style.backgroundColor = MailWindow.COLOUR_APPROVED;
          }
          else{
            addrColLocal.style.backgroundColor = MailWindow.COLOUR_REJECTED;
          }
        });
      }

      //next element
      i++;
      addrCol = document.getElementById(MailWindow.RECIPIENTSFIELD_PREFIX + i);
    }
  }

  /*
   * recipientsOnFocus function, called when recipients field is focused,
   *       resets the field when it is empty
   *  @param  addrCol     the recipients-field that was changed
   */
  this.recipientsOnFocus = function(addrCol){
    if(addrCol.value.length == 0){
      addrCol.style.backgroundColor = MailWindow.DEFAULT_COLOUR;
      return;
    }
  }

  /*
   * recipientsChange function, called when user alters anything in the recipients field
   *      of the compose-mail-window; passes info to C interface and highlights
   *      the fields if valid key found
   *  @param  addrCol     the recipients-field that was changed
   *
   *        fields are always named with id "addressCol2#<number>" with
   *        <number> indicating which field (starting with 1 not 0!)
   */
  this.recipientsChange = function(addrCol){
    // only colourise when encryption/signature is enabled
    if(this.encrypt || this.sign){
      // check if empty
      if(addrCol.value.length == 0){
        addrCol.style.backgroundColor = MailWindow.DEFAULT_COLOUR;
        return;
      }

      // log
      Logger.dbg("recipientsChange: " + addrCol.value);

      // send to c interface for check => set colour
      CWrapper.post("checkMailAddr",[addrCol.value, 0], function(status, seq){
        if(status == 0){
          addrCol.style.backgroundColor = MailWindow.COLOUR_APPROVED;
          Logger.dbg("recipientsChange: approved"+ status);
        }
        else{
          Logger.dbg("recipientsChange: not approved"+ status);
          addrCol.style.backgroundColor = MailWindow.COLOUR_REJECTED;
        }
      }.bind(this));
    }
  }

  /*
   * send_handler function, intercepts the send event of Thunderbird and passed
   *            info to C interface
   *  @param  event     the sending event
   *  @return		positive numbers indicate warnings, negative errors (stop sending!),
   *			0 is ok
   */
  this.send_handler = function(event){
    //check if tryango is disabled, if so, error
    if(Prefs.tryangoDisabled){
      return 2;
    }
    //vars
    var msgcomposeWindow = document.getElementById("msgcomposeWindow");
    var msg_type = Number(msgcomposeWindow.getAttribute("msgtype"));
    var draft = false;

    //Events:  Now, Later, Save, SaveAs, SaveAsDraft,
    //         SaveAsTemplate, SendUnsent, AutoSaveAsDraft
    if(msg_type == nsIMsgCompDeliverMode.Now ||
       msg_type == nsIMsgCompDeliverMode.Later){
      //normal send => continue
    }
    else if(this.isDraft(msg_type)){
      //encrypt/decrypt drafts
      //draft => continue
      draft = true;
    }
    else{
      //other options => stop here
      return 0;
    }

    //ASSERT: double-check our status
    if(document.getElementById("menu-encrypt").hasAttribute("checked") != this.encrypt ||
       document.getElementById("button-encrypt").hasAttribute("checked") != this.encrypt ||
       document.getElementById("menu-sign").hasAttribute("checked") != this.sign ||
       document.getElementById("button-sign").hasAttribute("checked") != this.sign){
      return -4;
    }
    //only encrypt if checkbox is set...
    if(!this.encrypt && !this.sign){
      return 0;
    }

    /****************************
     * get sending email address
     */
    var sender = gCurrentIdentity.email;
    if(draft){
      Logger.dbg("Saving draft (" + sender + ")");
    }
    else{
      Logger.dbg("Sending mail from: " + sender);
    }

    /******************
     * fill recipients
     */
    var recipients = "";
    if(!draft){
      var i = 1; //recipientsfield starts with 1!!!
      //read them from the mailwindow-field(s)
      var addrCol = document.getElementById(MailWindow.RECIPIENTSFIELD_PREFIX + i);
      while(addrCol){
          //check for empty string
        if(/([^\s])/.test(addrCol.value)){
          //store into an array
          recipients += addrCol.value + ",";
        }

        //next field
        i++;
        addrCol = document.getElementById(MailWindow.RECIPIENTSFIELD_PREFIX + i);
      }
      if(recipients.length == 0){
        return -5;
      }
      //strip last ","
      if(recipients.charAt(recipients.length-1) == ","){
        //ATTENTION: second argument of substring is the LENGTH, not the end!
        recipients = recipients.substring(0, recipients.length-1);
      }
      Logger.dbg("Sending mail to: " + recipients);
    }
    else{
      this.sign = false; //no need to sign drafts - we avoid asking password for encrypted keys
      Logger.dbg("Not signing as we are saving draft only");
    }

    /*************************
     * get body of the email
     */
    var mailBody;
    var editor;
    try{
      var sendFlowed = Prefs.getPrefByString("mailnews.send_plaintext_flowed", null);
      if(sendFlowed == undefined){
        sendFlowed = true;
      }
      //get editor
      editor = GetCurrentEditor();
      let dce = Components.interfaces.nsIDocumentEncoder;
      var flags = dce.OutputFormatted | dce.OutputLFLineBreak | dce.OutputPreformatted; //ATTENTION: OutputPreformatted is needed to avoid the double-empty-lines-bug!!!
      if(sendFlowed){
        flags = flags | dce.OutputFormatFlowed;
      }
      if(gMsgCompose.composeHTML){
        //html email
        mailBody = editor.outputToString("text/html", flags);
        mailBody = mailBody.replace(/[^\S\r\n]+$/gm, "");
      }
      else{
		//plaintext
        mailBody = editor.outputToString("text/plain", flags);
      }
	  editor.endTransaction();
      //         mailBody = Utils.convertFromUnicode(mailBody, "UTF-16");
    }
    catch(ex){
      Logger.error("Could not get message body:\n" + ex);
      return -1;
    }

    Logger.dbg("mailBody:\n" + mailBody);
    MailWindow._password = "";
    if(this.sign){
      Logger.dbg("Getting password as we need to sign email");
      var ret = CWrapper.synchGetSignPassword(sender);//TODO: change to asynchronous
      if(ret.status != 0){
        if(ret.status == 21){//ANG_CANCEL
          document.getElementById("menu-sign").removeAttribute("checked");
          document.getElementById("button-sign").removeAttribute("checked");
          this.sign = false;
        }
        else{
          let message;
          if(ret.status == 37){ //key has expired
            message = sender + " - " + CWrapper.languagepack.getString("sec_expired") + ".\n" +
              CWrapper.languagepack.getString("mail_send_unsigned");
          }
          else{
            message = CWrapper.languagepack.getString(CWrapper.getErrorStr(ret.status)) + "\n" +
              CWrapper.languagepack.getString("mail_send_unsigned");
          }
          if(this.encrypt){
            message += " " + CWrapper.languagepack.getString("mail_send_still_encrypted");
          }
          if(Logger.promptService.confirm(null, "Tryango", message)){
            document.getElementById("menu-sign").removeAttribute("checked");
            document.getElementById("button-sign").removeAttribute("checked");
            this.sign = false;
          }
          else{
            return 1;//abort
          }
        }
      }
      else{
        MailWindow._password = ret.password;
        Logger.dbg("Set pw:" + MailWindow._password);
      }
    }
    //check encrypt and sign again since it could have changed above!
    if(!this.encrypt && !this.sign){
      Logger.dbg("No need to encrypt or sign - returning...");
      return 0;
    }
    /************
     *   KEYS
     */
    //if encrypted and not a draft...
    if(this.encrypt && !draft){
        //...check if any recipient has no key
//         var r = recipients.split(",");
//         for(var k = 0; k < r.length; k++){
      CWrapper.post("checkRecipients",[recipients],
        function(status, recipient){
          if(status != 0){
            let message;
            if(status == 31){ //key has expired
              message = recipient + " - " + CWrapper.languagepack.getString("pub_expired") + ".\n" +
                CWrapper.languagepack.getString("mail_send_unencrypted");
            }
            else{
              message = recipient + " " + CWrapper.languagepack.getString("not_with_CM") + "\n" +
                CWrapper.languagepack.getString("mail_send_unencrypted");
            }
            if(Logger.promptService.confirm(null, "Tryango", message)){
              Logger.dbg("User requests unencrypted email since " + recipient + " is not with CM or key has expired");
              this.encrypt = false;
              document.getElementById("menu-encrypt").removeAttribute("checked");
              document.getElementById("button-encrypt").removeAttribute("checked");
              ///send email
              MailWindow._lateSend(msg_type);
              Logger.dbg("********erasing password");
              MailWindow._password = "";
            }
            else{
              //do nothing
            }
          }
          else{
            this._encryptAttachments(recipients, sender, this._password, mailBody, msg_type);
          }
        }.bind(this)
      );
    }
    else{
      this._encryptAttachments(recipients, sender, this._password, mailBody, msg_type);
    }
    return 3;//postpone sending - it will be done from callbacks
  }

  this.isDraft = function(msg_type){
    if (msg_type == nsIMsgCompDeliverMode.Save ||
        msg_type == nsIMsgCompDeliverMode.SaveAsDraft ||
        msg_type == nsIMsgCompDeliverMode.AutoSaveAsDraft ||
        msg_type == nsIMsgCompDeliverMode.SaveAsTemplate){
      return true;
    }
    else{
      return false;
    }
  }

  this._lateSend = function(msg_type){
    if(this.encrypt || !this.sign){
      delete gMsgCompose.domWindow.tryEncrypt;
    }

    var mCF = gMsgCompose.compFields;//TODO - check if this works -check if here is enough
    if(mCF.forcePlainText == false && mCF.useMultipartAlternative == false){
      mCF.useMultipartAlternative = true;
    }
    // code below is taken from Thunderbird source from mail/components/compose/content/MsgComposeCommands.js:2665
    // we cancelled send event and now after encryption/signing we send it again so the code below is ending
    // of function GenericSendMessage(msgType) - we resume the part after returning from calling event listener
    let nsIMsgCompDeliverMode= Components.interfaces.nsIDocumentEncoder;

    var msgWindow = Components.classes["@mozilla.org/messenger/msgwindow;1"]
                        .createInstance(Components.interfaces.nsIMsgWindow);

    var gAutoSaving = (msg_type == nsIMsgCompDeliverMode.AutoSaveAsDraft);
    try{
      if (!gAutoSaving)
      ToggleWindowLock(true);
    // If we're auto saving, mark the body as not changed here, and not
    // when the save is done, because the user might change it between now
    // and when the save is done.
    else{
      SetContentAndBodyAsUnmodified();
    }
    var progress = Components.classes["@mozilla.org/messenger/progress;1"]
                             .createInstance(Components.interfaces.nsIMsgProgress);
    if (progress){
      progress.registerListener(progressListener);
      if (MailWindow.isDraft(msg_type)){
        gSaveOperationInProgress = true;
      }
      else{
        gSendOperationInProgress = true;
      }
    }
    msgWindow.domWindow = window;
    msgWindow.rootDocShell.allowAuth = true;
    Logger.dbg("Late sending message with msg_type: "+  msg_type);
    gMsgCompose.SendMsg(msg_type, getCurrentIdentity(),
                        getCurrentAccountKey(), msgWindow, progress);

    }
    catch (ex) {
      Logger.error("Late message sending FAILED: " + ex);
      ToggleWindowLock(false);
    }

  }


  this._encryptAttachments = function(recipients, sender, password, mailBody, msg_type){
    /**************
     * attachments
     */
    var attachBucket = document.getElementById("attachmentBucket");
    if(attachBucket){
      if(attachBucket.firstChild == null){
        //no attachments
        this._encryptBody(recipients, sender, password, mailBody, msg_type);
      }
      else{
        AttachmentManager.encryptAttachments(attachBucket
                                            , recipients
                                            , sender
                                            , this.sign
                                            , this.encrypt
                                            , password
                                            ,
          function(status){
            if(status != 0){
              Logger.error("Error: " + this.languagepack.getString(CWrapper.getErrorStr(status)));
              //ask user what to do
              if(Logger.promptService.confirm(null, "Tryango", this.languagepack.getString("attach_fail") + "\n" +
                                              this.languagepack.getString("mail_send_unencrypted"))
                ){
                Logger.dbg("User requests to send email/attachments unencrypted");
                //send unencrypted
                MailWindow._lateSend(msg_type);
                Logger.dbg("********erasing password");
                MailWindow._password = "";
              }
              else{
                //user abort -- do nothing
              }
            }
            this._encryptBody(recipients, sender, password, mailBody, msg_type);
          }.bind(this)
        );
      }
    }
    else{
      //bucket not there!? => error
      Logger.error("Cannot get attachmentBucket");
      //avoid sending attachments without encrypting them => do nothing
    }
  }


  this._encryptBody = function(recipients, sender, password, mailBody,  msg_type){
    var origMailBody = "";
    if(MailWindow.isDraft(msg_type)){
      origMailBody = mailBody;
    }

    if(this.encrypt){ //we proceed in case of encryption
      Logger.dbg("calling C: encryptSignMail(...)");
      CWrapper.post("encryptSignMail", [mailBody, recipients, sender, this.sign, this.encrypt, password],
       function(status, encrypted){
         Logger.dbg("Post encryptBodyd");
         if(status > 0 && status <= CWrapper.getMaxErrNum()){
           Logger.error("Encrypt/Sign falied with error: " +
                        MailWindow.languagepack.getString(CWrapper.getErrorStr(status)));
           //ask user if mail should be sent unencrypted
           var usermsg = MailWindow.languagepack.getString("mail_enc_sign_failed") + "\n" +
             MailWindow.languagepack.getString("mail_send_unencrypted");
           if(Logger.promptService.confirm(null, "Tryango", usermsg)){
             //unencrypted mail
             Logger.dbg("Mail sent unencrypted");
           }
           else{
             //user abort -- do nothing
             return;
           }
         }
         else if(encrypted.length > 0){
           if (gMsgCompose.composeHTML) {
             // workaround for Thunderbird bug (TB adds an extra space in front of the text)
             encrypted = "\n" + encrypted;
           }
           else{
             //Thunderbird kills line-endings, so we need to revert back to "native" line endings
             //TODO: test on windows && mac
             encrypted = encrypted.replace(/(\r\n|\r[^\n])/g, '\n');
           }
           MailWindow._replaceBody(encrypted, origMailBody);
         }
         else{
           Logger.dbg("got empty message from encrypt");
           return;
         }
         MailWindow._lateSend(msg_type);
         Logger.dbg("********erasing password");
         MailWindow._password = "";
       }
      );
    }
    else if(this.sign){//prepare for later processing
      if(mailBody.charAt(0)=="-"){
        mailBody = "----TRYANGO START----" + "- " + mailBody + "----TRYANGO END----";
      }
      else{
        mailBody = "----TRYANGO START----" + mailBody + "----TRYANGO END----";
      }
      MailWindow._replaceBody(mailBody, origMailBody);
      MailWindow._lateSend(msg_type);
      //we must not erase password yet
    }
    //Logger.dbg("Message after enrcypt;"+ mailBody);
  }


  this._replaceBody = function(newBody, origMailBody){
    //change body to enc_signed_mail
    this.replaceEmail(newBody, true, true);
    if(origMailBody && origMailBody.length > 0){
      //add callback when message is saved as draft
      MailListener.addDraftCallback(
        function(){
          Logger.dbg("in draftCallback");
          //reset editing window to original message
          this.replaceEmail(origMailBody);
          gMsgCompose.domWindow.tryEncrypt = true; //to encrypt again in case draft is saved again
          this.sign  = document.getElementById("menu-sign").hasAttribute("checked");
          SetContentAndBodyAsUnmodified();//to prevent asking for saving
          //done
          return;
        }.bind(this)
      );
    }
 }

  // --- Helpers ---

  //tries to write an email back as HTML email; if it fails it writes the email as text
  this.replaceEmail = function(newBody, replace = true, puretext = false){
    //init
    var editor = GetCurrentEditor();
    if(replace){
      editor.beginningOfDocument();
      editor.selectAll();
    }
    //replace
    if(puretext || !gMsgCompose.composeHTML){
	  //pure text or we do NOT composeHTML (= editor is pure-text)
      editor.insertText(newBody);
    }else{
      try{
        //write as html
        var htmlEditor = editor.QueryInterface(Components.interfaces.nsIHTMLEditor);
        htmlEditor.insertHTML(newBody);
      }
      catch(ex){
        //on error, write text
        editor.insertText(newBody);
      }
    }
  }

  //tries to insert an email as text with quotations; if it fails it writes the email as text
  this.replaceEmailWithQuotations = function(
	newBody,
	html, //boolean indicating if the inserted text is html or text
	replace = true
  ){
    //init
    var editor = GetCurrentEditor();
    if(replace){
      editor.beginningOfDocument();
      editor.selectAll();
    }
    //replace
    try{
      //write with quotations
      var mailEditor = editor.QueryInterface(Components.interfaces.nsIEditorMailSupport);
      mailEditor.insertAsCitedQuotation(newBody, "", html & gMsgCompose.composeHTML);
    }
    catch(ex){
      //on error, write text
      editor.insertText(newBody);
    }
  }

}
/*
 * StateListener: this class listens to events on a specific compose-window. This is needed
 * for initialisation of EVERY compose-window (not ALL in general) and for
 * getting the body of a compose-window BEFORE thunderbird adds it's stuff.
 * E.g. we need to decrypt encrypted emails first! ("reply to" an encrypted email)
 *
 * Documentation:
 *  https://developer.mozilla.org/en-US/docs/User:codegroover/Compose_New_Message
 *  https://stackoverflow.com/questions/7414032/thunderbird-extension-load-event-seems-to-occur-only-once
 */
ConfiComposeStateListener = {

  //constructor (sign up listener with thunderbird)
  init: function(event){
    gMsgCompose.RegisterStateListener(ConfiComposeStateListener);
  },


  //after compose window started, before editing
  NotifyComposeFieldsReady: function(){
//     for(var key in gMsgCompose.domWindow){
//        Logger.dbg("-----key----"+key);
//     }
    gMsgCompose.domWindow.tryEncrypt = true;
//     MailWindow.unencrypted.add(gMsgCompose.identity);
//     gMsgCompose.unencrypted = true;

    //load preferences again
    MailWindow.reload();
    var angOnSendListener = {
        observe:
            function(subject, topic, data){
                // thunderbird sends a notification right before the mail gets assembled
                // doing stuff in the compose window is tricky as they reuse compose windows
                // subject is a reference to the compose window
              subject.gMsgCompose.addMsgSendListener(new AngMsgSendListener());
            }
    };
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(angOnSendListener, "mail:composeOnSend", false);
  },


  NotifyComposeBodyReady: function(){
    //recheck colours of recipients
    MailWindow.recheckRecipientColours();

	//TODO: it would be good to get the xheader "X-Mozilla-Draft-Info: internal/draft;"
	//check if message is a draft by checking where its ID
    var draft = (gMsgCompose.compFields.draftId && gMsgCompose.compFields.draftId.length > 0);
    if(draft){
      Logger.dbg("draft");
    }

    //called after email body is loaded (with quotations in the beginning!)
    //nsIEditor: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/NsIEditor
    //get message body
    var editor = GetCurrentEditor();
    editor.beginTransaction();
    let dce = Components.interfaces.nsIDocumentEncoder;
    var flags = dce.OutputFormatted | dce.OutputLFLineBreak ;//TODO: not sure if OutputPreformatted is needed here, seems to work without
    var body = editor.outputToString('text/plain', flags);
    editor.endTransaction();

	//    var charset = editor.documentCharacterSet;
	//    body = Utils.convertFromUnicode(body, charset);

    //search for PGP block
    var PGPstart = body.indexOf("-----BEGIN PGP ");
    if(PGPstart < 0){
      //no BEGIN PGP => stop
      Logger.dbg("compose-mail: NO PGP body found");
      return;
    }
    Logger.dbg("compose-mail: PGP body found");

    //cut email out of quotations
    //get indent from beginning to the line before "BEGIN PGP" (= removing "> -----BEGIN PGP")
    var indent = body.substring(body.substr(0, PGPstart).lastIndexOf("\n") + 1, PGPstart);

    var beginIndexObj = new Object();
    var endIndexObj = new Object();
    var indentStrObj = new Object();
    var blockType = Prefs.locateArmoredBlock(body, 0, indent,
                                             beginIndexObj, endIndexObj,
                                             indentStrObj);
    Logger.dbg("block type \"" + blockType + "\"");

    if ((blockType != "MESSAGE") && (blockType != "SIGNED MESSAGE")){
      Logger.error("block type not a valid PGP block");
      return;
    }

    var beginIndex = beginIndexObj.value;
    var endIndex   = endIndexObj.value;

    var head = body.substr(0, beginIndex); //head might be "email send by ... 2015-01-01 at 19:00"
    var tail = body.substr(endIndex + 1); //cut tail too if there is one

    //get ciphertext from "BEGIN PGP" on
    var ciphertext = body.substr(beginIndex, endIndex - beginIndex + 1);

    //format email a bit...
    var indentRegexp;
    if (indent) {
      // MULTILINE MATCHING ON
      RegExp.multiline = true;

      //remove first level of quotations
      if (indent == "> ") {
        // replace ">> " with "> > " to allow correct quoting
        ciphertext = ciphertext.replace(/^>>/g, "> >");
      }

      //delete indentation
      indentRegexp = new RegExp("^"+indent, "g");
      ciphertext = ciphertext.replace(indentRegexp, "");
      //tail     =     tail.replace(indentRegexp, "");

      //delete spacing at line end
      if (indent.match(/[ \t]*$/)) {
        indent = indent.replace(/[ \t]*$/g, "");
        indentRegexp = new RegExp("^"+indent+"$", "g");
        ciphertext = ciphertext.replace(indentRegexp, "");
      }

      // Handle blank indented lines
      ciphertext = ciphertext.replace(/^[ \t]*>[ \t]*$/g, "");
      tail = tail.replace(/^[ \t]*>[ \t]*$/g, "");
      head = head.replace(/^[ \t]*>[ \t]*\n/g, ""); //also delete the \n character

      // Trim leading space in tail
      tail = tail.replace(/^\s*\n/, "\n");

      // MULTILINE MATCHING OFF
      RegExp.multiline = false;
    }

    if (tail.search(/\S/) < 0) {
      // No non-space characters in tail; delete it
      tail = "";
    }

    //decrypt email
    Logger.dbg("decrypting email...");


    function decryptCallback(status, decrypted){
      if((status == 0 || CWrapper.getMaxErrNum() <= status) && decrypted.length > 0){
        Logger.dbg("write decrypted email back:\n" + decrypted);

		//init: check if decrypted email is html
		var isHtml = decrypted.match(/<html>[\s\S]*<\/html>/i) != null;
		Logger.dbg("isHtml: "  + isHtml);

        //TODO: we drop the header and the bgcolor in <body ...> here!
        //strip body out of email
        var match = decrypted.match(/<body[^>]*>([\s\S]*)<\/body>/i)
        if(match && match.length == 2){ // 2 cause "match" is an array: ["<body...> email </body>", "email"]
          decrypted= match[1];
        }

        if(draft){
		  Logger.dbg("write draft back");

          //draft not quoted
          MailWindow.replaceEmail(decrypted);
        }
        else{
		  Logger.dbg("write (non draft) email back");

          if(head){
            //insert head ("mail send by ... on 2015-01-01...") without quotations
            MailWindow.replaceEmail(head, true, true);

            //non-drafts (=replies) should quote the original mail
            MailWindow.replaceEmailWithQuotations(decrypted, isHtml, false);
          }else{
            //non-drafts (=replies) should quote the original mail
            MailWindow.replaceEmailWithQuotations(decrypted, isHtml, true);
          }

          if(tail){
            //insert tail (mostly empty lines?) without quotations similar to head
            Logger.dbg("tail: " + tail);
            MailWindow.replaceEmail(tail, false);
          }
        }
      }
      else{
        Logger.error("Decrypting failed with status:" + status);
      }
    }

    if(blockType == "MESSAGE"){
      var ret = CWrapper.synchDecryptMail(ciphertext);
      decryptCallback(ret.status, ret.decrypted);
    }
    else{
      //clear signature only
      var sender = gCurrentIdentity.email;
      var status = CWrapper.post("verifySignature", [ciphertext, sender],decryptCallback);
    }
  },


  ComposeProcessDone: function(result){
    //Logger.dbg("Ex body"+gMsgCompose.compFields.body);

    //called after a mail was sent/saved
    //not needed => empty interface
  },

  SaveInFolderDone: function(folderURI){
    //not needed => empty interface
  }
}


function AngMsgSendListener(){
  this.onStartSending =
    function(aMsgID,aMsgSize){
    if(!MailWindow.sign || MailWindow.encrypt ){ //we proceed in case of clear sign only
//       Logger.dbg("not signing "+ MailWindow.sign + MailWindow.encrypt);
      return;
    }
    delete gMsgCompose.domWindow.tryEncrypt;

    // when this event is fired, thunderbird has assembled the
    // mail it is to send in an temporary .eml file in the temp directory
    // first fetch temp directory (has nsIFile interface)
    var tmpDirFile =
      Components.classes["@mozilla.org/file/directory_service;1"].
      getService(Components.interfaces.nsIProperties).
      get("TmpD", Components.interfaces.nsIFile);
    // then check for the newest .eml file
    var entries = tmpDirFile.directoryEntries;
    var assembledMail = null;
    while(entries.hasMoreElements()){
      var entry = entries.getNext();
      entry.QueryInterface(Components.interfaces.nsIFile);
      // check whether the current file has .eml extension
      if ((/.eml$/i).test(entry.leafName)){
        if(assembledMail == null)
          assembledMail = entry;
        else{
          // the assembled mail should be the newest .eml file
          if(assembledMail.lastModifiedTime < entry.lastModifiedTime)
            assembledMail = entry;
        }
      }
    }
    let body = Utils.readFile(assembledMail);
    var msgStart = body.indexOf("----TRYANGO START----");
    if(msgStart < 0){
      //no BEGIN PGP => stop
      Logger.dbg("compose-mail: NO ENCRYPTION body found");
      return;
    }
    var msgEnd = body.indexOf("----TRYANGO END----");
    if(msgEnd < 0){
      Logger.dbg("compose-mail: NO ENCRYPTION end body found");
      return;
    }
    Logger.dbg("compose-mail: ENCRYPTION body found");


    //cut email out of quotations
    //get indent from beginning to the line before "BEGIN PGP" (= removing "> -----BEGIN PGP")
    var msgBody = body.substring(msgStart + 21, msgEnd);
    if(msgBody.length>1){
      if(msgBody.charAt(0) == '-' && msgBody.charAt(1) == ' '){
        msgBody = msgBody.substring(2);
      }
    }
    var head = body.substring(0, msgStart);

//     var recipients;
//     let start = head.indexOf("To: ") + 4;
//     if(start == -1) {
//       recipients = "";
//     }
//     else{
//       let end = head.substring(start).indexOf("\n");
//       if(end == -1) end = head.length;
//       else{
//         end = end + start;
//       }
//       recipients = head.substring(start, end);
//     }

    let sender;
    let start = head.indexOf("From: ") + 6;
    if(start == -1) {
      Logger.dbg("Could not find sender");
      return;
    }
    else{
      let end = head.substring(start).indexOf("\n");
      if(end == -1) end = head.length;
      else{
        end = end + start;
      }
      sender = head.substring(start, end);
    }

    let tail = body.substring(msgEnd+19);
    Logger.dbg("head:"+head);
//     Logger.dbg("calling C: clearSignMail(...) to sign only with pw:" + MailWindow._password);
//     var enc_signed_mail = {str : ""};

    let ret = CWrapper.synchClearSignMail(msgBody, sender, MailWindow._password);

//     MailWindow._password = ""; //function called twice sometimes - cannot remove password
      //check errors
    if(ret.status > 0 && ret.status <= CWrapper.getMaxErrNum()){
      Logger.error("Sign falied with error: " +
                   MailWindow.languagepack.getString(CWrapper.getErrorStr(ret.status)));
    }
    else if(ret.signed.length > 0){
      msgBody = ret.signed;
    }
    else{
      Logger.dbg("empty str after calling C: encryptSignMail(...) to sign only");
    }
    Logger.dbg("after calling C: msgBody" + msgBody);

    Utils.writeFile(assembledMail, head + msgBody + tail);
    // assembledMail now carries a reference to the assembled mail
  };
  this.onProgress = function(aMsgID, aProgress, aProgressMax){};
  this.onStatus = function(aMsgID, aMsg){};
  this.onGetDraftFolderURI = function(aFolderUri){};
  this.onStopSending = function(aMsgID, aStatus, aMsg, aFile){};
  this.onSendNotPerformed = function(aMsgID, aStatus){};
}


/*
 * setup the Eventlisteners
 */
if(typeof window != 'undefined'){ //only set-up if file is NOT imported
  window.addEventListener("load", function(event){
    // ATTENTION: load is only called ONCE to initialise ALL compose-windows!
    //		  if other initialisation is needed => "StateListener"
    // see also tryango.js for explanation of this "function(event)" structure
    // => switching context for this from "window" to MailWindow

    //to make the window identifiable (and matchable to the MailWindow class)
    window.id = MailWindow.id;
    MailWindow.onload(event);
  }, true);

  /*EVENTS to hook:
   * compose-send-message   A message gets sent
   * compose-window-close   A compose window gets closed
   * compose-window-init   A compose window has been opened
   * https://developer.mozilla.org/en-US/docs/Mozilla/Thunderbird/Events
   */


  //init StateListener to hook "reply to" messages
  window.addEventListener("compose-window-init", function(event){
    ConfiComposeStateListener.init(event);
  }, true);

  // can use document.getElementById("msgcomposeWindow") instead of window
  window.addEventListener("compose-send-message", function(event){
    if(!gMsgCompose.domWindow.tryEncrypt){
      Logger.dbg("compose-send-message  not trying to encrypt"); //TODO: FIXME: when saving drafts twice, this will not encrypt!
      return;
    }
    var ret;
    var err = "";
    try{
      //check return: positive numbers indicate warnings, negative errors, 0 is ok
      ret = MailWindow.send_handler(event);
      switch(ret){
      case 0:
        //everything ok - doing nothing so sending unencryted
        break;

      //------------ WARNINGS --------------
      case 1:
        //user abort => ok - not sending
        event.preventDefault();
        event.stopPropagation();
        break;

      case 2:
        //tryango is disabled => do nothing
        Logger.log("Tryango is disabled, no interaction while sending email...");
        break;
      case 3:
        //we will fire sending when encrytion/sign is done
        event.preventDefault();
        event.stopPropagation();
        break;

      //------------ ERRORS --------------
      //case -2 was: error due to html email
      //case -3 was: tryango disabled (now +2)
      case -4:
        Logger.error("Encryption/Signature status corrupted!");
        break;

      case -5:
        Logger.error("Recipients field is empty!");
        break;

      //case -6 was: mail with attachments not allowed

      case -1:
      default:
        //something went wrong => stop sending!
        Logger.error("General sending error");
      }
    }
    catch(ex){
      //display error msg
      Logger.error(ex);
      ret = -1;
    }

    //error handling
    if(ret >= 0){
      //just warnings
      return;
    }
    else{
      //errors => abort sending
      Dialogs.error(MailWindow.languagepack.getString("mail_send_failed"));
      event.preventDefault();
      event.stopPropagation();
    }

  }, true);
}
