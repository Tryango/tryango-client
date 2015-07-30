/* Handler class for attachments */

//imports
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

// own modules
// explanation for "resource://" see chrome.manifest
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");

//exports
var EXPORTED_SYMBOLS = ["AttachmentManager"]


// class handling attachments (decrypt for saving / encrypt for sending)
var AttachmentManager = new function()
{
  //variables
  this.window = null;
  this.languagepack = null;

  /*
   * "constructor"
   *	@param window		the "window" element (needed for filepicker)
   *	@param languagepack	the language file
   */
  this.init = function(window, languagepack){
    this.window = window;
    this.languagepack = languagepack;
  };

  /*
   * function to decrypt and save all selected attachments of an email
   * this function works PARALLEL, that means it will start all listeners
   * in the background and then return. The store operations are (possibly)
   * not finished by that time!
   *	@param attachmentList	the attachmentList of the email
   */
  this.decryptAndSave = function(attachmentList, sender){
    //if no attachment is selected => decrypt all; otherwise use selected files
    var indices;
    var bool_att_list;
    if(attachmentList.selectedItems == undefined ||
       attachmentList.selectedItems.length == 0){
      //create a list of indices from 0 to attachmentList.length
      indices = Array.apply(null, Array(attachmentList.itemCount)).map(function (_, i) {return i;});
      bool_att_list = true;
    }else{
      //use indices already supplied
      indices = attachmentList.selectedItems;
      bool_att_list = false;
    }

    //iterate over all selected attachments
    for(var i in indices){
      //get attachment
      //attachmentList is a list of objects
      //attachmentList.selectedItems is an array
      //=> different ways to access
      var att
      if(bool_att_list){
        att = attachmentList.getItemAtIndex(i).attachment;
      }else{
        att = attachmentList.selectedItems[i].attachment;
      }

      //check if pgp attachment (either type or correct line ending is fine)
      if(att.contentType != "application/pgp-encrypted" && att.name.match(/^.*\.pgp$/i) == null){
        Logger.dbg("attachment not pgp: " + att.name + " (" + att.contentType + ")");
        continue;
      }
      Logger.dbg("attachment: " + att.name);

      //ask user where to store the attachments
      var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
        Components.interfaces.nsIFilePicker);
      //filters:
      fp.appendFilter("All files", "*");
      fp.init(this.window, this.languagepack.getString("sel_attachment_location"),
              Components.interfaces.nsIFilePicker.modeSave);
      //create default name
      var name;
      var index = att.name.lastIndexOf(".pgp");
      if(index != -1){
        name = att.name.substring(0, index);
      }else{
        name = att.name;
      }
      fp.defaultString = name;
      //execute
      var res = fp.show();
      //check result
      if(res == Components.interfaces.nsIFilePicker.returnCancel){
        continue;
      }

      //XXX: debug
      Logger.dbg("Handling attachment: " + att.name + " (" + att.contentType + ")");

      //set up channel to retrieve file
      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
      var url = Services.io.newURI(att.url, null, null);
      var channel = ioService.newChannelFromURI(url);

      //set up asynchronous listener to handle file
      // ----------------------- Asynchronous StreamListener -----------------------
      /*
       * AsyncStreamListener: class to get attachment files asynchronously from the
       *                      server (think of IMAP!)
       *
       * code:
       *	http://mdn.beonex.com/en/Extensions/Thunderbird/HowTos/Common_Thunderbird_Use_Cases/View_Message.html
       *	http://mdn.beonex.com/en/Code_snippets/File_I%252F%252FO.html
       */
      var AsyncStreamListener =
        {
          path: fp.file.path,
          languagepack: this.languagepack,
          sender: sender,

          onStartRequest: function(aRequest, aSupports){
            this.raw = [];
          },

          onStopRequest: function(aRequest, aSupports, statusCode){
            //create file
            var data = this.raw.join("");

            //decrypt the file
            Logger.dbg("decrypting attachment " + this.path);
            CWrapper.decryptAndSaveAttachment(data, this.path, this.sender);
          },

          onDataAvailable: function(aRequest, aSupports, aInputStream, offset, count){
            //read stream as raw data
            this.raw.push(NetUtil.readInputStreamToString(aInputStream, count));
          },
        }
      // ----------------------- end Asynchronous StreamListener -----------------------

      //start the listener
      channel.asyncOpen(AsyncStreamListener, null);
    } //end for

    return; //no return value, this method works asynchronous!
  };

  //TODO: FIXME: (attachments) removing files before sending kills the encrypted file. to reproduce: create mail with txt attachment (that one works), save as draft, close, reopen, go to /tmp, remove nsmail.txt (temp file of the attachment), send. when email arrives it's in weird binary format!
  /*
   * function to encrypt attachments
   *	@param attachmentBucket		the attachmentBucket from Thunderbird
   *	@param recipients		the recipients of this email
   *	@param sender			the sender of this email
   *	@param sign			boolean indicating if attachment shall be signed
   *	@param encrypt			boolean indicating if attachment shall be encrypted
   *	@return		"status" of cWrapper
   *
   * docu:
   * https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/NsIMsgCompFields
   * http://doxygen.db48x.net/mozilla-full/html/d8/dca/interfacensIMsgAttachment.html
   *
   * attachments can be accessed via two methods:
   *   1) gMsgCompose.compFields["attachments"].hasMoreElements()/.getNext()
   *   2) document.getElementById("attachmentBucket").firstChild => child.nextSibling...
   *
   * It seems that 1) cannot delete elements though. (according to docu it can but it doesn't)
   */
  this.encryptAttachments = function(attachBucket, recipients, sender, sign, encrypt, password, callback){
    //init
    var node = attachBucket.firstChild; //if(node == null) here => no attachments
    var ioServ = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
    var FileUtils = Components.utils.import("resource://gre/modules/FileUtils.jsm").FileUtils;
    var updatedAttachments = [];

    //node == null means no attachments (not an error!)
    if(node == null){
      //debug output, maybe useful for later...
      Logger.dbg("Email with no attachments");
      callback(0);
      return;
    }
    this._status = 0;
    while(node){
      /*
       * reverse engineered:
       *    attachements are of type "object" and have the following attributes:
       *     url (an internal Thunderbird url!), name (=filename), size, contentType,
       *     sendViaCloud, QueryInterface, urlCharset, temporary, cloudProviderKey,
       *     htmlAnnotation, contentLocation, contentTypeParam, charset, macType,
       *     macCreator, equalsUrl
       *
       *    node is of type "object" but most fields are empty
       *	 nodeName = "attachmentitem", nodeValue = null, localName = "attachmentitem"
       *     attachment = the actual attachment
       *
       *	NOTE: if node = attachmentBucket.firstChild and node = node.nextSibling
       *		=> node.attachment == att
       */

      //get path to attachment
      var attFile = ioServ.newURI(node.attachment.url, null, null);
      var path = attFile.QueryInterface(Components.interfaces.nsIFileURL).file.path;
      Logger.dbg("Attachment-path: " + path); //XXX: remove after testing

      //encrypt and sign
      var newPath = path + ".pgp";
      Logger.dbg("newPath: " + newPath); //XXX: remove after testing
      CWrapper.post("encryptSignAttachment", [newPath, path, recipients, sender, sign, encrypt, password, node.nextSibling == null ],
        function(status, isLast){
          if(status == 0 && AttachmentManager._status == 0){
            //create file://... URL
            var nsifile = new FileUtils.File(newPath);
            var newURL = ioServ.newFileURI(nsifile).asciiSpec;
            Logger.dbg("newURL: " + newURL); //XXX: remove after testing
            //encryption/signature worked
            //buffer replacement and apply it LATER since
            //this should only be done when all encryptions worked
            updatedAttachments.push({
              url: newURL,
              temporary: true, //remove encrypted file after sending
              name: newPath.substring(newPath.lastIndexOf("/")+1, newPath.length) //cut only filename out of it
            });
          }
          else{
            AttachmentManager._status = status;
          }
          if(isLast){
            if(AttachmentManager._status == 0){
              //actually apply replacement of attachments
              //this needs to be done after all encryptions worked
              //(to not replace only parts of the attachments!)
              node = attachBucket.firstChild;
              var i = 0;
              while(node){
                Logger.dbg("replace " + i);
                //replace attachment
                node.attachment.url = updatedAttachments[i].url;
                node.attachment.temporary = updatedAttachments[i].temporary;
                node.attachment.name = updatedAttachments[i].name;
                //next
                i++;
                node = node.nextSibling;
              }
            }
            callback(AttachmentManager._status);
          }
        }
      );
//       var status = CWrapper.encryptSignAttachment(newPath, path, recipients, sender,
//                                                   sign, encrypt);
// 
//       if(status == 0){
//         //create file://... URL
//         var nsifile = new FileUtils.File(newPath);
//         var newURL = ioServ.newFileURI(nsifile).asciiSpec;
//         Logger.dbg("newURL: " + newURL); //XXX: remove after testing
// 
//         //encryption/signature worked
//         //buffer replacement and apply it LATER since
//         //this should only be done when all encryptions worked
//         updatedAttachments.push({
//           url: newURL,
//           temporary: true, //remove encrypted file after sending
//           name: newPath.substring(newPath.lastIndexOf("/")+1, newPath.length), //cut only filename out of it
//         });
//       }
//       else{
//         //could not encrypt attachment
//         return status;
//       }

      //next attachment
      node = node.nextSibling;
    }

    //actually apply replacement of attachments
    //this needs to be done after all encryptions worked
    //(to not replace only parts of the attachments!)
//     node = attachBucket.firstChild;
//     var i = 0;
//     while(node){
//       Logger.dbg("replace " + i);
//       //replace attachment
//       node.attachment.url = updatedAttachments[i].url;
//       node.attachment.temporary = updatedAttachments[i].temporary;
//       node.attachment.name = updatedAttachments[i].name;
//       //next
//       i++;
//       node = node.nextSibling;
//     }

//     return 0;
  };


//end of AttachmentManager
}
