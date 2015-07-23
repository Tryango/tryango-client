CMAKE_MINIMUM_REQUIRED(VERSION 2.8)

# FILE(GLOB IDL_SRC "*.idl")

SET(XPT_SRC "")

# FOREACH(F ${IDL_SRC})
#   GET_FILENAME_COMPONENT(BAS ${F} NAME_WE)
#   SET(BAS_ABS ${CMAKE_CURRENT_BINARY_DIR}/${BAS})
#   ADD_CUSTOM_COMMAND(
#     OUTPUT "${BAS_ABS}.xpt" "${BAS_ABS}.h"
#     COMMAND ${PYTHON_EXECUTABLE} ${XPIDL_TYPELIB} -o "${BAS_ABS}.xpt" -I "${XUL_SDKDIR}/idl" --cachedir=. ${F} 
#     COMMAND ${PYTHON_EXECUTABLE} ${XPIDL_HEADER} -o "${BAS_ABS}.h" -I "${XUL_SDKDIR}/idl" --cachedir=. ${F}
#     COMMENT "Building ${BAS}.xpt and ${BAS}.h in ${CMAKE_CURRENT_BINARY_DIR}"
#     MAIN_DEPENDENCY ${F})
#   SET_SOURCE_FILES_PROPERTIES("${BAS_ABS}.h" PROPERTIES GENERATED TRUE)
#   LIST(APPEND XPT_SRC ${BAS_ABS}.xpt)
# ENDFOREACH(F)

# ADD_CUSTOM_TARGET(xpt 
#   DEPENDS ${XPT_SRC})


FILE(GLOB CPP_SRC "*.cpp")

FILE(GLOB LZZ_SRC "*.lzz" "pgp/*.lzz")

SET(LIBRARY_SRC "")
FOREACH(F ${LZZ_SRC})
    GET_FILENAME_COMPONENT(BAS ${F} NAME_WE)
    SET(BAS_ABS ${CMAKE_CURRENT_BINARY_DIR}/${BAS})
    LIST(APPEND LIBRARY_SRC ${BAS_ABS}.cpp)
    #    LIST(APPEND LIBRARY_SRC ${BAS_ABS}.h)
ENDFOREACH(F)

FUNCTION(LAZY_COMPILE FILENAME)
    GET_FILENAME_COMPONENT(BASE ${FILENAME} NAME_WE)
    SET(BASE_ABS ${CMAKE_CURRENT_BINARY_DIR}/${BASE})
    SET(OUTPUT ${BASE_ABS}.cpp ${BASE_ABS}.h)
    GET_FILENAME_COMPONENT(BASE ${FILENAME} NAME)
    MESSAGE(STATUS "Generating sources from ${BASE}")
    ADD_CUSTOM_COMMAND(
      OUTPUT ${OUTPUT}
      COMMAND ${LZZ_COMMAND} -sl -hl -hd -sd -sx cpp -o ${CMAKE_CURRENT_BINARY_DIR} ${FILENAME}
      DEPENDS ${FILENAME})
#       MESSAGE(STATUS "${LZZ_COMMAND} -sl -hl -hd -sd -sx cpp -o ${CMAKE_CURRENT_BINARY_DIR} ${FILENAME}")
      SET_SOURCE_FILES_PROPERTIES(${OUTPUT} PROPERTIES GENERATED TRUE)
ENDFUNCTION()

FOREACH(F ${LZZ_SRC})
    LAZY_COMPILE(${F})
ENDFOREACH(F)

