# Shortcuts for the render Lambda (lambda/README.md). Everything else runs through pnpm.
#
#   make deploy PROFILE=<aws profile>              build, push, update (creates resources on a first run)
#   make deploy PROFILE=<aws profile> MEMORY=3008  first deploy on a capped account
#   make push PROFILE=<aws profile>                push the image already built, skip the build
#   make build                                     build the image only

PROFILE ?= $(AWS_PROFILE)
FLAGS ?=

DEPLOY_ENV = AWS_PROFILE=$(PROFILE) \
	$(if $(REGION),STICKSTAGE_REGION=$(REGION)) \
	$(if $(FUNCTION),STICKSTAGE_FUNCTION=$(FUNCTION)) \
	$(if $(MEMORY),STICKSTAGE_MEMORY=$(MEMORY))

.PHONY: help build deploy push check-profile

help:
	@sed -n '1,7p' Makefile

build:
	pnpm lambda:build

deploy: check-profile
	$(DEPLOY_ENV) lambda/deploy.sh $(FLAGS)

push: check-profile
	$(DEPLOY_ENV) lambda/deploy.sh --skip-build $(FLAGS)

check-profile:
	@test -n "$(PROFILE)" || { echo "set PROFILE=<aws profile> (or AWS_PROFILE)" >&2; exit 1; }
