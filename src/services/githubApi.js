/**
 * GitHub API Service
 * Handles fetching repository lists, file trees, and profile updates.
 */

export const fetchUserRepos = async (token, username) => {
    if (!token) return [];
    try {
        const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch repositories');

        const data = await response.json();
        return data.map(repo => ({
            name: repo.name,
            description: repo.description,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            url: repo.html_url,
            id: repo.id
        }));
    } catch (error) {
        console.error('GitHub API Error:', error);
        return [];
    }
};

export const fetchRepoContent = async (token, username, repoName, path = '') => {
    if (!token) return null;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/${path}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Content Fetch Error:', error);
        return null;
    }
};

export const fetchFullRepoTree = async (token, username, repoName) => {
    if (!token) return null;
    try {
        // Get default branch first
        const repoInfoResponse = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        const repoInfo = await repoInfoResponse.json();
        const branch = repoInfo.default_branch || 'main';

        // Get recursive tree
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/trees/${branch}?recursive=1`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.tree; // Array of file objects
    } catch (error) {
        console.error('Tree Fetch Error:', error);
        return null;
    }
};

export const updateRepoReadme = async (token, username, repoName, content, message = 'Update README via GMA Agent') => {
    if (!token) throw new Error('GitHub Token missing');

    try {
        // 1. Get the current README (to get its SHA if it exists)
        const getRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/README.md`, {
            headers: { 'Authorization': `token ${token}` }
        });

        let sha = null;
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }

        // 2. Create/Update the file
        const putRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/README.md`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                content: btoa(unescape(encodeURIComponent(content))), // Base64 encode UTF-8 string
                sha: sha || undefined
            })
        });

        if (!putRes.ok) {
            const err = await putRes.json();
            throw new Error(err.message || 'Failed to commit README');
        }

        return await putRes.json();
    } catch (error) {
        console.error('Commit Error:', error);
        throw error;
    }
};

export const updateUserProfile = async (token, profileData) => {
    if (!token) throw new Error('GitHub Token missing');

    try {
        const response = await fetch('https://api.github.com/user', {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to update profile');
        }

        return await response.json();
    } catch (error) {
        console.error('Profile Update Error:', error);
        throw error;
    }
};
export const createNewRepository = async (token, repoData) => {
    if (!token) throw new Error('GitHub Token missing');

    try {
        const response = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(repoData)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to create repository');
        }

        return await response.json();
    } catch (error) {
        console.error('Create Repo Error:', error);
        throw error;
    }
};

export const deleteRepository = async (token, username, repoName) => {
    if (!token) throw new Error('GitHub Token missing');

    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to delete repository');
        }

        return true;
    } catch (error) {
        console.error('Delete Repo Error:', error);
        throw error;
    }
};

export const fetchReadmeContent = async (token, username, repoName) => {
    if (!token) return null;
    try {
        const response = await fetch(`https://api.github.com/repos/${username}/${repoName}/readme`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3.raw' // Get raw content directly
            }
        });

        if (!response.ok) return null;
        return await response.text();
    } catch (error) {
        console.error('README Fetch Error:', error);
        return null;
    }
};

export const fetchUserProfileData = async (token) => {
    if (!token) return null;
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch profile data');
        return await response.json();
    } catch (error) {
        console.error('Profile Fetch Error:', error);
        return null;
    }
};
