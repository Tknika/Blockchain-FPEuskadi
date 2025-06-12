#!/usr/bin/env python3
"""
Simple script to compile .po files to .mo files using Python's built-in msgfmt
"""

import os
import sys
from babel.messages.mofile import write_mo
from babel.messages.pofile import read_po

def compile_po_file(po_path, mo_path):
    """Compile a single .po file to .mo file"""
    try:
        with open(po_path, 'rb') as f:
            catalog = read_po(f)
        
        with open(mo_path, 'wb') as f:
            write_mo(f, catalog)
        
        print(f"Compiled {po_path} -> {mo_path}")
        return True
    except Exception as e:
        print(f"Error compiling {po_path}: {e}")
        return False

def compile_all_translations():
    """Compile all translation files"""
    translations_dir = 'translations'
    success = True
    
    for lang_dir in os.listdir(translations_dir):
        lang_path = os.path.join(translations_dir, lang_dir)
        if os.path.isdir(lang_path):
            lc_messages_path = os.path.join(lang_path, 'LC_MESSAGES')
            if os.path.exists(lc_messages_path):
                po_file = os.path.join(lc_messages_path, 'messages.po')
                mo_file = os.path.join(lc_messages_path, 'messages.mo')
                
                if os.path.exists(po_file):
                    if not compile_po_file(po_file, mo_file):
                        success = False
    
    return success

if __name__ == '__main__':
    if compile_all_translations():
        print("All translations compiled successfully!")
    else:
        print("Some translations failed to compile.")
        sys.exit(1) 