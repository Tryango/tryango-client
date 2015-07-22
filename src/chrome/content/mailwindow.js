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
    Logger.log("mailwindow " + this.id + " onload");

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
    Logger.log("Reloading prefs of window " + this.id);

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
    else if(msg_type == nsIMsgCompDeliverMode.SaveAsDraft ||
            msg_type == nsIMsgCompDeliverMode.SaveAs ||
            msg_type == nsIMsgCompDeliverMode.Save ||
            msg_type == nsIMsgCompDeliverMode.AutoSaveAsDraft
           ){
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
      var flags = dce.OutputFormatted | dce.OutputLFLineBreak;
      //         var flags = Components.interfaces.nsIDocumentEncoder.OutputRaw;
      if(sendFlowed){
        flags = flags | dce.OutputFormatFlowed;
      }
      if(!gMsgCompose.composeHTML){
        //plaintext
        mailBody = editor.outputToString("text/plain", flags);
      }
      else{
        //html email
        //           flags = dce.OutputRaw;
        mailBody = editor.outputToString("text/html", flags);
        mailBody = mailBody.replace(/[^\S\r\n]+$/gm, "")
      }
      //         mailBody = Utils.convertFromUnicode(mailBody, "UTF-16");
    }
    catch(ex){
      Logger.error("Could not get message body:\n" + ex);
      return -1;
    }
    Logger.dbg("mailBody:\n" + mailBody); //TODO: FIXME: the code above inserts empty lines every second line when saving drafts a second time!!! (it works the first time though)
    MailWindow._password = "";
    if(this.sign){
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
            message = sender + " - " + this.languagepack.getString("sec_expired") + ".\n" +
              this.languagepack.getString("mail_send_unsigned");
          }
          else{
            message = this.languagepack.getString(CWrapper.getErrorStr(ret.status)) + "\n" +
              this.languagepack.getString("mail_send_unsigned");
          }
          if(Logger.promptService.confirm(null, "Tryango", message)){
            document.getElementById("menu-sign").removeAttribute("checked");
            document.getElementById("button-sign").removeAttribute("checked");
            this.sign = false;
          }
          else{
            return 0;
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
              message = recipient + " - " + this.languagepack.getString("pub_expired") + ".\n" +
                this.languagepack.getString("mail_send_unencrypted");
            }
            else{
              message = recipient + " " + this.languagepack.getString("not_with_CM") + "\n" +
                this.languagepack.getString("mail_send_unencrypted");
            }
            if(Logger.promptService.confirm(null, "Tryango", message)){
              Logger.dbg("User requests unencrypted email since " + recipient + " is not with CM or key has expired");
              this.encrypt = false;
              document.getElementById("menu-encrypt").removeAttribute("checked");
              document.getElementById("button-encrypt").removeAttribute("checked");
              ///send email
              MailWindow._justSend = true;
              SendMessage();
              Logger.dbg("********erasing password");
              MailWindow._password = "";
            }
            else{
              //do nothing
            }
          }
          else{
            this._encryptAttachments(recipients, sender, this._password, mailBody);
          }
        }.bind(this)
      );
    }
    else{
      this._encryptAttachments(recipients, sender, this._password, mailBody);
    }
    return 3;//postpone sending - it will be done from callbacks
  }


  this._encryptAttachments = function(recipients, sender, password, mailBody){
    /**************
     * attachments
     */
    var attachBucket = document.getElementById("attachmentBucket");
    if(attachBucket){
      if(attachBucket.firstChild == null){
        //no attachments
        this._encryptBody(recipients, sender, password, mailBody);
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
                MailWindow._justSend = true;
                SendMessage();
                Logger.dbg("********erasing password");
                MailWindow._password = "";
              }
              else{
                //user abort -- do nothing
              }
            }
            this._encryptBody(recipients, sender, password, mailBody);
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


  this._encryptBody = function(recipients, sender, password, mailBody, draft){
    var origMailBody = "";
    if(draft){
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
         MailWindow._justSend = true;
         SendMessage();
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
      MailWindow._justSend = true;
      SendMessage();
      Logger.dbg("********erasing password");
      MailWindow._password = "";
    }
    //Logger.dbg("Message after enrcypt;"+ mailBody);
  }


  this._replaceBody = function(newBody, origMailBody){
    //change body to enc_signed_mail
    var editor = GetCurrentEditor();
    editor.selectAll();
    try{
      var mailEditor = editor.QueryInterface(Components.interfaces.nsIEditorMailSupport);
      mailEditor.insertTextWithQuotations(newBody);
    }
    catch(ex){
      editor.insertText(newBody);
    }
    if(origMailBody.length > 0){
      //add callback when message is saved as draft
      MailListener.addDraftCallback(
        function(){
          Logger.dbg("in draftCallback");
        //reset editor window to original message
          editor.selectAll();
          try{
            var mailEditor = editor.QueryInterface(Components.interfaces.nsIEditorMailSupport);
            mailEditor.insertTextWithQuotations(origMailBody);
          }
          catch(ex){
            editor.insertText(origMailBody);
        }
          //done
          return;
        }
    );
    }
 }

}
/*
 * StateListener: this class listens to events on a specific compose-window. This is needed
 *		  for initialisation of EVERY compose-window (not ALL in general) and for
 *		  getting the body of a compose-window BEFORE thunderbird adds it's stuff.
 *		  E.g. we need to decrypt encrypted emails first! ("reply to" an encrypted email)
 *
 * Documentation:
 *	https://developer.mozilla.org/en-US/docs/User:codegroover/Compose_New_Message
 *	https://stackoverflow.com/questions/7414032/thunderbird-extension-load-event-seems-to-occur-only-once
 */
