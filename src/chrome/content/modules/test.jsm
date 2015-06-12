/* A simple logger to print to commandline and Thunderbird's Error Console */
Components.utils.import("resource://tryango_modules/logger.jsm");


//exports
var EXPORTED_SYMBOLS = ["Tester"]
let Cc = Components.classes;
let Ci = Components.interfaces;

createTCPErrorFromFailedXHR = function(xhr) {
  let status = xhr.channel.QueryInterface(Ci.nsIRequest).status;

  let errType;
  if ((status & 0xff0000) === 0x5a0000) { // Security module
    const nsINSSErrorsService = Ci.nsINSSErrorsService;
    let nssErrorsService = Cc['@mozilla.org/nss_errors_service;1'].getService(nsINSSErrorsService);
    let errorClass;
    // getErrorClass will throw a generic NS_ERROR_FAILURE if the error code is
    // somehow not in the set of covered errors.
    try {
      errorClass = nssErrorsService.getErrorClass(status);
    } catch (ex) {
      errorClass = 'SecurityProtocol';
    }
    if (errorClass == nsINSSErrorsService.ERROR_CLASS_BAD_CERT) {
      errType = 'SecurityCertificate';
    } else {
      errType = 'SecurityProtocol';
    }
                 
    // NSS_SEC errors (happen below the base value because of negative vals)
    if ((status & 0xffff) < Math.abs(nsINSSErrorsService.NSS_SEC_ERROR_BASE)) {
      // The bases are actually negative, so in our positive numeric space, we
      // need to subtract the base off our value.
      let nssErr = Math.abs(nsINSSErrorsService.NSS_SEC_ERROR_BASE)
                       - (status & 0xffff);
      switch (nssErr) {
        case 11: // SEC_ERROR_EXPIRED_CERTIFICATE, sec(11)
          errName = 'SecurityExpiredCertificateError';
          break;
        case 12: // SEC_ERROR_REVOKED_CERTIFICATE, sec(12)
          errName = 'SecurityRevokedCertificateError';
          break;
          
        // per bsmith, we will be unable to tell these errors apart very soon,
        // so it makes sense to just folder them all together already.
        case 13: // SEC_ERROR_UNKNOWN_ISSUER, sec(13)
        case 20: // SEC_ERROR_UNTRUSTED_ISSUER, sec(20)
        case 21: // SEC_ERROR_UNTRUSTED_CERT, sec(21)
        case 36: // SEC_ERROR_CA_CERT_INVALID, sec(36)
          errName = 'SecurityUntrustedCertificateIssuerError';
          break;
        case 90: // SEC_ERROR_INADEQUATE_KEY_USAGE, sec(90)
          errName = 'SecurityInadequateKeyUsageError';
          break;
        case 176: // SEC_ERROR_CERT_SIGNATURE_ALGORITHM_DISABLED, sec(176)
          errName = 'SecurityCertificateSignatureAlgorithmDisabledError';
          break;
        default:
          errName = 'SecurityError';
          break;
      }
    } else {
      let sslErr = Math.abs(nsINSSErrorsService.NSS_SSL_ERROR_BASE)
                       - (status & 0xffff);
      switch (sslErr) {
        case 3: // SSL_ERROR_NO_CERTIFICATE, ssl(3)
          errName = 'SecurityNoCertificateError';
          break;
        case 4: // SSL_ERROR_BAD_CERTIFICATE, ssl(4)
          errName = 'SecurityBadCertificateError';
          break;
        case 8: // SSL_ERROR_UNSUPPORTED_CERTIFICATE_TYPE, ssl(8)
          errName = 'SecurityUnsupportedCertificateTypeError';
          break;
        case 9: // SSL_ERROR_UNSUPPORTED_VERSION, ssl(9)
          errName = 'SecurityUnsupportedTLSVersionError';
          break;
        case 12: // SSL_ERROR_BAD_CERT_DOMAIN, ssl(12)
          errName = 'SecurityCertificateDomainMismatchError';
          break;
        default:
          errName = 'SecurityError';
          break;
      }
    }
  } else {
    errType = 'Network';
    switch (status) {
      // connect to host:port failed
      case 0x804B000C: // NS_ERROR_CONNECTION_REFUSED, network(13)
        errName = 'ConnectionRefusedError';
        break;
      // network timeout error
      case 0x804B000E: // NS_ERROR_NET_TIMEOUT, network(14)
        errName = 'NetworkTimeoutError';
        break;
      // hostname lookup failed
      case 0x804B001E: // NS_ERROR_UNKNOWN_HOST, network(30)
        errName = 'DomainNotFoundError';
        break;
      case 0x804B0047: // NS_ERROR_NET_INTERRUPT, network(71)
        errName = 'NetworkInterruptError';
        break;
      default:
        errName = 'NetworkError';
        break;
    }
  }

  // XXX we have no TCPError implementation right now because it's really hard to
  // do on b2g18. On mozilla-central we want a proper TCPError that ideally
  // sub-classes DOMError. Bug 867872 has been filed to implement this and
  // contains a documented TCPError.webidl that maps all the error codes we use in
  // this file to slightly more readable explanations.
  let error = Cc["@mozilla.org/dom-error;1"].createInstance(Ci.nsIDOMDOMError);
  error.wrappedJSObject.init(errName);
  return error;
 
  // XXX: errType goes unused
}
dumpSecurityInfo=function (xhr, error) {
  let channel = xhr.channel;
 
  try {
    Logger.log("Connection status:\n");
    if (!error) {
      Logger.log("\tsucceeded\n");
    } else {
      Logger.log("\tfailed: " + error.name + "\n");
    }
 
    let secInfo = channel.securityInfo;
    // Print general connection security state
    Logger.log("Security Info:\n");
    if (secInfo instanceof Ci.nsITransportSecurityInfo) {
      secInfo.QueryInterface(Ci.nsITransportSecurityInfo);
      Logger.log("\tSecurity state: ");
        // Check security state flags
    if ((secInfo.securityState & Ci.nsIWebProgressListener.STATE_IS_SECURE)
           == Ci.nsIWebProgressListener.STATE_IS_SECURE) {
      Logger.log("secure\n");
    } else if ((secInfo.securityState & Ci.nsIWebProgressListener.STATE_IS_INSECURE)
           == Ci.nsIWebProgressListener.STATE_IS_INSECURE) {
      Logger.log("insecure\n");
    } else if ((secInfo.securityState & Ci.nsIWebProgressListener.STATE_IS_BROKEN)
               == Ci.nsIWebProgressListener.STATE_IS_BROKEN) {
      Logger.log("unknown\n");
      Logger.log("\tSecurity description: " + secInfo.shortSecurityDescription + "\n");
      Logger.log("\tSecurity error message: " + secInfo.errorMessage + "\n");
    }
    } else {
      Logger.log("\tNo security info available for this channel\n");
    }

    // Print SSL certificate details
    if (secInfo instanceof Ci.nsISSLStatusProvider) {
      var cert = secInfo.QueryInterface(Ci.nsISSLStatusProvider)
                        .SSLStatus.QueryInterface(Ci.nsISSLStatus).serverCert;
            
      Logger.log("\tCommon name (CN) = " + cert.commonName + "\n");
      Logger.log("\tOrganisation = " + cert.organization + "\n");
      Logger.log("\tIssuer = " + cert.issuerOrganization + "\n");
      Logger.log("\tSHA1 fingerprint = " + cert.sha1Fingerprint + "\n");
       
      var validity = cert.validity.QueryInterface(Ci.nsIX509CertValidity);
      Logger.log("\tValid from " + validity.notBeforeGMT + "\n");
      Logger.log("\tValid until " + validity.notAfterGMT + "\n");
    }
  } catch(err) {
    alert(err);
  }
}
sendAsBinary = function(sData, req) {
  var nBytes = sData.length, ui8Data = new Uint8Array(nBytes);
  for (var nIdx = 0; nIdx < nBytes; nIdx++) {
    ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
  }
  /* send as ArrayBufferView...: */
  req.send(ui8Data);
  /* ...or as ArrayBuffer (legacy)...: this.send(ui8Data.buffer); */
};

