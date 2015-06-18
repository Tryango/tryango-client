//TODOTODO: (machineID) make sure machineID is not signing up the same device twice
//TODO: memory leaks through EventListeners (?) => if so, clean them somewhere



/* Basic file for JavaScript code on composing a new e-mail */

// own modules
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");
Components.utils.import("resource://tryango_modules/maillistener.jsm");
Components.utils.import("resource://tryango_modules/prefs.jsm");
Components.utils.import("resource://tryango_modules/attachmentManager.jsm");

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
    }else if(handler == "button-sign"){
      this.sign = document.getElementById("button-sign").hasAttribute("checked");
    }else if(handler == "menu-encrypt"){
      this.encrypt = document.getElementById("menu-encrypt").hasAttribute("checked");
    }else if(handler == "menu-sign"){
      this.sign = document.getElementById("menu-sign").hasAttribute("checked");
    }else{
      //error and stop
      Logger.error("Unknown event: " + id);
      return;
    }

    //redo/undo colouring
    //set encrypt
    if(this.encrypt){
      document.getElementById("menu-encrypt").setAttribute("checked", true);
      document.getElementById("button-encrypt").setAttribute("checked", true);
    }else{
      document.getElementById("menu-encrypt").removeAttribute("checked");
      document.getElementById("button-encrypt").removeAttribute("checked");
    }

    //set sign
    if(this.sign){
      document.getElementById("menu-sign").setAttribute("checked", true);
      document.getElementById("button-sign").setAttribute("checked", true);
    }else{
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
        if(CWrapper.checkMailAddr(addrCol.value) == 0){
          addrCol.style.backgroundColor = MailWindow.COLOUR_APPROVED;
        }
        else{
          addrCol.style.backgroundColor = MailWindow.COLOUR_REJECTED;
        }
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
      var status = CWrapper.checkMailAddr(addrCol.value);
      if(status == 0){
        addrCol.style.backgroundColor = MailWindow.COLOUR_APPROVED;
        Logger.dbg("recipientsChange: approved"+ status);
      }
      else{
        Logger.dbg("recipientsChange: not approved"+ status);
        addrCol.style.backgroundColor = MailWindow.COLOUR_REJECTED;
      }
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
    let msg_type = Number(msgcomposeWindow.getAttribute("msgtype"));

    //Events:   Now, Later, Save, SaveAs, SaveAsDraft,
    //  SaveAsTemplate, SendUnsent, AutoSaveAsDraft
    //TODO: encrypt/decrypt drafts
    if(!(msg_type == nsIMsgCompDeliverMode.Now ||
         msg_type == nsIMsgCompDeliverMode.Later ||
         msg_type == nsIMsgCompDeliverMode.SaveAsDraft)){
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
    if(this.encrypt || this.sign){
      
      /****************************
       * get sending email address
       */
      var sender = gCurrentIdentity.email;
      Logger.dbg("Sending mail from: " + sender);

      /******************
       * fill recipients
       */
      var i = 1; //recipientsfield starts with 1!!!
      var recipients = "";
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

      /************
       *   KEYS
       */
      //if encrypted...
      if(this.encrypt){
        //...check if any recipient has no key
        var r = recipients.split(",");
        for(var k = 0; k < r.length; k++){
          Logger.dbg("Chencking mail: " + r[k]);

          status = CWrapper.checkMailAddr(r[k]);
          Logger.dbg("Chencking mail status: " + status);
          if(status != 0){
            //at least one recipient is not signed up with tryango
            //=> only clear text message is possible
            //warn user about unencrypted message
            message = r[k] + " " + this.languagepack.getString("not_with_CM") + "\n" +
                this.languagepack.getString("mail_send_unencrypted");
            if(status == 31){ //key has expired
              message = r[k] + " - " + this.languagepack.getString("pub_expired") + ".\n" +
                this.languagepack.getString("mail_send_unencrypted");
            }
            if(Logger.promptService.confirm(null, "Tryango", message)){
              Logger.log("User requests unencrypted email since " + r[k] + " is not with CM or key has expired");
              this.encrypt = false;
              document.getElementById("menu-encrypt").removeAttribute("checked");
              document.getElementById("button-encrypt").removeAttribute("checked");
              break;
            }
            else{
              //user abort
              return 1;
            }
          }
        }
      }

      //check encrypt and sign again since it could have changed above!
      if(!this.encrypt && !this.sign){
        return 0;
      }
      /**************
       * attachments
       */
      var attachBucket = document.getElementById("attachmentBucket");
      if(attachBucket){
        if(attachBucket.firstChild == null){
          //no attachments
        }
        else{
          var status = AttachmentManager.encryptAttachments(attachBucket, recipients, sender, this.sign, this.encrypt);
          //error => ask user what to do
          if(status != 0){
            Logger.error("Error: " + this.languagepack.getString(CWrapper.getErrorStr(status)));
            //ask user what to do
            if(Logger.promptService.confirm(null, "Tryango", this.languagepack.getString("attach_fail") + "\n" +
                              this.languagepack.getString("mail_send_unencrypted"))
              ){
              Logger.log("User requests to send email/attachments unencrypted");
              //send unencrypted
              return 0;
            }
            else{
              //user abort
              return 1;
            }
          }
        }
      }
      else{
        //bucket not there!? => error
        Logger.error("Cannot get attachmentBucket");
        //TODO: what to do? abort sending? (not that we send attachments without encrypting them) => return -1?
      }

      /*************************
       * get body of the email
       */
      var mailBody;
      var editor;
      var editor_type;
      try{
        //get editor
        editor = GetCurrentEditor();
        editor_type = GetCurrentEditorType();
        var flags = Components.interfaces.nsIDocumentEncoder.OutputRaw;
        if(editor_type == "textmail" || editor_type == "text"){
          //plaintext
          mailBody = editor.outputToString("text/plain", flags);
        }
        else{
          //html email
          mailBody = editor.outputToString("text/html", flags);
          mailBody = mailBody.replace(/[^\S\r\n]+$/gm, "")
        }
      }
      catch(ex){
        Logger.error("Could not get message body:\n" + ex);
        return -1;
      }
      Logger.log("mailBody:\n" + mailBody);

      /****************
       * encrypt/sign
       */
      Logger.log("calling C: encryptSignMail(...)");
      var enc_signed_mail = {str : ""};
      var status = CWrapper.encryptSignMail(enc_signed_mail, mailBody, recipients, sender, 
                                            this.sign, this.encrypt);
      //check errors
      if(status > 0 && status <= CWrapper.getMaxErrNum()){
        Logger.error("Encrypt/Sign falied with error: " + CWrapper.getErrorStr(status));
        //ask user if mail should be sent unencrypted
        var usermsg = this.languagepack.getString("mail_enc_sign_failed") + "\n" +
          this.languagepack.getString("mail_send_unencrypted");
        if(Logger.promptService.confirm(null, "Tryango", usermsg)){
          //unencrypted mail
          Logger.log("Mail sent unencrypted");
          return 0;
        }
        else{
          //user abort
          return 1;
        }
      }
      enc_signed_mail = enc_signed_mail.str;

      //change body to enc_signed_mail
      editor.selectAll();
      try{
        var mailEditor = editor.QueryInterface(Components.interfaces.nsIEditorMailSupport);
        mailEditor.insertTextWithQuotations(enc_signed_mail);
      }
      catch(ex){
        editor.insertText(enc_signed_mail);
      }

      return 0;
    }
    else{
      /**********************
       * unencrypted email
       */
      //warn user about unencrypted message
      if(Logger.promptService.confirm(null, "Tryango", this.languagepack.getString("mail_send_unencrypted"))){
        Logger.log("Mail sent unencrypted");
        return 0;
      }else{
        //user abort
        return 1;
      }
    }

    //general error case: something went wrong
    return -1;
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
  },

  NotifyComposeBodyReady: function(){
    //called after email body is loaded (with quotations in the beginning!)
    //nsIEditor: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/NsIEditor
    //get message body
    var editor = GetCurrentEditor();  
    editor.beginTransaction();
    var body = editor.outputToString('text/plain', 4);
    editor.endTransaction();

    //search for PGP block
    var PGPstart = body.indexOf("-----BEGIN PGP ");
    if(PGPstart < 0){
      //no BEGIN PGP => stop
      Logger.log("compose-mail: NO PGP body found");
      return;
    }
    Logger.log("compose-mail: PGP body found");

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
    var plaintext = {str : ""};
    if(blockType == "MESSAGE"){

      var status = CWrapper.decryptMail(plaintext, ciphertext, "", "");
      if(status > 0 && status <= CWrapper.getMaxErrNum()){
        Logger.error("Decrypt failed with error:" + CWrapper.getErrorStr(status)); //TODO: check all getErrorStr for a this.languagepack.getString(...) around it!
        //tell user
        Logger.infoPopup(this.languagepack.getString("mail_dec_failed") + " Error:" + CWrapper.getErrorStr(status));
        return;
      }
      plaintext = plaintext.str;
    }
    else{
      //clear signature only

      //TODO: is this code needed? shall "reply" check the signature again? (it should already have been checked before!)
      sender = gCurrentIdentity.email;
      var status = CWrapper.verifySignature(plaintext, ciphertext, sender);
      if(status > 0 && status <= CWrapper.getMaxErrNum()){
        Logger.error("Signature failed with error:" + CWrapper.getErrorStr(status));
        //tell user
        Logger.infoPopup(this.languagepack.getString("mail_dec_failed") +
                         " Error:" + this.languagepack.getString(CWrapper.getErrorStr(status)));
        return;
      }
      plaintext = ciphertext;
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
      Logger.err("Could not load mailEditor");
      mailEditor = null; //no insertTextWithQuoatations
    }

    //insert head
    if(head){
      if(mailEditor){
        mailEditor.insertTextWithQuotations(head);
      }else{
        editor.insertText(head);
      }
    }
    
    //TODO: FIXME: we drop the header and the bgcolor in <body ...> here!
    //strip body out of email
    plaintext = plaintext.match(/<body[^>]*>([\s\S]*)<\/body>/i)[1];

    //insert decrypted text as quotation
    //nsIEditorMailSupport: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIEditorMailSupport#insertTextWithQuotations%28%29
    if(mailEditor){
      mailEditor.insertAsCitedQuotation(plaintext, "", true);
    }else{
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

  },

  ComposeProcessDone: function(result){
    //called after a mail was sent/saved
    //not needed
  },

  SaveInFolderDone: function(folderURI){    
    //not needed
  },
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

  //init StateListener to hook "reply to" messages
  window.addEventListener("compose-window-init", ConfiComposeStateListener.init, true);

  // could use document.getElementById("msgcomposeWindow") instead of window
  window.addEventListener("compose-send-message", function(event){

    var ret;
    var err = "";
    try{
      //check return: positive numbers indicate warnings, negative errors, 0 is ok
      ret = MailWindow.send_handler(event);
      switch(ret){
      case 0:
        //everything ok
        break;

      //------------ WARNINGS --------------
      case 1:
        //user abort => ok
        event.preventDefault();
        event.stopPropagation();
        break;

      case 2:
        //tryango is disabled => do nothing
        Logger.log("Tryango is disabled, no interaction while sending email...");
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
    }else{
      //errors => abort sending
      Logger.infoPopup(MailWindow.languagepack.getString("mail_send_failed"));
      event.preventDefault();
      event.stopPropagation();
    }

  }, true);
}
