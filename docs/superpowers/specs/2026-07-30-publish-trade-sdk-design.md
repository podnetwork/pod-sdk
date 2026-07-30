# Publish `@pod-network/trade-sdk` to npm

Status: approved, not yet implemented
Date: 2026-07-30

## Problem

`ts-sdk` has never been published. Consumers link it from a sibling checkout:

```json
"@pod-network/trade-sdk": "file:../pod-sdk/ts-sdk"
```

A `file:` dependency carries no version, and the frontend's image workflow
checked pod-sdk out with no `ref`, so a build compiled against whatever the
default branch happened to be at that moment. Two consequences:

- builds were not reproducible — the same app commit produced different bundles
  over time;
- an SDK change reached users with nothing in the consumer's history recording
  which SDK shipped.

This is not hypothetical. `buildSubmitOrder` defaulted `ioc` to `false` while the
CLOB rejects any market order that is not immediate-or-cancel, so every market
order the frontend built was refused and positions could not be closed. The fix
landed in the SDK and reached the deployed app with no frontend commit — the same
mechanism would have delivered a regression just as silently.

A commit pin in the consumer's workflow (frontend PR #4) is the stopgap in place
today. It fixes reproducibility for shipped builds but not for local
development, and it keeps the pin outside the dependency manifest.

## Decisions

| Question | Decision |
| --- | --- |
| Registry | Public npm, `registry.npmjs.org`, scope `@pod-network` |
| Publish trigger | Tag `ts-sdk-v*` |
| First version | `0.1.0` |
| Local cross-repo iteration | `npm link`, documented |

Registry: the repo is public and MIT, so publishing exposes nothing new, and
consumers install with no auth — which matters because the frontend's image build
runs in public CI. GitHub Packages was rejected because its npm registry requires
a token to *read* even public packages, pushing auth onto every developer and
every CI job. A git dependency was rejected because `ts-sdk` is a subdirectory,
which npm cannot target without extra tooling, and it gives no semver.

Trigger: `ts-sdk-v*` does not match the `v*` glob that `release.yml` already uses
to zip all three SDKs into a GitHub Release, so the two coexist with no
double-trigger. A scoped tag also decouples cadence — a TypeScript patch should
not force a `rust-sdk` release. Extending the shared `v*` tag was rejected for
that coupling, and because its lockstep premise is already false: repo tags stop
at `v0.2.0` while `rust-sdk` and `types` are at `0.5.0` and `ts-sdk` at `0.0.0`.

Version `0.1.0` treats the npm package as a fresh lineage. Note it is numerically
below the `ts-sdk-v0.2.0.zip` artifact attached to an earlier GitHub Release; that
was raised and accepted. Staying on `0.x` is deliberate — under semver a `0.x`
minor may carry breaking changes, which matches how this package evolves.

## Release flow

New workflow `.github/workflows/publish-ts-sdk.yml`, `working-directory: ts-sdk`:

```
git tag ts-sdk-v0.1.0 && git push origin ts-sdk-v0.1.0
  → guard: "${GITHUB_REF_NAME#ts-sdk-v}" == package.json version, else fail
    npm ci
    npm run typecheck
    npm run build
    npm publish --provenance --access public [--tag rc, if prerelease]
```

Two guards, each for a failure that has a real path to happening:

- **Tag/manifest agreement.** The tag triggers the job but `package.json` is the
  source of truth. The job derives the expected version by stripping the
  `ts-sdk-v` prefix from `GITHUB_REF_NAME` and compares it to the manifest, so
  publishing `ts-sdk-v0.1.0` while the manifest still says `0.0.0` fails loudly
  rather than shipping a mislabelled version.
- **`ts-sdk/dist` is gitignored**, so it does not exist in a fresh checkout and
  must be built in the job. A `prepublishOnly: npm run build` script additionally
  stops a manual `npm publish` from a laptop shipping a stale or absent `dist/`.

**Prerelease handling.** `npm publish` applies the `latest` dist-tag by default
even for a semver prerelease, so publishing `0.1.0-rc.0` unqualified would make a
release candidate the default install for everyone. The job therefore inspects the
version and passes `--tag rc` when it contains a hyphen, reserving `latest` for
real releases. This also means a prerelease is driven the same way as a release —
set the manifest to `0.1.0-rc.0`, tag `ts-sdk-v0.1.0-rc.0` (which matches the same
`ts-sdk-v*` glob), then bump the manifest to `0.1.0` for the real tag.

