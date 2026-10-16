# Localization contract

The shared browser UI supports `en`, `ru`, `uk`, `de`, `fr` and `nl`. Both backends must adopt the updated SPA before an installed dashboard gains a UI change.

## Selection and persistence

Settings contains the language selector. [src/i18n](../src/i18n) is authoritative for the locale list, browser matching, stored choice and English fallback. A browser locale such as `de-DE` matches `de`; unsupported languages fall back to English. Explicit user choice takes priority and is stored under `inverter-dashboard.locale`. System mode removes that preference and uses the first supported entry in `navigator.languages`. Other tabs synchronize through storage events. Unavailable browser storage must not prevent rendering or an in-session language change.

The document language follows the selected locale for assistive technology. Presentation changes must not alter the installation's time zone, controller settings or data ownership. Localized formatting preserves measurement precision and the distinction between absent readings and zero.

The SPA initializes document-language integration. Component-library consumers can use `setLocale`, `currentLocale` and `initializeLocale`; document integration is opt-in for hosts.

## Translation boundaries

Translate navigation, sections, empty states, actions, accessible names, application validation, settings, alert age labels and tariff tools. Preserve operator device labels. Native alarm text and external diagnostics may remain in their source language: do not claim to translate arbitrary server messages by replacing substrings.

Never translate entity IDs, command names, wire enum values, JSON keys, CSS selectors or stored schemas. Labels and protocol values are different data. Keep signed values and physical units correct.

The tariff spreadsheet keeps its selected column headings for the lifetime of an open editor, preserving unsaved numeric cells during a language change. Close and reopen the editor to refresh those headings. The bundled Univer vendor locale is available in English, Russian, German and French; Ukrainian and Dutch use English for vendor-owned chrome. The application-owned editor labels, help and errors use all six locales; the vendor toolbar and context menu are hidden.

## Contributor procedure

1. Add a new stable key to `src/i18n/ui/en.json` and the corresponding value to every supported catalog. Keep the English source message unique: `tr()` looks up that exact message before selecting its translated value. Prefer complete sentences with named interpolation over concatenated fragments.
2. Preserve interpolation and plural parameters. Do not insert HTML to work around layout.
3. Call `tr('Exact English message', { namedParameter: value })` at the presentation boundary, including accessible labels. For owned messages retained in state or across an async operation, use `localized()` / `localizedError()` from `src/i18n/messages.ts` and preserve their identity with `errorText()` until rendering; storing an already translated string would leave an existing error in the previous language. Ordinary external errors remain literal. Existing nested vue-i18n keys are mapped through the English catalog for compatibility. An unused catalog entry does not localize the UI.
4. Register new locales in the shared list and README navigation using their native names.
5. Run type checking, catalog/component tests, lint and both builds. Cover unsupported browser languages and unavailable storage.
6. Check narrow layouts and long labels. Changing language must not trigger a device operation or change its payload.

## Documentation

The root README is English. `README.ru.md`, `README.uk.md`, `README.de.md`, `README.fr.md` and `README.nl.md` contain localized setup and operation guidance with identical commands and trust boundaries. Detailed protocol, release and developer references remain in English. Update translated instructions when behavior changes.

Catalog tests do not establish native-speaker editorial review, physical-device safety or OS notification delivery. Report those checks independently.
