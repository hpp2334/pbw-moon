# See https://tech.davis-hansson.com/p/make/
SHELL := bash
.DELETE_ON_ERROR:
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := all
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules
MAKEFLAGS += --no-print-directory
TMP   = .tmp
BIN   = .tmp/bin
UNAME_OS := $(shell uname -s)
LICENSE_HEADER_YEAR_RANGE := 2023-2024
GOOGLE_PROTOBUF_VERSION = 26.1

ifeq ($(UNAME_OS),Darwin)
	PLATFORM := osx-x86_64
else ifeq ($(UNAME_OS),Linux)
	PLATFORM := linux-x86_64
endif

$(BIN)/conformance_test_runner: Makefile
	@mkdir -p $(@D)
	curl -L https://github.com/bufbuild/protobuf-conformance/releases/download/v$(GOOGLE_PROTOBUF_VERSION)/conformance_test_runner-$(GOOGLE_PROTOBUF_VERSION)-$(PLATFORM).zip > $(TMP)/conformance-test-runner-$(GOOGLE_PROTOBUF_VERSION).zip
	unzip -o $(TMP)/conformance-test-runner-$(GOOGLE_PROTOBUF_VERSION).zip -d $(TMP)/conformance_test_runner-$(GOOGLE_PROTOBUF_VERSION)
	cp -f $(TMP)/conformance_test_runner-$(GOOGLE_PROTOBUF_VERSION)/bin/conformance_test_runner $(@D)
	cp -f $(TMP)/conformance_test_runner-$(GOOGLE_PROTOBUF_VERSION)/include/conformance/conformance.proto proto/conformance
	cp -f $(TMP)/conformance_test_runner-$(GOOGLE_PROTOBUF_VERSION)/include/google/protobuf/test_messages*.proto proto/google/protobuf

.PHONY: all
all: test

.PHONY: test
test: $(BIN)/conformance_test_runner  ## Run conformance tests
	cd impl/protobuf.js;     PATH="$(abspath $(BIN)):$(PATH)" ./test.sh