// (Singleton) Logger class
var Tester = new function() {
//class to do testing
// Adapted from the patch for mozTCPSocket error reporting (bug 861196).
  this.test = function(url) {
    var req =
       Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
     Logger.log("before open\n");
     req.open('POST', url, true);
     Logger.log("afer open\n");
     Logger.log("\tRequest stat" + req.status + "\n");
     sData='aue au aeu ae uaeu aeu aeu aeua eubabaue au aeu ae uaeu aeu aeu aeua eubabaue au aeu ae uaeu aeu aeu aeua eubabaue au aeu ae uaeu aeu aeu aeua eubabaaaaaue au aeu ae uaeu aeu aeu aeua eubaba';
     var nBytes = sData.length, ui8Data = new Uint8Array(nBytes);
     for (var nIdx = 0; nIdx < nBytes; nIdx++) {
       ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
     }
     req.send(ui8Data);
     Logger.log("\tRequest stat" + req.status + "\n");
     Logger.log("afer send\n");
//     req.addEventListener("error",
//                          function(e) {
//                            var error = createTCPErrorFromFailedXHR(req);
//                            dumpSecurityInfo(req, error);
//                          },
//                          false);
   
//     req.onload = function(e) {
//       dumpSecurityInfo(req);
//     };
//     req.send();
  }
}
