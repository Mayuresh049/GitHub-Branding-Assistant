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

export const buildStorytellerPrompt = (repo, tree, userInstructions = "", readmeContent = "") => {
    const fileSummary = tree.slice(0, 30).map(f => f.path).join(', ');

    return `
    PROJECT: ${repo.name}
    DESCRIPTION (from GitHub): ${repo.description}
    README CONTENT (Actual project details): 
    ${readmeContent ? readmeContent.slice(0, 3000) : "No README found. Rely on file tree."}
    
    FILE TREE SUMMARY: ${fileSummary}
    
    USER CUSTOM INSTRUCTIONS: ${userInstructions || "No specific instructions. Use your elite testing persona."}

    TASK: Generate a "High-Impact Quality Engineering Narrative".
    CRITICAL INSTRUCTION:
    - DISREGARD generic tech stacks. Focus on WHAT this tool actually does for Testing/QA (read the README carefully).
    - If the README describes specific testing features (Regenerative, Logic-based, etc.), spotlight them.
    - SCHEMA:
      1. 🛡️ CORE MISSION: What problem does this project solve for QA?
      2. ⚙️ TECHNICAL ARCHITECTURE: Based on the README and Files.
      3. 🧠 PROFESSIONAL IMPACT: Why this adds value to a Quality Engineer's portfolio.
    `;
};

export const buildSocialPrompt = (repo, type, userInstructions = "", readmeContent = "") => {
    const typeConstraints = {
        engine: "Focus on the CORE ENGINE and infrastructure. Use ⚙️ and 🛠️ symbols.",
        logic: "Focus on the TECHNICAL LOGIC and test-case architecture. Use 🧠 and 🧪 symbols.",
        release: "Focus on the QUALITY BENCHMARK and final release impact. Use 🏆 and ⚡ symbols."
    };

    return `
    PROJECT NAME: ${repo.name}
    README SUMMARY/CONTENT: ${readmeContent ? readmeContent.slice(0, 2000) : repo.description}
    POST TYPE: ${type}
    SPECIFIC CONSTRAINT: ${typeConstraints[type] || ""}
    
    USER CUSTOM INSTRUCTIONS: ${userInstructions || "Make it professional for a QA leader."}

    TASK: Write a UNIQUE LinkedIn spotlight about "${repo.name}".
    GUIDELINES:
    - IDENTIFY THE PURPOSE: Do not just list files. Tell the story of what ${repo.name} achieves.
    - Start with a massive technical "Hook".
    - Use industrial symbols.
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
            
            SKILLS:
            - Update bio: ACTION:UPDATE_BIO "new text"
            - Create README: ACTION:COMMIT_README "repo" "[Markdown Content]"
            - Update profile: ACTION:UPDATE_PROFILE {"name": "...", "location": "..."}
            - Create Repository: ACTION:CREATE_REPO {"name": "repo_name", "description": "desc"}
            - Delete Repository: ACTION:DELETE_REPO "repo_name"
            - Sync Avatar: ACTION:UPDATE_AVATAR "image_url"

            PROTOCOL FOR ACTIONS:
            1. If an action is requested, confirm the details first.
            2. For DELETION: Explicitly state: "⚙️ Confirming repository deletion details: Repository Name: [Name]. Are you sure? This action is permanent."
            3. Then, provide the ACTION: line at the very end of your response.`
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
