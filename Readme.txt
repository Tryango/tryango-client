Tryango Thunderbird Extension
===============================



Instructions for compiling and packaging Tryango
------------------------------------------------

Prerequisites for compilation for Linux and MacOS:
~~~~~~~~~~~~~
In order to build Tryango you will need the following helper tools:
- GNU make 3.81 or newer
- cmake
- a C-89 compliant compiler (gcc or cc)
- python 2.7
- OpenSSL
- lzz - The Lazy C++ Programmer's Tool [http://www.lazycplusplus.com/download.html]
- git
Optionally if you want to link protobuf dynamically you will need:
- protobuf library (on Debian libprotobuf-dev package)
- protobuf compiler (on Debian protobuf-compiler package)

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

Prerequisites for compilation for Windows:
~~~~~~~~~~~~~
In order to build Tryango you will need the following helper tools:
- Visual Studio - tested with 2013 Community Edition - if you want to use newer/older 
  version of Visual Studio it may work, but probably you need to compile OpenSSL yourself.
- OpenSSL - tested with version from http://slproweb.com/download/Win32OpenSSL-1_0_2d.exe
- lzz - The Lazy C++ Programmer's Tool - you can get binary here: http://www.lazycplusplus.com/lzz_2_8_2_windows.zip
- python 2.7
- cMake
- git

Preparation:
~~~~~~~~~~~~
- Install (free) Visual Studio 2013 Community Edition
- Install OpenSSl - program expects to find static libraries in lib\VC\static\ in openssl installation directory.
- Install cmake and make sure it is in PATH environment variable (e. g. by typing cmake in cmd)
- Dowload and unpack lzz - make sure it is in PATH environment variable
- Install Python
- Install Git and checkout Tryango source from https://github.com/tryango/tryango-client.git

Building:
~~~~~~~~
- Start Visual Studio Native Tools Command Prompt (e. g. by running "C:\Program Files (x86)\Microsoft Visual Studio 12.0\VC\vcvarsall.bat"" x86):
  In the command prompt go to confimail/client_src and execute the commands:
    mkdir build
    cd build
    cmake -G "NMake Makefiles" ..   -Dconfimail_build_tests=OFF  -DCMAKE_BUILD_TYPE=Release -Dconfimail_windows_tests=ON
    nmake
  If everything goes well you should have an xpi file in build directory (e. g. confimail-0.9.5-win-i386.xpi).
  
  Optionally you may need to tell cmake or python is installed:
    set pythonExe = D:\Tools\Python\python.exe
    set cmakeDir = D:\Tools\cmake-3.2.1-win32-x86\bin
  and then you can add the following additional parameters to cmake command:
    -DCMAKE_ROOT=%cmakeDir% -DPYTHON_EXECUTABLE=%pythonExe%
    


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
