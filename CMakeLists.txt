#  ================================================================
#
#  This file is part of the Tryango Thunderbird Extension
#
#  ================================================================
CMAKE_MINIMUM_REQUIRED(VERSION 3.0 FATAL_ERROR)
cmake_policy(VERSION 3.0)
SET( PROJECT_NAME tryango )
PROJECT( ${PROJECT_NAME} CXX C)

include(FindThreads) #set up e.g. CMAKE_THREAD_LIBS_INIT
include(CheckTypeSize)
include(CheckIncludeFile)
include(CheckCXXCompilerFlag)
include(ExternalProject)

CHECK_CXX_COMPILER_FLAG("-std=c++11" CXX11)
if (NOT CXX11)
    MESSAGE(FATAL_ERROR "C++ compiler doesn't support C++11")
endif()

CHECK_INCLUDE_FILES("inttypes.h" HAVE_INTTYPES_H)
CHECK_INCLUDE_FILES("netinet/in.h" HAVE_NETINET_IN_H)

if(HAVE_INTTYPES_H)
    ADD_DEFINITIONS("-DHAVE_INTTYPES_H")
endif()

if(HAVE_NETINET_IN_H)
  ADD_DEFINITIONS("-DHAVE_NETINET_IN_H")
endif()
  
IF(WIN32)
  OPTION(${PROJECT_NAME}_build_tests "Build tests for ${PROJECT_NAME}." OFF)
  OPTION(${PROJECT_NAME}_windows_tests "Build tests for ${PROJECT_NAME} for windows." ON)
