// LISTE ÉTENDUE DE MESSAGES MOTIVATIONNELS POUR LES UTILISATEURS PERSONNELS (50+ messages)
const PERSONAL_MOTIVATIONAL_MESSAGES = [
    "💪 Vous faites un travail incroyable ! Chaque choix sain compte !",
    "🌟 Rappelez-vous : le progrès, pas la perfection ! Continuez !",
    "❤️ Votre corps est votre temple. Traitez-le avec amour aujourd'hui !",
    "🚀 Les petits pas mènent à de grands changements. Vous pouvez le faire !",
    "💫 Croyez en vous - vous êtes plus fort que vous ne le pensez !",
    "🥗 Chaque repas est une nouvelle opportunité de vous nourrir !",
    "🔑 La constance est la clé. Vous développez d'excellentes habitudes !",
    "🌈 Votre parcours vers la santé est unique et magnifique !",
    "🎯 Prenez un moment pour apprécier le chemin parcouru !",
    "✨ Vous ne changez pas seulement votre corps, vous changez votre vie !",
    "📈 Le succès est la somme de petits efforts répétés quotidiennement !",
    "🙏 Votre futur vous remerciera pour les choix d'aujourd'hui !",
    "💯 Chaque entraînement, chaque repas sain compte !",
    "🏠 Vous construisez un mode de vie, pas seulement un régime !",
    "⏰ Faites confiance au processus - la transformation prend du temps !",
    "🌅 Votre engagement d'aujourd'hui façonne votre demain !",
    "🌱 Soyez patient avec vous-même - la croissance se fait progressivement !",
    "💪 Vous êtes plus fort que votre excuse la plus forte !",
    "💰 Les habitudes saines sont des investissements dans votre avenir !",
    "🧠 Votre corps peut le faire. C'est votre esprit qu'il faut convaincre !",
    "🏆 Chaque pas en avant est une victoire qui mérite d'être célébrée !",
    "📚 Vous ne recommencez pas, vous recommencez avec de l'expérience !",
    "👣 Le progrès est le progrès, peu importe sa taille !",
    "💎 Votre santé est votre richesse - investissez judicieusement !",
    "💪 Les luttes d'aujourd'hui sont les forces de demain !",
    "✍️ Vous écrivez votre histoire de succès un jour à la fois !",
    "⚖️ La discipline pèse des grammes, le regret pèse des tonnes !",
    "🥇 Votre seule compétition, c'est qui vous étiez hier !",
    "👀 Les champions se font quand personne ne regarde !",
    "🛤️ Votre parcours vous est propre - embrassez-le !",
    "💝 Chaque choix sain est un acte d'amour-propre !",
    "🌟 Vous ne perdez pas seulement du poids, vous gagnez de la vie !",
    "🤝 Croyez en vous autant que votre coach croit en vous !",
    "🔥 Votre persévérance portera ses fruits - continuez à pousser !",
    "✨ Vous créez la meilleure version de vous-même !",
    "🌅 Chaque jour est une nouvelle chance de bien faire !",
    "🏃‍♀️ Votre parcours santé est un marathon, pas un sprint !",
    "🌾 Vous plantez des graines aujourd'hui pour la récolte de demain !",
    "👥 Votre engagement inspire ceux qui vous entourent !",
    "🎉 Célébrez chaque petite victoire en cours de route !",
    "💧 Hydratez-vous ! Votre corps a besoin d'eau pour fonctionner !",
    "🌿 Ajoutez de la couleur à votre assiette aujourd'hui !",
    "🧘‍♀️ Prenez 5 respirations profondes - la pleine conscience commence ici !",
    "👂 Écoutez votre corps - mangez quand vous avez faim, arrêtez quand vous êtes rassasié !",
    "👨‍🍳 Essayez une nouvelle recette saine cette semaine !",
    "☀️ Prenez un peu de soleil - la vitamine D est essentielle !",
    "🙏 Pratiquez la gratitude pour la nourriture dans votre assiette !",
    "🚶‍♀️ Faites une courte promenade après avoir mangé - aidez votre digestion !",
    "🥕 Préparez vos collations saines pour la semaine !",
    "😴 Le sommeil est crucial pour la récupération - visez 7-9 heures !",
    "🤸‍♀️ Étirez-vous pendant 10 minutes pour améliorer la flexibilité !",
    "🪜 Choisissez les escaliers plutôt que l'ascenseur quand c'est possible !",
    "🔍 Lisez les étiquettes alimentaires - la connaissance, c'est le pouvoir !",
    "⏰ Restez cohérent avec vos horaires de repas !",
    "🥩 Incluez des protéines dans chaque repas pour la satiété !",
    "🍎 Limitez les aliments transformés - choisissez des aliments entiers !"
];

