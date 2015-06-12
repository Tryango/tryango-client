#!/usr/bin/python
import sys
import os
import os.path
import subprocess
import shutil
import distutils.spawn


def help():
    print "Program requires four parameters:"
    print "    1. Name of Tryango library - full path"
    print "    2. Location of chrome.manifest.in - full path with filename"
    print "    3. Destination for chrome.manifest - full path with filename"
    print "    4. Abi string compatible with Thunderbird"


def main(argv):
    if len(argv) != 4:
        help()
        sys.exit(2)
    protobufLib = ""
    if os.name != 'nt':  # on windows we link protobuf-lite statically
        if distutils.spawn.find_executable("ldd") != None:
            for line in subprocess.check_output(["ldd", argv[0]]).split('\n'):
                if(line.find("protobuf-lite") > -1):
                    protobufLib = line.strip().split()[2]
        elif distutils.spawn.find_executable("otool") != None: # for MacOS
            for line in subprocess.check_output(["otool", "-L", argv[0]]).split('\n'):
                if(line.find("protobuf-lite") > -1):
                    protobufLib = line.strip().split()[0]

        if (protobufLib != ""):
            shutil.copy(protobufLib, os.path.dirname(argv[0]))
            print "Copying " + protobufLib + " to " + os.path.dirname(argv[0])
            protoFile = os.path.join(os.path.dirname(argv[0]), "protobuf.txt")
            with open(protoFile, "wt") as prout:
                prout.write(os.path.basename(protobufLib))
    print "Generating " + argv[2]
    with open(argv[2], "wt") as fout:
        with open(argv[1], "rt") as fin:
            for line in fin:
                if os.name != 'nt':
                    protoLine = "resource  	protobuf 					components/" +\
                      os.path.basename(protobufLib) + "  abi=@ABI@"
                else:
                    protoLine = ""
                fout.write(line.
                           replace("@PROTOBUF_LINE@", protoLine).
                           replace("@ABI@", argv[3]).
                           replace("@TRYANGO_FILE@",
                                   os.path.basename(argv[0])))


if __name__ == "__main__":
    main(sys.argv[1:])
