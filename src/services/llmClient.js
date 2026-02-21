/**
 * Agnostic LLM Client - Quality Engineering Edition
 * Supports Groq, Gemini, and future providers.
 */

const callGroq = async (apiKey, messages, temperature = 0.8) => {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature
        })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
};

const callGemini = async (apiKey, messages, temperature = 0.8) => {
    // Combine messages into a single prompt for simplicity in this version
    const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature }
        })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
};

export const generateNarrative = async (apiKey, prompt, provider = 'groq') => {
    if (!apiKey) return "API Key missing. Please check Settings.";

    const messages = [
        {
            role: 'system',
            content: `You are GitHub-Branding-Assistant (GBA), an elite Quality Engineering & Automation Strategist.
            CORE PERSONA: Specialized in Testing, Reliability, and code quality. Technical and symbol-rich.`
        },
        { role: 'user', content: prompt }
    ];

    try {
        if (provider === 'gemini') return await callGemini(apiKey, messages);
        return await callGroq(apiKey, messages);
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

export const generateChatResponse = async (apiKey, messages, provider = 'groq') => {
    if (!apiKey) return "API Key missing. Please check Settings.";

    const systemMessage = {
        role: 'system',
        content: `You are GitHub-Branding-Assistant, an elite Quality Engineering AI. 
Help the user manage their testing repositories. Current User: Mayuresh049.
Tone: High-impact, technical, and symbol-rich.

SKILLS: UPDATE_BIO, COMMIT_README, UPDATE_PROFILE, CREATE_REPO, DELETE_REPO, UPDATE_AVATAR.
Confirm actions first, then provide ACTION: keyword.`
    };

    try {
        const fullMessages = [systemMessage, ...messages];
        if (provider === 'gemini') return await callGemini(apiKey, fullMessages);
        return await callGroq(apiKey, fullMessages);
    } catch (error) {
        return "Chat error: " + error.message;
    }
};

export const buildStorytellerPrompt = (repo, tree, userInstructions = "", readmeContent = "") => {
    const fileSummary = tree.slice(0, 30).map(f => f.path).join(', ');
    return `PROJECT: ${repo.name}\nREADME: ${readmeContent?.slice(0, 2000)}\nFILES: ${fileSummary}\n\nTASK: Generate QE Narrative.`;
};

export const buildSocialPrompt = (repo, type, userInstructions = "", readmeContent = "") => {
    return `PROJECT: ${repo.name}\nTYPE: ${type}\nREADME: ${readmeContent?.slice(0, 2000)}\n\nTASK: Write LinkedIn Spotlight.`;
};
