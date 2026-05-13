/* eslint-disable */
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDKey } from "@scure/bip32";
import { base58 } from "@scure/base";
const ALCHEMY_KEY = "YokW0M0bp-LeCF7hniz9";
const ALCHEMY_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;
// Adresses du propriétaire de la plateforme (frais de 1%)
const OWNER_ETH = "0xf00321696aDF29f5f6C9230CAbB16498395Fc47b";
const OWNER_BTC = "125q6effx3BZDyBsnmEtUownEkDDhqhT2R";
const OWNER_SOL = "yKYJzJnFp67yqJhyRsdD9jo52D3F7Jj1VYNri9G1VEPJ";
const FRAIS_PLATEFORME = 0.01; // 1%
function chiffrer(texte, mdp) {
const bytes = new TextEncoder().encode(texte);
const key = new TextEncoder().encode(mdp.padEnd(32, "0").slice(0, 32));
return btoa(String.fromCharCode(...bytes.map((b, i) => b ^ key[i % key.length])));
}
function dechiffrer(chiffre, mdp) {
const bytes = Uint8Array.from(atob(chiffre), c => c.charCodeAt(0));
const key = new TextEncoder().encode(mdp.padEnd(32, "0").slice(0, 32));
return new TextDecoder().decode(bytes.map((b, i) => b ^ key[i % key.length]));
}
function walletDepuisMnemonic(mnemonic) {
const seed = mnemonicToSeedSync(mnemonic);
const root = HDKey.fromMasterSeed(seed);
const ethNode = root.derive("m/44'/60'/0'/0/0");
const ethWallet = new ethers.Wallet(ethers.hexlify(ethNode.privateKey));
const btcNode = root.derive("m/44'/0'/0'/0/0");
const adresseBtc = "1" + base58.encode(btcNode.publicKey).slice(0, 33);
const solNode = root.derive("m/44'/501'/0'/0'");
const adresseSol = base58.encode(solNode.publicKey);
return {
mnemonic,
eth: ethWallet.address,
ethPrivateKey: ethers.hexlify(ethNode.privateKey),

btc: adresseBtc,
sol: adresseSol
};
}
function QRCode({ value, size = 150 }) {
const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=1A1A1A&color=ffffff`;
return <img src={url} alt="QR Code" style={{ borderRadius: "10px", width: size, height: size }} />;
}
function CopierBouton({ texte }) {
const [copie, setCopie] = useState(false);
function copier() {
navigator.clipboard.writeText(texte);
setCopie(true);
setTimeout(() => setCopie(false), 2000);
}
return (
<button onClick={copier} style={{ background: copie ? "#1a472a" : "#1A1A1A", border: "1px solid #333", borderRadius: "8px", color: copie ? "#4ade80" : "#888", padding: "6px 12px", fontSize: "12px", cursor: "pointer", transition: "all 0.2s" }}>
{copie ? " Copié !" : " Copier"}
</button>
);
}
function App() {
const [page, setPage] = useState("chargement");
const [wallet, setWallet] = useState(null);
const [soldes, setSoldes] = useState({ btc: 0, eth: 0, sol: 0 });
const [prix, setPrix] = useState({ btc: 0, eth: 0, sol: 0 });
const [loading, setLoading] = useState(false);
const [motDePasse, setMotDePasse] = useState("");
const [motDePasseConfirm, setMotDePasseConfirm] = useState("");
const [erreur, setErreur] = useState("");
const [mots, setMots] = useState(Array(12).fill(""));
const [cryptoSelectionnee, setCryptoSelectionnee] = useState(null);
const [phraseVisible, setPhraseVisible] = useState(false);
// States pour Envoyer
const [montant, setMontant] = useState("");
const [adresseDestinataire, setAdresseDestinataire] = useState("");
const [etapeEnvoi, setEtapeEnvoi] = useState("form");
const [loadingEnvoi, setLoadingEnvoi] = useState(false);
useEffect(() => {
fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd")
.then(r => r.json())
.then(data => setPrix({ btc: data.bitcoin.usd, eth: data.ethereum.usd, sol: data.solana.usd }))

.catch(() => {});
const w = localStorage.getItem("wallet_chiffre");
setPage(w ? "deverrouiller" : "accueil");
}, []);
async function chargerSoldes(w) {
setLoading(true);
try {
const resEth = await fetch(ALCHEMY_URL, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [w.eth, "latest"] })
});
const dataEth = await resEth.json();
const ethBalance = parseInt(dataEth.result, 16) / 1e18;
const resBtc = await fetch(`https://blockstream.info/api/address/${w.btc}`);
const dataBtc = await resBtc.json();
const btcBalance = (dataBtc.chain_stats.funded_txo_sum - dataBtc.chain_stats.spent_txo_sum) / 1e8;
const resSol = await fetch("https://api.mainnet-beta.solana.com", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [w.sol] })
});
const dataSol = await resSol.json();
const solBalance = dataSol.result.value / 1e9;
setSoldes({ btc: btcBalance, eth: ethBalance, sol: solBalance });
} catch (e) {
console.error(e);
}
setLoading(false);
}
function sauvegarderEtOuvrir(w, mdp) {
localStorage.setItem("wallet_chiffre", chiffrer(JSON.stringify(w), mdp));
setWallet(w);
setPage("wallet");
chargerSoldes(w);
}
function creerWallet() {
if (motDePasse.length < 6) { setErreur("Minimum 6 caractères"); return; }
if (motDePasse !== motDePasseConfirm) { setErreur("Mots de passe différents"); return; }
sauvegarderEtOuvrir(walletDepuisMnemonic(generateMnemonic(wordlist)), motDePasse);

}
function importerWallet() {
if (motDePasse.length < 6) { setErreur("Minimum 6 caractères"); return; }
if (motDePasse !== motDePasseConfirm) { setErreur("Mots de passe différents"); return; }
const phrase = mots.join(" ").trim().toLowerCase();
if (!validateMnemonic(phrase, wordlist)) { setErreur("Phrase invalide"); return; }
sauvegarderEtOuvrir(walletDepuisMnemonic(phrase), motDePasse);
}
function deverrouiller() {
try {
const chiffre = localStorage.getItem("wallet_chiffre");
const w = JSON.parse(dechiffrer(chiffre, motDePasse));
if (!w.eth) throw new Error();
setWallet(w);
setPage("wallet");
chargerSoldes(w);
setErreur("");
} catch {
setErreur("Mot de passe incorrect !");
}
}
function supprimerWallet() {
if (window.confirm(" Supprimer ce wallet ? Assure-toi d'avoir sauvegardé tes 12 mots avant !")) {
localStorage.removeItem("wallet_chiffre");
setWallet(null);
setMotDePasse("");
setMotDePasseConfirm("");
setPhraseVisible(false);
setPage("accueil");
}
}
const soldeTotal = (soldes.btc * prix.btc + soldes.eth * prix.eth + soldes.sol * prix.sol).toFixed(2);
const inputStyle = { backgroundColor: "#1A1A1A", border: "1px solid #333", borderRadius: "12px", padding: "15px", fontSize: "16px", color: "white", width: "100%", boxSizing: "border-box", marginBottom: "10px" };
const btnPrimary = { backgroundColor: "#5546FF", color: "white", padding: "16px", fontSize: "16px", border: "none", borderRadius: "12px", cursor: "pointer", width: "100%", marginBottom: "10px" };
const btnSecondary = { backgroundColor: "#1A1A1A", color: "white", padding: "16px", fontSize: "16px", border: "1px solid #333", borderRadius: "12px", cursor: "pointer", width: "100%" };
const cryptos = [
{ nom: "Bitcoin", symbole: "BTC", couleur: "#F7931A", emoji: "₿", adresse: wallet?.btc, solde: soldes.btc, prixUnit: prix.btc },
{ nom: "Ethereum", symbole: "ETH", couleur: "#627EEA", emoji: "Ξ", adresse: wallet?.eth, solde: soldes.eth, prixUnit: prix.eth },
{ nom: "Solana", symbole: "SOL", couleur: "#9945FF", emoji: "◎", adresse: wallet?.sol, solde: soldes.sol, prixUnit: prix.sol },
];

