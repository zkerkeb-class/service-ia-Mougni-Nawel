const OpenAI = require('openai');
const logger = require('../utils/logger');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.dev') });

async function interagirAvecAssistant(contenu) {
  try {

    console.log(`TEst in IA function ${process.env.API_KEY} `);
    
    // 1. Initialiser le client OpenAI avec votre clé API
    const client = new OpenAI({
      apiKey: process.env.API_KEY,
    });

    // 2. Créer un thread (conversation)
    const thread = await client.beta.threads.create();
    console.log(`Thread créé avec l'ID: ${thread.id}`);

    // 3. Ajouter un message de l'utilisateur au thread
    await client.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: contenu,
    });

    // 4. Exécuter l'assistant sur le thread
    const run = await client.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ID_ASSISTANT,
    });

    // 5. Vérifier l'état de l'exécution
    let runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
    
    // 6. Attendre que l'assistant ait fini de répondre
    while (runStatus.status !== 'completed') {
      // Attendre 1 seconde avant de vérifier à nouveau
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await client.beta.threads.runs.retrieve(thread.id, run.id);
      
      // Gérer les erreurs potentielles
      if (runStatus.status === 'failed') {
        throw new Error(`Échec de l'exécution: ${runStatus.last_error}`);
      }
    }

    // 7. Récupérer les messages de la conversation
    const messages = await client.beta.threads.messages.list(thread.id);

    // 8. Extraire la dernière réponse de l'assistant
    const reponseAssistant = messages.data
      .filter(msg => msg.role === 'assistant')
      .shift();

    return reponseAssistant ? reponseAssistant.content[0].text.value : "Pas de réponse de l'assistant";
  } catch (error) {
    console.error('Erreur lors de l\'interaction avec l\'assistant:', error);
    throw error;
  }
}

module.exports = { interagirAvecAssistant };