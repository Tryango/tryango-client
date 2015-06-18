/* Basic file for JavaScript code on signing up with new E-mail address */

//standard modules
Components.utils.import("resource:///modules/iteratorUtils.jsm"); //for fixIterator

// own modules
Components.utils.import("resource://tryango_modules/logger.jsm");
Components.utils.import("resource://tryango_modules/dialogs.jsm");
Components.utils.import("resource://tryango_modules/cWrapper.jsm");
Components.utils.import("resource://tryango_modules/prefs.jsm");
Components.utils.import("resource://tryango_modules/pwmanager.jsm")
Components.utils.import("resource://tryango_modules/utils.jsm");



// ----- GENERAL -----

//function defining how the wizard will proceed, which pages are shown next
//(uses the following three functions)
function onNext() {
  var wizard = getWizard();

  //progression through the dialog
  if(wizard.currentPage){
    switch(wizard.currentPage.pageid) {
    //1. page: welcome page
    case "welcomePage":
      wizard.currentPage.next = "chooseEmailPage";
      break;
      
    //2. page: choose email and key creation/import option
    case "chooseEmailPage":
      /*3. page =
       *	previous key	=> lastPage (simple) or serverPage (advanced)
       *	create new key	=> createKeyPage
       *	import key		=> importKeyPage
      */
      wizard.currentPage.next = getNextKeyPage();
      break;

    //3. page: serverPage (advanced)
    case "serverPage":
      wizard.currentPage.next = "lastPage";
      break;
      
    //3. page: createKeyPage (simple/advanced)
    //3. page: importKeyPage (simple/advanced)
    case "createKeyPage":
    case "importKeyPage":
      wizard.currentPage.next = getNextServerPage();
      break;
    }

    //lastPage => wizard finished; do the signup
    if(wizard.currentPage.next == "lastPage"){
      if(!signup()){
        //error => stay on page
        wizard.currentPage.next = wizard.currentPage;
      }
    }
  }
  return true;
}

//helper function to choose next page after chooseEmailPage
function getNextKeyPage(){
  var radioGroup = document.getElementById("ang_key_radiogroup");
  switch(radioGroup.selectedIndex) {
  //use previous key
  case 0:
    //proceed with lastPage (simple) or serverPage (advanced)
    return getNextServerPage();

  //create new key
  case 1: 
    return "createKeyPage";

  //import key
  case 2: 
    return "importKeyPage";
  }

  //error => restart
  return "welcomePage";
}
 

//helper function to distinguish "simple" and "advanced" setup
function getNextServerPage(){
  if (Prefs.getPref("advancedOptions")){
    return "serverPage";
  }
  else{
    return "lastPage";
  }
}



//general stuff...

function getWizard() {
  return document.getElementById("tryango_signup_wizard");
}

function onLoad(){}

function onFinish(){
  Dialogs.signupEnd();
  return true;
}

function onCancel(){
  CWrapper.clearInfo(); //clear temporary key database
  Dialogs.signupEnd();
  return true;
}


function onBack() {
  var wizard = getWizard();
  if (wizard.currentPage) {
    wizard.setAttribute("lastViewedPage", wizard.currentPage.pageid);
  }
  return true;
}



// ----- FIRST PAGE: WELCOME PAGE -----
//user chooses option: simple or advanced sign-up

function welcomePageCreate(){
  var wizard = getWizard();
  //hide "normal" dialog buttons (and just display "simple" and "advanced")
  var buttons = document.getAnonymousElementByAttribute(wizard, "anonid", "Buttons");
  buttons.setAttribute("hidden", "true");
  
  //re-add cancel button again
  var box  = document.getElementById("cancel_box");
  var cloneBtn = wizard.getButton("cancel").cloneNode(true);
  cloneBtn.setAttribute("oncommand", "getWizard().cancel()");
  if(!box.hasChildNodes()){
    box.appendChild(cloneBtn);
  }
}


function onSimple(){
  //set prefs and go to next page
  Prefs.setPref("advancedOptions", false);  
  getWizard().advance(null);
}