ConfiComposeStateListener = {

  //constructor (sign up listener with thunderbird)
  init: function(event){
    gMsgCompose.RegisterStateListener(ConfiComposeStateListener);
  },


  //after compose window started, before editing
  NotifyComposeFieldsReady: function(){
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
    //TODO: FIXME: temporary solution - it would be good to get the xheader "X-Mozilla-Draft-Info: internal/draft;"
    //check if message is a draft by checking where it is stored (URI)
    //=> if it is a draft, the folder Draft should be included
    var draft = gMsgCompose.originalMsgURI.match(/Draft/g) != null;
    Logger.dbg("draft: " + draft);

    //called after email body is loaded (with quotations in the beginning!)
    //nsIEditor: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/NsIEditor
    //get message body
    var editor = GetCurrentEditor();
    var charset = editor.documentCharacterSet;
    editor.beginTransaction();
//     var flags = Components.interfaces.nsIDocumentEncoder.OutputRaw;
    let dce = Components.interfaces.nsIDocumentEncoder;
//     var flags = dce.OutputRaw;
    var flags = dce.OutputFormatted | dce.OutputLFLineBreak;
    var body = editor.outputToString('text/plain', flags);
    editor.endTransaction();
//     body = Utils.convertFromUnicode(body, charset);

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

    var head = body.substr(0, beginIndex);
    var tail = body.substr(endIndex + 1);

    //get ciphertext from "BEGIN PGP" on
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
        indentRegexp = new RegExp("^"+indent+"$", "g");

        ciphertext = ciphertext.replace(indentRegexp, "");
      }


      // Handle blank indented lines
      ciphertext = ciphertext.replace(/^[ \t]*>[ \t]*$/g, "");
      //tail     =     tail.replace(/^[ \t]*>[ \t]*$/g, "");

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
      if(decrypted.length > 0){
      }
      //write decrypted email back
      Logger.dbg("write decrypted email back");
      editor.beginningOfDocument();
      editor.selectAll(); //replace everything (easier than handling ranges in thunderbird!)
      var mailEditor;
      try{
        mailEditor = editor.QueryInterface(Components.interfaces.nsIEditorMailSupport);
      }
      catch(ex){
        Logger.error("Could not load mailEditor");
        mailEditor = null; //no insertTextWithQuoatations
      }

      //insert head
      if(head){
        if(mailEditor){
          mailEditor.insertTextWithQuotations(head);
        }
        else{
          editor.insertText(head);
        }
      }

      //TODO: FIXME: we drop the header and the bgcolor in <body ...> here!
      //strip body out of email
      // 	Logger.dbg("plaintext: " + plaintext);
      var match = plaintext.match(/<body[^>]*>([\s\S]*)<\/body>/i)
      if(match && match.length == 2){ // 2 cause "match" is an array: ["<body...> email </body>", "email"]
        plaintext = match[1];
      }

      //insert decrypted text as quotation
      //nsIEditorMailSupport: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIEditorMailSupport#insertTextWithQuotations%28%29
      if(mailEditor){
        mailEditor.insertAsCitedQuotation(plaintext, "", true);
      }
      else{
        editor.insertText(plainText);
      }

      //insert tail
      if(tail){
        if(mailEditor){
          mailEditor.insertTextWithQuotations(tail);
        }else{
          editor.insertText(tail);
        }
      }
    }

    if(blockType == "MESSAGE"){
      var status = CWrapper.decryptMail(plaintext, ciphertext, "");
      if(status > 0 && status <= CWrapper.getMaxErrNum()){
        Logger.error("Decrypt failed with error:" +
                     this.languagepack.getString(CWrapper.getErrorStr(status)));
        //tell user
        Dialogs.error(this.languagepack.getString("mail_dec_failed") + " Error: " +
                     this.languagepack.getString(CWrapper.getErrorStr(status)));
        return;
      }
      plaintext = plaintext.str;
    }
    else{
      //clear signature only

      //TODO: is this code needed? shall "reply" check the signature again? (it should already have been checked before!)
      var sender = gCurrentIdentity.email;
      var status = CWrapper.verifySignature(plaintext, ciphertext, sender);
      if(status > 0 && status <= CWrapper.getMaxErrNum()){
        Logger.error("Signature failed with error:" +
                     this.languagepack.getString(CWrapper.getErrorStr(status)));
        //tell user
        Dialogs.error(this.languagepack.getString("mail_dec_failed") + " Error: " +
                     this.languagepack.getString(CWrapper.getErrorStr(status)));
        return;
      }
      plaintext = ciphertext;
    }

    //write decrypted email back
    Logger.dbg("write decrypted email back");
	  Logger.dbg("email:\n" + plaintext);
    editor.beginningOfDocument();
    editor.selectAll(); //replace everything (easier than handling ranges in thunderbird!)
    var mailEditor;
    try{
      mailEditor = editor.QueryInterface(Components.interfaces.nsIEditorMailSupport);
    }
    catch(ex){
      Logger.err("Could not load mailEditor");
      mailEditor = null; //no insertTextWithQuoatations
    }

    //insert head
    if(head){
      if(mailEditor){
        mailEditor.insertTextWithQuotations(head);
      }
      else{
        editor.insertText(head);
      }
    }

    //TODO: FIXME: we drop the header and the bgcolor in <body ...> here!
    //strip body out of email
