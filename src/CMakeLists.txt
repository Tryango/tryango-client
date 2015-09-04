#  ================================================================
#
#  This file is part of the Tryango Thunderbird Extension
#
#  ================================================================
# CMAKE_POLICY(SET CMP0026 OLD)

INCLUDE("${PROJECT_SOURCE_DIR}/cmake/GetOs.cmake")
ADD_SUBDIRECTORY("components")

# CMAKE_POLICY(SET CMP0026 OLD)
#
#
# GET_PROPERTY(CONFIMAIL_PATH TARGET tryango-client PROPERTY LOCATION)
# GET_FILENAME_COMPONENT(CONFIMAIL_FILE ${CONFIMAIL_PATH} NAME)

# Build xpi file

SET(INSTALLRDF "install.rdf")
MESSAGE(STATUS "Generating ${INSTALLRDF}")
CONFIGURE_FILE("${CMAKE_CURRENT_SOURCE_DIR}/install.rdf.in" "${CMAKE_CURRENT_BINARY_DIR}/${INSTALLRDF}")

#en-US
CONFIGURE_FILE("${CMAKE_CURRENT_SOURCE_DIR}/chrome/locale/en-US/about.html.in" "${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/en-US/about.html")
CONFIGURE_FILE("${CMAKE_CURRENT_SOURCE_DIR}/chrome/locale/en-US/help.html.in" "${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/en-US/help.html")
#en-GB
CONFIGURE_FILE("${CMAKE_CURRENT_SOURCE_DIR}/chrome/locale/en-GB/about.html.in" "${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/en-GB/about.html")
CONFIGURE_FILE("${CMAKE_CURRENT_SOURCE_DIR}/chrome/locale/en-GB/help.html.in" "${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/en-GB/help.html")
#de
CONFIGURE_FILE("${CMAKE_CURRENT_SOURCE_DIR}/chrome/locale/de/about.html.in" "${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/de/about.html")
CONFIGURE_FILE("${CMAKE_CURRENT_SOURCE_DIR}/chrome/locale/de/help.html.in" "${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/de/help.html")

GetOSArchitecture("ANG")
EXECUTE_PROCESS(
  COMMAND ${PYTHON_EXECUTABLE} ${PROJECT_SOURCE_DIR}/cmake/linux_name.py #will return empty string for non-linux
  OUTPUT_VARIABLE ANG_LINUX_NAME)
SET(XPI_OUT "${PROJECT_NAME}-${VERSION}-${ANG_OS}-${ANG_LINUX_NAME}-${ANG_ARCHITECTURE}")

if(WIN32)
  SET(ABI "WINNT_x86-msvc")
ELSE(WIN32)
  SET(ABI ${CMAKE_SYSTEM_NAME}_x86-gcc3)
  if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    SET(ABI ${CMAKE_SYSTEM_NAME}_x86_64-gcc3)
  endif()
endif(WIN32)

IF(${CMAKE_SYSTEM_NAME} MATCHES "Darwin")
  FIND_PROGRAM(OTOOL_COMMAND otool)
  IF(NOT OTOOL_COMMAND)
    MESSAGE(FATAL_ERROR "Could not find otool command!")
  ENDIF()
#   MESSAGE("Found otool.")
ENDIF()

IF(${CMAKE_SYSTEM_NAME} MATCHES "Linux")
  FIND_PROGRAM(LDD_COMMAND ldd)
  IF(NOT LDD_COMMAND)
    MESSAGE(FATAL_ERROR "Could not find ldd command!")
  ENDIF()
ENDIF()

ADD_CUSTOM_COMMAND(OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/chrome.manifest
    COMMAND ${PYTHON_EXECUTABLE}
      ${PROJECT_SOURCE_DIR}/cmake/genChromeManifest.py
      $<TARGET_FILE:tryango-client>
      ${CMAKE_CURRENT_SOURCE_DIR}/chrome.manifest.in
      ${CMAKE_CURRENT_BINARY_DIR}/chrome.manifest
      ${ABI}
  DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/chrome.manifest.in" tryango-client
)

# GET_FILENAME_COMPONENT(PROTOBUF_FILE ${PROTOBUF_PATH} NAME)
# message (STATUS "protobuf file== ${PROTOBUF_FILE})