function onAdvanced(){
  //set prefs and go to next page
  Prefs.setPref("advancedOptions", true);
  getWizard().advance(null);
}


// ----- SECOND PAGE: CHOOSE EMAIL PAGE -----

function chooseEmailPageCreate(){
  var wizard = getWizard();
  wizard.canAdvance = false;
  //show buttons again
  var buttons = document.getAnonymousElementByAttribute(wizard, "anonid", "Buttons");
  buttons.removeAttribute("hidden");

  //set labels for advanced options
  if(Prefs.getPref("advancedOptions")){
    document.getElementById("chooseEmailPage_import_key").setAttribute(
      "label",
      document.getElementById("lang_file").getString("wizard_chooseEmailPage_importKey_advanced"));
  }else{
    document.getElementById("chooseEmailPage_import_key").setAttribute(
      "label",
      document.getElementById("lang_file").getString("wizard_chooseEmailPage_importKey_simple"));
  }
  
  //get email accounts
  var addresses = Utils.getEmailAddresses();
  
  // load drop down menu 
  var dropdownmenu = document.getElementById("signup_email");
  if(addresses.length != 0){
    //clear
    dropdownmenu.removeAllItems();
    //add new buttons
    for each (let addr in addresses){
      dropdownmenu.appendItem(addr, addr); //label, value
    }
    //default option
    dropdownmenu.selectedIndex = 0;
    //adjust radio button
    setRadioBtn(dropdownmenu);
  }
  if(dropdownmenu.selectedItem.value != "empty"){
    wizard.canAdvance = true;
  }
}


function setRadioBtn(dropdownmenu){
  //check dropdown not empty
  if(dropdownmenu != null && dropdownmenu.selectedItem.value != "empty"){
    //set radio button "use previous key" active if there is a previous key...
    var radio = document.getElementById("chooseEmailPage_prev_key");
    if(CWrapper.hasSecretKey(dropdownmenu.selectedItem.value)){
      radio.removeAttribute("hidden");
    }else{
      //...otherwise hide it
      radio.setAttribute("hidden", "true");
      //and set other option as default
      var radioGroup = document.getElementById("ang_key_radiogroup");
      if(radioGroup.selectedIndex == 0){
        radioGroup.selectedIndex = 1;
      }
    }
  }
}


// ----- THIRD PAGE: SERVER PAGE (option 1; advanced setup) -----

function serverPageCreate(){
  //advanced options should always be turned on when displaying this page
  if(!Prefs.getPref("advancedOptions")){
    Logger.error("serverPage was shown even though advanced options is turned off. (cancel)");
    //cancel dialog
    getWizard().cancel();
  }
  
  //init
  var port = document.getElementById("ang_port");
  var server = document.getElementById("ang_server");
  port.value = Prefs.getPref("port");
  server.value = Prefs.getPref("server");
  document.getElementById("ang_machineID").value = Prefs.getPref("machineID");

  //set active/disabled depending on advanced options
  //(this shall not be used but maybe we allow the simple user in future to set servers, too)
  if(Prefs.getPref("advancedOptions")){
    port.removeAttribute("disabled");
    server.removeAttribute("disabled");
  }else{
    port.setAttribute("disabled");
    server.setAttribute("disabled");
  }
}


// ----- THIRD PAGE: CREATE NEW KEY (option 2) -----

function createKeyPageCreate(){
  if (!Prefs.getPref("advancedOptions")){
    //simple setup (hide advanced settings)
    document.getElementById("ang_adv_header").setAttribute("hidden", "true");
    document.getElementById("ang_adv_expirydate").setAttribute("hidden", "true");
    document.getElementById("ang_datepickerbox").setAttribute("hidden", "true");
    document.getElementById("ang_datepicker").setAttribute("hidden", "true");
    document.getElementById("createKey_size").setAttribute("hidden", "true");
    document.getElementById("ang_adv_size").setAttribute("hidden", "true");

    //change labels
    document.getElementById("ang_key_pw_label").value =
      document.getElementById("lang_file").getString("wizard_createKeyPage_typePw_simple");
  }
  else{
    //advanced setup (show advanced settings)
    document.getElementById("ang_adv_header").removeAttribute("hidden");
    document.getElementById("ang_adv_expirydate").removeAttribute("hidden");
    document.getElementById("ang_datepickerbox").removeAttribute("hidden");
    document.getElementById("ang_datepicker").removeAttribute("hidden");
    document.getElementById("createKey_size").removeAttribute("hidden");
    document.getElementById("ang_adv_size").removeAttribute("hidden");

    //change labels
    document.getElementById("ang_key_pw_label").value =
      document.getElementById("lang_file").getString("wizard_createKeyPage_typePw_advanced");
  }
}