# MESSAGE("INC protobuf ${PROTOBUF_INCLUDE_DIRS}")
# message(${CMAKE_CURRENT_BINARY_DIR})
IF(UNIX)
  SET(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fPIC")
ENDIF(UNIX)
IF (MSVC)
  SET(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} /MD")
  SET(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} /MDd")
ENDIF(MSVC)

IF("${CMAKE_CXX_COMPILER_ID}" MATCHES "[Cc]lang"
    OR "${CMAKE_CXX_COMPILER_ID}" MATCHES "GNU")
  SET(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++11 -fno-exceptions -Wall")
ENDIF()
SET(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -D__STDC_LIMIT_MACROS")
MESSAGE(STATUS "CMAKE_CXX_FLAGS: ${CMAKE_CXX_FLAGS}")

IF(WIN32 OR ${PROJECT_NAME}_static_protobuf)
  SET(PROTO_SRC "${CMAKE_CURRENT_BINARY_DIR}/tryango.pb.cc")
  SET(PROTO_HDR "${CMAKE_CURRENT_BINARY_DIR}/tryango.pb.h")
  ADD_CUSTOM_COMMAND(
      DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/tryango.proto
      COMMAND ${PROTOBUF_GENERATOR}
      ARGS -I${CMAKE_CURRENT_SOURCE_DIR} --cpp_out=${CMAKE_CURRENT_BINARY_DIR} ${CMAKE_CURRENT_SOURCE_DIR}/tryango.proto
      OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/tryango.pb.cc"
             "${CMAKE_CURRENT_BINARY_DIR}/tryango.pb.h"
      COMMENT "Running C++ compiler on tryango.proto"
      VERBATIM 
  )
ELSE()
  PROTOBUF_GENERATE_CPP(PROTO_SRC PROTO_HDR "tryango.proto")
ENDIF()

#message("extra cxx flags ${CMAKE_CXX_FLAGS}")
# INCLUDE_DIRECTORIES(${XUL_INCLUDE_DIRS})
INCLUDE_DIRECTORIES(${CMAKE_CURRENT_BINARY_DIR}) #some header files are generated
INCLUDE_DIRECTORIES(${CMAKE_CURRENT_SOURCE_DIR})
INCLUDE_DIRECTORIES(${OPENSSL_INCLUDE_DIR})

IF(WIN32 OR ${PROJECT_NAME}_static_bzip2)
  INCLUDE_DIRECTORIES("bzip2")
  FILE(GLOB BZIP2_SRC "bzip2/*.c")
  SET(BZIP2_LIBRARIES "")
ELSE()
  INCLUDE_DIRECTORIES(${BZIP2_INCLUDE_DIR})
  SET(BZIP2_SRC "")
ENDIF()
IF(WIN32 OR ${PROJECT_NAME}_static_zlib)
  INCLUDE_DIRECTORIES("zlib")  
  FILE(GLOB ZLIB_SRC "zlib/*.c")
  SET(ZLIB_LIBRARIES "")
ELSE()
  INCLUDE_DIRECTORIES(${ZLIB_INCLUDE_DIRS})
  SET(ZLIB_SRC "")
ENDIF()
# IF(WIN32 OR ${PROJECT_NAME}_static_protobuf)
#   INCLUDE_DIRECTORIES("protobuf-lite")
#   FILE(GLOB PROTOBUF_SRC "protobuf-lite/*.cc")
#   SET(PROTOBUF_LITE_LIBRARIES "")
#   ADD_DEFINITIONS(-DHAVE_ZLIB)
# ELSE()
#   INCLUDE_DIRECTORIES(${PROTOBUF_INCLUDE_DIR})
#   SET(PROTOBUF_SRC "")
# ENDIF()
# Enable ExternalProject CMake module



ADD_LIBRARY(tryango-client SHARED  ${PROTO_SRC} ${LIBRARY_SRC}
  ${CPP_SRC} ${BZIP2_SRC} ${ZLIB_SRC} pgp/bufferFilter.cpp tryango.def)

# LINK_DIRECTORIES(${XUL_LIBRARY_DIRS})

# ADD_DEPENDENCIES(tryango-client xpt)
#message("library = ${XUL_LIBRARIES}")
IF(WIN32)
  IF(MINGW)
    TARGET_LINK_LIBRARIES(tryango-client Ws2_32 protobuf-lite ${OPENSSL_LIBRARIES} ${CMAKE_THREAD_LIBS_INIT})	
    SET_TARGET_PROPERTIES(tryango-client PROPERTIES LINK_FLAGS "-static-libgcc -static -static-libstdc++")
  ELSE(MINGW)
    TARGET_LINK_LIBRARIES(tryango-client ${PROTOBUF_LITE_LIBRARIES} ${OPENSSL_LIBRARIES} )
  ENDIF(MINGW)
ELSE(WIN32)
  TARGET_LINK_LIBRARIES(tryango-client ${PROTOBUF_LITE_LIBRARIES} ${OPENSSL_LIBRARIES} ${CMAKE_THREAD_LIBS_INIT} ${BZIP2_LIBRARIES} ${ZLIB_LIBRARIES})
#     SET_TARGET_PROPERTIES(tryango-client PROPERTIES LINK_FLAGS "-static -lz")
ENDIF(WIN32)

SET_TARGET_PROPERTIES(tryango-client PROPERTIES LINKER_LANGUAGE CXX)

#   LIST(APPEND ADDITIONAL_LIBS ${OPENSSL_LIBRARIES})

ADD_CUSTOM_TARGET(certificate)
ADD_CUSTOM_COMMAND(TARGET certificate PRE_BUILD
   COMMAND ${CMAKE_COMMAND} -E copy_if_different ${CMAKE_SOURCE_DIR}/src/certs/tryango-cert.pem ${CMAKE_CURRENT_BINARY_DIR}/certificate.pem)

################################
# Tests
################################
IF( ${PROJECT_NAME}_build_tests )
  # Create patch file for gtest with MSVC 2012
  IF(MSVC_VERSION EQUAL 1700)
    FILE(WRITE ${CMAKE_BINARY_DIR}/gtest.patch "Index: cmake/internal_utils.cmake\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "===================================================================\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "--- cmake/internal_utils.cmake   (revision 660)\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "+++ cmake/internal_utils.cmake   (working copy)\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "@@ -66,6 +66,9 @@\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "       # Resolved overload was found by argument-dependent lookup.\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "       set(cxx_base_flags \"\${cxx_base_flags} -wd4675\")\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "     endif()\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "+    if (MSVC_VERSION EQUAL 1700)\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "+      set(cxx_base_flags \"\${cxx_base_flags} -D_VARIADIC_MAX=10\")\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "+    endif ()\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "     set(cxx_base_flags \"\${cxx_base_flags} -D_UNICODE -DUNICODE -DWIN32 -D_WIN32\")\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "     set(cxx_base_flags \"\${cxx_base_flags} -DSTRICT -DWIN32_LEAN_AND_MEAN\")\n")
    FILE(APPEND ${CMAKE_BINARY_DIR}/gtest.patch "     set(cxx_exception_flags \"-EHsc -D_HAS_EXCEPTIONS=1\")\n")
  ELSE()
    FILE(WRITE ${CMAKE_BINARY_DIR}/gtest.patch "")
    message(STATUS "Creating gtest.patch")
  ENDIF()
  # Set the build type if it isn't already
  IF(NOT CMAKE_BUILD_TYPE)
    SET(CMAKE_BUILD_TYPE Release)
  ENDIF()
  # Set default ExternalProject root directory
  ################################
  # Add GTest
  ################################
  SET(googleTest_PREFIX ${CMAKE_BINARY_DIR}/ThirdParty/googletest)
  SET_DIRECTORY_PROPERTIES(PROPERTIES EP_PREFIX ${googleTest_PREFIX})
  EXTERNALPROJECT_ADD(
      googletest
      SVN_REPOSITORY http://googletest.googlecode.com/svn/trunk/
      SVN_REVISION -r 660
      TIMEOUT 10
      PATCH_COMMAND svn patch ${CMAKE_BINARY_DIR}/gtest.patch ${googleTest_PREFIX}/src/googletest
      # Force separate output paths for debug and release builds to allow easy
      # identification of correct lib in subsequent TARGET_LINK_LIBRARIES commands
      CMAKE_ARGS -DCMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE}
                 -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY_DEBUG:PATH=DebugLibs
                 -DCMAKE_ARCHIVE_OUTPUT_DIRECTORY_RELEASE:PATH=ReleaseLibs
                 -Dgtest_force_shared_crt=ON
      # Disable install step
      INSTALL_COMMAND ""
      # Wrap download, configure and build steps in a script to log output
      LOG_DOWNLOAD ON
      LOG_CONFIGURE ON
      UPDATE_COMMAND "" #disables updates of google tests
      LOG_BUILD ON)
  # Specify include dir
  EXTERNALPROJECT_GET_PROPERTY(googletest source_dir)
  INCLUDE_DIRECTORIES(${source_dir}/include)
  INCLUDE_DIRECTORIES(${NSS_INCLUDE_DIRS})
  # Add compiler flag for MSVC 2012
  if(MSVC_VERSION EQUAL 1700)
    ADD_DEFINITIONS(-D_VARIADIC_MAX=10)
  endif()
  # Specify MainTest's link libraries
  EXTERNALPROJECT_GET_PROPERTY(googletest binary_dir)
  SET(gtest_lib  "${binary_dir}/${CMAKE_BUILD_TYPE}Libs/${CMAKE_STATIC_LIBRARY_PREFIX}gtest${CMAKE_STATIC_LIBRARY_SUFFIX}")
  SET(gtest_mainlib  "${binary_dir}/${CMAKE_BUILD_TYPE}Libs/${CMAKE_STATIC_LIBRARY_PREFIX}gtest_main${CMAKE_STATIC_LIBRARY_SUFFIX}")
  ADD_LIBRARY(gtest_main IMPORTED STATIC GLOBAL)
  SET_TARGET_PROPERTIES(gtest_main PROPERTIES
    "IMPORTED_LOCATION" "${gtest_mainlib}"
    "IMPORTED_LINK_INTERFACE_LIBRARIES"
        "${gtest_lib};${CMAKE_THREAD_LIBS_INIT}")
  ADD_DEPENDENCIES(gtest_main googletest)

  FILE(GLOB_RECURSE GLOB_DB RELATIVE "${CMAKE_CURRENT_SOURCE_DIR}" test/*.db)

  ADD_DEPENDENCIES(gtest_main certificate)

################################
# Find python
################################
INCLUDE(FindPythonLibs)
# PKG_SEARCH_MODULE( PYTHON REQUIRED python) #install pkg-config python-dev
IF (NOT PYTHONLIBS_FOUND)
  MESSAGE(FATAL_ERROR "Could not find python libraries! Install appropriate package (e.g python-dev).")
ENDIF(NOT PYTHONLIBS_FOUND)
MESSAGE(STATUS "Found python library VERSION ${PYTHONLIBS_VERSION_STRING}")
INCLUDE_DIRECTORIES(${PYTHON_INCLUDE_DIRS})
INCLUDE_DIRECTORIES("${CMAKE_CURRENT_SOURCE_DIR}/test")

################################
# Unit Tests
################################
  # Add test of angSsl
  ADD_EXECUTABLE( sslTest test/sslTest.cc angSsl.cpp logger.cpp angCommon.cpp)

  TARGET_LINK_LIBRARIES(sslTest gtest_main ${PYTHON_LIBRARIES} ${OPENSSL_LIBRARIES})
  ADD_TEST( sslTest sslTest )
  # Add test of angClient
  ADD_EXECUTABLE( clientTest test/clientTest.cc angClient.cpp angSsl.cpp angProofs.cpp logger.cpp   angCommon.cpp secretKeyPair.cpp packet.cpp signKey.cpp packetParser.cpp keyDb.cpp pgp/bufferFilter.cpp keyParser.cpp messageHandler.cpp publicKeyDb.cpp angWrapper.cpp angPipe.cpp ${PROTO_SRC} ${BZIP2_SRC} ${ZLIB_SRC})
  TARGET_LINK_LIBRARIES(clientTest gtest_main ${PYTHON_LIBRARIES} ${OPENSSL_LIBRARIES} ${PROTOBUF_LITE_LIBRARIES} ${ZLIB_LIBRARIES} ${BZIP2_LIBRARIES})
  ADD_TEST( clientTest clientTest )
  # Add test of angVerify
  ADD_EXECUTABLE( verifyTest test/verifyTest.cc angProofs.cpp ${PROTO_SRC} angCommon.cpp  logger.cpp)
  TARGET_LINK_LIBRARIES(verifyTest gtest_main ${PYTHON_LIBRARIES} ${PROTOBUF_LITE_LIBRARIES} ${OPENSSL_LIBRARIES})
  ADD_TEST( verifyTest verifyTest )
  # Add test of parse_packet
  ADD_EXECUTABLE( pgpTest test/pgpTest.cc  angCommon.cpp angClient.cpp angSsl.cpp logger.cpp angProofs.cpp packet.cpp signKey.cpp packetParser.cpp secretKeyPair.cpp keyDb.cpp pgp/bufferFilter.cpp keyParser.cpp messageHandler.cpp publicKeyDb.cpp ${PROTO_SRC} ${BZIP2_SRC} ${ZLIB_SRC})
  TARGET_LINK_LIBRARIES(pgpTest gtest_main ${OPENSSL_LIBRARIES} ${PYTHON_LIBRARIES} ${PROTOBUF_LITE_LIBRARIES} ${ZLIB_LIBRARIES} ${BZIP2_LIBRARIES})
  ADD_TEST(pgpTest pgpTest )

  # Add test of parse_packet
  ADD_EXECUTABLE( pPacketTest test/pPacketTest.cc  angCommon.cpp angClient.cpp angSsl.cpp logger.cpp angProofs.cpp packet.cpp signKey.cpp packetParser.cpp secretKeyPair.cpp keyDb.cpp pgp/bufferFilter.cpp keyParser.cpp messageHandler.cpp publicKeyDb.cpp ${PROTO_SRC} ${BZIP2_SRC} ${ZLIB_SRC})
  TARGET_LINK_LIBRARIES(pPacketTest gtest_main ${OPENSSL_LIBRARIES} ${PYTHON_LIBRARIES} ${PROTOBUF_LITE_LIBRARIES} ${ZLIB_LIBRARIES} ${BZIP2_LIBRARIES})
  ADD_TEST(pPacketTest pPacketTest )
  TARGET_COMPILE_OPTIONS(sslTest PRIVATE -ggdb)
  TARGET_COMPILE_OPTIONS(clientTest PRIVATE -ggdb)
  TARGET_COMPILE_OPTIONS(verifyTest PRIVATE -ggdb)
  TARGET_COMPILE_OPTIONS(pgpTest PRIVATE -ggdb)
  TARGET_COMPILE_OPTIONS(pPacketTest PRIVATE -ggdb)

ENDIF ( ${PROJECT_NAME}_build_tests )

################################
# Windows Tests
################################
IF(${PROJECT_NAME}_windows_tests)
  ADD_EXECUTABLE(windowsTest test/windowsTest.cc)
  TARGET_LINK_LIBRARIES(windowsTest tryango-client)
ENDIF ( ${PROJECT_NAME}_windows_tests )
