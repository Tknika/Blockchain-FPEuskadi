# Internationalization (i18n) Setup for EtiketaAPP

## Overview

EtiketaAPP now supports automatic language detection based on browser settings, with Spanish as the default language and Basque as an alternative. The application automatically detects the user's preferred language from their browser's `Accept-Language` header.

## Supported Languages

- **Spanish (es)**: Default language
- **Basque (eu)**: Alternative language

## How it Works

1. **Browser Detection**: The application checks the browser's `Accept-Language` header
2. **Language Matching**: Matches against supported languages (`es`, `eu`)
3. **Fallback**: If no match found, defaults to Spanish (`es`)

## Files and Structure

### Configuration Files
- `config.py`: Contains language settings (`LANGUAGES`, `BABEL_DEFAULT_LOCALE`)
- `babel.cfg`: Babel configuration for string extraction

### Translation Files
```
translations/
├── es/
│   └── LC_MESSAGES/
│       ├── messages.po  # Spanish translations (source)
│       └── messages.mo  # Compiled Spanish translations
└── eu/
    └── LC_MESSAGES/
        ├── messages.po  # Basque translations
        └── messages.mo  # Compiled Basque translations
```

### Key Application Files
- `etiketa.py`: Main Flask app with Babel initialization
- `forms.py`: Form field labels using `lazy_gettext`
- `templates/login.html`: Login template using translation functions

## Translation Strings

### Current Translations

| English/Spanish | Basque |
|-----------------|--------|
| Iniciar sesión | Saioa hasi |
| Usuario | Erabiltzailea |
| Contraseña | Pasahitza |
| Enviar | Bidali |

## Adding New Translations

### 1. Mark Strings for Translation
In Python files:
```python
from flask_babel import lazy_gettext as _l
# For form fields (evaluated later)
field_label = _l('Text to translate')

from flask_babel import gettext as _
# For immediate translation
flash(_('Message to translate'))
```

In templates:
```html
<h1>{{ _('Text to translate') }}</h1>
```

### 2. Extract and Update Translations
```bash
# Extract new strings
python babel_commands.py extract

# Update existing translation files
python babel_commands.py update

# Compile translations
python babel_commands.py compile
```

### 3. Edit Translation Files
Edit `translations/eu/LC_MESSAGES/messages.po` for Basque:
```po
msgid "New text"
msgstr "Testu berria"
```

Edit `translations/es/LC_MESSAGES/messages.po` for Spanish:
```po
msgid "New text"
msgstr "Nuevo texto"
```

### 4. Compile Translations
```bash
python compile_translations.py
```

## Testing Language Detection

Run the demo server to test language detection:
```bash
python demo_language.py
```

Then visit `http://localhost:5000` and:
1. Change your browser's language preferences
2. Use browser developer tools to modify Accept-Language headers
3. Observe how the interface language changes automatically

## Browser Language Settings

### Chrome
1. Settings → Advanced → Languages
2. Add/remove languages and reorder by preference

### Firefox
1. Settings → General → Language and Appearance
2. Choose your preferred languages

### Safari
1. Preferences → Advanced → Language
2. Edit the list of preferred languages

## Production Deployment

1. Ensure all translation files are compiled (`.mo` files exist)
2. The `translations/` directory must be included in deployment
3. Set appropriate environment variables if needed
4. Flask-Babel automatically handles language detection

## Maintenance Commands

```bash
# Initialize new language support
python babel_commands.py init

# Extract all translatable strings
python babel_commands.py extract

# Update existing translations with new strings
python babel_commands.py update

# Compile all translations for production use
python babel_commands.py compile
```

## Notes

- Browser language detection happens automatically on each request
- Translations are cached for performance
- Language preference is determined per-request (no session storage)
- Default language is Spanish (`es`) if no supported language is detected
- All form validation messages also support translation 