function setPwVisibility(){
  var checkbox = document.getElementById("ang_show_pw");
  if(checkbox.hasAttribute("checked")){
    //pw visible
    document.getElementById("ang_key_pw2").value = "";
    document.getElementById("ang_key_pw2").setAttribute("disabled", "true");
    document.getElementById("ang_key_pw").removeAttribute("type");
  }
  else{
    //pw hidden
    document.getElementById("ang_key_pw").setAttribute("type", "password");
    document.getElementById("ang_key_pw2").removeAttribute("disabled");
  }
  comparePw();
}

function comparePw(){
  Logger.dbg("SignUpWizard comparePW");
  //variables
  var pw1  = document.getElementById("ang_key_pw");
  var pw2  = document.getElementById("ang_key_pw2");
  var label = document.getElementById("ang_pw_nomatch");
  var vspace = document.getElementById("ang_vspace");
  var wizard = getWizard();
  //check if password matches
  if(!pw2.hasAttribute("disabled") &&
     (pw1.value != pw2.value)){
    //pw2 is active (characters are hidden) but passwords do NOT match
    //=> disallow continue, show label
    label.removeAttribute("hidden");
    vspace.setAttribute("hidden", "true");
    wizard.canAdvance = false;
  }else{
    //passwords match or pw2 is disabled
    //=> allow continue, hide label
    vspace.removeAttribute("hidden");
    label.setAttribute("hidden", "true");
    wizard.canAdvance = true;
  }
}

function setDateVisibility(){
  //get fields to set expiry date
  var checkbox = document.getElementById("ang_datepickerbox");
  var datebox = document.getElementById("ang_datepicker");
  //show datebox if checkbox set
  if(checkbox.hasAttribute("checked")){
    datebox.setAttribute("disabled", "true");
  }else{
    datebox.removeAttribute("disabled");
  }
}


// ----- THIRD PAGE: IMPORT KEY (option 3) -----

function importKeyPageCreate(){
  //when on advanced setup: check if GPG is installed
  if(Prefs.getPref("advancedOptions") && CWrapper.hasGpg()){
    document.getElementById("ang_btn_gpg").removeAttribute("hidden");
  }else{
    document.getElementById("ang_btn_gpg").setAttribute("hidden", "true");
  }

  //hide tables
  Logger.dbg("set label, hide tables...");
  //set appropriate text visibility
  var none = document.getElementById("ang_lbl_noKeys");
  none.removeAttribute("hidden");
  var emptyfile = document.getElementById("ang_lbl_emptyFile");
  emptyfile.setAttribute("hidden", "true");
  var gpg = document.getElementById("ang_lbl_loadedGpg");
  gpg.setAttribute("hidden", "true");
  var file = document.getElementById("ang_lbl_loadedFile");
  file.setAttribute("hidden", "true");
  var table = document.getElementById("ang_table_importkeys");
  table.setAttribute("hidden", "true");

  //labels etc.
  var languagepack = document.getElementById("lang_file");
  if(Prefs.getPref("advancedOptions")){
    //advanced setup
    //set labels
    document.getElementById("importKeyPage").setAttribute(
      "label", languagepack.getString("wizard_importKeyPage_title_advanced"));
    document.getElementById("ang_lbl_loadedFile").value =
      languagepack.getString("wizard_importKeyPage_loadedFile_advanced");
    document.getElementById("key_id").setAttribute(
      "label", languagepack.getString("wizard_importKeyPage_fingerprint_advanced"));
    //show rows in table
    document.getElementById("key_type").removeAttribute("hidden");
    document.getElementById("key_expiry").removeAttribute("hidden");
    document.getElementById("key_encrypted").removeAttribute("hidden");
    document.getElementById("info_key_tree").removeAttribute("hidecolumnpicker");
  }
  else{
    //simple setup
    //set labels
    document.getElementById("importKeyPage").setAttribute(
      "label", languagepack.getString("wizard_importKeyPage_title_simple"));
    document.getElementById("ang_lbl_loadedFile").value =
      languagepack.getString("wizard_importKeyPage_loadedFile_simple");
    document.getElementById("key_id").setAttribute(
      "label", languagepack.getString("wizard_importKeyPage_fingerprint_simple"));
    //hide rows in table
    document.getElementById("key_type").setAttribute("hidden", "true");
    document.getElementById("key_expiry").setAttribute("hidden", "true");
    document.getElementById("key_encrypted").setAttribute("hidden", "true");
    document.getElementById("info_key_tree").setAttribute("hidecolumnpicker", "true");
    
    //open file dialog straight away (only simple setup)
    onInfoFile();
  }
}