// ==================== PAGE CHARGEMENT ====================
if (page === "chargement") {
return (
<div style={{ backgroundColor: "#0C0C0C", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
<p>Chargement...</p>
</div>
);
}
// ==================== PAGE ACCUEIL ====================
if (page === "accueil") {
return (
<div style={{ backgroundColor: "#0C0C0C", minHeight: "100vh", color: "white", fontFamily: "Inter, Arial", padding: "40px 20px" }}>
<div style={{ textAlign: "center", marginBottom: "40px" }}>
<div style={{ backgroundColor: "#5546FF", borderRadius: "50%", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "24px", margin: "0 auto 20px" }}>W</div>
<h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Mon Wallet</h1>
<p style={{ color: "#888" }}>Gérez vos cryptomonnaies</p>
</div>
<button onClick={() => setPage("creer")} style={btnPrimary}> Créer un nouveau wallet</button>
<button onClick={() => setPage("importer")} style={btnSecondary}> Importer un wallet existant</button>
</div>
);
}
// ==================== PAGE CRÉER ====================
if (page === "creer") {
return (
<div style={{ backgroundColor: "#0C0C0C", minHeight: "100vh", color: "white", fontFamily: "Inter, Arial", padding: "20px" }}>
<button onClick={() => setPage("accueil")} style={{ background: "none", border: "none", color: "#5546FF", fontSize: "16px", marginBottom: "20px", cursor: "pointer" }}>← Retour</button>
<h2 style={{ marginBottom: "20px" }}> Créer un wallet</h2>
<input type="password" placeholder="Mot de passe (min 6 caractères)" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} style={inputStyle} />
<input type="password" placeholder="Confirmer le mot de passe" value={motDePasseConfirm} onChange={e => setMotDePasseConfirm(e.target.value)} style={inputStyle} />
{erreur && <p style={{ color: "#ff4444", marginBottom: "10px" }}>{erreur}</p>}
<button onClick={creerWallet} style={btnPrimary}>Créer</button>
</div>
);
}
// ==================== PAGE IMPORTER ====================
if (page === "importer") {
return (
<div style={{ backgroundColor: "#0C0C0C", minHeight: "100vh", color: "white", fontFamily: "Inter, Arial", padding: "20px" }}>
<button onClick={() => setPage("accueil")} style={{ background: "none", border: "none", color: "#5546FF", fontSize: "16px", marginBottom: "20px", cursor: "pointer" }}>← Retour</button>
<h2 style={{ marginBottom: "20px" }}> Importer un wallet</h2>
<p style={{ color: "#888", marginBottom: "15px" }}>Entre tes 12 mots de récupération :</p>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "15px" }}>
{mots.map((mot, i) => (

<input key={i} type="text" placeholder={`Mot ${i + 1}`} value={mot}
onChange={e => { const n = [...mots]; n[i] = e.target.value; setMots(n); }}
style={{ ...inputStyle, marginBottom: 0, fontSize: "14px", padding: "10px" }} />
))}
</div>
<input type="password" placeholder="Mot de passe (min 6 caractères)" value={motDePasse} onChange={e => setMotDePasse(e.target.value)} style={inputStyle} />
<input type="password" placeholder="Confirmer le mot de passe" value={motDePasseConfirm} onChange={e => setMotDePasseConfirm(e.target.value)} style={inputStyle} />
{erreur && <p style={{ color: "#ff4444", marginBottom: "10px" }}>{erreur}</p>}
<button onClick={importerWallet} style={btnPrimary}>Importer</button>
</div>
);
}
// ==================== PAGE DÉVERROUILLER ====================
if (page === "deverrouiller") {
return (
<div style={{ backgroundColor: "#0C0C0C", minHeight: "100vh", color: "white", fontFamily: "Inter, Arial", padding: "40px 20px" }}>
<div style={{ textAlign: "center", marginBottom: "40px" }}>
<div style={{ backgroundColor: "#5546FF", borderRadius: "50%", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "24px", margin: "0 auto 20px" }}> </div>
<h2>Déverrouiller</h2>
</div>
<input type="password" placeholder="Mot de passe" value={motDePasse} onChange={e => setMotDePasse(e.target.value)}
onKeyDown={e => e.key === "Enter" && deverrouiller()} style={inputStyle} />
{erreur && <p style={{ color: "#ff4444", marginBottom: "10px" }}>{erreur}</p>}
<button onClick={deverrouiller} style={btnPrimary}> Déverrouiller</button>
</div>
);
}
// ==================== PAGE PHRASE SECRÈTE + SUPPRIMER ====================
if (page === "phrase") {
return (
<div style={{ backgroundColor: "#0C0C0C", minHeight: "100vh", color: "white", fontFamily: "Inter, Arial", padding: "20px" }}>
<button onClick={() => { setPage("wallet"); setPhraseVisible(false); }}
style={{ background: "none", border: "none", color: "#5546FF", fontSize: "16px", marginBottom: "20px", cursor: "pointer" }}>
← Retour
</button>
<h2 style={{ marginBottom: "5px" }}> Clé secrète</h2>
<p style={{ color: "#888", marginBottom: "20px", fontSize: "14px" }}>Phrase de récupération (12 mots)</p>
{/* Avertissement */}
<div style={{ backgroundColor: "#2a1a00", border: "1px solid #ff9900", borderRadius: "12px", padding: "15px", marginBottom: "20px" }}>
<p style={{ color: "#ff9900", margin: 0, fontSize: "14px" }}>
Ne partage jamais ces mots avec personne. Quiconque les possède a accès à ton wallet.
</p>
</div>

{/* Affichage des 12 mots */}
<div style={{ backgroundColor: "#1A1A1A", padding: "20px", borderRadius: "16px", marginBottom: "20px", position: "relative" }}>
{!phraseVisible && (
<div style={{
position: "absolute", inset: 0, backgroundColor: "rgba(12,12,12,0.92)",
borderRadius: "16px", display: "flex", flexDirection: "column",
alignItems: "center", justifyContent: "center", gap: "10px", zIndex: 1
}}>
<p style={{ color: "#888", fontSize: "14px" }}>Phrase masquée pour ta sécurité</p>
<button onClick={() => setPhraseVisible(true)}
style={{ backgroundColor: "#5546FF", color: "white", padding: "10px 20px", border: "none", borderRadius: "10px", cursor: "pointer" }}>
Afficher la phrase
</button>
</div>
)}
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
{wallet?.mnemonic.split(" ").map((mot, i) => (
<div key={i} style={{ backgroundColor: "#0C0C0C", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
<span style={{ color: "#555", fontSize: "12px", minWidth: "18px" }}>{i + 1}.</span>
<span style={{ color: phraseVisible ? "white" : "transparent" }}>{mot}</span>
</div>
))}
</div>
{phraseVisible && (
<div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
<CopierBouton texte={wallet?.mnemonic} />
<button onClick={() => setPhraseVisible(false)}
style={{ background: "#1A1A1A", border: "1px solid #333", borderRadius: "8px", color: "#888", padding: "6px 12px", fontSize: "12px", cursor: "pointer" }}>
Masquer
</button>
</div>
)}
</div>
{/* Séparateur */}
<div style={{ borderTop: "1px solid #222", margin: "25px 0" }} />
{/* Zone danger - Supprimer wallet */}
<div style={{ backgroundColor: "#1a0000", border: "1px solid #ff4444", borderRadius: "16px", padding: "20px" }}>
<h3 style={{ color: "#ff4444", marginBottom: "8px", fontSize: "16px" }}> Zone danger</h3>
<p style={{ color: "#888", fontSize: "13px", marginBottom: "15px" }}>
Supprimer ce wallet de l'appareil. Assure-toi d'avoir noté tes 12 mots avant !
</p>
<button onClick={supprimerWallet}
style={{ backgroundColor: "#ff4444", color: "white", padding: "14px", fontSize: "15px", border: "none", borderRadius: "12px", cursor: "pointer", width: "100%", fontWeight: "bold" }}>
Supprimer ce wallet
</button>

</div>
</div>
);
}
// ==================== PAGE RECEVOIR ====================
if (page === "recevoir" && cryptoSelectionnee) {
return (
<div style={{ backgroundColor: "#0C0C0C", minHeight: "100vh", color: "white", fontFamily: "Inter, Arial", padding: "20px" }}>
<button onClick={() => setPage("wallet")} style={{ background: "none", border: "none", color: "#5546FF", fontSize: "16px", marginBottom: "20px", cursor: "pointer" }}>← Retour</button>
<h2> Recevoir {cryptoSelectionnee.nom}</h2>
<div style={{ backgroundColor: "#1A1A1A", padding: "25px", borderRadius: "16px", textAlign: "center", marginTop: "20px" }}>
<QRCode value={cryptoSelectionnee.adresse} size={180} />
<p style={{ wordBreak: "break-all", fontSize: "13px", color: "#888", margin: "15px 0", lineHeight: "1.6" }}>
{cryptoSelectionnee.adresse}
</p>
<CopierBouton texte={cryptoSelectionnee.adresse} />
</div>
</div>
);
}
// ==================== PAGE ENVOYER ====================
if (page === "envoyer" && cryptoSelectionnee) {
const montantNum = parseFloat(montant) || 0;
const frais = montantNum * FRAIS_PLATEFORME;
const montantNet = montantNum - frais;
const montantUSD = montantNum * cryptoSelectionnee.prixUnit;
const fraisUSD = frais * cryptoSelectionnee.prixUnit;
const montantNetUSD = montantNet * cryptoSelectionnee.prixUnit;
async function confirmerEnvoi() {
const mdpInput = document.getElementById("mdpEnvoi").value;
if (!mdpInput) return alert("Entre ton mot de passe");
setLoadingEnvoi(true);
try {
const chiffre = localStorage.getItem("wallet_chiffre");
const w = JSON.parse(dechiffrer(chiffre, mdpInput));
if (cryptoSelectionnee.symbole === "ETH") {
const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);
const signer = new ethers.Wallet(w.ethPrivateKey, provider);
// Transaction 1 : envoi au destinataire (99%)
const tx1 = await signer.sendTransaction({
to: adresseDestinataire,

value: ethers.parseEther(montantNet.toFixed(18)),
});
// Transaction 2 : frais plateforme (1%)
const tx2 = await signer.sendTransaction({
to: OWNER_ETH,
value: ethers.parseEther(frais.toFixed(18)),
});
alert(`Transaction envoyee !\nHash: ${tx1.hash}\nFrais plateforme 1% envoyes.`);
setPage("wallet");
chargerSoldes(w);
} else {
alert("Envoi seulement disponible pour Ethereum pour le moment");
}
} catch (e) {
alert("Erreur : " + e.message);
}
setLoadingEnvoi(false);
}
return (
<div style={{ backgroundColor: "#0C0C0C", minHeight: "100vh", color: "white", fontFamily: "Inter, Arial", padding: "20px" }}>
<button onClick={() => setPage("wallet")} style={{ background: "none", border: "none", color: "#5546FF", fontSize: "16px", marginBottom: "20px", cursor: "pointer" }}>
Retour
</button>
<h2>Envoyer {cryptoSelectionnee.nom}</h2>
{etapeEnvoi === "form" && (
<div style={{ backgroundColor: "#1A1A1A", padding: "20px", borderRadius: "16px" }}>
<p style={{ color: "#888", marginBottom: "8px" }}>Montant ({cryptoSelectionnee.symbole})</p>
<input type="number" placeholder="0.0" value={montant} onChange={e => setMontant(e.target.value)} style={inputStyle} />
{montantNum > 0 && (
<div style={{ backgroundColor: "#0C0C0C", borderRadius: "12px", padding: "15px", marginBottom: "15px", fontSize: "13px" }}>
<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
<span style={{ color: "#888" }}>Vous envoyez</span>
<span>{montantNum.toFixed(6)} {cryptoSelectionnee.symbole} (${montantUSD.toFixed(2)})</span>
</div>
<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
<span style={{ color: "#ff9900" }}>Frais plateforme (1%)</span>
<span style={{ color: "#ff9900" }}>- {frais.toFixed(6)} {cryptoSelectionnee.symbole} (${fraisUSD.toFixed(2)})</span>
</div>
<div style={{ borderTop: "1px solid #333", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
<span>Destinataire recoit</span>
<span style={{ color: "#4ade80" }}>{montantNet.toFixed(6)} {cryptoSelectionnee.symbole} (${montantNetUSD.toFixed(2)})</span>
</div>

</div>
)}
<p style={{ color: "#888", margin: "15px 0 8px 0" }}>Adresse destinataire</p>
<input type="text" placeholder="0x..." value={adresseDestinataire} onChange={e => setAdresseDestinataire(e.target.value)} style={inputStyle} />
<button onClick={() => setEtapeEnvoi("confirmation")} style={btnPrimary} disabled={!montant || !adresseDestinataire || montantNet <= 0}>
Continuer
</button>
</div>
)}
{etapeEnvoi === "confirmation" && (
<div style={{ backgroundColor: "#1A1A1A", padding: "25px", borderRadius: "16px" }}>
<h3>Confirmer l'envoi</h3>
<div style={{ backgroundColor: "#0C0C0C", borderRadius: "12px", padding: "15px", marginBottom: "20px", fontSize: "13px" }}>
<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
<span style={{ color: "#888" }}>Montant total</span>
<span>{montantNum.toFixed(6)} ETH</span>
</div>
<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
<span style={{ color: "#ff9900" }}>Frais plateforme (1%)</span>
<span style={{ color: "#ff9900" }}>- {frais.toFixed(6)} ETH</span>
</div>
<div style={{ borderTop: "1px solid #333", paddingTop: "8px", display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
<span>Destinataire recoit</span>
<span style={{ color: "#4ade80" }}>{montantNet.toFixed(6)} ETH</span>
</div>
</div>
<p style={{ color: "#888", fontSize: "12px", marginBottom: "5px" }}>Vers :</p>
<p style={{ wordBreak: "break-all", fontSize: "13px", margin: "0 0 15px 0", color: "white" }}>{adresseDestinataire}</p>
<input id="mdpEnvoi" type="password" placeholder="Ton mot de passe" style={inputStyle} />
<button onClick={confirmerEnvoi} disabled={loadingEnvoi} style={{ ...btnPrimary, backgroundColor: "#ff4444" }}>
{loadingEnvoi ? "Envoi en cours..." : "CONFIRMER ET ENVOYER"}
</button>
<button onClick={() => setEtapeEnvoi("form")} style={btnSecondary}>Modifier</button>
</div>
)}
</div>
);
}
// ==================== WALLET PRINCIPAL ====================
return (
<div style={{ backgroundColor: "#0C0C0C", minHeight: "100vh", color: "white", fontFamily: "Inter, Arial", paddingBottom: "80px" }}>

{/* Header */}
<div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<div style={{ backgroundColor: "#5546FF", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>W</div>
<span style={{ color: "#888" }}>Mon portefeuille</span>
{/* BOUTON CLÉ - ouvre la page phrase + supprimer */}
<button
onClick={() => { setPhraseVisible(false); setPage("phrase"); }}
style={{ background: "none", border: "none", color: "#888", fontSize: "20px", cursor: "pointer" }}
title="Clé secrète & Paramètres"
>
</button>
</div>
{/* Solde Total */}
<div style={{ textAlign: "center", padding: "20px" }}>
<p style={{ color: "#888", marginBottom: "5px" }}>Total des ventes</p>
<h1 style={{ fontSize: "42px", fontWeight: "bold" }}>${loading ? "..." : soldeTotal}</h1>
<p style={{ color: "#888" }}>USD</p>
<button onClick={() => chargerSoldes(wallet)} style={{ background: "none", border: "1px solid #333", color: "#888", padding: "5px 15px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", marginTop: "10px" }}>
Actualiser
</button>
</div>
{/* Boutons Actions */}
<div style={{ display: "flex", justifyContent: "center", gap: "20px", padding: "20px" }}>
{[
{
label: " Envoyer",
action: () => {
setCryptoSelectionnee(cryptos[1]);
setPage("envoyer");
setEtapeEnvoi("form");
setMontant("");
setAdresseDestinataire("");
}
},
{ label: " Récepteur", action: () => { setCryptoSelectionnee(cryptos[1]); setPage("recevoir"); } },
{ label: " Échange", action: () => alert("Swap bientôt disponible") },
].map((btn, i) => (
<button key={i} onClick={btn.action} style={{ backgroundColor: "#1A1A1A", color: "white", padding: "15px 20px", border: "none", borderRadius: "15px", cursor: "pointer", fontSize: "14px" }}>
{btn.label}
</button>
))}
</div>
{/* Liste des cryptos */}

<div style={{ padding: "20px" }}>
<h3 style={{ color: "#888", marginBottom: "15px" }}>Mes actifs</h3>
{cryptos.map((crypto, i) => (
<div key={i} onClick={() => { setCryptoSelectionnee(crypto); setPage("recevoir"); }}
style={{ backgroundColor: "#1A1A1A", padding: "20px", borderRadius: "15px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "15px", cursor: "pointer" }}>
<div style={{ backgroundColor: crypto.couleur, borderRadius: "50%", width: "45px", height: "45px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
{crypto.emoji}
</div>
<div style={{ flex: 1 }}>
<div style={{ fontWeight: "bold" }}>{crypto.nom}</div>
<div style={{ color: "#888", fontSize: "12px" }}>{crypto.adresse?.substr(0, 16)}...</div>
</div>
<div style={{ textAlign: "right" }}>
<div style={{ fontWeight: "bold" }}>{loading ? "..." : crypto.solde.toFixed(6)}</div>
<div style={{ color: "#888", fontSize: "12px" }}>${loading ? "..." : (crypto.solde * crypto.prixUnit).toFixed(2)}</div>
</div>
</div>
))}
</div>
{/* Navigation du bas */}
<div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#1A1A1A", display: "flex", justifyContent: "space-around", padding: "15px" }}>
{[
{ label: " Accueil", action: () => {} },
{ label: " Échange", action: () => alert("Swap bientôt disponible") },
{ label: " NFT", action: () => alert("NFTs bientôt disponibles") },
{ label: " Paramètres", action: () => { setPhraseVisible(false); setPage("phrase"); } },
].map((item, i) => (
<button key={i} onClick={item.action} style={{ background: "none", border: "none", color: i === 0 ? "#5546FF" : "#888", cursor: "pointer", fontSize: "12px" }}>
{item.label}
</button>
))}
</div>
</div>
);
}
export default App;