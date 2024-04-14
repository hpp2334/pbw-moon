# See https://tech.davis-hansson.com/p/make/
SHELL := bash
.DELETE_ON_ERROR:
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --no-print-directory
BIN   = ./bin
UNAME_OS := $(shell uname -s)
LICENSE_HEADER_YEAR_RANGE := 2023-2024
GOOGLE_PROTOBUF_VERSION = 26.1

ifeq ($(UNAME_OS),Darwin)
	PLATFORM := osx-x86_64
else ifeq ($(UNAME_OS),Linux)
	PLATFORM := linux-x86_64
endif

.PHONY: all
all: test

.PHONY: test
test: $(BIN)/conformance_test_runner  ## Run conformance tests
	cd impl/protobuf.js;     PATH="$(abspath $(BIN)):$(PATH)" ./test.sh