ELSE(WIN32)
  IF(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
    OPTION(${PROJECT_NAME}_build_tests "Build tests for ${PROJECT_NAME}." OFF)
  ELSE()
    OPTION(${PROJECT_NAME}_build_tests "Build tests for ${PROJECT_NAME}." ON)
  ENDIF()
  OPTION(${PROJECT_NAME}_windows_tests "Build tests for ${PROJECT_NAME} for windows." OFF)
ENDIF(WIN32)
OPTION(${PROJECT_NAME}_static_zlib "Include zlib statically for ${PROJECT_NAME}." ON)
OPTION(${PROJECT_NAME}_static_bzip2 "Include bzip2 statically for ${PROJECT_NAME}." ON)
OPTION(${PROJECT_NAME}_static_protobuf "Include protobuf statically for ${PROJECT_NAME}." ON)

IF(WIN32 OR ${PROJECT_NAME}_static_protobuf)
  SET(protobuf_PREFIX ${CMAKE_CURRENT_BINARY_DIR}/ThirdParty/protobuf)
  EXTERNALPROJECT_ADD(
      protobuf
      PREFIX ${protobuf_PREFIX}
      URL "https://github.com/google/protobuf/releases/download/v2.6.0/protobuf-2.6.0.tar.bz2"
      URL_MD5 "78253c509a055dab316a21e754cb278a"
      CONFIGURE_COMMAND CXX=${CMAKE_CXX_COMPILER} CC=${CMAKE_C_COMPILER} ${protobuf_PREFIX}/src/protobuf/configure --prefix=${protobuf_PREFIX} --disable-shared --with-pic
      BUILD_COMMAND $(MAKE)
      INSTALL_COMMAND $(MAKE) install
      BUILD_IN_SOURCE 1
  )
  INCLUDE_DIRECTORIES(${protobuf_PREFIX}/include)
  SET(PROTOBUF_LITE_LIBRARIES ${protobuf_PREFIX}/lib/libprotobuf-lite.a)
  SET(PROTOBUF_GENERATOR ${protobuf_PREFIX}/bin/protoc)
ELSE()
  FIND_PACKAGE(Protobuf REQUIRED)
  IF(NOT PROTOBUF_FOUND)
      MESSAGE(FATAL_ERROR "Could not find PROTOBUF library! Install appropriate package e.g. libprotobuf-dev")
  ENDIF()
  
  FIND_PROGRAM(PROTOBUF_GENERATOR protoc PATHS ${PROTOBUF_SRC_ROOT_FOLDER}/vsprojects/Release)
  IF(NOT PROTOBUF_GENERATOR)
      MESSAGE(FATAL_ERROR "Could not find PROTOBUF compiler \"protoc\"! Install appropriate package e.g. protobuf-compiler")
  ENDIF()
ENDIF()


# ---------- Testing
IF(${PROJECT_NAME}_build_tests)
  MESSAGE(STATUS "TESTING ENABLED" )
  ENABLE_TESTING()
ELSE()  
  MESSAGE(STATUS "TESTING DISABLED" )
ENDIF (${PROJECT_NAME}_build_tests)

# if(NOT APPLE)
# #     CHECK_INCLUDE_FILE(pthread.h HAVE_LIBPTHREAD)
#   FIND_PACKAGE(Threads)
# ELSE()
#   SET(HAVE_LIBPTHREAD YES)
# ENDIF()
#
# Find OpenSSL
#
INCLUDE("${PROJECT_SOURCE_DIR}/cmake/FindOpenSSL.cmake")
#FIND_PACKAGE(OpenSSL)
IF(NOT OPENSSL_FOUND)
#   INCLUDE_DIRECTORIES(${OPENSSL_INCLUDE_DIR})
#   LIST(APPEND ADDITIONAL_LIBS ${OPENSSL_LIBRARIES})
MESSAGE(FATAL_ERROR "Could not find OpenSSL library! Install appropriate package e. g. libssl-dev")
ENDIF()

IF(NOT WIN32)
  IF(NOT ${PROJECT_NAME}_static_zlib)
    FIND_PACKAGE(ZLIB)
    IF(NOT ZLIB_FOUND)
      MESSAGE(FATAL_ERROR "Could not find zlib library!")
    ENDIF()
  ENDIF()
  IF(NOT ${PROJECT_NAME}_static_bzip2)
    FIND_PACKAGE(BZip2)
    IF(NOT BZIP2_FOUND)
      MESSAGE(FATAL_ERROR "Could not find bzip2 library! Install appropriate package e. g. libbz2-dev")
    ENDIF()
  ENDIF()
ENDIF()
#
# FIND_PACKAGE(PkgConfig)
# IF (NOT PKG_CONFIG_FOUND)
#   MESSAGE(FATAL_ERROR "Could not find pkg-config executable!")
# ENDIF(NOT PKG_CONFIG_FOUND)
# 
# PKG_SEARCH_MODULE( XUL REQUIRED libxul)
# IF (NOT XUL_FOUND)
#   MESSAGE(FATAL_ERROR "Could not find thunderbird or similar development package! Install appropriate package e.g. iceweasel-dev")
# ENDIF(NOT XUL_FOUND)
# MESSAGE("THUNDERBIRD VERSION ${XUL_VERSION}")
# STRING(REGEX REPLACE "\\.[0-9]+$" ".0" THUNDERBIRD_MIN_VERSION ${XUL_VERSION})
# STRING(REGEX REPLACE "\\.[0-9]+$" ".*" THUNDERBIRD_MAX_VERSION ${XUL_VERSION})
SET ( THUNDERBIRD_MIN_VERSION 30.0) #should be the earliest version we tested
SET ( THUNDERBIRD_MAX_VERSION 38.*)
MESSAGE(STATUS "Building for Thunderbird from ${THUNDERBIRD_MIN_VERSION} to ${THUNDERBIRD_MAX_VERSION}")

# PKG_SEARCH_MODULE( NSS REQUIRED nss)
# IF (NOT NSS_FOUND)
#   MESSAGE(FATAL_ERROR "Could not find nss development package! Install appropriate package e.g. iceweasel-dev")
# ENDIF(NOT NSS_FOUND)
# IF (${NSS_VERSION} VERSION_LESS 3.17.1)
#   MESSAGE(FATAL_ERROR "NSS version ${NSS_VERSION} (<3.17.1) is vulnerable to attacks!")
# ENDIF(${NSS_VERSION} VERSION_LESS 3.17.1)
# MESSAGE("NSS VERSION ${NSS_VERSION}")
# ---------- This is where the extension files lives


# Use FindPkgConfig internal function _pkgconfig_invoke to get sdkdir
# _pkgconfig_invoke(libxul "XUL" SDKDIR "" --variable=sdkdir)
# SET(XPIDL_HEADER ${XUL_SDKDIR}/sdk/bin/header.py)
# SET(XPIDL_TYPELIB ${XUL_SDKDIR}/sdk/bin/typelib.py)

# Verify that we can find a Python interpreter,
INCLUDE(FindPythonInterp)
IF( NOT PYTHONINTERP_FOUND )
  MESSAGE(FATAL_ERROR
"Unable to find Python interpreter, required for builds and testing.
Please install Python or specify the PYTHON_EXECUTABLE CMake variable.")
ENDIF()

SET(CMAKE_MODULE_PATH "${PROJECT_SOURCE_DIR}/cmake")
  
FIND_PROGRAM(LZZ_COMMAND lzz)
IF(NOT LZZ_COMMAND)
  MESSAGE(FATAL_ERROR "Could not find \"lzz\" program! Download from http://www.lazycplusplus.com/download.html")
ENDIF()

# Get the latest abbreviated commit hash of the working branch
EXECUTE_PROCESS(
  COMMAND git log -1 --format=%h
  WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
  OUTPUT_VARIABLE GIT_COMMIT_HASH
  OUTPUT_STRIP_TRAILING_WHITESPACE
)

SET( ANG_PACKAGE_VERSION_MAJOR "0")
SET( ANG_PACKAGE_VERSION_MINOR "9")
SET( ANG_PACKAGE_VERSION_PATCH "4")
SET( VERSION "${ANG_PACKAGE_VERSION_MAJOR}.${ANG_PACKAGE_VERSION_MINOR}.${ANG_PACKAGE_VERSION_PATCH}" )
SET( FULL_VERSION "${ANG_PACKAGE_VERSION_MAJOR}.${ANG_PACKAGE_VERSION_MINOR}.${ANG_PACKAGE_VERSION_PATCH}-${GIT_COMMIT_HASH}" )

IF(NOT CMAKE_BUILD_TYPE)
       SET(CMAKE_BUILD_TYPE Release CACHE STRING
           "Choose the type of build, options are: None Debug Release RelWithDebInfo MinSizeRel." FORCE)
ENDIF(NOT CMAKE_BUILD_TYPE)

ADD_SUBDIRECTORY("src")


# Four back-slashes to escape a dot? Go figure...
# SET( CPACK_SOURCE_IGNORE_FILES "\\\\.svn/;.*~" )
# SET( CPACK_GENERATOR "ZIP" )
# SET( CPACK_SOURCE_GENERATOR "TBZ2") 
# INCLUDE( CPack ) 

