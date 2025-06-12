#!/usr/bin/env python3
"""
Babel translation management script for EtiketaAPP

Commands:
- extract: Extract translatable strings
- init: Initialize a new language
- update: Update existing translations
- compile: Compile translations
"""

import os
import sys

def extract_messages():
    """Extract translatable strings from the application"""
    os.system('pybabel extract -F babel.cfg -k _l -o messages.pot .')

def init_language(lang):
    """Initialize a new language"""
    os.system(f'pybabel init -i messages.pot -d translations -l {lang}')

def update_translations():
    """Update all existing translations"""
    os.system('pybabel update -i messages.pot -d translations')

def compile_translations():
    """Compile all translations"""
    os.system('pybabel compile -d translations')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Usage: python babel_commands.py <command>')
        print('Commands: extract, init, update, compile')
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'extract':
        extract_messages()
        print('Messages extracted to messages.pot')
    elif command == 'init':
        # Initialize both Spanish and Basque
        extract_messages()
        init_language('es')
        init_language('eu')
        print('Initialized translations for Spanish (es) and Basque (eu)')
    elif command == 'update':
        extract_messages()
        update_translations()
        print('Updated all translations')
    elif command == 'compile':
        compile_translations()
        print('Compiled all translations')
    else:
        print(f'Unknown command: {command}')
        sys.exit(1) 