function onInfoGpg(){
  //variables
  var languagepack = document.getElementById("lang_file");
  var email = document.getElementById("signup_email").selectedItem.value;

  //load keys from gpg
  var status = CWrapper.loadInfoKeysFromGpg(email);
  if(status != 0 && status !=15){ //15 = ANG_NO_ENTRIES
    //error
    Logger.error("loadInfoKeysFromGpg failed with status: " + status);
    Logger.infoPopup(languagepack.getString("imp_keys_fail"));
  }
  else if(status == 0){
    //fill the table
    fillInfoTable(email);
    //check if tree is empty
    if(document.getElementById("info_key_list").childNodes.length != 0){
      //adjust label to show gpg
      var gpg = document.getElementById("ang_lbl_loadedGpg");
      var file = document.getElementById("ang_lbl_loadedFile");
      gpg.removeAttribute("hidden");
      file.setAttribute("hidden", "true");
      //show table (ATTENTION: this is needed to access tree.view apparently!)
      var table = document.getElementById("ang_table_importkeys");
      table.removeAttribute("hidden");
      //default selection
      var tree = document.getElementById("info_key_tree");
      tree.view.selection.select(0);
    }
  }
  //else: no entries - nothing to do?
}

function onInfoFile(){
  //use filepicker to open file
  var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
    Components.interfaces.nsIFilePicker);
  var languagepack = document.getElementById("lang_file");
  var secKey= languagepack.getString("secret_key_files");
  var allFiles= languagepack.getString("all_files");

  //file filters:
  fp.appendFilter(secKey, "*.purse; *.gpg; *.pgp; *.asc; *.txt");
  fp.appendFilter(allFiles, "*");
  var headerString;
  if(Prefs.getPref("advancedOptions")){
    headerString = "sel_secret_key_advanced";
  }
  else{
    headerString = "sel_secret_key_simple";
  }
  fp.init(window,languagepack.getString(headerString),
          Components.interfaces.nsIFilePicker.modeOpen);
  //show filepicker
  var res = fp.show();
  if(res != Components.interfaces.nsIFilePicker.returnCancel){
    var email = document.getElementById("signup_email").selectedItem.value;
    //import keypurse from selected location
    var status = CWrapper.loadInfoKeysFromFile(email, fp.file.path);
    if(status != 0 && status != 15){ //15 = ANG_NO_ENTRIES 
      //error
      Logger.error("loadInfoKeysFromFile failed");
      Logger.infoPopup(languagepack.getString("imp_keys_fail"));
    }
    else if(status == 0){
      //fill table
      var gotoNextPage = fillInfoTable(email);
      if(document.getElementById("info_key_list").childNodes.length != 0){
        //show table (ATTENTION: this is needed to access tree.view apparently!)
        var table = document.getElementById("ang_table_importkeys");
        table.removeAttribute("hidden");
        //default selection
        var tree = document.getElementById("info_key_tree");
        tree.view.selection.select(0);
        //next page?
        if(gotoNextPage){
          getWizard().advance(null); //null for next page
        }
        else{
          //adjust label to show "loaded from file"
          var gpg = document.getElementById("ang_lbl_loadedGpg");
          var file = document.getElementById("ang_lbl_loadedFile");
          file.removeAttribute("hidden");
          gpg.setAttribute("hidden", "true");
        }
      }
    }
    //else: no entries - nothing to do?
  }
}

