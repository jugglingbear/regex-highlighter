# Regex Highlighter — local development commands.

NPM ?= npm
NODE ?= node
.DEFAULT_GOAL := help

##@ Commands

.PHONY: help
help:  ## Show available commands
	@printf '\n\033[1mRegex Highlighter — available commands:\033[0m\n'
	@awk 'BEGIN { FS = ":.*## " } \
		/^##@ / { printf "\n\033[1;38;5;208m%s\033[0m\n", substr($$0, 5); next } \
		/^[a-zA-Z0-9_-]+:.*## / { printf "  \033[97m%-22s\033[0m %s\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)
	@printf '\nBrowser fixtures and installed-extension checks are separate; see README.md.\n\n'

.PHONY: test
test:  ## Run the complete automated test suite (Node.js)
	@printf '🧪 Running all automated tests\n'
	$(NPM) test

.PHONY: icons
icons:  ## Regenerate extension icons (SVG and PNG)
	@printf '🎨 Generating extension icons\n'
	$(NODE) scripts/generate-icons.js

.PHONY: package
package: test  ## Test and create a versioned release ZIP in dist/
	@printf '📦 Packaging extension\n'
	$(NODE) scripts/package.js