`--provenance` requires `permissions: id-token: write` and npm ≥ 9.5 (runners
have 11.17). It attaches a verifiable link from the package to the workflow run
that built it.

Publishing needs `NPM_TOKEN` in repo secrets.

## Package manifest changes

In `ts-sdk/package.json`:

- `version` → `0.1.0`
- add `publishConfig: { "access": "public" }` — scoped packages default to
  restricted, so without this the first publish fails or lands private
- add `repository`, `homepage`, `bugs` so the npm page links back to the repo
- add `prepublishOnly: "npm run build"`

Unchanged: the `exports` map, `type: module` (ESM-only), `files: ["dist","src"]`,
`sideEffects: false`, the `viem` dependency.

## Consumer wiring (frontend)

The frontend drops both current mechanisms and gains one:

```diff
- "@pod-network/trade-sdk": "file:../pod-sdk/ts-sdk"
+ "@pod-network/trade-sdk": "^0.1.0"
```

`image.yml` loses the entire second checkout step, including the `ref:` pin from
PR #4. That pin becomes dead weight: `npm ci` installs exactly what the lockfile
records, so reproducibility moves from a SHA in a workflow file to an integrity
hash in `package-lock.json` — stronger, and visible in the diff when it changes.
On `0.x`, `^0.1.0` resolves within `0.1.x` only, so adopting a minor is a
deliberate PR.

**Sequencing is forced:** the frontend cannot depend on `^0.1.0` until `0.1.0` is
on npm. So this is a follow-up PR to the frontend, after the first publish
succeeds — not part of the same change.

## Local iteration

The committed dependency is always the published version. Cross-repo work uses:

```bash
cd pod-sdk/ts-sdk && npm run build && npm link
cd frontend && npm link @pod-network/trade-sdk
# undo
npm unlink @pod-network/trade-sdk && npm ci
```

Documented in both READMEs. Because nothing local is committed, the tree cannot
accidentally ship a filesystem path — which the `file:` arrangement could.

## Closing the CI gap

Add a `ts-sdk` job (`npm ci`, `npm run typecheck`, `npm run build`) to `test.yml`,
alongside its existing `cargo` and `examples-solidity` jobs, so TypeScript is
covered by the same "Test" check the repo already runs on every PR.

Today `test.yml`, `lint.yml` and `format.yml` are Rust and Solidity only — cargo
build/test, clippy, cargo shear, rustfmt, Foundry. **No CI anywhere touches the
TypeScript**, so a broken SDK surfaces only when a consumer's image build fails.
The same job is the release gate, so a publish cannot ship code that does not
compile.

`ts-sdk` has no test runner, only `build` and `typecheck`. Adding one is out of
scope here; typecheck plus build is the available gate.

## Verification

1. Set the manifest to `0.1.0-rc.0` and tag `ts-sdk-v0.1.0-rc.0`, so the real
   workflow is what gets exercised rather than a laptop. Confirm it lands on npm
   under the `rc` dist-tag and that `latest` is untouched.
2. Install that prerelease into the frontend on a scratch branch; confirm the app
   builds and the bundle still encodes `ioc` defaulting to `true` for market
   orders (`grep` the built asset for `.ioc??`).
3. Bump the manifest to `0.1.0` and tag `ts-sdk-v0.1.0`.

A prerelease is throwaway in a way a real version is not — npm versions cannot be
reused, so the first real publish should not be the first execution of the
workflow.

## Out of scope

- Publishing `rust-sdk` / `types` (both `0.5.0`, unpublished) or `solidity-sdk`
- `pod`'s stale `pod-sdk` submodule pointer (`98a9100` vs current main)
- Changelog or version automation (changesets, release-please)
- A test runner for `ts-sdk`

Each is worth doing and each is its own decision.

## Prerequisites outside this repo

- The `@pod-network` org must exist on npm, with an owner holding 2FA
- A granular publish token scoped to the package, stored as the `NPM_TOKEN`
  repository secret
