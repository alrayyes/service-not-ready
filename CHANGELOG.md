# Changelog

## [0.4.5](https://github.com/alrayyes/service-not-ready/compare/v0.4.4...v0.4.5) (2026-10-16)


### Bug Fixes

* publish Lighthouse reports under stable file names ([#85](https://github.com/alrayyes/service-not-ready/issues/85)) ([6d07ccf](https://github.com/alrayyes/service-not-ready/commit/6d07ccfc358910a4e7230be54ddf06484da25343))

## [0.4.4](https://github.com/alrayyes/service-not-ready/compare/v0.4.3...v0.4.4) (2026-10-16)


### Bug Fixes

* declare no icon on the error pages ([#80](https://github.com/alrayyes/service-not-ready/issues/80)) ([402937b](https://github.com/alrayyes/service-not-ready/commit/402937b685ac5d23723d064c029b44e031b09e7e)), closes [#79](https://github.com/alrayyes/service-not-ready/issues/79)

## [0.4.3](https://github.com/alrayyes/service-not-ready/compare/v0.4.2...v0.4.3) (2026-10-16)


### Bug Fixes

* **ci:** run release-auto-merge when the autorelease label is added ([#76](https://github.com/alrayyes/service-not-ready/issues/76)) ([b4412d1](https://github.com/alrayyes/service-not-ready/commit/b4412d14102e53fe0d1c9f77104599b10efc499d)), closes [#75](https://github.com/alrayyes/service-not-ready/issues/75)

## [0.4.2](https://github.com/alrayyes/service-not-ready/compare/v0.4.1...v0.4.2) (2026-10-15)


### Bug Fixes

* bump caddy from `881bbc6` to `d8542f4` ([#60](https://github.com/alrayyes/service-not-ready/issues/60)) ([3a581ab](https://github.com/alrayyes/service-not-ready/commit/3a581ab6ace813aeb9f763f0c21f8f55464fb57d))

## [0.4.1](https://github.com/alrayyes/service-not-ready/compare/v0.4.0...v0.4.1) (2026-10-09)


### Bug Fixes

* **hooks:** sort only the staged package.json in pre-commit ([fff0a86](https://github.com/alrayyes/service-not-ready/commit/fff0a86339f3152746c1664867565a5c6e3e85c6))
* **hooks:** sort only the staged package.json in pre-commit ([229958d](https://github.com/alrayyes/service-not-ready/commit/229958d5fe4d2cf5294a3f5f4c40cfdacc0da296))

## [0.4.0](https://github.com/alrayyes/service-not-ready/compare/v0.3.1...v0.4.0) (2026-10-09)


### Features

* **ci:** publish test and coverage reports to GitHub Pages ([#55](https://github.com/alrayyes/service-not-ready/issues/55)) ([2b21af9](https://github.com/alrayyes/service-not-ready/commit/2b21af955c8df4813c05162118d365d5e5243bf9))

## [0.3.1](https://github.com/alrayyes/service-not-ready/compare/v0.3.0...v0.3.1) (2026-10-06)


### Bug Fixes

* call the release steps directly, not through wretry.action ([96d5772](https://github.com/alrayyes/service-not-ready/commit/96d5772201a477644e6d0192148d9060269b0337))
* call the release steps directly, not through wretry.action ([f99d8f9](https://github.com/alrayyes/service-not-ready/commit/f99d8f978a0e565006979788ddbe7d2dfd5df69f))
* override smol-toml and katex to their patched releases ([3e84a4b](https://github.com/alrayyes/service-not-ready/commit/3e84a4bfdb6d8b29756a4c2561f7f75769d77ede))
* override smol-toml and katex to their patched releases ([647bf9b](https://github.com/alrayyes/service-not-ready/commit/647bf9bae028da020237a07c6560ca0c9538d479))

## [0.3.0](https://github.com/alrayyes/service-not-ready/compare/v0.2.0...v0.3.0) (2026-10-03)


### Features

* serve a status page for each error a proxy can produce ([9c1ed87](https://github.com/alrayyes/service-not-ready/commit/9c1ed8786d219aa909511579507daeb229f799d4))
* serve a status page for each error a proxy can produce ([b744e7c](https://github.com/alrayyes/service-not-ready/commit/b744e7c6b55b2112c64ad0609444fd770e75c8f5)), closes [#27](https://github.com/alrayyes/service-not-ready/issues/27)

## [0.2.0](https://github.com/alrayyes/service-not-ready/compare/v0.1.0...v0.2.0) (2026-10-03)


### Features

* serve a 503 fallback page from Caddy ([73ec405](https://github.com/alrayyes/service-not-ready/commit/73ec4054062446ddac6ee68cdbe3a456611dfbc4)), closes [#1](https://github.com/alrayyes/service-not-ready/issues/1)
