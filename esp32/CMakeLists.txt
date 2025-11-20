# Top-level CMakeLists.txt for RayZ unified project
cmake_minimum_required(VERSION 3.16)

# Set extra component directories - shared component is always available
set(EXTRA_COMPONENT_DIRS "shared")

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(rayz)