// MESSAGES POUR LES COACHS (30+ messages)
const COACH_MOTIVATIONAL_MESSAGES = [
    "🌟 Vos conseils changent des vies aujourd'hui !",
    "👏 Merci d'être un guerrier du bien-être !",
    "💡 Votre expertise fait une vraie différence !",
    "🦋 Continuez à inspirer des transformations saines !",
    "🏆 Chaque client que vous aidez est une histoire de succès !",
    "💫 Votre dévouement au bien-être est admirable !",
    "🤝 Vous construisez des communautés plus saines !",
    "⚡ Votre coaching crée un changement positif durable !",
    "💎 Vous rendez le monde plus sain, un client à la fois !",
    "🔥 Votre passion pour la nutrition inspire les autres !",
    "📈 Chaque transformation de client reflète votre expertise !",
    "✨ Votre patience et vos connaissances créent des miracles !",
    "💫 Vous n'enseignez pas seulement la nutrition, vous changez des vies !",
    "🎯 Votre dévouement professionnel est vraiment inspirant !",
    "🤝 Continuez à être le mentor dont vos clients ont besoin !",
    "🌊 Votre impact s'étend bien au-delà de ce que vous voyez !",
    "💚 Merci pour votre engagement envers la santé et le bien-être !",
    "🔍 Vos conseils aident les gens à trouver leur meilleur moi !",
    "🌊 Vous créez des ondulations de changement positif !",
    "💬 Prenez des nouvelles de vos clients - un simple message peut égayer leur journée !",
    "🧘‍♂️ N'oubliez pas de pratiquer ce que vous prêchez - l'auto-soin compte !",
    "🎉 Célébrez les petites victoires de vos clients - elles s'additionnent !",
    "📚 Restez à jour avec les dernières recherches en nutrition !",
    "☕ Prenez le temps de vous ressourcer - on ne peut pas verser d'une tasse vide !",
    "🤝 Connectez-vous avec d'autres professionnels - la collaboration fait grandir le succès !",
    "📝 Documentez les histoires de succès - elles inspirent les futurs clients !",
    "👂 Écoutez activement - parfois les clients ont juste besoin d'être entendus !",
    "🎯 Adaptez votre approche - chaque client est unique !",
    "⏰ Faites confiance au processus - la transformation prend du temps !",
    "🎯 Fixez des objectifs réalistes avec vos clients !",
    "📊 Utilisez des aides visuelles pour expliquer des concepts nutritionnels complexes !",
    "📅 Créez des plans de repas qui s'adaptent au mode de vie de vos clients !",
    "📞 Faites un suivi régulier - cela montre que vous vous souciez !",
    "⏳ Soyez patient - un changement durable prend du temps !",
    "🎓 Éduquez, n'instruisez pas seulement !",
    "🤝 Construisez la confiance grâce à la transparence et l'honnêteté !",
    "❓ Aidez les clients à trouver leur 'pourquoi' pour la motivation !",
    "✅ Utilisez le renforcement positif efficacement !",
    "💚 Restez accessible et empathique !"
];

// MESSAGES POUR LES NOTIFICATIONS D'ÉVÉNEMENTS
const EVENT_NOTIFICATIONS = {
    NEW_MESSAGE: {
        TO_CLIENT: [
            "💬 Votre coach vous a envoyé un message !",
            "📱 Nouveau message de votre coach - consultez-le maintenant !",
            "🎯 Votre coach a des conseils pour vous !",
            "📩 Message de votre coach en attente !",
            "💌 Votre coach veut se connecter avec vous !"
        ],
        TO_COACH: [
            "💬 Vous avez un nouveau message de votre client !",
            "📱 Votre client vous a envoyé un message - jetez-y un œil !",
            "🔔 Alerte message - votre client a besoin de vous !",
            "📩 Message reçu de votre client !",
            "💌 Votre client vous a contacté !"
        ]
    },
    INVITATION: {
        SENT: [
            "📤 Votre invitation a été envoyée avec succès !",
            "✉️ Invitation livrée - en attente de réponse !",
            "🚀 Votre invitation de coaching est en route !",
            "📧 Invitation envoyée à votre client potentiel !",
            "💫 Vous avez franchi la première étape - invitation envoyée !"
        ],
        RECEIVED: [
            "📨 Vous avez reçu une invitation de coaching !",
            "🎉 Un coach veut travailler avec vous !",
            "⭐ Nouvelle opportunité de coaching vous attend !",
            "📩 Quelqu'un croit en votre potentiel !",
            "🤝 Un coach est prêt à guider votre parcours !"
        ],
        ACCEPTED: [
            "🎉 Excellente nouvelle ! Votre invitation a été acceptée !",
            "✅ Accueillez votre nouveau client dans le parcours !",
            "🤝 Félicitations ! Vous avez un nouveau client !",
            "🌟 Votre expertise a été reconnue !",
            "🚀 Nouvelle relation de coaching commencée !"
        ],
        DECLINED: [
            "📝 Votre invitation a été déclinée, mais n'abandonnez pas !",
            "💪 Continuez à tendre la main - le bon client arrive !",
            "🔄 Pas cette fois, mais restez positif !",
            "🎯 Concentrez-vous sur l'avenir - plus d'opportunités vous attendent !",
            "💫 Chaque 'non' vous rapproche d'un 'oui' !"
        ]
    },
    NUTRITION_PLAN: {
        CREATED: [
            "📋 Votre plan nutritionnel personnalisé est prêt !",
            "🎯 Nouveau plan de repas créé juste pour vous !",
            "📊 Votre coach a préparé un plan sur mesure !",
            "✨ Plan nutritionnel frais qui vous attend !",
            "🥗 Votre plan de parcours bien-être est là !"
        ],
        UPDATED: [
            "🔄 Votre plan nutritionnel a été mis à jour !",
            "📈 Votre coach a apporté des améliorations à votre plan !",
            "⭐ Plan de repas amélioré prêt pour vous !",
            "🎯 Votre plan a été optimisé !",
            "💫 Nouveaux ajustements apportés à votre plan nutritionnel !"
        ]
    }
};

// Fonction utilitaire pour choisir un message aléatoire
const getRandomMessage = (messageArray) => {
    if (!Array.isArray(messageArray) || messageArray.length === 0) {
        return "Message de motivation !";
    }
    return messageArray[Math.floor(Math.random() * messageArray.length)];
};

module.exports = {
    PERSONAL_MOTIVATIONAL_MESSAGES,
    COACH_MOTIVATIONAL_MESSAGES,
    EVENT_NOTIFICATIONS,
    getRandomMessage
};