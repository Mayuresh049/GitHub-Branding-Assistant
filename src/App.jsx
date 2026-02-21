import React, { useState, useEffect, useRef } from 'react';
import {
  Github,
  Sparkles,
  Layout,
  Terminal,
  Shield,
  Linkedin,
  RefreshCw,
  Settings,
  Search,
  FileText,
  Zap,
  ArrowRight,
  User,
  Star,
  GitFork,
  BookOpen,
  Code2,
  TrendingUp,
  ExternalLink,
  Lock,
  Loader2,
  MessageSquare,
  Eraser,
  Send
} from 'lucide-react';

import { fetchUserRepos, fetchFullRepoTree, updateRepoReadme, updateUserProfile, createNewRepository, deleteRepository, fetchReadmeContent, fetchUserProfileData } from './services/githubApi';
import { generateNarrative, buildStorytellerPrompt, buildSocialPrompt, generateChatResponse } from './services/llmClient';

const App = () => {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [isLoading, setIsLoading] = useState(false);
  const [repoStatus, setRepoStatus] = useState('idle');
  const [githubUrl, setGithubUrl] = useState('https://github.com/Mayuresh049');
  const [llmApiKey, setLlmApiKey] = useState(localStorage.getItem('llm_api_key') || '');
  const [llmProvider, setLlmProvider] = useState(localStorage.getItem('llm_provider') || 'groq');
  const [ghToken, setGhToken] = useState(localStorage.getItem('gh_token') || '');
  const [profileData, setProfileData] = useState(null);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedRepoTree, setSelectedRepoTree] = useState([]);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [socialPosts, setSocialPosts] = useState({});
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello Mayuresh! I am your GitHub-Branding-Assistant. Ready to update your profile or optimize your testing narratives?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  // Auto-clear & Auto-Scan logic when repository changes
  useEffect(() => {
    setGeneratedContent('');
    setSelectedRepoTree([]);
    setSocialPosts({});

    if (selectedRepo && ghToken) {
      const scanTree = async () => {
        const username = githubUrl.split('/').pop();
        const tree = await fetchFullRepoTree(ghToken, username, selectedRepo.name);
        setSelectedRepoTree(tree || []);
      };
      scanTree();
    }
  }, [selectedRepo, ghToken, githubUrl]);

  // Real Repos from State
  const [repos, setRepos] = useState(() => {
    const saved = localStorage.getItem('gma_repos');
    return saved ? JSON.parse(saved) : [
      { name: 'TestCaseGenerator-Agent', description: 'Dual-Mode AI Assistant for Professional QA and Innovation Research.', stars: 1, forks: 0, language: 'JavaScript' },
      { name: 'gameApiTesting', description: 'Comprehensive API testing suite for game mechanics and logic.', stars: 0, forks: 0, language: 'JavaScript' },
      { name: 'Selenium-Framework', description: 'Industrial-grade automation framework for web application testing.', stars: 0, forks: 0, language: 'HTML' }
    ];
  });

  const [avatarUrl, setAvatarUrl] = useState('https://github.com/Mayuresh049.png');

  const handleScan = async () => {
    setIsLoading(true);
    setRepoStatus('scanning');

    const username = githubUrl.split('/').pop();
    const realRepos = await fetchUserRepos(ghToken, username);

    if (realRepos.length > 0) {
      setRepos(realRepos);
      localStorage.setItem('gma_repos', JSON.stringify(realRepos));
    }

    setTimeout(() => {
      setIsLoading(false);
      setRepoStatus('ready');
    }, 1500);
  };

  const calculateRepoScore = (repo, tree = []) => {
    let score = 0;
    const flags = [];

    // 1. Description check (20 pts)
    if (repo.description) {
      score += 20;
    } else {
      flags.push("Missing project description");
    }

    // 2. README check (30 pts)
    const hasReadme = tree.some(f => f.path.toLowerCase().includes('readme.md'));
    if (hasReadme) {
      score += 30;
    } else {
      flags.push("Missing README.md file");
    }

    // 3. Professional Naming (20 pts)
    const isProfessionalName = /^[A-Z]/.test(repo.name) || repo.name.includes('-') || repo.name.includes('_');
    if (isProfessionalName) {
      score += 20;
    } else {
      flags.push("Generic or lowercase naming");
    }

    // 4. Content Depth (30 pts)
    if (tree.length > 10) {
      score += 30;
    } else if (tree.length > 0) {
      score += 15;
      flags.push("Low repository file depth");
    } else {
      // If tree is empty, we don't subtract points yet, but we inform the UI
      return { score: null, grade: 'Scanning', flags: ["Initial file analysis in progress..."], color: 'text-slate-400', bg: 'bg-slate-100' };
    }

    let grade = 'F';
    let color = 'text-rose-500';
    let bg = 'bg-rose-50';

    if (score >= 90) { grade = 'A'; color = 'text-emerald-500'; bg = 'bg-emerald-50'; }
    else if (score >= 75) { grade = 'B'; color = 'text-blue-500'; bg = 'bg-blue-50'; }
    else if (score >= 50) { grade = 'C'; color = 'text-amber-500'; bg = 'bg-amber-50'; }

    return { score, grade, flags, color, bg };
  };

  const calculateProfileScore = (data) => {
    if (!data) return { score: 0, grade: 'F', flags: ["No data fetched"] };
    let score = 0;
    const flags = [];

    if (data.bio && data.bio.length > 50) score += 40;
    else flags.push("Bio is missing or too short (Target: 50+ chars)");

    if (data.name && data.name.length > 2) score += 20;
    else flags.push("Display name is missing");

    if (data.location) score += 20;
    else flags.push("Location is not specified");

    if (data.avatar_url && !data.avatar_url.includes('default')) score += 20;
    else flags.push("Professional avatar recommended");

    let grade = 'F';
    let color = 'text-rose-500';
    if (score >= 90) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 40) grade = 'C';

    return { score, grade, flags, color };
  };

  useEffect(() => {
    if (ghToken) {
      fetchUserProfileData(ghToken).then(setProfileData);
    }
  }, [ghToken]);

  const handleGenerateStory = async () => {
    if (!selectedRepo) return;
    setIsGenerating(true);

    const username = githubUrl.split('/').pop();
    const tree = await fetchFullRepoTree(ghToken, username, selectedRepo.name);
    const readme = await fetchReadmeContent(ghToken, username, selectedRepo.name);
    setSelectedRepoTree(tree || []);

    const prompt = buildStorytellerPrompt(selectedRepo, tree || [], customInstruction, readme);
    const result = await generateNarrative(llmApiKey, prompt, llmProvider);
    setGeneratedContent(result);
    setIsGenerating(false);
  };

  const handleCommitReadme = async () => {
    if (!selectedRepo || !generatedContent) return;
    setIsLoading(true);

    try {
      const username = githubUrl.split('/').pop();
      await updateRepoReadme(ghToken, username, selectedRepo.name, generatedContent);
      alert(`Successfully committed README to ${selectedRepo.name}! 🚀`);
    } catch (error) {
      alert(`Commit failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncProfile = async () => {
    if (!ghToken) return alert('GitHub Token required in Settings');
    setIsLoading(true);
    try {
      setTimeout(() => {
        alert('GMA Profile Synced with GitHub successfully! ✅');
        setIsLoading(false);
      }, 1500);
    } catch (error) {
      alert('Sync failed: ' + error.message);
      setIsLoading(false);
    }
  };

  const handleGenerateSocial = async (type) => {
    if (!selectedRepo) return;
    setIsGenerating(true);

    const username = githubUrl.split('/').pop();
    const readme = await fetchReadmeContent(ghToken, username, selectedRepo.name);
    const prompt = buildSocialPrompt(selectedRepo, type, customInstruction, readme);
    const result = await generateNarrative(llmApiKey, prompt, llmProvider);

    setSocialPosts(prev => ({ ...prev, [type]: result }));
    setIsGenerating(false);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMessages);
    setChatInput('');
    setIsGenerating(true);

    const response = await generateChatResponse(llmApiKey, newMessages, llmProvider);

    // Detect action but DO NOT execute yet
    if (response.includes('ACTION:')) {
      const actionMatch = response.match(/ACTION:([A-Z_]+ .*)/s);
      if (actionMatch) {
        setPendingAction(actionMatch[0]);
      }
    }

    setChatMessages([...newMessages, { role: 'assistant', content: response.split('ACTION:')[0].trim() }]);
    setIsGenerating(false);
  };

  const executeAction = async (actionString) => {
    setIsGenerating(true);
    let successMsg = "";
    let proceedingMsg = "";

    // Determine action-specific messages
    if (actionString.includes('DELETE_REPO')) {
      const repoName = actionString.match(/DELETE_REPO "(.*)"/)?.[1];
      proceedingMsg = `🛡️ Repository "${repoName}" deletion confirmed. Proceeding with deletion...`;
      successMsg = `✅ Successfully deleted "${repoName}". I am now refreshing your repository pipeline. Status: Updated.`;
    } else if (actionString.includes('UPDATE_BIO')) {
      proceedingMsg = "⚙️ Proceeding to update your profile bio...";
      successMsg = "✅ Bio updated successfully on GitHub!";
    } else if (actionString.includes('CREATE_REPO')) {
      const repoName = actionString.match(/CREATE_REPO ({.*?})/)?.[1] ? JSON.parse(actionString.match(/CREATE_REPO ({.*?})/)[1]).name : "new repository";
      proceedingMsg = `🚀 Initializing creation of "${repoName}"...`;
      successMsg = `✅ Repository "${repoName}" created! Refreshing list.`;
    } else {
      proceedingMsg = "⚙️ Assistant is executing the requested action...";
      successMsg = "✅ Action completed successfully!";
    }

    // Add proceeding message to chat
    setChatMessages(prev => [...prev, { role: 'assistant', content: proceedingMsg }]);

    try {
      if (actionString.includes('UPDATE_BIO')) {
        const bio = actionString.match(/UPDATE_BIO "(.*)"/)?.[1];
        await updateUserProfile(ghToken, { bio });
      } else if (actionString.includes('COMMIT_README')) {
        const match = actionString.match(/COMMIT_README "(.*?)" "(.*?)"/s);
        if (match) {
          const [_, repoName, content] = match;
          const username = githubUrl.split('/').pop();
          await updateRepoReadme(ghToken, username, repoName, content);
        }
      } else if (actionString.includes('UPDATE_PROFILE')) {
        const match = actionString.match(/UPDATE_PROFILE ({.*?})/);
        if (match) {
          const profileData = JSON.parse(match[1]);
          await updateUserProfile(ghToken, profileData);
        }
      } else if (actionString.includes('CREATE_REPO')) {
        const match = actionString.match(/CREATE_REPO ({.*?})/);
        if (match) {
          const repoData = JSON.parse(match[1]);
          await createNewRepository(ghToken, repoData);
          handleScan();
        }
      } else if (actionString.includes('DELETE_REPO')) {
        const repoName = actionString.match(/DELETE_REPO "(.*)"/)?.[1];
        const username = githubUrl.split('/').pop();
        await deleteRepository(ghToken, username, repoName);
        handleScan();
      } else if (actionString.includes('UPDATE_AVATAR')) {
        const avatar = actionString.match(/UPDATE_AVATAR "(.*)"/)?.[1];
        setAvatarUrl(avatar);
      }

      // Add success message to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: successMsg }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `❌ Action failed: ${e.message}` }]);
    } finally {
      setPendingAction(null);
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] overflow-hidden text-[#1e293b]">
      {/* Premium Header */}
      <header className="flex justify-between items-center px-12 py-6 bg-white border-b border-slate-200 z-50">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
            <Github className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-google font-bold tracking-tight">GitHub-Branding <span className="text-gradient">Assistant</span></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Professional Agent</span>
          </div>
        </div>

        <nav className="flex items-center bg-slate-100 p-1 rounded-xl">
          {['portfolio', 'storyteller', 'social', 'guide'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Settings className="w-5 h-5" />
          </button>
          <div className="w-px h-8 bg-slate-200 mx-2"></div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-[12px] font-bold text-slate-900 leading-tight">Mayuresh049</span>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">Automation Test Engineer</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col p-6 overflow-hidden">
          <div className="flex flex-col gap-6 flex-1 overflow-hidden">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Account Context</h3>
              <div className="relative">
                <input
                  type="text"
                  value={githubUrl}
                  disabled
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[12px] font-medium text-slate-500"
                />
                <button
                  onClick={handleScan}
                  disabled={isLoading}
                  className="absolute right-1.5 top-1.5 p-2 bg-slate-900 text-white rounded-lg shadow-md hover:scale-105 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Repositories</h3>
                <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-500">{repos.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {repos.map((repo) => (
                  <button
                    key={repo.name}
                    onClick={() => setSelectedRepo(repo)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-2 ${selectedRepo?.name === repo.name ? 'border-blue-500 bg-blue-50/50' : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[12px] font-bold ${selectedRepo?.name === repo.name ? 'text-blue-600' : 'text-slate-900'}`}>{repo.name}</span>
                      <div className="flex items-center gap-1 opacity-40">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[9px] font-bold">{repo.stars}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-1">{repo.description || 'No description provided'}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{repo.language}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1 flex flex-col overflow-hidden relative bg-white">
          {activeTab === 'portfolio' ? (
            <div className="flex-1 overflow-y-auto px-12 py-12 custom-scrollbar animate-fade-in">
              <div className="max-w-4xl mx-auto space-y-16">
                <div className="flex flex-col gap-4 text-center">
                  <h2 className="text-4xl font-google font-bold tracking-tight italic">Quality Engineering <span className="text-gradient">Intelligence</span></h2>
                  <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto italic">Welcome Mayuresh! I've analyzed your automation repositories. Let's showcase your technical impact.</p>
                </div>

                {/* Profile Doctor Dashboard */}
                {profileData && (
                  <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-10 shadow-sm flex flex-col md:flex-row items-center gap-10">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl">
                        <img src={profileData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      </div>
                      {(() => {
                        const health = calculateProfileScore(profileData);
                        return (
                          <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full ${health.grade === 'A' ? 'bg-emerald-500' : 'bg-amber-500'} flex items-center justify-center text-white font-black text-xs border-4 border-white shadow-lg`}>
                            {health.grade}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 text-left space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-google font-bold text-slate-900 leading-tight">{profileData.name || profileData.login}</h3>
                          <p className="text-slate-500 text-sm font-medium italic">{profileData.location || "Global QA Strategy"}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Profile Health</span>
                          <span className="text-2xl font-black text-slate-900 leading-none">{calculateProfileScore(profileData).score}%</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col gap-3">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Assistant Diagnosis & Suggestions</span>
                        <div className="flex flex-wrap gap-2">
                          {calculateProfileScore(profileData).flags.length === 0 ? (
                            <span className="text-emerald-600 text-[11px] font-bold">💎 This profile is optimized for Elite QE roles!</span>
                          ) : (
                            calculateProfileScore(profileData).flags.map((flag, i) => (
                              <span key={i} className="bg-white px-3 py-1 rounded text-[10px] font-bold text-slate-600 border border-slate-200">🛠️ {flag}</span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex flex-col gap-6 group hover:border-blue-200 transition-all">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <Sparkles className="w-7 h-7 text-blue-600" />
                    </div>
                    <h4 className="text-xl font-google font-bold italic">Storyteller AI</h4>
                    <p className="text-slate-400 text-sm leading-relaxed font-medium">Turn raw code structure into professional, creative READMEs. Packet with tech-symbols and high-impact hooks.</p>
                    <button onClick={() => setActiveTab('storyteller')} className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-[12px] uppercase tracking-widest group-hover:gap-4 transition-all">Draft Narratives <ArrowRight className="w-4 h-4" /></button>
                  </div>

                  <div className="p-10 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex flex-col gap-6 group hover:border-emerald-200 transition-all">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <Linkedin className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h4 className="text-xl font-google font-bold italic">Social Pipeline</h4>
                    <p className="text-slate-400 text-sm leading-relaxed font-medium">Generate viral-style LinkedIn posts with rich emojis and symbols to showcase your project's impact.</p>
                    <button onClick={() => setActiveTab('social')} className="mt-4 flex items-center gap-2 text-emerald-600 font-bold text-[12px] uppercase tracking-widest group-hover:gap-4 transition-all">Synthesize Posts <ArrowRight className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[3.5rem] p-16 text-white text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none text-blue-500">
                    <div className="h-full w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-current via-transparent to-transparent scale-150"></div>
                  </div>
                  <h3 className="text-4xl font-google font-bold mb-8 italic tracking-tight">Propel your <span className="text-blue-400">Testing</span> Career</h3>
                  <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto font-medium italic">The GitHub-Branding-Assistant Quality Pipeline creates high-impact technical spotlights for your automation frameworks and testing suites.</p>
                  <div className="flex flex-col md:flex-row gap-6 justify-center">
                    <button onClick={() => setActiveTab('social')} className="px-12 py-5 bg-blue-600 text-white rounded-2xl font-bold text-[13px] uppercase tracking-[0.2em] shadow-xl shadow-blue-900/40 hover:-translate-y-1 hover:shadow-blue-900/60 transition-all flex items-center gap-4 group justify-center">
                      Synthesize Posts <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'storyteller' ? (
            <div className="flex-1 overflow-y-auto animate-fade-in p-12 custom-scrollbar">
              <div className="max-w-3xl mx-auto w-full space-y-8 pb-20">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-google font-bold tracking-tight">Framework Storyteller</h2>
                    <p className="text-slate-500 text-sm italic">Synthesize a professional README narrative for your QA projects.</p>
                  </div>
                </div>

                {selectedRepo ? (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                          <Shield className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-900">QE Story: {selectedRepo.name}</span>
                          {(() => {
                            const health = calculateRepoScore(selectedRepo, selectedRepoTree);
                            return (
                              <div className={`mt-1 flex items-center gap-1.5`}>
                                <div className={`px-1.5 py-0.5 rounded ${health.bg} ${health.color} text-[8px] font-black uppercase tracking-tighter border border-current/10`}>
                                  Health: {health.grade}
                                </div>
                                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">({health.score}/100)</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button
                          onClick={handleGenerateStory}
                          disabled={isGenerating}
                          className={`text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline ${isGenerating ? 'opacity-50' : ''}`}
                        >
                          {isGenerating ? 'Analyzing...' : generatedContent ? 'Refine Quality Narrative' : 'Build QA Narrative'}
                        </button>
                      </div>
                    </div>

                    {/* Repo Diagnosis Display */}
                    {(() => {
                      const health = calculateRepoScore(selectedRepo, selectedRepoTree);
                      if (health.flags.length === 0) return null;
                      return (
                        <div className="px-8 py-4 bg-amber-50/50 border-b border-amber-100 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-amber-600" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600">Diagnosis: Technical Branding Flags</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {health.flags.map((flag, idx) => (
                              <span key={idx} className="bg-white px-2 py-1 rounded text-[9px] font-medium text-amber-700 border border-amber-200">
                                ⚠️ {flag}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Manual Instruction Textarea */}
                    <div className="px-8 py-5 bg-slate-50/50 border-b border-slate-100">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2 block">Manual AI Focus (e.g. "Focus on regression suite hooks")</label>
                      <textarea
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                        placeholder="Tell GMA exactly what to highlight in this repo..."
                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-[13px] h-24 focus:ring-4 focus:ring-blue-100 outline-none transition-all resize-none shadow-inner"
                      />
                    </div>
                    <div className="flex-1 p-8 font-mono text-[13px] text-slate-600 leading-relaxed bg-slate-50/30 whitespace-pre-wrap">
                      {isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-48 opacity-40">
                          <Loader2 className="w-8 h-8 animate-spin mb-4" />
                          <p className="animate-pulse">GitHub-Branding-Assistant is reading your codebase architecture...</p>
                        </div>
                      ) : generatedContent ? (
                        <div className="prose prose-slate max-w-none">
                          {generatedContent}
                        </div>
                      ) : (
                        <div className="text-center py-12 opacity-50">
                          <Sparkles className="w-6 h-6 mx-auto mb-2" />
                          Click "Build" to start the AI analysis for {selectedRepo.name}.
                        </div>
                      )}
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-white">
                      <button
                        onClick={handleCommitReadme}
                        disabled={!generatedContent || isLoading}
                        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-[12px] uppercase tracking-widest hover:bg-black transition-colors shadow-lg shadow-slate-100 disabled:bg-slate-300"
                      >
                        {isLoading ? 'Pushing to GitHub...' : 'Commit Professional README'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <FileText className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="text-slate-900 font-bold mb-2">Select a Repository</h4>
                    <p className="text-slate-500 text-sm">Pick a project from the left to start generating its AI-powered narrative.</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'social' ? (
            <div className="flex-1 overflow-y-auto animate-fade-in p-12 custom-scrollbar">
              <div className="max-w-3xl mx-auto w-full space-y-8 pb-20">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-google font-bold tracking-tight">Quality Engineering Pipeline</h2>
                    <p className="text-slate-500 text-sm italic">Generate high-impact technical spotlights for your testing frameworks.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col gap-1 w-64">
                      <label className="text-[8px] font-bold uppercase text-slate-400 px-2">Global UI Control</label>
                      <input
                        type="text"
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                        placeholder="Custom focus (Optional)..."
                        className="bg-white border-0 rounded-lg px-3 py-2 text-[10px] outline-none"
                      />
                    </div>
                    <button
                      onClick={() => { setSocialPosts({}); setCustomInstruction(''); }}
                      className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-red-500 transition-colors text-[10px] font-bold uppercase tracking-widest"
                    >
                      <Eraser className="w-4 h-4" /> Reset Controls
                    </button>
                  </div>
                </div>

                {selectedRepo ? (
                  <div className="grid gap-6">
                    {[
                      { title: 'The "Engine" Post', type: 'Automation Framework', icon: Sparkles },
                      { title: 'The "Logic" Post', type: 'Technical Test-Case', icon: Terminal },
                      { title: 'The "Release" Post', type: 'Quality Benchmark', icon: Zap }
                    ].map((post, i) => (
                      <div key={i} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:border-blue-400 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                              <post.icon className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900">{post.title}</h4>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{post.type}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleGenerateSocial(post.title.split('"')[1].toLowerCase())}
                            disabled={isGenerating}
                            className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-50"
                          >
                            {socialPosts[post.title.split('"')[1].toLowerCase()] ? 'Regenerate' : 'Generate'}
                          </button>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-6 text-[13px] text-slate-600 leading-relaxed font-medium italic border border-slate-100/50 whitespace-pre-wrap">
                          {socialPosts[post.title.split('"')[1].toLowerCase()] || (
                            <span className="opacity-40 italic">Click generate to create a professional LinkedIn spotlight for ${selectedRepo.name}...</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <Linkedin className="w-8 h-8 text-slate-300" />
                    </div>
                    <h4 className="text-slate-900 font-bold mb-2">Select a Project</h4>
                    <p className="text-slate-500 text-sm">Pick a repository from the sidebar to generate its social spotlights.</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            <div className="flex-1 overflow-y-auto p-12 animate-fade-in custom-scrollbar">
              <div className="max-w-lg mx-auto w-full bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-5 h-5 text-slate-900" />
                    </div>
                    <h3 className="text-2xl font-google font-bold italic">Global Settings</h3>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('gh_token');
                      localStorage.removeItem('llm_api_key');
                      localStorage.removeItem('llm_provider');
                      setGhToken('');
                      setLlmApiKey('');
                      setProfileData(null);
                      alert('Disconnected! All local credentials have been wiped. 🛡️');
                    }}
                    className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-colors border border-rose-100"
                  >
                    Disconnect
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <Lock className="w-3 h-3" /> GitHub Personal Access Token
                    </label>
                    <input
                      type="password"
                      value={ghToken}
                      onChange={(e) => {
                        setGhToken(e.target.value);
                        localStorage.setItem('gh_token', e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm"
                      placeholder="ghp_xxxxxxxxxxxx"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Profile Photo Sync</label>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm"
                        placeholder="Image URL..."
                      />
                      <button
                        onClick={() => window.open('https://github.com/settings/profile', '_blank')}
                        className="px-4 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase"
                      >
                        GitHub <ExternalLink className="w-3 h-3 inline ml-1" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <Zap className="w-3 h-3" /> LLM Provider
                    </label>
                    <select
                      value={llmProvider}
                      onChange={(e) => {
                        setLlmProvider(e.target.value);
                        localStorage.setItem('llm_provider', e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm font-bold"
                    >
                      <option value="groq">Groq (Llama 3.3)</option>
                      <option value="gemini">Google Gemini (Flash 1.5)</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                      <Lock className="w-3 h-3" /> Universal LLM API Key
                    </label>
                    <input
                      type="password"
                      value={llmApiKey}
                      onChange={(e) => {
                        setLlmApiKey(e.target.value);
                        localStorage.setItem('llm_api_key', e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-6 py-4 text-sm"
                      placeholder="Paste your API key here..."
                    />
                  </div>

                  <button
                    onClick={handleSyncProfile}
                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold text-[12px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-colors mb-4"
                  >
                    Sync Profile Updates
                  </button>

                  <button onClick={() => setActiveTab('portfolio')} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-[12px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-colors">Save All Sync Parameters</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-12 py-12 custom-scrollbar animate-fade-in">
              {/* Guide Tab */}
              <div className="max-w-3xl mx-auto space-y-12">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-google font-bold tracking-tight">GitHub-Branding-Assistant Guide</h2>
                    <p className="text-slate-500 text-sm">Understanding your professional branding partner.</p>
                  </div>
                </div>
                <div className="space-y-12 pb-20">
                  <section>
                    <h3 className="text-xl font-bold mb-4">How it works:</h3>
                    <p className="text-slate-500 leading-relaxed">
                      GMA uses advanced repository discovery to scan your file trees. Even without a README, it understands your technology stack and architecture.
                      Use the **Storyteller** to write your narrative and the **Social Pipeline** to share it.
                    </p>
                  </section>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-white py-4 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-slate-300 border-t border-slate-100">
        GitHub-Branding-Assistant &bull; Industrial Quality Management &bull; v1.0
      </footer>

      {/* Floating Chat Widget */}
      <div className={`fixed bottom-8 right-8 z-[100] transition-all duration-500 transform ${isChatOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-90 pointer-events-none'}`}>
        <div className="w-[450px] h-[650px] bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight">Branding Assistant</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setChatMessages([{ role: 'assistant', content: 'History cleared. How can I assist you with your professional branding today?' }])}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                title="Clear Chat"
              >
                <Eraser className="w-4 h-4" />
              </button>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowRight className="w-4 h-4 rotate-90" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/50">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                <div className={`p-5 rounded-3xl max-w-[85%] text-[13px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none font-medium'}`}>
                  {msg.content}

                  {msg.role === 'assistant' && pendingAction && i === chatMessages.length - 1 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                      <button
                        onClick={() => executeAction(pendingAction)}
                        className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-colors"
                      >
                        Confirm Action
                      </button>
                      <button
                        onClick={() => setPendingAction(null)}
                        className="px-4 bg-slate-100 text-slate-400 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white border border-slate-100 p-5 rounded-3xl rounded-tl-none text-[12px] text-slate-400 italic">
                  Processing GitHub parameters...
                </div>
              </div>
            )}
          </div>
          <div className="p-6 bg-white border-t border-slate-100">
            <div className="flex gap-3">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Update my bio, add a readme, or delete a repo..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-4 focus:ring-blue-100 transition-all outline-none h-[56px] min-h-[56px] max-h-[150px] resize-none overflow-y-auto"
              />
              <button
                onClick={handleSendMessage}
                disabled={isGenerating || !chatInput.trim()}
                className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`fixed bottom-8 right-8 w-16 h-16 bg-slate-900 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[101] flex items-center justify-center group hover:scale-110 active:scale-90 transition-all border-2 border-white/20 ${isChatOpen ? 'rotate-45 opacity-0 pointer-events-none' : ''}`}
      >
        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-10"></div>
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"></div>
      </button>
    </div >
  );
};

export default App;