# IF(${CMAKE_SYSTEM_NAME} MATCHES "Windows")
#   FIND_PROGRAM(LDD_COMMAND ldd)
#   IF(NOT LDD_COMMAND)
#     MESSAGE(FATAL_ERROR "Could not find ldd command!")
#   ENDIF()
# ENDIF()

FILE(GLOB_RECURSE XPI_DEPS chrome/content/* chrome/skin/* chrome/locale/*dtd chrome/locale/*properties defaults/*)
SET(XPI_DEPS ${XPI_DEPS} ${CMAKE_CURRENT_BINARY_DIR}/chrome.manifest ${CMAKE_CURRENT_BINARY_DIR}/install.rdf ${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/en-US/about.html ${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/en-GB/about.html  ${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/de/about.html ${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/en-US/help.html ${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/en-GB/help.html ${CMAKE_CURRENT_BINARY_DIR}/chrome/locale/de/help.html)

FILE(GLOB_RECURSE GLOB_TEMP RELATIVE "${CMAKE_CURRENT_SOURCE_DIR}" chrome/content/* chrome/skin/* chrome/locale/*dtd chrome/locale/*properties chrome/locale/*html defaults/*)

ADD_CUSTOM_TARGET(copy)

FOREACH(FILE ${GLOB_TEMP})
  ADD_CUSTOM_COMMAND(TARGET copy PRE_BUILD
                     COMMAND ${CMAKE_COMMAND} -E
                     copy_if_different ${CMAKE_CURRENT_SOURCE_DIR}/${FILE} ${CMAKE_CURRENT_BINARY_DIR}/${FILE})
ENDFOREACH(FILE)

FOREACH(FILE ${GLOB_TEMP})
  SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_SOURCE_DIR}" "${FILE}" ${XPI_SOURCES})
ENDFOREACH(FILE)

# FILE(GLOB IDL "components/*.idl")
#
# FOREACH(F ${IDL})
#   GET_FILENAME_COMPONENT(BAS ${F} NAME_WE)
#   SET(XPI_DEPS ${XPI_DEPS} "${CMAKE_CURRENT_BINARY_DIR}/components/${BAS}.xpt")
#   SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" "components/${BAS}.xpt" ${XPI_SOURCES})
# ENDFOREACH(F)

# SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" components/test ${XPI_SOURCES})
SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" ${INSTALLRDF} chrome.manifest ${XPI_SOURCES})
SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" chrome/locale/en-GB/about.html ${XPI_SOURCES})
SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" chrome/locale/en-US/about.html ${XPI_SOURCES})
SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" chrome/locale/de/about.html ${XPI_SOURCES})
SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" chrome/locale/en-GB/help.html ${XPI_SOURCES})
SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" chrome/locale/en-US/help.html ${XPI_SOURCES})
SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" chrome/locale/de/help.html ${XPI_SOURCES})
SET(XPI_SOURCES "-C" "${CMAKE_CURRENT_BINARY_DIR}" components/certificate.pem ${XPI_SOURCES})
SET(XPI_SOURCES "-C" "${CMAKE_SOURCE_DIR}" LICENSE ${XPI_SOURCES})
# message("sources:${XPI_SOURCES}")
# todo add custom command to pack (we need to include protobuf library)
ADD_CUSTOM_TARGET(xpi ALL
  COMMAND ${PYTHON_EXECUTABLE} ${PROJECT_SOURCE_DIR}/cmake/pack.py
    "${CMAKE_BINARY_DIR}/${XPI_OUT}.xpi"
    ${XPI_SOURCES} "-C" "${CMAKE_CURRENT_BINARY_DIR}" "components/$<TARGET_FILE_NAME:tryango-client>"
    DEPENDS ${XPI_DEPS} tryango-client copy certificate)

#also copy to releases location
IF (CMAKE_BUILD_TYPE STREQUAL "RELEASE")
  ADD_CUSTOM_COMMAND(
	TARGET xpi POST_BUILD
	COMMAND ${CMAKE_COMMAND} -E copy "${CMAKE_BINARY_DIR}/${XPI_OUT}.xpi" "${PROJECT_SOURCE_DIR}/releases/${XPI_OUT}.xpi"
	)
ENDIF (CMAKE_BUILD_TYPE STREQUAL "RELEASE")
