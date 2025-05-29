# Blockchain Irakurri - Datu bilatzaileak

Karpeta honek blockchain-etik datuak irakurtzeko tresna hauek ditu:

## 📚 formakuntzak.html
Formakuntza token-ak bilatzeko tresna. NFT token ID bat sartuz, token-aren informazio osoa erakusten du:
- Token jabea
- Token URI
- Testu informazioa
- Irudiak (IPFS-tik)

## 🏷️ etiketa.html
Etiketa lote-ak bilatzeko tresna. Lote zenbaki bat sartuz, produktuaren informazio publikoa erakusten du.

## Erabilera

1. Ireki nahi duzun HTML fitxategia web nabigatzailean
2. Automatikoki blockchain nodoak probatzen hasiko da
3. Konektatzen denean, bilaketa formularioa agertuko da
4. Sartu bilatu nahi duzun Token ID (formakuntzak) edo Lote zenbakia (etiketa)
5. "Bilatu" sakatu
6. Emaitzak pantailan erakutsiko dira

## Oharrak

- Blockchain nodo ezberdinak automatikoki probatzen ditu konektatzeko
- Ethers.js 5.7.2 erabiltzen du blockchain-arekin komunikatzeko
- Kontratuen helbideak kodean ezarrita daude. Beharrezkoa bada, aldatu