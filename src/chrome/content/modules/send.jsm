var EXPORTED_SYMBOLS = ['sendMessage', 'getIdentities', 'msgHdrToMessageBody']

const {classes: Cc, interfaces: Ci, utils: Cu, results : Cr} = Components;

Cu.import("resource://gre/modules/PluralForm.jsm");
Cu.import("resource:///modules/MailUtils.js"); // for getFolderForURI
Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://tryango_modules/logger.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm"); // for generateQI, defineLazyServiceGetter
Cu.import("resource:///modules/iteratorUtils.jsm"); // for fixIterator


function sendMessage(email, subject, body, window, custom_headers){

  let fields = Cc["@mozilla.org/messengercompose/composefields;1"]
                  .createInstance(Ci.nsIMsgCompFields);
  let id = getIdentityForEmail(email);
  let identity = id.identity;
  Logger.dbg("send message id"+ identity+ " email:"+email+ " id.email"+ identity.email);

  fields.from = MailServices.headerParser.makeMimeAddress(identity.fullName, identity.email);
  fields.to = fields.from;
  fields.subject = subject;
  fields.returnReceipt = identity.requestReturnReceipt;
  fields.receiptHeaderType = identity.receiptHeaderType;
  fields.DSN = identity.requestDSN;
  fields.references = "";
  fields.fcc = "";
  fields.bodyIsAsciiOnly = false;
  fields.characterSet = "UTF-8";
  fields.useMultipartAlternative = false;
  fields.forcePlainText = true;
  fields.body = body+"\n"; // does not work without EOL - weird stuff huh?
  fields.otherRandomHeaders = custom_headers;
  let params = Cc["@mozilla.org/messengercompose/composeparams;1"]
                  .createInstance(Ci.nsIMsgComposeParams);
  params.composeFields = fields;
  params.type = Ci.nsIMsgCompType.New;
//   params.sendListener = sendListener;
  params.format = Ci.nsIMsgCompFormat.PlainText;
//   let msgSend = Cc["@mozilla.org/messengercompose/send;1"].createInstance(Ci.nsIMsgSend);
  let msgCompose = Cc["@mozilla.org/messengercompose/compose;1"].createInstance(Ci.nsIMsgCompose);

  if("initialize" in msgCompose){
    msgCompose.initialize(params , window);
  } else if("Initialize" in msgCompose){
    msgCompose.Initialize(window, params);
  } else{
    msgCompose.initCompose(params, window);
  }
  try {
    msgCompose.SendMsg(Ci.nsIMsgCompDeliverMode.Now, identity, "", null, null);
  } catch (e) {
    Logger.error(e);
  }
       
}


/**
 * Returns a list of all identities in the form [{ boolean isDefault; nsIMsgIdentity identity}].
 * It is assured that there is exactly one default identity.
 * If only the default identity is needed, getDefaultIdentity() can be used.
 * @param aSkipNntpIdentities (default: true) Should we avoid including nntp identities in the list?
 */
function getIdentities(aSkipNntpIdentities = true) {
  let identities = [];
  for (let account in fixIterator(MailServices.accounts.accounts, Ci.nsIMsgAccount)) {
    let server = account.incomingServer;
    if (aSkipNntpIdentities && (!server || server.type != "pop3" && server.type != "imap")) {
      continue;
    }
    for (let currentIdentity in fixIterator(account.identities, Ci.nsIMsgIdentity)) {
      // We're only interested in identities that have a real email.
      if (currentIdentity.email) {
        identities.push({ isDefault: (currentIdentity == MailServices.accounts.defaultAccount.defaultIdentity), identity: currentIdentity});
      }
    }
  }
  if (identities.length == 0) {
    Logger.log("Didn't find any identities!");
  }
  else {
    if (!identities.some(function (x) x.isDefault)) {
      Logger.log("Didn't find any default key - mark the first identity as default!");
      identities[0].isDefault = true;
    }
  }
  return identities;
}

/**
 * Searches a given email address in all identities and returns the corresponding identity.
 * @param {String} anEmailAddress Email address to be searched in the identities
 * @returns {{Boolean} isDefault, {{nsIMsgIdentity} identity} if found, otherwise undefined
 */
function getIdentityForEmail(anEmailAddress) {
  return getIdentities(false).find(function (ident) ident.identity.email.toLowerCase() == anEmailAddress.toLowerCase());
}
