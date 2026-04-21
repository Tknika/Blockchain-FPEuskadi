# Blockchain Sareen Hedapena eta Konfigurazioa

## Sarrera

Dokumentu honek Blockchain zer den eta Blockchain sareek nola funtzionatzen duten ulertzeko oinarrizko kontzeptuak lantzen ditu. Oinarri teoriko sendo bat eskaintzeko diseinatuta dago, bai azpiko teknologia bai haren aplikazio praktikoa enpresa-inguruneetan ulertu ahal izateko.

---

# 1. zatia: Blockchain-en oinarriak

## 1.1 Zer da Blockchain?

**Blockchain** datu-base banatu, aldaezin eta deszentralizatu bat da, kriptografikoki lotutako blokeetan multzokatutako transakzioen erregistro ordenatua mantentzen duena.

### Analogia didaktikoa: partekatutako kontabilitate-liburua

Imajinatu kontabilitate-liburu bat honela:

- **Ez da inorena bereziki**: Munduko hainbat lekutan milaka kopia berdin daude. Edozein aldaketa kopia guztietan islatu behar da.
- **Orriak josita ditu**: Orrialde bakoitzak (blokeak) aurreko orriarekin lotzen duen zigilu bat (hash) dauka inprimatuta. Norbaitek aurreko orri bat aldatuko balu, dagokion zigilua (hash) ezberdina izango litzateke, hurrengo orriak daraman zigilua ez litzateke bat etorriko eta iruzurra atzeman egingo litzateke.
- **Tinta ezabaezinarekin idatzita dago**: Behin idatzita, ezin da ezabatu arrastorik utzi gabe. Edozein aldaketak ondorengo kate osoa baliogabetzen du.

### Funtsezko propietateak

| Propietatea | Deskribapena | Inplikazio praktikoa |
|-----------|-------------|----------------------|
| **Deszentralizazioa** | Ez dago datuak kontrolatzen dituen agintaritza zentral bakar bat. Sarea nodo independente ugarik mantentzen dute. | Akats-puntu bakarra ezabatzen du; ez dago transakzioak blokeatu edo aktiboak konfiskatu ditzakeen "banku" bakar bat. |
| **Aldaezintasuna** | Datuak ezin dira aldatu adostasunik gabe. Zailtasun konputazionalak (PoW) edo balidatzaileen sinadura digitalek (PoA) historia berridaztea bideraezin bihurtzen dute. | Auditoretza fidagarria: erregistratzen dena hor geratzen da. Ideala trazabilitaterako eta araudia betetzeko. |
| **Gardentasuna** | Nodoek uneko egoera eta transakzioen historia egiaztatu ditzakete. Sare publikoetan, edonork audita dezake; pribatuetan, baimendutako parte-hartzaileek. | Hirugarren batean konfiantzarik jarri gabe egiaztapena ahalbidetzen du. |
| **Akatsen aurreko tolerantzia** | Sareak funtzionatzen jarraitzen du nodo batzuek huts egiten badute edo gaiztoak badira ere (adostasun-protokoloak ezarritako muga bateraino). | Erresilientzia: sareak lanean jarraitzen du erorketa partzialen aurrean. |

### Blockchain vs datu-base tradizionala

| Alderdia | Datu-base zentralizatua | Blockchain |
|---------|---------------------------|------------|
| **Kontrola** | Administratzaile batek erabakitzen du zer gordetzen den | Nodoen arteko adostasun banatua |
| **Aldaketa** | Erregistroak eguneratu edo ezabatu daitezke | Bloke berriak bakarrik gehitzen dira; historia aldaezina da |
| **Konfiantza** | Administratzailearengan konfiantza jartzen da | Kriptografian eta protokoloan jartzen da konfiantza |
| **Errendimendua** | Oso handia, milaka transakzio segunduko (TPS) | Adostasunak mugatua (normalean ehunka TPS sare pribatuetan) |

---

## 1.2 Blockchain sare baten oinarrizko arkitektura

### Osagai nagusiak

#### 🔹 Nodoak

**Nodo** bat blockchain softwarearen instantzia bat da (gure kasuan **Hyperledger Besu**), eta honako hauek egiten ditu:

- Ledger-aren kopia bat mantentzen du (bloke-katea eta egoera).
- Transakzioak eta blokeak balioztatzen ditu protokoloaren arauen arabera.
- Beste nodoekin P2P (peer-to-peer) protokoloen bidez komunikatzen da.

**Nodo motak:**

| Mota | Funtzioa | Ohiko erabilera |
|------|---------|------------|
| **Nodo balidatzailea** | Blokeak proposatzen ditu eta adostasunean parte hartzen du. Bere identitatea ezaguna da. | Sarearen azpiegitura nagusia. |
| **Nodo ez-balidatzailea** | Katea errepikatzen du eta kontsultei erantzuten die. Ez ditu blokeak proposatzen. | Aplikazioetarako RPC nodoak; babeseko nodoak. |
| **RPC nodoa** | APIak azaltzen ditu (JSON-RPC, WebSockets), kanpoko aplikazioek sarearekin elkarreragin dezaten. | DApps, wallet-ak, administrazio-scriptak. |
>**Oharra:** Nodo balidatzaileak zein ez-balidatzaileak RPC nodo ere izan daitezke.

![Blockchain-en diagrama kontzeptuala](../baliabideak/esquema_red_acceso.png)
#### 🔹 Ledger-a (egoera)

*Ledger*-ak (kontabilitate-liburuak) honako hau mantentzen du:

- **Transakzioen historia**: Exekutatutako transakzio guztiak dituzten blokeen sekuentzia.
- **Uneko egoera (World State)**: Kontuen saldoak, kontratuen kodea, kontratuen biltegiratzea. Genesis bloketik hasita transakzio guztiak exekutatzetik eratorria da.

#### 🔹 Transakzioak

Transakzio batek sarean **egoera-aldaketa** bat adierazten du:

- **Balio-transferentzia**: ETH (edo jatorrizko token-a) kontu batetik bestera bidaltzea.
- **Smart Contract bati egindako deia**: Hedatutako kontratu bateko funtzio bat exekutatzea.
- **Kontratu baten hedapena**: Blockchain-ean kontratu berri bat sortzea.

**Transakzio baten osagaiak:**

| Eremua | Deskribapena |
|-------|-------------|
| **Igorlea** | Sinatzen duen kontuaren helbidea (bere gako pribatuaren bidez identifikatua). |
| **Hartzailea** | Helmugako kontuaren helbidea (hutsa kontratu-hedapena bada). |
| **Datuak (payload)** | Kontratuaren kodea edo deialdiaren parametro kodetuak. |
| **Gas** | Kontsumitzea onartzen den gas-unitate kopuru maximoa. Begizta infinituak saihesten ditu eta kostuaren goi-muga ezartzen du. Benetako kostua sarearen jatorrizko monetan ordaintzen da (adib. ETH): **kontsumitutako gasa × gasaren prezioa** = balidatzaileak jasotzen duen komisioa. Igorleak, gainera, gas-unitateko ordaintzeko prest dagoen *gas price* (edo *max fee*, EIP-1559-n) ere adierazten du. |
| **Nonce** | Replay erasoak saihesten dituen eta igorle beraren transakzioak ordenatzen dituen zenbaki sekuentziala. **Replay:** sinatutako transakzio bat hirugarren batek kopiatu eta berriro bidal lezake (adibidez, beste sare batean edo berriro sare berean) eragiketa bera errepikatzeko (adib. beste transferentzia bat). Kontu horretarako baliozkoa den transakzio bakoitzak espero den hurrengo nonce-a eraman behar duenez, behin exekutatuta nonce hori jada "erabilia" dago eta transakzio bera ezin da berriro sartu: baliogabetuta geratuko litzateke. |

#### 🔹 Adostasuna

Nodoei **hurrengo bloke baliozkoa adostea** ahalbidetzen dien mekanismoa da, agintaritza zentralik gabe.

---

## 1.3 Datu-egitura: katea, egoera eta blokeak

Aipatu dugun bezala, *ledger*-a **blokeen** **kateak** osatzen du, transakzio guztiak biltzen dituena, eta zenbait 'objekturen' **uneko egoerak** (kontuen saldoak, kontratuen aldagaiak...).

### Katea: kriptografia bidez lotutako zerrenda baten bitartez

Blockchain ez da soilik datu-base bat; **erregistro historiko sekuentzial** bat da. Bloke bakoitzak honako hau dauka:

- Aurreko blokera doan erakusle bat, haren **hash**-aren bidez (aztarna kriptografikoa).
- Norbaitek bloke zahar bat aldatzen badu, haren hash-a aldatu egiten da. Hurrengo blokeak erakusle "hautsi" bat izango luke eta katea baliogabetuta geratuko litzateke.
- Beraz, historia faltsutzeko ondorengo bloke guztien hash-ak berriz kalkulatu beharko lirateke, eta hori konputazionalki debekuzkoa da bloke asko dituzten sareetan.

