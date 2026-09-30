import { initChatModel } from 'langchain/chat_models/universal';
import { HumanMessage } from '@langchain/core/messages';
import ProviderConfigModel from '../models/providerConfig';

const PROMPT = `You are explaining a medical condition to someone who has never studied science or medicine — think of a farmer, a shopkeeper, or a grandparent who only understands everyday life.

Your job is to take the medical text and explain it the way a caring friend would — using simple words, real-life comparisons, and a warm tone. No medical jargon at all.

Rules:
- Never use medical terms without immediately explaining them in plain words
- Use analogies from everyday life (pipes, pumps, machines, food, weather — whatever fits)
- Write short sentences
- Be warm and reassuring, not scary
- If something is important (like a warning or action to take), say it clearly and simply
- Do not start with phrases like "Simplified version:" or "In simple terms:" — just explain directly

Medical Text:
{text}

Now explain this to a person who has no medical background at all:`;

export const simplifyMedicalContent = async (medicalText: string): Promise<{ success: boolean; simplifiedText?: string; error?: string }> => {
  try {
    const config = await ProviderConfigModel.findActive();
    if (!config) {
      return { success: false, error: 'No active LLM provider configured. Please configure one in the admin panel.' };
    }

    const apiKeyParam: Record<string, string> = {
      openai: 'openAIApiKey',
      anthropic: 'anthropicApiKey',
      'google-genai': 'googleApiKey',
    };

    const llm = await initChatModel(config.model, {
      modelProvider: config.provider,
      temperature: 0.3,
      [apiKeyParam[config.provider]]: config.api_key,
    });

    const response = await llm.invoke([new HumanMessage(PROMPT.replace('{text}', medicalText))]);
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

    return { success: true, simplifiedText: content };
  } catch (error) {
    console.error('LLM Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to simplify text' };
  }
};
