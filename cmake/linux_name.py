#!/usr/bin/python
import sys
import platform

#script to determine linux platform name
if __name__ == "__main__":
    if sys.platform == "linux" or sys.platform == "linux2":
        sys.stdout.write(platform.linux_distribution()[0]) #print without newline