> **Irudia:** Blockchain baten adibide bisuala, elkarren artean lotutako bloke-kate gisa, non bloke bakoitzak transakzioak eta aurreko blokearen hash-a dituen, egitura segurua eta aldaezina osatuz. Irudia [webgune honetatik](https://www.preethikasireddy.com/post/how-does-ethereum-work-anyway) lortu da.

![Blockchain-en diagrama kontzeptuala](../baliabideak/blockchain.png)

### Egoera globala: Merkle zuhaitzen bidez

Ethereum edo Hyperledger Besu bezalako plataformetan, **egoera globala** (saldoak, kontratuak, biltegiratzea) ez da bloke bakoitzaren barruan gordetzen. Horren ordez:

- **Trie** motako datu-egitura erabiltzen da (aurrizkien zuhaitza).
- Blokeak zuhaitz horren **erroa** (Root Hash) bakarrik dauka. Zuhaitz motako datu-egitura baten (Trie/Merkle Tree) goiko nodoa adierazten duen hash-a da. Zuhaitzeko hostoetan eta tarteko adarretan gordetako datu guztietatik kalkulatzen da. Edozein hostotako datu bakar bat aldatzeak erroa aldatzen du.
- Horrela, blokean erroa bakarrik gordetzeak aukera ematen du modu eraginkorrean egiaztatzeko (inklusio-frogen bidez) transakzio, egoera edo ordainagiri bat benetan sartuta dagoela, zuhaitz osoa bloke bakoitzean agerian utzi edo gorde gabe. Horrek bezero arinei saldo bat egiaztatzeko aukera ematen die blockchain osoa deskargatu gabe: erroatik dagokion hostorainoko bidea nahikoa da.

### Bloke baten anatomia

Bloke bakoitzak bi zati nagusi ditu:

#### Goiburua (Header) – Metadatuak

> **Irudia:** Ethereum bloke baten goiburuaren adibide bisuala, eremu esanguratsuenekin. Irudia [webgune honetatik](https://www.preethikasireddy.com/post/how-does-ethereum-work-anyway) lortu da.

![Blockchain-en diagrama kontzeptuala](../baliabideak/block_header.png)

| Eremua | Funtzioa |
|-------|---------|
| **ParentHash** | Aurreko blokearen hash-a. Bat ez badator, blokea umezurtza da eta baztertu egiten da. |
| **Nonce** | Behin erabiltzen den zenbakia; PoW-rako (lan-froga) esklusiboa, egindako lana frogatzeko; PoA-n (agintaritza-froga) zeroan edo balio konbentzional batean uzten da. |
| **Timestamp** | Blokea sortu zeneko Unix denbora-zigilua. Sinkronizazioan eta sareko denbora-kontrolean laguntzen du. |
| **UncleHash (OmmersHash)** | "Osaba" edo aitortutako bloke umezurtzen zerrendaren hash-a. PoA-n normalean hutsik egoten da, baina goiburuan presente dago. |
| **Coinbase (Beneficiary)** | Blokea proposatzen duen eta komisioak jasotzen dituen balidatzailearen helbidea. Hemen jasotzen du meatzariak edo balidatzaileak blokea sortzearen ordaina. |
| **LogsBloom** | Bloom iragazkia (gertaera bat egon daitekeen ala ez azkar egiaztatzeko datu-egitura probabilistikoa, faltsu positiboekin), gertaerak modu eraginkorrean bilatzeko erabiltzen dena bloke osoa irakurri gabe. |
| **Difficulty** | Meatzaritzarako behar den zailtasuna (PoW) edo balio finko/testigantzazkoa PoA-n. |
| **ExtraData** | PoA-n, balidatzailearen sinadura eta adostasun-datuak barne hartzen ditu. Sareak definitutako datu gehigarriak ere izan ditzake. |
| **Number** | Kateko bloke-zenbakia (altuera). Ordena kronologikoa mantentzeko balio du. |
| **GasLimit** | Blokeko transakzioetarako onartutako gehieneko gas-a. Prozesamendu-gaitasuna definitzen du. |
| **GasUsed** | Blokeko transakzioek benetan kontsumitutako gas-a. |
| **MixHash** | PoW-n meatzaritza-prozesuaren balioztatze-informazioa dauka; PoA-n, normalean balio finko bat da. Balioztatze horrek esan nahi du, Nonce-arekin batera, MixHash-ek beharrezko lan konputazionala egin dela frogatzen duela (adibidez, blokearen hash-ak zailtasun-helburua betetzen duela). |
| **StateRoot** | Egoera globalaren zuhaitzaren erroa, blokeko transakzioak exekutatu *ondoren*. |
| **TransactionsRoot** | Blokeko transakzio guztiak dituen zuhaitzaren erroa. |
| **ReceiptsRoot** | Ordainagirien zuhaitzaren erroa (Smart Contract-en gertaeren log-ak). Funtsezkoa indexatzaileentzat eta dApp-entzat. |

> **Oharra:** Eremu batzuk agian ez dira garrantzitsuak edo ez dira betetzen QBFT edo Clique bezalako PoA protokoloetan, baina bloke-goiburuaren egituran beti daude presente Ethereum-en espezifikazioaren arabera.

#### Gorputza (Body)

- Transakzioen zerrenda ordenatua.
- PoW sareetan, "uncles" (saritutako bloke umezurtzak) izan ditzake; PoA-n normalean hutsik egoten da.

---

## 1.4 EVM (Ethereum Virtual Machine) – exekuzio-motorra

**EVM** (Ethereum Virtual Machine) Ethereum eta Hyperledger Besu bezalako sare bateragarrietako smart contract-en exekuzio-ingurunea da. Pila bidezko makina birtual determinista bat da, kontratuen bytecode-a nodo guztietan modu berean exekutatzen duena, blockchain-aren egoerak modu koherente eta egiaztagarrian eboluzionatzea bermatuz. EVM-k kontratuak ostalari-sistematik isolatzen ditu, transakzioak eta kontratuak nola prozesatzen diren definitzen du, eta baliabideen kontsumoa gas-kostuaren bidez erregulatzen du, sarearen segurtasuna eta funtzionamendu autonomoa ziurtatuz.

### Non eta noiz exekutatzen da kodea EVMn

| Unea | Zer exekutatzen da | Non |
|---------|----------------|-------|
| **Kontratuaren hedapena** | `to = hutsa` eta `data = kontratuaren bytecode-a` duen transakzio bat bidaltzen denean, EVM-k bytecode hori behin bakarrik exekutatzen du. Emaitza sortu berri den kontratuaren helbidean gordetzen den kodea da. | Transakzioa prozesatzen duen nodoan (balidatzaile bakoitzak exekutatzen du blokea sartzean). |
| **Kontratuari deitzea** | Transakzio batek `to = kontratuaren helbidea` eta `data = funtzio-hautatzailea + kodetutako parametroak` dituenean, EVM-k helbide horretan gordetako bytecode-a kargatu eta exekutatzen du. Deitutako funtzioa `data`-ren lehen 4 byteek (hautatzaileak) zehazten dute. | Blokea balidatzen duen nodo bakoitzean, modu deterministan, transakzioa aplikatzean. |
| **Barne-deiak (CALL/DELEGATECALL)** | Kontratu batek beste bati dei diezaioke. EVM-k uneko exekuzioa eten, barne-deiarentzat "testuinguru" berri bat sortu, helburuko kontratuaren bytecode-a exekutatu, eta emaitzarekin jatorrizko testuingurura itzultzen da. | Transakzio beraren barruan, azpi-exekuzio gisa. |

**Laburpena:** EVM-k ez du iturburu-koderik (.sol) ezta ABIrik ere exekutatzen. **Bytecode** bakarrik exekutatzen du (EVMren makina-kodea). Exekuzioa **kontratu bati eragiten dion transakzio bat bloke batean sartzen denean** gertatzen da; sareko nodo bakoitzak transakzioak lokalki exekutatzen ditu emaitza blokearen proposatzailearenarekin bat datorrela egiaztatzeko.

### Solidity eta honi lotutako fitxategiak

Smart Contract-ak normalean **Solidity**-n idazten dira, C/JavaScript-en inspiratutako goi-mailako lengoaia batean. Garapenean hainbat artefakturekin lan egiten da:

| Fitxategia / Artefaktua | Deskribapena | Zertarako balio du |
|---------------------|-------------|----------------|
| **`.sol`** | Kontratuaren iturburu-kodea Solidity-n. Garatzaileak idazten dituen funtzioak, egoera-aldagaiak eta logika biltzen ditu. | Editatzen dena da. Ez da blockchain-era igotzen. |
| **`.abi`** (Application Binary Interface) | Kontratuaren interfazea deskribatzen duen JSON fitxategia: funtzioen izenak, parametroak, itzulera-motak, gertaerak. Ez dauka ez logikarik ez bytecode-rik. | Kanpoko aplikazioek (DApps, scriptak, wallet-ak) deialdiak nola kodetu eta emaitzak nola deskodetu jakiteko balio du. Frontend-aren eta hedatu den kontratuaren arteko "interfazea" da. |
| **`.bytecode`** | Kode konpilatua (EVMren opcodes-ak). Normalean kate hamaseitar gisa sortzen da. Hori da EVM-k exekutatzen duena. | Hedapen-transakzioaren `data` eremuan sartzen da. Behin hedatuta, blockchain-ean gordetzen da kontratuaren helbideari lotuta. |

**Ohiko fluxua:** Garatzaileak `MiContrato.sol` idazten du → konpilatzaileak bytecode-a (`MiContrato.bytecode`) eta ABIa (`MiContrato.abi`) sortzen ditu → bytecode-a sarean hedatzen da → aplikazioek ABI erabiltzen dute kontratuaren funtzioei deitzen dieten transakzioak eraiki eta bidaltzeko.

**Garrantzitsua - EVMren bertsioa:** EVM hard fork bakoitzarekin eboluzionatzen da (London, Shanghai, Cancun, etab.). Sare bakoitzak bere `genesis.json`-ean definitzen du zein EVM bertsio aktibatzen duen. **Funtsezkoa da kontratua hedatuko den sareari dagokion EVM bertsioarekin konpilatzea**. Sarea baino berriagoa den EVM baterako konpilatzen badugu, bytecode-ak existitzen ez diren opcodes-ak erabil ditzake eta transakzioak huts egingo du. Zaharrago baterako konpilatzen badugu, optimizazioak edo funtzionalitateak galduko ditugu. Solidity-n `pragma solidity ^0.8.0` bidez zehazten da, eta konpilatzailean `--evm-version` aukerarekin (adib. `paris`, `shanghai`).

### Pila-arkitektura (Stack-based)

- EVM-k **256 biteko pila** batekin lan egiten du.
- Instrukzioek (PUSH, POP, SSTORE, CALL bezalako opcodes-ek) pila hori manipulatzen dute.
- Egoera-makina determinista da: input berak → output berak.

### Biltegiratze motak

| Mota | Iraunkortasuna | Kostua (gas) | Erabilera |
|------|--------------|-------------|-----|
| **Storage** | Iraunkorra (kontratuari lotua) | Oso garestia | Deien artean iraun behar duten datuak. |
| **Memory** | Lurrunkorra (transakzioaren ondoren ezabatzen da) | Ertaina | Exekuzioan zeharreko aldi baterako datuak. |
| **Stack** | Uneko instrukzioan bakarrik | Doakoa | Berehalako kalkuluak (geh. 1024 elementu). |
| **Calldata** | Irakurketa bakarrik | Baxua | Transakzioaren sarrerako parametroak. |

### Gas-a eta gelditzearen arazoa

EVM **Turing-osoa** da: edozein algoritmo exekuta dezake, begizta infinitu potentzialak barne. Transakzio batek sarea mugagabe blokeatzea saihesteko:

- Eragiketa bakoitzak **gas** kontsumitzen du (kostu-unitateak).
- Igorleak **gas-muga** bat ezartzen du (gas limit).
- Transakzioa osatu aurretik gas-a agortzen bada, transakzioa leheneratu egiten da (baina kontsumitutako gas-a berdin kobratzen da).
- Horrek bermatzen du exekuzio oro denbora mugatuan amaitzea.

---

# 2. zatia: Blockchain sareak

## 2.1 Blockchain sare motak

### Sareen taxonomia

| Ezaugarria | Publikoa (baimenik gabea) | Kontsortziokoa (baimendua) | Pribatua |
|----------------|--------------------------|---------------------------|--------------------------|
| **Sarbidea** | Edonork irakurri/idatzi dezake | Baimendutako kideek bakarrik | Erakunde bakar bat |
| **Gobernantza** | Deszentralizatua (DAO, off-chain) | Erdi-zentralizatua (kideen batzordea) | Zentralizatua |
| **Gardentasuna** | Osoa | Kideetara mugatua | Barnekoa |
| **Errendimendua** | Deszentralizazioak mugatua | Handia (sare fidagarria) | Oso handia |
| **Finalitatea** | Probabilistikoa (normalean) | Berehalakoa (determinista) | Berehalakoa |
| **Erabilera-kasuak** | Kriptotxanponak, DeFi, NFTak | Supply chain, CBDCak, banka | Barne-auditoretza, probak |

### 🔓 Sare publikoak

**Adibideak:** Bitcoin, Ethereum

**Ezaugarriak:**

- Sarbide irekia: edonork exekuta dezake nodo bat, meatzaritza/balioztatzea egin eta transakzioak bidali.
- Deszentralizazio handia: munduan banatutako milaka nodo.
- Errendimendu txikia: adostasunak (PoW/PoS) segundoko transakzio kopurua mugatzen du.
- Adostasun garestia: segurtasuna bermatzeko meatzaritza edo *staking* ekonomikoa behar da.

**Erabilera-kasuak:**

- Kriptotxanponak.
- Finantza deszentralizatuak (DeFi).
- NFTak eta aplikazio deszentralizatu irekiak.

### 🤝 Kontsortzio-sareak

**Adibideak:** Alastria, R3 Corda

**Ezaugarriak:**

- Hainbat erakunderen artean partekatutako kontrola.
- Elkarren arteko akordioz baimendutako nodoak.
- Konfiantza partziala: ez da parte-hartzaile bakar batean guztiz fidatzen.

**Erabilera-kasuak:**

- Hornidura-katea fabrikatzaile, banatzaile eta saltzaileen artean.
- Bankuen arteko sareak.
- Identitate digital partekaturako plataformak.

### 🔐 Sare pribatuak

**Adibideak:** Hyperledger Besu, Fabric

**Ezaugarriak:**

- Sarbide mugatua: baimendutako nodoak eta kontuak bakarrik.
- Identitate ezaguna: balidatzaileak identifikagarriak dira.
- Errendimendu handia: meatzaritzarik gabeko adostasun eraginkorra.
- Gobernantza kontrolatua: erakunde batek edo gehiagok definitzen dituzte arauak.

**Erabilera-kasuak:**

- Enpresa barruko sareak.
- Bankuak eta finantza-sektorea.
- Produktuen trazabilitatea.
- Auditoretza eta araudia betetzea.

---

## 2.2 Adostasun-protokoloak

Adostasuna da nodoek hurrengo bloke baliozkoa zein den adosteko eta sarearen koherentzia mantentzeko erabiltzen duten mekanismoa.

### Proof of Work (PoW)

- **Mekanismoa:** Nodoek (meatzariek) arazo kriptografiko bat ebatziz lehiatzen dute (blokearen hash-ak baldintza jakin batzuk betetzen dituen nonce bat aurkitzea).
- **Pizgarria:** Konpontzen duen lehenak blokea proposatzen du eta saria jasotzen du.
- **Abantailak:** Segurtasun frogatua, erasoei erresistentzia.
- **Desabantailak:** Energia-kontsumo handia, berrespen-denbora luzea.
- **Adibidea:** Bitcoin.

### Proof of Stake (PoS)

- **Mekanismoa:** Balidatzaileak "apustu" gisa jartzen duten kriptotxanpon kopuruaren (stake) arabera aukeratzen dira. Zenbat eta stake handiagoa, orduan eta aukera handiagoa blokeak proposatzeko.
- **Abantailak:** PoW baino eraginkorragoa, energia-kontsumo txikiagoa.
- **Desabantailak:** Hasierako aberastasunak boterea kontzentra dezake.
- **Adibidea:** Ethereum 2.0.

### Delegated Proof of Stake (DPoS)

- **Mekanismoa:** Tokenen jabeek beren izenean blokeak balidatuko dituzten ordezkariak bozkatzen dituzte.
- **Abantailak:** Abiadura eta eraginkortasun handia.
- **Desabantailak:** Zentralizazio handiagoa (balidatzaile aktibo gutxi).
- **Adibidea:** EOS.

### Proof of Authority (PoA)

PoA-k zailtasun matematikoa (PoW) edo ekonomikoa (PoS) **identitate digitalarekin** ordezkatzen du. Balidatzaileak ezagunak eta baimenduak dira.

**Ezaugarriak:**

- Identitate egiaztatua duten balidatzaile baimenduak.
- Bloke bakoitza balidatzaile batek sinatzen du.
- Ez du meatzaritzarik edo staking ekonomikorik behar.
- Eraginkorra da sare pribatuetarako eta kontsortzio-sareetarako.

---

## 2.3 Hyperledger Besu - gure inplementazio praktikoa

Ikastaro honetako praktikak [Hyperledger Besu sare pribatu](https://besu.hyperledger.org/private-networks) bat hedatuz egingo ditugu, PoA adostasunarekin. [Kode irekiko software](https://github.com/hyperledger/besu/) bat da, modu aktiboan garatzen jarraitzen du, eta **EVM** inplementatzen du, Ethereum-ek erabiltzen duen makina birtual bera; horrek Ethereum ekosistemako kontratu eta tresnekin bateragarritasuna bermatzen du.

**PoA inplementazioak Hyperledger Besun:**

| Aukera | Gomendatutako erabilera |
|--------|------------------|
| **Clique PoA** | Batez ere garapen-sareetan edo proba-inguruneetan erabiltzen da; Clique Proof of Authority protokolo sinple eta konfiguratzen erraza da. Segurtasun aurreratua baino probetako azkartasuna eta hedapenaren erraztasuna lehenesten diren eszenatokietarako egokia da. Ez da gomendatzen ekoizpen-inguruneetarako, bere sinpletasunagatik eta akatsen aurrean tolerantzia txikiagoagatik. |
| **IBFT (Istanbul Byzantine Fault Tolerance)** | Ekoizpenerako eta kontsortzioetarako. Enpresa-sare askotan onartutako BFT aldaera; akatsen aurreko tolerantzia eta erredundantzia behar diren inguruneetarako egokia. |
| **QBFT (Quorum Byzantine Fault Tolerance)** | Ekoizpen-inguruneetarako diseinatua; QBFT-k akats bizantziarrekiko tolerantzia eskaintzen du, sareak lanean jarraitzea ahalbidetuz nodo batzuek modu gaiztoan jardun edo huts egiten badute ere. Segurtasuna, fidagarritasuna eta akatsen aurreko erresilientzia lehentasunezkoak diren sareetarako pentsatuta dago, kontsortzio edo enpresetan sendotasun eta koherentzia handiagoa bermatuz. |

#### 🔹 Nola funtzionatzen du QBFT-k (gure kasua)

QBFT BFT (Byzantine Fault Tolerance) protokolo bat da, eta PoA (agintaritza-froga) inplementatzen du. Hauek dira bere faseak:

1. **Pre-Prepare:** Proposatzaileak (txandaka aukeratutako balidatzaileak) proposatutako blokea gainerakoei bidaltzen die.
2. **Prepare:** Balidatzaileek blokearen harrera eta baliozkotasuna berresten dituzte.
3. **Commit:** Balidatzaileek "Prepare" mezuen quorum nahikoa ikusi dutela berresten dute eta blokea beren kopia lokalean idaztera pasatzen dira.

**Funtsezko propietateak:**

- **Berehalako finalitatea:** Behin berrestituta, bloke bat ezin da atzera bota (PoWn ez bezala, non berrantolaketa-arriskua dagoen).
- **Akatsen aurreko tolerantzia:** Sareak `f = (n - 1) / 3` nodo akastun edo gaizto arte jasan ditzake, non `n` balidatzaile kopuru osoa den.
  - Adibidea: 4 nodorekin, akats 1 onartzen da.
- **Sinatutako mezularitza:** Nodoek digitalki sinatutako mezuak trukatzen dituzte osotasuna eta benetakotasuna bermatzeko.

**Bizitasuna vs Koherentzia:** QBFT-k segurtasuna (koherentzia) lehenesten du bizitasunaren gainetik. Sarea zatitzen bada eta quorum-a lortu ezin badu, gelditu egiten da, kate dibergenteetan bifurkatu beharrean.

---

# 3. zatia: Aurrez konfiguratutako Blockchain sare baten hedapena

Hyperledger Besu blockchain sare **aurrez konfiguratu** bat hedatuko dugu elkarrekin komunikatu daitezkeen 4 makina birtualetan (Ubuntu Server), eta haren funtzionamendua aztertuko dugu. Bosgarren makina bat izango dugu (Ubuntu Desktop), hedapen-makina eta sarearen erabilerarako edo monitorizaziorako web zerbitzari gisa jardungo duena. Sinpletasunagatik eta interfazearen erosotasunagatik, Ubuntu Desktop-etik bakarrik lan egingo dugu, behar izanez gero hortik konektatuz gainerako makinetara.

Iturburu-kode guztia hemen dago: https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak

Makina hauek erabiltzaile bakoitzarentzat hedatuta daude hemen: https://vdi.tknika.eus/login

'Besu nodo 1-5' izeneko bost makina birtualak Ubuntu Server makinak dira (**4 bakarrik erabiliko dira hedapen honetan**). Konfiguratutako gauza bakarrak IP helbide finkoa eta zerbitzariaren izena dira. Blockchain sareko nodoak martxan jartzeko instalatu behar dugun guztia **Ansible** bidez egingo da hedapenean.

'Ubuntu Desktop' izeneko makina birtuala mahaigaineko Ubuntu bat da; konfiguratutako gauza bakarrak IP helbide finkoa eta hedapena egiteko Ansible instalatua dira. Hedapenaren zati bat makina horretan bertan egiten da, blockchain-a erabiltzen duten aplikazioentzako web zerbitzari gisa jokatzen baitu.

> **Oharra:** Itsatsi komandoak erraz makina birtualean, SPICE bidez ikusiz eta `Ctrl. + Shift + V` erabiliz.

Hedapenerako 'Ubuntu Desktop' izeneko makina erabiliko dugu, urrats hauek jarraituz:

1.- Ziurtatu makina guztiak piztuta daudela, guztira 5.

2.- Ubuntu Desktop makinan terminala ireki eta exekutatu:

`git clone https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak.git`

`cd Ikastaroa_Blockchain_Sareak`

3.- Lehenik, makinekiko konektibitatea egiaztatuko dugu. Horretarako, lehen komandoarekin haien gakoak makina ezagunen zerrendara gehitzen ditugu, eta bigarrenarekin Ansiblek haietara sarbidea duela egiaztatzen dugu (makina bakoitzeko SUCCESS bat jaso behar dugu):

`ssh-keyscan -t ed25519 -H 192.168.100.1 192.168.100.2 192.168.100.3 192.168.100.4 192.168.100.5 >> ~/.ssh/known_hosts`

`ansible -i Hedapena/inventory.yml -m ping all --ask-pass`

4.- Nodoetarako konektibitatea ondo badoa, **Ansible Playbook** bat exekutatzen dugu hedapen osoa egiteko, makinetara sartzeko pasahitza bakarrik eskatzen digunean sartuz:

`ansible-playbook -i Hedapena/inventory.yml Hedapena/hedapena-AnsiblePlaybook.yml --ask-become-pass`

Pixka bat beharko du hedapen guztia egiteko. Dena ondo joan bada, zereginaren amaieran honen antzeko mezu bat jasoko dugu:

![Ansible OK](../baliabideak/ansible_ok.jpg)

Zerbait gaizki joan bada, errorea begiratu beharko dugu, baina ez dago arazorik komandoa berriro exekutatzeko; Ansiblek ondo egindako zereginak saltatuko ditu.

Sarea martxan dagoela egiazta dezakegu Ubuntu Desktop-eko nabigatzailean `localhost` edo `ethstats.localhost` helbideetara sartuta. Honelako zerbait ikusiko dugu:

![Ethstats](../baliabideak/ethstats.jpg)

Hau da Ansible bidezko hedapen-prozesuan gertatu dena:

1. Hasteko, hedapenerako eta instalaziorako behar den kode guztia [Github](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak)-etik deskargatu dugu `git clone ...` komandoarekin.


2. Hedapenean parte hartzen duten makinak biltegiko [`Hedapena/inventory.yml`](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/inventory.yml) fitxategian definituta daude. Bertan definitzen da haien IPa, eta taldeka sailkatuta daude (`besu_nodes`, `webserver`), edukiak hedatzerakoan bereizteko.


3. Ansibleri *ssh* bidezko sarbidea behar zaionez, `ssh-keyscan` komandoaren bidez urruneko makinak makina ezagunen zerrendara gehitu ditugu, eta `ansible -i Hedapena/inventory.yml -m ping all --ask-pass` komandoarekin hedapenean parte hartzen duten makinetara sarbidea duela egiaztatu dugu.


4. [`Hedapena/hedapena-AnsiblePlaybook.yml`](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/hedapena-AnsiblePlaybook.yml) fitxategian definitutako Ansible **playbook**-a exekutatzen dugu. Playbook-ak hiru zeregin gauzatzen ditu:


   4.1. Docker eta Docker Compose makina guztietan instalatzea: 'hosts: all_servers' propietateak inbentarioan definitutako makina guztiei eragiten diela adierazten du. 'isard' erabiltzailearen pasahitza eskatzen da, eta 4 azpi-zeregin exekutatzen dira:
    - Pasahitza aldagai batean gordetzea, berriro eskatu behar ez izateko.
    - 'docker.io' eta 'docker-compose-v2' paketeak instalatzea.
    - Docker zerbitzua abiaraztea.
    - 'isard' erabiltzailea 'docker' taldera gehitzea.


   4.2. Web zerbitzaria hedatzea eta zerbitzuak abiaraztea: 'hosts: webserver' propietateak lotutako zereginak webserver taldeko makinetan bakarrik egingo direla adierazten du; kasu honetan, 192.168.100.10 IP duen makina da, eta hedapena egiteko erabiltzen ari garen bera da. Azpi-zereginak hauek dira:
    - 'web' karpeta sortzea.
    - 'WebServer' karpeta helmugako 'web' karpetaren barrura kopiatzea.
    - 'Pilotoak' karpeta helmugako 'web' karpetaren barrura kopiatzea.
    - Helmugako 'web' karpeta eta azpikarpetak 'isard' erabiltzailearenak direla ziurtatzea.
    - Docker bidez web zerbitzaria eta 'WebServer/docker-compose.yml' fitxategian definitutako beste zerbitzu batzuk abiaraztea.


   4.3. Hyperledger Besu lau nodoetan hedatzea: 'hosts: besu_nodes' propietateak lotutako zereginak *besu_nodes* taldeko makinetan bakarrik egingo direla adierazten du. Azpi-zereginak hauek dira:
    - '~/besuNode'-n beharrezko karpeta-egitura sortzea.
    - Nodo guztientzat komunak diren fitxategiak kopiatzea.
    - Nodo bakoitzaren fitxategi espezifikoak kopiatzea (indizea erabiliz).
    - Helmugako 'besuNode' karpeta eta azpikarpetak 'isard' erabiltzailearenak direla ziurtatzea.
    - Docker bidez Besu makina bakoitzean abiaraztea. Kasu honetan, makina bakoitzerako fitxategi ezberdin bat hedatu behar denez, fitxategi-izeneko zenbakiari *inventory.yml*-n definitutako indize-zenbakia erreferentziatzen zaio.

**Ariketa, ondorengoa egitean datza:**

**1.** Jarraitu deskribatutako urrats guztiak aurrez konfiguratutako blockchain sarea hedatzeko. Entregatu Ethstats-en kaptura bat, nodo guztiak martxan eta blokeak sortzen agertzen direna.


**2.** Sartu nodoetako batera (erosotasun handiagoz Ubuntu Desktop-etik ssh bidez) eta jaitsi zerbitzua eskuz, sareak blokeak sortzen jarraitzen duela ikusteko.
  - Exekutatu `ssh isard@192.168.100.1` eta `besuNode` karpetaren barruan `docker compose -f docker-compose1.yml down`
  - Atera zerbitzariko konexiotik `exit` erabiliz.
  - Begiratu Ethstats nabigatzailean.
  - Entregatu Ethstats-en kaptura bat 3 nodo martxan baina blokeak sortzen ari direla erakutsiz (`Last block` 10 segundo baino gutxiagorekin).

**3.** Sartu beste nodo batera eta jaitsi zerbitzua, sarea dagoeneko ez dela bloke gehiago sortzen ikusteko.
  - Exekutatu `ssh isard@192.168.100.2` eta `besuNode` karpetaren barruan `docker compose -f docker-compose2.yml down`
  - Atera zerbitzariko konexiotik `exit` erabiliz.
  - Begiratu Ethstats nabigatzailean.
  - Entregatu Ethstats-en kaptura bat 2 nodo martxan eta bloke berririk sortu gabe ('Last block' 10 segundo baino gehiagorekin).

**4.** Berraktibatu zerbitzua bi nodoetan, sareak bloke-sorkuntzari berrekin diola ikusteko (ingurune honetan bloke berriak sortzeari berriro ekiteko denbora pixka bat behar izan dezake, 5 minutu inguru).
  - Exekutatu `ssh isard@192.168.100.1` eta `besuNode` karpetaren barruan `docker compose -f docker-compose1.yml up -d`
  - Atera zerbitzariko konexiotik `exit` erabiliz.
  - Exekutatu `ssh isard@192.168.100.2` eta `besuNode` karpetaren barruan `docker compose -f docker-compose2.yml up -d`
  - Atera zerbitzariko konexiotik `exit` erabiliz.
  - Begiratu Ethstats nabigatzailean.
  - Entregatu Ethstats-en kaptura bat nodo guztiak martxan eta blokeak sortzen agertzen direna (bloke-zenbakiak aurreko ataleko kapturakoa baino handiagoa izan behar du, eta 'Last block'-ek 10 segundo baino gutxiago erakutsi behar ditu).

**5.** Hedatu Smart Contract bat. Gure sarea dagoeneko operatiboa dela eta transakzioak egin daitezkeela egiaztatzeko, dagoeneko konpilatuta dagoen kontratu bat hedatu eta deitzen duen script bat exekutatuko dugu:
  - Joan kontratuen karpetara `cd ~/Ikastaroa_Blockchain_Sareak/Garapena/Kontratuak/Formularioak` komandoarekin. Bertan `Formularioak` izeneko kontratu baten *.sol*, *.abi* eta *.bytecode* fitxategiak daude.
  - Exekutatu `python ./hedatu_erabili.py`.
  - Identifikatu mezuetan kontratua hedatu den helbidea eta kopiatu terminaletik (`Ctrl. + Maius. + C`).
  - Ireki nabigatzailearekin karpeta berean dagoen `trazabilitatea.html` fitxategia eta sartu kontratuaren helbidea. Formulario-zenbakia 1 da.
  - Entregatu web-orriaren kaptura bat, non kontratu horretarako formularioko datuak berreskuratu direla ikusten den.

**6.**- Erabili bloke-esploratzaile bat eta identifikatu transakzio baten datuak non dauden. Aurreko ariketako azken transakzioak 1. formularioa eguneratzen du 'Dato final 1' eta 'Dato final 2' informazioarekin. Ikus daiteke transakzio hori zein bloke-zenbakitan gertatu den.
  - Sartu nabigatzailean `esploratzaile.localhost` helbidera eta bilatu transakzio hori gertatu den bloke-zenbakia.
  - Entregatu bloke horren datuekin kaptura bat. 'Dato final 1' eta 'Dato final 2' agertu behar dira.

Hurrengo atalean aztertuko dugu non konfiguratu diren hedatutako blockchain sarearen alderdi desberdinak.

---

# 4. zatia: Blockchain sareen konfigurazioa

## 4.1 Makinetan behar den softwarea

Erabiltzen ari garen Ubuntu Desktop makinak jada honako hau dakar instalatuta:

- Ansible 2.17.14 (hedapena egiteko)
- Java 25 (Besu erremintak erabiltzeko)
- Hyperledger Besu 26.2.0 (softwarea eta tresnak, ez nodo bat)
- Python 3.10.12 (smart-contract baten hedapena egiteko eta klabe batzuk sortzeko)

Ubuntu Server makinek ('Besu node 1-5') ez dute ezer instalatuta.

## 4.2 Besu nodoetako konfigurazio-fitxategien egitura eta edukia

Gure kasuan, Hyperledger Besu sare bat hedatzen ari gara lau nodotan.

Nodo bakoitzerako, fitxategiak hedapen-karpetan (besu) honela egituratzen dira:

![Tree](../baliabideak/tree.jpg)

Aurreko atalean ikusi den bezala, nodo bakoitzean hedapena **docker-composeX.yml** fitxategi bakoitzean definitutako Docker zerbitzu bat abiaraztean datza.

[docker-composeX.yml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/docker-compose1.yml) fitxategian nodoan hedatuko den Docker irudia definitzen da (iruzkinetan konfigurazio-lerro bakoitzak zer egiten duen deskribatzen da) eta haren ezaugarriak. **Begiratu emandako estekari konfiguratutakoa ulertzeko**.

Fitxategi horretatik abiatuta, ikus dezagun zein harreman duen konfigurazioko gainerako funtsezko fitxategiekin:

- **[node-config.toml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/configNodes/node-config.toml)**: nodoaren ezaugarriak definitzen dituen konfigurazio-fitxategia. Parametro bakoitzaren esanahia labur azaltzen da iruzkin batean; **sartu emandako estekan ikusteko**. Nodo bakoitzaren konfigurazioaren muina da, eta bertan erreferentzia egiten zaie honako fitxategi hauei:
  - **[genesis.json](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/genesis.json)**: hasierako blokea eta katearen konfigurazioa definitzen dituen fitxategia.
  - **publicRSAKeyOperator.pem**: JWT sarbide-tokenak egiaztatzeko erabiltzen den gako publikoa.
  - **[static-nodes.json](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/static-nodes.json)**: abiaraztean konektatu behar diren nodo ezagunen zerrenda duen fitxategia. Zerrenda *enode* helbideek osatzen dute (**gako publikoa + IP:portua**).
  - **[nodes_permissions_config.toml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/nodes_permissions_config.toml)**: *node-config.toml*-en nodoen araberako baimenak aktibatu baditugu, fitxategi honek nodo honekin komunikatzeko baimena duten nodoen helbideak adierazten ditu. Zerrenda *enode* helbideek osatzen dute (**gako publikoa + IP:portua**)
  - **[accounts_permissions_config.toml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/accounts_permissions_config.toml)**: *node-config.toml*-en helbideen araberako baimenak aktibatu baditugu, fitxategi honek nodora transakzioak bidaltzeko baimena duten helbideak adierazten ditu (gure kasuan desaktibatuta dago).

- **networkFiles/keys/keyX**: nodo bakoitza modu bakarrean identifikatzen duen gako pribatua.

## 4.3 Fitxategiak sortzea Besu tresnen eta script-en bidez

### Helbide berriak sortzea

Blockchain-eko helbideek banku-kontu baten zenbakiaren antzera funtzionatzen dute, baina Ethereum edo Besu bezalako sareetan. Helbide batek erabiltzaile, kontratu edo entitate bat modu bakarrean identifikatzen du sarearen barruan: gako publiko batetik sortutako karaktere-kate bat da, eta gako pribatu hori ezagutzen duenak bakarrik erabil dezake.

Helbide horiei esker funtsak bidali eta jaso daitezke, baimenak kudeatu edo kontratu adimendunak exekutatu. Funtsezkoak dira segurtasunerako eta sarbide-kontrolerako, gako pribatuaren jabeak bakarrik baimendu baititzake eragiketak helbide horren gainean (adibidez, transakzioak sinatzea).

Besu instalatuta dugunez, nahi adina helbide berri sor ditzakegu genesis blokean hasierako ETH kopuru bat esleitzeko. Komando hauekin egin dezakegu:

`besu --data-path=./address_1 public-key export --to=./address_1/key.pub`

`besu --data-path=./address_1 public-key export-address --to=./address_1/address`

Horrek `address_1` karpetan hiru fitxategi sortuko dizkigu:
- Gako pribatua (`key`).
- Gako publikoa (`key.pub`).
- Helbidea (`address`, gako publikotik eratorria).

> Sortu hiru gako/helbide multzo probetarako; baliagarriak izango zaizkizu azken ariketan. `address_1`, `address_2` eta `address_3` karpetetan egongo dira.

### genesis.json eta nodoen gakoak sortzea

**[genesis.json](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/networkFiles/genesis.json)** fitxategia funtsezko artxibo bat da, hasierako blokea ("genesis blokea") eta sareko nodo guztiek erabiliko duten bloke-katearen konfigurazioa definitzen dituena. Blockchain-aren abiapuntua da: bertan ezartzen dira katearen funtzionamendu-parametroak (adostasun-algoritmoa, blokeen arteko denbora, hasierako saldoa duten kontuak...) eta sareak zein arauren pean jardungo duen definitzen da.

**Zein eremu ditu genesis.json-ek?**

- `config`: Sarearen identitatea eta arauak definitzen ditu. Bertan adierazten dira, adibidez, `chainId`, hardfork-en aktibazioa (`londonBlock`) eta `qbft` adostasunaren konfigurazioa (`blockperiodseconds`, `epochlength`, `requesttimeoutseconds`).
- `nonce`: Ethereum-eko genesis formatutik heredatutako balioa. QBFT duten Besu sareetan `0x0` balioan uzten da normalean eta ez da meatzaritzarako erabiltzen.
- `timestamp`: Genesis blokearen denbora-zigilua. Hasierako blokeari bakarrik eragiten dio eta nodo guztietan bat etorri behar du.
- `gasLimit`: Sarearen hasieratik blokeko gas-muga maximoa. Baldintzatzen du zenbat transakzio edo lan sar daitekeen bloke bakoitzean.
- `difficulty`: Lan-frogan oinarritutako sareetatik heredatutako eremua. QBFTn ez da meatzaritza-lehiarako erabiltzen; beraz, normalean `0x1` bezalako balio finko batekin uzten da.
- `mixHash`: Ethereum-etik heredatutako eremua; QBFTn balio konstante bat hartzen du erabilitako adostasun mota identifikatzeko.
- `coinbase`: Blokearen onuradunari lotutako helbidea. Testuinguru honetan normalean `0x0000000000000000000000000000000000000000` jartzen da.
- `alloc`: Kontuen hasierako egoera. Lehen bloketik saldoak esleitzeko aukera ematen du, eta laborategirako sortutako fitxategietan `privateKey` edo `comment` bezalako eremu lagungarriak ere sar ditzake, nahiz eta sareak saldoa eta helbidea bakarrik erabiltzen dituen.
- `extraData`: Funtsezko eremua QBFT sareetan. Genesis blokearen datu gehigarriak eta, bereziki, sareko hasierako balidatzaileak ezartzeko behar den informazioa barne hartzen ditu.
  
Fitxategi honek berdina izan behar du nodo guztietan, sare berekoak izan daitezen.

[Hemen](https://besu.hyperledger.org/private-networks/how-to/configure/consensus/qbft) informazio gehiago eremu horiek zer esan nahi duten eta nola konfiguratzen diren jakiteko.

**Nola sortzen da?**

Automatikoki sortzen da **[qbftConfigFile.json](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/qbftConfigFile.json)** bezalako konfigurazio-fitxategi batetik, non adostasun mota (adibidez, QBFT), nodo balidatzaileen kopurua eta beste hasierako ezarpen batzuk definitzen diren. Besuren komandoak:

`besu operator generate-blockchain-config --config-file=qbftConfigFile.json --to=networkFilesNEW --private-key-file-name=key`

konfigurazio-fitxategi hori hartzen du eta irteerako karpetan (*networkFilesNEW* kasu honetan, dagoeneko badagoen *networkFiles* gainidatzi ez dezan) **genesis.json** sortzen du, nodoen gako eta helbideekin batera. Sarearen parte izango diren nodoen gakoak (*key* fitxategia) bakoitza karpeta desberdin batean daude, eta karpeta horren izena gako horri lotutako helbidea da.

> Joan `qbftConfigFile.json` dagoen karpetara (`Ikastaroa_Blockchain_Sareak/Hedapena`) eta exekutatu komandoa, aipatutako fitxategiak `networkFilesNEW` karpetan nola sortzen diren ikusteko. Gakoetako bat ondo etorriko zaizu amaieran proposatzen den ariketarako.

Nodo bakoitza abiarazteko, egia esan, *key* fitxategi hori bakarrik behar dugu; erabiltzen ari garen konfigurazioarekin nahikoa da *networkFiles/keys* karpetara *keyX* izenarekin kopiatzea (X nodoaren indizea izanik), nodo bakoitzaren *docker-composeX.yml*-tik erreferentzia dadin.

Nodo bakoitzerako sortzen den beste gakoa, *key.pub*, nodoa identifikatzeko erabiliko den gakoa da, IParekin batera, lehen aipatutako *enode* helbideetan.

### RSA gakoak eta JWT tokenen sorrera

Sarearen segurtasunean eta autentifikazioan bi RSA gakoek eta JWT tokenak berak parte hartzen dute. Hedatu dugun konfigurazioan, nodoaren APIen zati bat, zehazki administrazio-zereginetarako direnak, autentifikazio bidez bakarrik eskuratzeko prestatuta daude. Horregatik, nodo bakoitzak bere gako propioak eta hari lotutako JWT tokenak izan beharko lituzke modu seguruan jarduteko:

- **privateRSAKeyOperator**: JWT tokena **sinatzeko** erabiltzen den **RSA gako pribatua** da. Babestuta mantendu behar da eta inoiz ez da partekatu behar.
- **publicRSAKeyOperator**: Aurrekoari lotutako **RSA gako publikoa** da. Nodoari banatzen zaio, tokena gako pribatu egokiarekin sinatu dela egiaztatu ahal izan dezan.
- **JWT tokenak (JSON Web Tokens)**: Autentifikazioari buruzko informazioa duten tokenak dira, hala nola APIetarako sarbide-baimenak eta iraungitze-data. Tokena datu horiekin sortzen da eta ondoren **gako pribatuarekin sinatzen** da. Nahi adina JWT token sor daitezke ezaugarri ezberdinekin, adibidez erabiltzailearen arabera sarbide-maila desberdinekin.

**JWT sortzeko eta erabiltzeko prozesua:**  
1. RSA gako pare bat sortzen da: **gako pribatu** bat eta **gako publiko** bat.  
2. **Gako pribatua** JWT tokena jaulkiko duen sisteman gordetzen da.  
3. **Gako publikoa** nodora kopiatzen da, tokenaren sinadura balioztatu ahal izan dezan.
4. JWT tokena behar diren datuekin sortzen da, adibidez baimenak eta iraungitze-data.
5. JWT hori **gako pribatuarekin sinatzen** da.  
6. Erabiltzaileak edo aplikazioak tokena bidaltzen du nodoko API babestura konektatzean.
7. Nodoak sinadura **gako publikoarekin** egiaztatzen du. Sinadura baliozkoa bada eta tokena iraungi ez bada, eragiketa onartzen du.

`Garapena/Erremintak/JWT/sortu_JWT.py` script-ak prozesu hori automatizatzen du `X` nodo baterako. Exekutatzean, zenbaki hori argumentu gisa emanez, `X` karpeta bat sortzen du uneko direktorioan eta honako hauek sortzen ditu barruan:

- `privateRSAKeyOperatorX.pem`
- `publicRSAKeyOperatorX.pem`
- `JWT_X`

Lehenespenez API guztietara denbora-mugarik gabe sarbidea ematen duen token bat sortzen du, baina konfiguratu daiteke script-a aldatuz, baimen mugatuagoak dituen token bat sortu nahi bagenu.

> Probatzeko, aldatu karpetaz `cd ~/Ikastaroa_Blockchain_Sareak/Garapena/Erremintak/JWT` komandoarekin eta exekutatu `python ./sortu_JWT.py 5`, 5. nodorako gako berriak `5` karpetaren barruan sortzeko. Aurrerago proposatutako ariketan ondo etorriko zaizu.

## 4.4 Nodoen arteko komunikazioa

Hyperledger Besu bezalako blockchain sare bateko nodoen arteko komunikazioa funtsezkoa da sarearen funtzionamendurako eta segurtasunerako. Hona hemen alderdi honi buruzko puntu garrantzitsu batzuk:

### P2P sarea (Peer-to-Peer)

Sareko nodo guztiak elkarri lotzen zaizkio P2P protokolo baten bidez; Besuren kasuan, devp2p protokoloa erabiltzen da (Ethereum-ekin bateragarria). Horrek blokeen, transakzioen eta adostasun-mezuen trukea ahalbidetzen du eragile desberdinen artean, informazioa azkar hedatzea erraztuz.

### Nodoen aurkikuntza

Besun hainbat modu daude nodo batek sareko beste nodo batzuk aurki ditzan:

- **`static-nodes.json`:** Zehazki adierazteko balio du zein nodoetara konektatu nahi dugun. Aukerarik zuzenena eta aurreikusgarriena da sare pribatuetan, balidatzaileen edo nodo ezagunen zerrenda eskuz finkatzeko aukera ematen duelako.

- **`bootnodes`:** Hasierako sarrerako nodoak dira. Ez dute zertan sareko nodo guztiak ordezkatu; abiapuntu batzuk besterik ez dira, eta horietatik hasita nodo batek beste *peer* batzuk aurkitzen has daiteke.

> **Desberdintasun nagusia:** `static-nodes.json`-ek hasieratik ezagunak eta egonkorrak diren konexioak definitzen ditu; `bootnodes`-ek, berriz, aurkikuntza-prozesua abiarazten laguntzen dute soilik.

> **`discovery-enabled` aukeraren eragina:** Aktibatuta dagoenean (*node-config.toml*-en), nodoak beste nodo ezagun batzuetatik abiatuta *peer* berriak automatikoki aurki ditzake. Desaktibatuta dagoenean, nodoak ez du aurkikuntza dinamiko hori egiten eta askoz gehiago oinarritzen da `static-nodes.json` bezalako zerrenda esplizituetan.

- Enode: 
  Ethereum/Besu nodo bat modu bakarrean identifikatzen duen URL bat da, eta honako hauek barne hartzen ditu:
  - Nodoaren gako publikoa.
  - Nodoa dagoen IPa edo domeinua.
  - Konexioak entzuteko erabiltzen dituen TCP eta UDP portuak.

  Enode formatua:
  `enode://<gakoPubliko_hex>@<ip>:<tcpport>?discport=<udpport>`

- **Erabilitako portuak:**
  - Lehenespenez, nodoek 30303 portuan entzuten dute (TCP eta UDP) P2P konexioetarako.
  - API zerbitzuak (RPC HTTP eta WebSocket) normalean 8545 (HTTP) eta 8546 (WS) portuetan argitaratzen dira, nahiz eta konfigura daitezkeen.

- **Firewall-a eta konektibitatea:**
  - Garrantzitsua da sareko nodoen artean P2P portuak irekita egotea, komunikazio zuzena ahalbidetzeko.
  - Cloud edo laborategi-inguruneetan, firewall arauak egokitu behar dira portu horiek ez blokeatzeko.

- **Nodoen detekzioa eta ebazpena:**
  - Sare baimenduetan, topologia estatikoa (*static-nodes.json* bidezko konexioa) ohikoa da, parte har dezakeena nor den bermatzeko eta esposizioa minimizatzeko.
  - Sare publiko edo irekietan, aurkikuntza erabil daiteke (`discovery-enabled` aukera).

- **Egiaztapen erabilgarriak:**
  - Besuren log-ek nodo bat zein enodetara konektatuta dagoen adierazten dute.
  - RPC/API kontsolako komandoek konektatutako peer-ak kontsultatzeko aukera ematen dute, `admin_peers` bezalako metodoekin.

Laburbilduz, nodoen arteko komunikazioaren konfigurazio zuzena ezinbestekoa da adostasunak funtziona dezan, informazioa azkar zirkula dadin eta sarea erresilientea izan dadin erorketen edo deskonexio partzialen aurrean.

### Kanpoko APIak

Hyperledger Besuren APIak erlazionatutako funtzionalitateak taldekatzen dituzten multzoetan antolatuta daude. Talde bakoitzak metodo multzo jakin batzuetara sartzeko aukera ematen du, eragiketa-esparruaren arabera. `node-config.toml` konfigurazio-fitxategian, ohiko taldeak honako hauek dira:

- **DEBUG:** Nodoaren barne-egoera diagnostikatzeko informazio xehea lortzeko eta arazketa-mezuak erregistratzeko aukera ematen du.
- **ETH:** Ethereum-en metodo estandarrak biltzen ditu, hala nola blokeak, transakzioak, saldoak kontsultatzea eta transakzioak bidaltzea.
- **TXPOOL:** "Transaction pool"-aren egoerara sartzeko aukera ematen du, hau da, oraindik katean sartu ez diren transakzio zainetara.
- **NET:** Sarearen egoerari, katearen IDari, sare-konexioei eta sinkronizazio-egoerari buruzko informazioa ematen du.
- **TRACE:** Transakzioen exekuzioaren trazak exekutatu eta eskuratzeko aukera ematen du, kontratu adimendunen analisirako erabilgarria.
- **WEB3:** Web3 APIrako oinarrizko eta bateragarritasun-utilitateak eskaintzen ditu.
- **PLUGINS:** Besuren plugin bidezko hedapenarekin lotuta dago, eta instalatutako pluginek emandako API gehigarriak azaltzeko aukera ematen du.
- **ADMIN:** Pribilegio handiko administrazio-metodoetarako sarbidea ematen du, hala nola peer eta nodoen kudeaketarako (WebSocket bidez bakarrik erabilgarri).
- **MINER:** Meatzaritzarekin lotutako metodoak (PoW blokeak; QBFTn normalean ez da erabiltzen).
- **QBFT:** QBFT adostasuna administratu eta kontsultatzeko metodo espezifikoak, hala nola balidatzaile-proposamenak eta adostasunaren egoera.
- **PERM:** Nodoen eta kontuen baimenen kudeaketarekin lotuta dago.

Horrela, API taldeak gaitu edo murriztu daitezke hedapenaren beharren arabera, malgutasuna zein segurtasuna handituz.

Eskuragarri dauden metodoen erreferentzia osoa [orri ofizialean](https://besu.hyperledger.org/public-networks/reference/api) dago.

**Nola deitu APIko metodoei**

Gure hedapenean, API talde batzuk HTTP bidez eskuragarri daude 8545 portuan, baimenik behar izan gabe; bestalde, API talde guztiak WebSocket bidez eskuragarri daude 8546 portuan, baimenarekin (JWT tokena). Hori guztia nodo bakoitzeko [node-config.toml](https://github.com/aiza-fp/Ikastaroa_Blockchain_Sareak/blob/main/Hedapena/configNodes/node-config.toml) fitxategian konfiguratuta dago.

Ikus dezagun adibide bana:

  - HTTP 8545 portua baimenik gabe: exekutatu, adibidez:

  `curl -X POST --data '{"jsonrpc":"2.0","method":"net_peerCount","params":[],"id":53}' http://192.168.100.1:8545/ -H "Content-Type: application/json"`

  Horrek *net_peerCount* metodoa deitzen du [NET taldeko](https://besu.hyperledger.org/public-networks/reference/api#net-methods) 192.168.100.1 IPa eta 8545 portua duen nodoan, autentifikaziorik gabe eskuragarri dagoena. Ikusiko dugun erantzuna hau da:

  `{"jsonrpc":"2.0","id":53,"result":"0x3"}`

  3 bat, hau da, nodoak 3 peer dituela.

  - WebSocket 8546 portua baimenarekin: pixka bat konplexuagoa da; dagoeneko instalatuta dagoen programa bat (*websocat*) erabili behar dugu komunikazioa hasteko, eskaerari JWT_1 tokena gehituz, eta ondoren metodoak deitu. Jarraitu urrats hauei probatzeko:

    `cd ~`

    `./websocat -H="Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJwZXJtaXNzaW9ucyI6WyIqOioiXSwicHJpdmFjeVB1YmxpY0tleSI6IjdxSHJ0RG85TVc0UHRPSXgrTkJDWWNqTTNqN0UzaU0rYUExL20rNmpzbnM9IiwiZXhwIjoxNjAwODk5OTk5MDAyfQ.drZxJPRxE3AQ5z5ws8gJ2E_q0zUqZM82QdXp1DREuXcdyskL0eqTCs0OVwvarlWpxFXJzXShEYzinNeLZrfPZHGReDYoQMoSuTNaI34REsVQ8zUqvUt2J9UNklKnGzOXZlZ6Z0nTVD69DviIb-GrLwJ4eiqLi9-AeqSI90DlQmubIuhLJZHPH0Y7NOWvLOJ-jcUddFGmzl9wonAnsmwBM3YDbpA3bWFtp5Cb8ZQox073-7kWmNjImnUljr8Uut_j1xdc5fIJxIBez7Q1v4rkia0SXSd6fC5OL7A9OgEiYmt7Xus8at__3luhVJfNIU8DaHFnXWtfosZgLtAa4Vykbw" ws://192.168.100.2:8546`

    Horrela websocket konexio bat abiarazten dugu 2. nodora, eta komandoen zain geratzen da. Kontuan izan formatua hau dela: `./websocat -H="Authorization: TOKEN_JWT" ws://192.168.100.2:8546`. Kasu honetan JWT_2 tokena erabili da (nahiz eta hedatu dugun sarean denak berdinak diren, sinpletasunagatik).

    Komando berrien zain geratzen denean, idatz dezakegu adibidez:

    `{"jsonrpc":"2.0","method":"qbft_getValidatorsByBlockNumber","params":["latest"], "id":1}`

    Horrek *qbft_getValidatorsByBlockNumber* metodoa deitzen du [QBFT taldean](https://besu.hyperledger.org/private-networks/reference/api#qbft-methods). Honelako erantzun bat lortuko dugu:

    `{"jsonrpc":"2.0","id":1,"result":["0x867e3dcc2e546ab8d62ab8b25e6800c328ca2dd8","0x89b84b7fa93e429f2ce4632505074eed74e89351","0x92c83b4052230b836e100c42701cdc83d7baeb8a","0xc6261c951d52b563d6a91afb774db1c2516caac4"]}`

    Horiek gure sarea osatzen duten lau nodoen helbideak (*address*) dira. Erantzun horrek esan nahi du lau nodo horiek sortutako azken blokearen balidatzaile gisa jardun dutela (deian "latest" adierazten da).

Horrela, APIko edozein metodo dei dezakezu informazioa eskuratzeko edo administrazio-eragiketak exekutatzeko.

> Egiaztatu emandako adibideek funtzionatzen dutela; azken ariketan metodo horiek erabili beharko dituzu.

## 4.5 Segurtasuna Blockchain sareetan

Errepasa ditzagun blockchain sarean ezar daitezkeen segurtasun-ezaugarri eta neurri nagusiak. Batzuk dagoeneko ezarri ditugu gure sarean, eta beste batzuk ekoizpen-ingurunean hedatzeko iradokizun gisa geratzen dira.

### Autentifikazioa eta baimena

- Nodoetarako sarbide-kontrola (*nodes_permissions_config.toml* bidez): nodo bakoitzera zein nodo konekta daitezkeen murriztea.
- Baimendutako kontuen kontrola (*accounts_permissions_config.toml* bidez): sarean transakzioak egitean zein kontuk jardun dezaketen murriztea.
- Nodo balidatzaileen kudeaketa (on-chain proposamenak eta bozketak): zein nodo izango diren balidatzaile erabakitzea, eta gehiengo bidez gehitu edo kentzea.
- Sarearen administrazio APIetara JWT (JSON Web Tokens) bidez sartzea.
- Gutxieneko pribilegioaren printzipioa aplikatzea: erabiltzaile edo zerbitzu guztiek ez lukete baimen guztiak izan behar (`["*:*"]`) behar ez badituzte.
- JWT tokenentzako iraungitze arrazoizko bat konfiguratzea eta behar denean birsortzea, mugagabe berrerabili beharrean.
- Administrazio APIetarako sarbidea zorrotz beharrezkoak diren kanaletara mugatzea, beharrezkoa ez den erasorako azalera ez erakusteko.

### Nodoaren konfigurazio segurua

- HTTP eta WebSocket bidez zein JSON-RPC API azaltzen diren berrikustea, beharrezkoak direnak bakarrik gaituz.
- Administrazio-interfazeak `0.0.0.0`-n argitaratzea saihestea beharrezkoa ez bada edo, egiten bada, firewall, VPN edo SSH tunelen bidez babestea.
- Ahal den neurrian P2P, RPC eta metrika zerbitzuak bereiztea, bezeroek zein portutara sar daitezkeen hobeto kontrolatzeko.
- `static-nodes.json`, `bootnodes` eta baimenen zerrendak aldizka berrikustea, jada egon behar ez duten nodo edo sarbideak kentzeko.

### Konektibitatea

- Firewall-en erabilera eta irisgarri dauden portuen murrizketa.
- P2P, RPC eta monitorizaziorako zorrotz beharrezkoak diren portuak bakarrik irekitzea.
- Sare-segmentazioa edo sare pribatu/VPNak erabiltzea, nodoak Internetera alferrik ez gera daitezen agerian.
- IP edo sare-tarte bidezko murrizketa, konektatu behar duten ekipoak aurrez ezagutzen direnean.

### Monitorizazioa eta gorabeheren aurreko erantzuna

- Log-ak, peer kopurua, sinkronizazioa eta baliabideen erabilera gainbegiratzea portaera anomaloak detektatzeko.
- APIetarako huts egindako sarbide-saiakerak, ustekabeko deskonexioak eta balidatzaile multzoan aurreikusi gabeko aldaketak berrikustea.
- Erantzun-prozedurak definitzea: JWTak baliogabetzea, gakoak biratzea, portuak ixtea edo konprometitutako nodoak isolatzea.

### Mantentze-lanak eta eragiketa segurua

- Gako pribatuak ez dira inoiz agerian utzi behar; helbideak gako publikotik eratorriak dira.
- Kontuen, nodoen eta JWTen gako pribatuak sarbide-baimen minimoekin gorde behar dira, eta inoiz ez biltegi publikoetan.
- Administrazio-sarbideko gakoak biratzea komeni da konpromiso-susmorik badago edo arduradunak aldatzen direnean.
- Besu, sistema eragilea eta tresna lagungarriak eguneratuta mantentzea, ezagutzen diren ahultasunak zuzentzeko.
- Konfigurazio-fitxategi kritikoen eta gorde behar diren gakoen babeskopiak egitea, behar bezala babestuta.
- Nodo bakoitzerako administrazio-sarbidea nork duen dokumentatzea eta pribilegio handiko kredentzialen kopurua minimora murriztea.

## 4.6 Monitorizazioa eta mantentze-lanak

### Adierazle nagusiak

- Nodo bakoitzaren sinkronizazio-egoera (`eth_syncing`).
- Nodo bakoitzean konektatutako peer kopurua (`net_peerCount`).
- Azken bloketik igarotako denbora (`eth_getBlockByNumber(["latest", false])`), `timestamp` eremua behatuz eta uneko orduarekin alderatuz.
- Sistemaren baliabideen erabilera (CPU, diskoa, memoria).
- Adostasunaren egoera eta bloke-ekoizpena, sarea normaltasunez aurrera doan detektatzeko.
- Log-etan behin eta berriz agertzen diren erroreak, deskonexio maizak edo peer kopuruaren jaitsierak.

### Tresnak

- Besuren log-ak (`docker logs` erabiliz).
- Ethstats (web aplikazioa erabiliz).
- Prometheus + Grafana metriketarako (gure hedapenean ez dago inplementatuta).
- Alertak: komeni da honelako egoeretarako alertak definitzea: "peer kopurua atalase baten azpitik", "blokeen ekoizpena geldirik", "sinkronizazio falta" edo "CPU, memoria edo disko erabilera handia" (gure hedapenean ez dago inplementatuta).

### Jardunbide egokiak

- Log-ak aldizka berrikustea berrabiarazteen, konfigurazio-aldaketen edo hedapenen ondoren.
- Diskoko espazioa eta datuen zein log-en hazkundea zaintzea, ustekabeko geldialdiak saihesteko.
- Aldaketa bakoitzaren ondoren egiaztatzea nodoak sinkronizatuta jarraitzen duela, peer-ak mantentzen dituela eta RPC bidez ondo erantzuten duela.

**Ariketa: 1.- bosgarren nodo bat gehitu sarera eta  2.- Balidatzaile bihurtu gainerako nodoen bozken bidez.**

Bosgarren nodo bat gehitzeko honako hau egin beharko duzu:

- Nodoaren gakoak eta helbidea sortu (*besu* komandoa). Kopiatu gako hori **key5** gisa `networkFiles/keys` karpetara.
- Sortu `JWT_5` fitxategia `networkFiles/JWTkeys` karpetan (daudenen kopia bat bakarrik sortu; hedapen honetan guztiak berdinak izango dira sinpletasunagatik). Ez da beharrezkoa egitea.
- Gehitu *enode*-a *static-nodes.json* eta *nodes_permissions_config.toml* fitxategietan.
- Aldatu *inventory.yml* fitxategia nodo berria gehitzeko. Printzipioz ez dugu Ansible Playbook-a ukitu behar, prozedura bera baita.
- Sortu 5. nodora egokitutako `docker-compose5.yml` berria.
- Exekutatu Ansible Playbook-a.
- Egiaztatu Ethstats-en nodo berria sarearen parte dela.
- **Entregatu:** Ethstats-en kaptura bat, 5 nodoak martxan eta blokeak sortzen ikusten diren tokian (azken blokea sortu zenetik igarotako denborak 10s baino txikiagoa izan behar du).

Bosgarren nodoa balidatzaile bihurtzea:

- Egiaztatu (aurrez ikusitako WebSocket komandoa `qbft_getValidatorsByBlockNumber` erabiliz) 5 nodo izan arren blokeak 4 nodo desberdinek bakarrik balidatzen dituztela, jatorrizko 4ek.
- Bilatu [dokumentazioan](https://besu.hyperledger.org/private-networks/reference/api#qbft-methods) zein komando exekutatu behar den jada balidatzaile diren nodoetan nodo berria balidatzaile gisa proposatzeko.
- Exekutatu gutxienex 3 nodotan (gehiengoa) bosgarren nodoa balidatzaile gisa gehitzeko behar den komandoa. Orain 5 balidatzaile agertu behar dira bloke berrietan.
- **Entregatu:** kaptura bat non nodo berria sortutako azken blokeko balidatzaileen artean dagoela ikusten den (komandoa gehi erantzuna). Guztira 5 balidatzaile agertu behar dira orain.

---

# 5. zatia: Blockchain sare baten konfigurazioa eta hedapena

Atal hau azken ariketa bat da, eta orain arte ikusitako guztia kontuan hartuta hedapen berri bat egitean datza. Egin beharreko hedapenaren ezaugarriak hauek dira:
- 2 nodo (IP helbideak 192.168.100.1-2 dira).
- Blokeen arteko denbora 20 segundokoa izango da.
- Nodo bakoitzaren gako propioak berriak eta elkarren artean desberdinak izango dira.
- JWT tokenak desberdinak izango dira nodo bakoitzean, eta gako pribatu desberdinetatik sortuak.
- Bi nodoek bakarrik parte hartu ahal izango dute sarean.
- Estatistikak Ethstats-era nodo izen hauekin bidaltzen dituzte: *2nodeNetwork_1* eta *2nodeNetwork_2*


Kontuan izan konfigurazio-fitxategi ia guztiak ukituko direla eta berriz sortu egin beharko direla.

Hedapenerako, gomendatzen da Ansible bidezko hedapen-fitxategietan (*hedapena-AnsiblePlaybook.yml* eta *inventory.yml*) aldaketa txikiak egitea, ariketara egokitzeko.

**1 eta 2 makinak 'birsortu'** hasierako egoerara itzul daitezen eta hedapen garbi bat egiteko (hedatuta edo aldatuta dagoena ezabatuko da):

![Recreate](../baliabideak/recreate.jpg)

**'Besu node 3-5' makinak itzali**, ez direlako behar eta piztuta badaude beraien egoeran datuak egon daitezke bidaltzen Ethstats-era.

Oharra: behin hedapena eginda, errorerik ez badago, sareak 10-15 minutu hartu ditzake blokeak sortzen hasi arte baina Ethstats-en bi nodoak hasieratik ikusi beharko lirateke.

**Entregatu: Ethstats-en kaptura(k) pdf fitxategi batean, bi nodoak aktibo eta blokeak sortzen ikusten direnak, eta 'Active Nodes' atalean (goian eskuinean) 2/2 agertzen dena**

---

# Eranskina: Glosario teknikoa

| Terminoa | Definizioa |
|---------|------------|
| **Trie** | Aurrizkien bidez datuak gorde eta berreskuratzeko aukera ematen duen zuhaitz motako datu-egitura. Egoerarako eta transakzioetarako erabiltzen da. |
| **Hash** | Luzera finkoko aztarna kriptografikoa, datu multzo bat modu bakarrean identifikatzen duena. Datuetan egindako edozein aldaketak hash-a aldatzen du. |
| **Finalitatea** | Bloke bat ez dela atzera botako bermatzen duen propietatea. QBFTn berehalakoa da; PoWn probabilistikoa da (berrespenekin handitzen da). |
| **Gas** | Lan konputazionala neurtzen duen kostu-unitatea. EVMko eragiketa bakoitzak gas-a kontsumitzen du. |
| **Enode** | P2P sareko nodo bat identifikatzen duen URIa (gako publikoa + IPa + portua). |
| **Genesis** | Hasierako blokea (0 blokea), sarearen parametroak definitzen dituena. Nodo guztietan berdina izan behar du. |
| **Ledger** | Bloke-kateak eta hortik eratorritako egoera globalak osatutako multzoa. |
| **Hard fork** | Protokoloaren aldaketa garrantzitsu eta atzerabateragaitza, nodoak eguneratzera behartzen dituena. Ethereum-en, hard fork-ak funtzionalitate berriak gehitzeko edo errore kritikoak zuzentzeko erabiltzen dira. |
| **Byzantine Fault Tolerance (BFT)** | Sare banatu batek bere nodo batzuek modu gaiztoan jardun edo modu arbitrarioan huts egin arren zuzen funtzionatzen jarraitzeko duen gaitasuna. Blockchain-ean funtsezkoa da adostasuna nodoen akats edo erasoen aurrean segurua izan dadin. |
| **RPC** | Remote Procedure Call. Programa batek sareko beste makina batean funtzioak edo prozedurak lokalak balira bezala exekutatzeko aukera ematen duen protokoloa, sistema banatuetan bezeroaren eta zerbitzariaren arteko komunikazioa erraztuz. |
| **JSON** | JavaScript Object Notation. Datu-trukerako formatu arin bat, gizakiek irakurtzeko modukoa eta makinek erraz analizatzekoa. Bezeroaren eta zerbitzariaren artean datu egituratuak bidaltzeko erabili ohi da. |
| **Websocket** | TCP konexio bakar baten bidez bezeroaren eta zerbitzariaren arteko komunikazio bidirekzional eta iraunkorra ahalbidetzen duen protokoloa. Oso erabilia da denbora errealeko eguneraketa behar duten aplikazioetan, hala nola blockchain dashboard-etan (Ethstats, esploratzaileak). |
| **API** | Application Programming Interface. Aplikazio batek beste batekin komunikatu eta elkarreragiteko aukera ematen duen definizio eta protokolo multzoa, haren inplementazioa ezagutu gabe funtzionalitate edo datu zehatzetara sartzea erraztuz. |

---