generate:
	forge bind --crate-name voting-bindings --bindings-path ../bindings --alloy-version 0.9.2 --force --no-metadata --select "^Voting$$" --overwrite
	@printf '\nserde = { version = "1.0.214", features = ["derive"] }' >> ../bindings/Cargo.toml

check:
	forge bind --crate-name voting-bindings --bindings-path ../bindings --alloy-version 0.9.2 --force --no-metadata --select "^Voting$$"

.PHONY: generate
.PHONY: check
