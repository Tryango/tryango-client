Tryango Thunderbird Extension
===============================



Instructions for compiling and packaging Tryango
--------------------------------------------------

Prerequisites for compilation:
~~~~~~~~~~~~~
In order to build Tryango you will need the following helper tools:
- GNU make 3.81 or newer
- cmake
- a C-89 compliant compiler (gcc or cc)
- Java jar command (for packing)
- protobuf-c [https://github.com/protobuf-c/protobuf-c] or debian package protobuf-c
- lzz - The Lazy C++ Programmer's Tool [http://www.lazycplusplus.com/download.html]

Building
~~~~~~~~

Execute the following commands:

----
 mkdir build
 cd build
 cmake .. 
 make 
----


The resulting XPI file can be found in the "build" directory.

Directory structure:
--------------------
client_src
├── CMakeLists.txt               	(main cmake file)
├── LICENSE                      	(license for the plugin -empty at the moment)
├── Readme.txt                   	(this file)
├── build                        	(directory used by build process - all of the content can be regenerated)
├── cmake                        	(files used by cmake)
│   └── modules
│       ├── Copy.cmake           	(not used yet)
│       ├── FindMozilla.cmake    	(not used yet)
│       └── GetOs.cmake          	(determines the operating system)
└── src
    ├── CMakeLists.txt           	(cmake file used to build xpi)

    ├── chrome
    │   ├── content
    │   │   ├── tryango.xul	 	(declaration of Thunderbird modules to be used/altered by the extension)
    │   │   ├── tryango.js	 	(the actual extension code)
    │   │   ├── mailwindow.xul	 	(overlay for the "compose-email" window in Thunderbird)
    │   │   ├── mailwindow.js	 	(code for overlay)
    │   │   └── modules		 	(directory for all sub-modules; jsm = javascript-module)
    │   │       ├── logger.jsm	 	(a basic logfile-manager)
    │   │       └── userinterface.jsm	(interaction with GUI)
    │   └── locale
    │       └── ...			(language packs, see
    │                             	https://developer.mozilla.org/en-US/docs/Building_an_Extension#Localization)
    ├── chrome.manifest          	(declaration of directory structure)
    ├── install.rdf.in           	(template for install.rdf)
    └── xpi.cpack.in             	(configuration file for CPack)



Installation Thunderbird Extention:
-----------------------------------

.Possibility 1:
1. create a new profile in Thunderbird (preferably: tryangotest)
2. build addon
3. choose:
   a. Load extension in Thunderbird (Tools => Add-ons => (button right upper corner) Install Add-on From File)
   b. copy tryango.xpi into ~/.thunderbird/<tryangotest>/extensions/ + 
      (maybe ~/.thunderbird/<tryangotest>/extensions.ini has to be altered)

.Possibility 2:
1. create a new profile in Thunderbird (preferably: tryangotest)
2. create a text-file named "tryango@uni_bham" in ~/.thunderbird/<tryangotest>/extensions/ +
   and write the full path to the repository in it: +
   /home/<user>/...../src

[CAUTION]
====
Thunderbird _DELETES_ extensions that are not working. If sym-linked this even deletes the entries
IN the repository. Make sure to commit often when using Possibility 2!
====

Testing:
--------
For testing see Makefile (make test).

In addition, there is a gmail account for usage with the Thunderbird-profile:
mail: tryango.bham@gmail.com
pw:   angmai (without l)

The Thunderbird-Error-Console logging is turned off by default, to activate goto
Edit -> Preferences -> Advanced -> General -> Config Editor... and set
    javascript.options.showInConsole to true
    extensions.logging.enabled to true
    (not needed but maybe helpful: browser.dom.window.dump.enabled to true)
    more info: https://developer.mozilla.org/en-US/Add-ons/Setting_up_extension_development_environment
To turn off delay when installing addon modify security.dialog_enable_delay in about:config
To turn on debugging messages install https://addons.mozilla.org/en-US/firefox/addon/devprefs/
Explanation for Thunderbird Extensions:
---------------------------------------

.Documentation:
https://developer.mozilla.org/en-US/
https://developer.mozilla.org/en-US/docs/Web/API	(all javascript elements)
https://developer.mozilla.org/en-US/Add-ons/Thunderbird	(main start page)
http://doxygen.db48x.net/comm-central/html/

.Complete example of XPCOM:
http://ptncode.blogspot.com/2013/08/exposing-xpcom-c-interface-on-dom.html

.TB Examples:
http://mdn.beonex.com/en/Extensions/Thunderbird/HowTos.html

.Book
http://books.mozdev.org/html/index.html

.File structure of plugins:
https://developer.mozilla.org/en-US/Add-ons/Thunderbird/Building_a_Thunderbird_extension_2:_extension_filesystem


.Tutorial on how to build a Thunderbird Extension (outdated according to website, but still working)
https://developer.mozilla.org/en-US/Add-ons/Thunderbird/Building_a_Thunderbird_extension

[NOTE]
====
Forget about the mentioned "builder" and create files manually by hand.
The builder seems to work only for firefox!
====

.Next Tutorial
http://blog.xulforum.org/index.php?post/2011/01/03/An-overview-of-Thunderbird-Conversations
http://blog.xulforum.org/index.php?post/2011/03/14/Basic-MimeMessage-demo

.Advanced Tutorials:
https://developer.mozilla.org/en-US/Add-ons/Thunderbird/Demo_Addon
https://developer.mozilla.org/en-US/Add-ons/Thunderbird/HowTos





Useful plugins:
---------------
Developer assistant: https://addons.mozilla.org/en-US/thunderbird/addon/extension-developer/?src=search
