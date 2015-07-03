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

Installation Thunderbird Extention:
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. build addon
2. install
   a. Load extension in Thunderbird (Tools => Add-ons => (button right upper corner) Install Add-on From File)
   b. FOR ADVANCED USERS: copy tryango.xpi into ~/.thunderbird/<profile>/extensions/ +
      (maybe ~/.thunderbird/<profile>/extensions.ini has to be altered)


[CAUTION]
====
Thunderbird _DELETES_ extensions that are not working. If sym-linked this even deletes the entries
IN the repository.
====



Directory structure:
--------------------
.
├── CMakeLists.txt               	(main cmake file)
├── LICENSE                      	(license for the plugin -empty at the moment)
├── Readme.txt                   	(this file)
├── LICENSE
├── build                        	(directory used by build process - all of the content can be regenerated)
├── cmake                        	(files used by cmake)
└── src
	├── certs
	├── components					(all C files - usually as lzz)
	│	└── ...
	├── defaults
    ├── chrome.manifest.in          (template for chrome.manifest =declaration of paths)
    ├── install.rdf.in           	(template for install.rdf =meta-info of the Thunderbird plugin)
	└── chrome
	    ├──content
		│   ├── dialogs
		│   │   ├── about.xul
		│   │   ├── help.js
		│   │   ├── help.xul
		│   │   ├── settings.js
		│   │   ├── settings.xul
		│   │   ├── signup.js
		│   │   └── signup.xul
		│   ├── mailwindow.js	(code for overlay)
		│   ├── mailwindow.xul	(overlay for the "compose-email" window in Thunderbird)
		│   ├── modules			(directory for all sub-modules; jsm = javascript-module)
		│   │   ├── attachmentManager.jsm
		│   │   ├── cWrapper.jsm
		│   │   ├── dialogs.jsm
		│   │   ├── logger.jsm	(a basic logfile-manager)
		│   │   ├── maillistener.jsm
		│   │   ├── prefs.jsm
		│   │   ├── pwmanager.jsm
		│   │   ├── send.jsm
		│   │   ├── test.jsm
		│   │   └── utils.jsm
		│   ├── tryango.js		(the actual extension code =main javascript file)
		│   └── tryango.xul		(declaration of Thunderbird modules to be used/altered by the extension)
		├── locale				(language packs, see
    	│   └── ...             https://developer.mozilla.org/en-US/docs/Building_an_Extension#Localization)
		└── skin
	    	├── cm_logo_24x24.png
	    	├── cm_logo.png
	    	├── cm_logo.xcf
	    	└── overlay.css
