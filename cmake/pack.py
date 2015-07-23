#!/usr/bin/python
import glob
import sys
import os.path
import os
import zipfile
# import subprocess
# import shutil


def help():
    print "Program requires at least two parameters -" + \
          " the first parameter is name of the zip file"


def main(argv):
    if len(argv) < 2:
        help()
        sys.exit(2)
    try:
        import zlib
        mode = zipfile.ZIP_DEFLATED
    except:
        mode = zipfile.ZIP_STORED
        print "Not using compression for creating xpi"
    changeDir = False
    zip = zipfile.ZipFile(argv[0], 'w', mode)
    for arg in argv[1:]:
        if(arg == "-C"):
            changeDir = True
        else:
            if changeDir:
                changeDir = False
                os.chdir(arg)
            else:
                files = glob.glob(arg)
                for f in files:
                    zip.write(f)
    zip.close()


if __name__ == "__main__":
    main(sys.argv[1:])