// 	Logger.dbg("plaintext: " + plaintext);
    var match = plaintext.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    if(match && match.length == 2){ // 2 cause "match" is an array: ["<body...> email </body>", "email"]
      plaintext = match[1];
    }

    //insert decrypted text as quotation (if it is not a draft!)
    //nsIEditorMailSupport: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIEditorMailSupport#insertTextWithQuotations%28%29
    if(mailEditor && !draft){
	  mailEditor.insertAsCitedQuotation(plaintext, "", true);
    }else{
	  editor.insertText(plaintext);
	  Logger.dbg("inserted email:\n" + editor.outputToString('text/plain', flags));
    }

    //insert tail
    if(tail){
      if(mailEditor){
        mailEditor.insertTextWithQuotations(tail);
      }else{
        editor.insertText(tail);
      }
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

// function readFile(file){
//   var data = "";
//   var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
//   var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
//   fstream.init(file, -1, 0, 0);
//   cstream.init(fstream, "UTF-8", 0, 0);
//   let (str = {}) {
//     let read = 0;
//     do {
//       read = cstream.readString(0xffffffff, str);
//       data += str.value;
//     } while (read != 0);
//   }
//   cstream.close();
//   return data;
// }

function AngMsgSendListener(){
  this.onStartSending =
    function(aMsgID,aMsgSize){
    if(!MailWindow.sign || MailWindow.encrypt){ //we proceed in case of clear sign only
//       Logger.dbg("not signing "+ MailWindow.sign + MailWindow.encrypt);
      return;
    }
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
    Logger.dbg("calling C: clearSignMail(...) to sign only with pw:" + MailWindow._password);
//     var enc_signed_mail = {str : ""};

    let ret = CWrapper.synchClearSignMail(msgBody, sender, MailWindow._password);
//     MailWindow._password = "";
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
    Logger.dbg("compose-send-message justSending:" + MailWindow._justSend);
    if(MailWindow._justSend){//to avoid infinite recursion
      MailWindow._justSend = false;
      Logger.dbg("compose-send-message  setting to false *************justSending:" + MailWindow._justSend);
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
