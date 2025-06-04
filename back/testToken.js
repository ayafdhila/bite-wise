const { admin } = require("./config/firebase"); // Vérifiez le chemin

const testToken = async () => {
    const idToken = "VOTRE_TOKEN_ICI"; // Copiez ici le token reçu côté frontend
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        console.log(" Token valide :", decodedToken);
    } catch (error) {
        console.error("❌Token invalide :", error.code, error.message);
    }
};

testToken();
