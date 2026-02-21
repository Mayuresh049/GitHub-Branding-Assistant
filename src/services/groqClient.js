/**
 * Groq AI Client - Quality Engineering Edition
 * Optimized for Automation, Testing, and Industrial QA narratives.
 */

export const generateNarrative = async (apiKey, prompt) => {
    if (!apiKey) return "API Key missing. Please check Settings.";

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are GitHub-Branding-Assistant (GBA), an elite Quality Engineering & Automation Strategist.
            
            CORE PERSONA:
            - You specialize in Software Testing, Test Case Generation, and Automation Frameworks.
            - You NEVER use generic "software developer" fluff.
            - You focus on Reliability, Scalability, and Code Quality.
            
            FORMATTING:
            - ALWAYS use technical symbols and emojis (🛠️, 🛡️, ⚙️, 🧠, ⚡).
            - NO corporate long-form paragraphs.
            - Use BOLD keywords and Bullet points.`
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        return `Error: ${error.message}`;
    }
};

export const buildStorytellerPrompt = (repo, tree, userInstructions = "") => {
    const fileSummary = tree.slice(0, 30).map(f => f.path).join(', ');

    return `
    PROJECT: ${repo.name}
    DESCRIPTION: ${repo.description}
    TECH STACK: ${repo.language}
    FILES: ${fileSummary}
    
    USER CUSTOM INSTRUCTIONS: ${userInstructions || "No specific instructions. Use your elite testing persona."}

    TASK: Generate a "Quality Engineering Narrative" for this repository.
    SCHEMA:
    1. 🛡️ QA ARCHITECTURE: How does this project ensure quality?
    2. ⚙️ AUTOMATION STACK: What tools and frameworks are being leveraged (referencing files)?
    3. 🧠 INDUSTRIAL IMPACT: Why this project is critical for a professional testing portfolio.
    4. ⚡ ELITE FEATURES: 3 bullet points with distinct symbols.

    CRITICAL: Focus 100% on Software Testing and Quality Assurance. Avoid generic development terms.
    `;
};

export const buildSocialPrompt = (repo, type, userInstructions = "") => {
    return `
    PROJECT: ${repo.name}
    TECH: ${repo.language}
    TYPE: ${type}
    USER CUSTOM INSTRUCTIONS: ${userInstructions || "Make it viral and professional for a QA Lead."}

    TASK: Write an energetic LinkedIn post focusing on Automation & Testing Innovation.
    FORMAT:
    - ⚡ HOOK: Bold statement about the future of testing.
    - 🟢 Feature List with symbols.
    - 🚀 Impact summary.
    - Call to action for the Testing community.
    `;
};

export const generateChatResponse = async (apiKey, messages, context = {}) => {
    if (!apiKey) return "Please add your Groq API key in Settings.";

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are GitHub-Branding-Assistant, an elite Quality Engineering AI. 
            Help the user manage their testing repositories. 
            Current User: Mayuresh049 (Automation Test Engineer).
            
            Tone: High-impact, technical, and symbol-rich (🛡️, 🧪, ⚙️).
            
            SKILLS (Trigger these by starting your line with the exact keyword):
            - Update bio: ACTION:UPDATE_BIO "new text"
            - Create README: ACTION:COMMIT_README "repo" "[Markdown Content]"
            - Update name/loc: ACTION:UPDATE_PROFILE {"name": "...", "location": "..."}
            - Create Repository: ACTION:CREATE_REPO {"name": "repo_name", "description": "desc", "private": false}
            - Sync Avatar: ACTION:UPDATE_AVATAR "image_url"

            When a user asks to perform these, confirm first, then provide the ACTION line at the end.`
                    },
                    ...messages
                ],
                temperature: 0.8
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        return "Chat error: " + error.message;
    }
};