function fillInfoTable(email){
  //set appropriate text visibility
  var none = document.getElementById("ang_lbl_noKeys");
  none.removeAttribute("hidden");
  var emptyfile = document.getElementById("ang_lbl_emptyFile");
  emptyfile.setAttribute("hidden", "true");
  var gpg = document.getElementById("ang_lbl_loadedGpg");
  gpg.setAttribute("hidden", "true");
  var file = document.getElementById("ang_lbl_loadedFile");
  file.setAttribute("hidden", "true");
  
  //load keys and add to tree
  var treeList = document.getElementById("info_key_list");
  var keys = CWrapper.getInfoKeys(email, false);
  if(keys == null){
    //error
    Logger.err("Error in CWrapper.getInfoKeys");
    return false;
  }
  else if(keys.length <= 0){
    //keys.length == 0 - no results
    Logger.dbg("getInfoKeys size: " + keys.length);
    Logger.log("No keys to be filled into table (empty file)");
    none.setAttribute("hidden", "true");
    emptyfile.removeAttribute("hidden");
    return false;
  }
  else{
    Logger.dbg("getInfoKeys size: " + keys.length);
    
    //set appropriate text visibility
    none.setAttribute("hidden", "true");
    
    //clear old tree
    while(treeList.childNodes.length != 0){
      treeList.removeChild(treeList.childNodes[0]);
    }
    //add keys to tree
    var languagepack = document.getElementById("lang_file");
    var advSetup = Prefs.getPref("advancedOptions");
    var expire;
    for (var i = 0; i < keys.length; i++) {
      expire = new Date(keys[i].signExpire);
      //only display keys if they are not expired or advanced setup is on
      if(advSetup || (keys[i].signExpire == 0) || (expire.getTime() < Date.now()) ){
        Utils.treeAppendRow(treeList, keys[i], document, false, languagepack);
      }
    }

    //check length, if only 1 key & simple setup => proceed
    if(!advSetup && keys.length == 1 ){
      return true;
    }
    else{
      return false;
    }
  }
  return false;
}

function onKeySelect(){
  //assert
  if(document.getElementById("info_key_list").childNodes.length == 0){
    Logger.dbg("onKeySelect: tree is empty");
    //tree is empty
    tree.currentIndex = -1;
    wizard.canAdvance = false;
    return;
  }
  //get tree
  var tree = document.getElementById("info_key_tree");
  var col = tree.columns.key_expiry;
  var index = tree.view.getParentIndex(tree.currentIndex);
  //-1 is returned if there is no parent
  if(index == -1){
    index = tree.currentIndex;
  }

  //check selected key
  var wizard = getWizard();
  var expire = tree.view.getCellText(index, col);
  var languagepack = document.getElementById("lang_file");
  if(expire == languagepack.getString("never")){
    wizard.canAdvance = true;
  }
  else{
    //XXX: Logger.dbg("expire"+expire+"time compare:"+(new Date(expire)).toLocaleDateString()+ " now:"+Date.now()+ " bool:"+( (new Date(expire)).getTime() < Date.now()));

    //check expiry of selected key
    if((new Date(expire)).getTime() < Date.now()){
      wizard.canAdvance = false;
    }
    else{
      wizard.canAdvance = true;
    }
  }
}


// ----- LAST PAGE -----

function lastPageCreate(){
  Logger.dbg("SignUpWizard createLastPage");
  var wizard = getWizard();
  //last page only shows some text => no "back"/"cancel"
  wizard.canRewind=false;
  wizard.getButton("cancel").disabled = true;
}


// ----- FINISHED -----

function signup(){
  var email = document.getElementById("signup_email").selectedItem.value;
  if(email != "empty"){
    var doSignup = false;
                                 
    //check which option was selected (previous key, new key, import key)
    //and execute it
    var keyMethod = document.getElementById("ang_key_radiogroup");
    switch(keyMethod.selectedIndex) {
    case 0:
      doSignup = true;
      break;
    case 1:
      //display a "waiting" popup
      if(!Logger.promptService.confirm(
        null, "Tryango", document.getElementById("lang_file")
          .getString("wizard_signup_waitingDialog"))){
        //user abort
        return false;
      }
      doSignup = generateKey();
      break;
    case 2:
      doSignup = importKey();
      break;
    }

    //if execution succeeded, do the signup
    if(doSignup){
      //generate random requestID to identify answers from server
      var token = generateToken();
      Logger.dbg("reqId token: " + token);
      Prefs.setPref("reqId_" + email, token);

      //pass email address to c
      //TODO: append machineID with random string
      let result = CWrapper.signup(email, Prefs.getPref("machineID"), token);

      //check errors
      if(result != 0){
        //error
        var strbundle = document.getElementById("strings");
        var errorStr = CWrapper.getErrorStr(result);
        Logger.error("Error signing up: " + strbundle.getString(errorStr));
        Logger.infoPopup(strbundle.getString(errorStr) + " (" + result + ")");
        return false;
      }else{
        Logger.dbg("deleting ap for email: " + email);
        Pwmgr.setAp(email, "");//delete ap as it is invalid since we submitted to server
      }
      Logger.dbg("sign up: " + email);
      return true;
    }
  }
  
  return false;
}


function generateKey(){
  //get infos about key to create
  var email = document.getElementById("signup_email").selectedItem.value;
  var password = document.getElementById("ang_key_pw").value;
  var radioKeySize = document.getElementById("createKey_size");
  var keySize = (4-2*radioKeySize.selectedIndex)*1024;
  if (keySize == 0){
    keySize = 1024;
  }
  //create key
  if(CWrapper.generateRsaKeys(email, password, keySize)){
    //save keypurse
    if(CWrapper.exportKeyPurse(Prefs.getPref("keyPursePath"), "")){ //TODO: change "" to password
      //everything ok
      Logger.dbg("Keypurse saved");
      return true;
    }else{
      //error saving keypurse
      Logger.error("Error saving keypurse to file " + Prefs.getPref("keyPursePath"));
    }
  }else{
    //error creating key
    Logger.error("Generation of RSA keys failed");
  }
  return false;
}


function importKey(){
  //identify key
  var tree = document.getElementById("info_key_tree")
  var email = document.getElementById("signup_email").selectedItem.value;
  var col = tree.columns.key_id;
  var index = tree.view.getParentIndex(tree.currentIndex);
  Logger.dbg("Transfering of RSA keys");
  //-1 means no parent
  if(index == -1){
    index = tree.currentIndex;
  }
  var fingerprint = tree.view.getCellText(index, col);

  //import key
  var status = CWrapper.transferKeysFromInfo(fingerprint);
  if(status == 0){
    //save key
    if(CWrapper.exportKeyPurse(Prefs.getPref("keyPursePath"), "")){ //TODO: change "" to password here too?
      //everything ok
      Logger.dbg("Keypurse saved with fingerprint " + fingerprint);
      return true;
    }
    else{
      //error saving keypurse
      Logger.error("Error saving keypurse to file " + Prefs.getPref("keyPursePath"));
    }
  }
  else{
    //error importing keys
    Logger.error("Transfer of RSA keys failed with status:" + status);
  }
  return false;
}



// ----- HELPER FUNCTIONS -----

// helper function to generate random int string (128 bit = 32 characters)
function generateToken(){
  var t = "";

  for(var i = 0; i < 4; i++){
    t += Math.random().toString(16).substr(2, 8); //removing "0." in beginning
  }

  return t;
}


// function getTimestamp(){
//   var dp = document.getElementById("ang_datepicker");
//   return Date.UTC(dp.year, dp.motnth, dp.date);
//   
// }


