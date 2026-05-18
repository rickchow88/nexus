document.addEventListener('DOMContentLoaded', () => {
    const feedContainer = document.getElementById('feed');
    const loader = document.getElementById('loader');
    const btnTop = document.getElementById('btn-top');
    const btnNew = document.getElementById('btn-new');
    const btnAiTable = document.getElementById('btn-ai-table');

    // Algolia API
    const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1';
    
    const AI_KEYWORDS = [
        'openai', 'google gemini', 'anthropic', 'deepseek', 'kimi', 'opencode', 'artificial intelligence', 'llm', 'grok',
        'linux', 'mac os', 'iphone', 'ipad', 'apple'
    ];
    
    const ONLY_AI_KEYWORDS = [
        'openai', 'google gemini', 'anthropic', 'deepseek', 'kimi', 'opencode', 'artificial intelligence', 'llm', 'grok'
    ];
    
    const ITEMS_PER_PAGE = 1500;
    let currentStoryType = 'ai-table';

    // SVG Icons
    const icons = {
        score: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>`,
        user: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        time: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
    };

    // Helper functions
    const timeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = Math.floor((now - date) / 1000); // in seconds
        
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    };

    const getDomain = (url) => {
        if (!url) return 'news.ycombinator.com';
        try {
            const domain = new URL(url).hostname;
            return domain.replace('www.', '');
        } catch (e) {
            return '';
        }
    };

    async function fetchAiNews(sortType) {
        showLoader();
        feedContainer.innerHTML = '';
        feedContainer.className = 'feed-grid';
        
        try {
            const endpoint = sortType === 'top' ? 'search' : 'search_by_date';
            
            // UNIX timestamps for start and end of 2026
            const startOf2026 = 1767225600;
            const endOf2026 = 1798761599;
            const numericFilters = `numericFilters=created_at_i>=${startOf2026},created_at_i<=${endOf2026}`;

            // We fetch hits for each keyword to ensure we get a comprehensive list,
            // then combine and sort them.
            const fetchPromises = AI_KEYWORDS.map(keyword => 
                fetch(`${ALGOLIA_BASE}/${endpoint}?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=1000&${numericFilters}`)
                    .then(res => res.json())
                    .then(data => data.hits)
            );
            
            const results = await Promise.all(fetchPromises);
            
            // Flatten the array of arrays
            let allHits = results.flat();
            
            // Deduplicate by objectID
            const uniqueHits = [];
            const seenIds = new Set();
            for (const hit of allHits) {
                if (!seenIds.has(hit.objectID)) {
                    seenIds.add(hit.objectID);
                    uniqueHits.push(hit);
                }
            }
            
            // Sort combined results - Always sort by latest news on top
            uniqueHits.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Limit to ITEMS_PER_PAGE
            const finalStories = uniqueHits.slice(0, ITEMS_PER_PAGE);
            
            renderStories(finalStories);
        } catch (error) {
            console.error('Failed to fetch AI news:', error);
            feedContainer.innerHTML = '<p class="error">Failed to load news. Please try again later.</p>';
        } finally {
            hideLoader();
        }
    }

    function renderStories(stories) {
        if (stories.length === 0) {
            feedContainer.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-secondary);">No stories found.</p>';
            return;
        }

        stories.forEach((story, index) => {
            const domain = getDomain(story.url);
            const storyUrl = story.url || `https://news.ycombinator.com/item?id=${story.objectID}`;
            
            const card = document.createElement('a');
            card.href = storyUrl;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.className = 'story-card';
            card.style.animationDelay = `${index * 0.05}s`;
            
            card.innerHTML = `
                <div>
                    <div class="story-domain">${domain}</div>
                    <h2 class="story-title">${story.title}</h2>
                </div>
                <div class="story-meta">
                    <div class="meta-left">
                        <span class="meta-item">${icons.score} ${story.points || 0}</span>
                        <span class="meta-item">${icons.user} ${story.author}</span>
                    </div>
                    <div class="meta-item">${icons.time} ${timeAgo(story.created_at)}</div>
                </div>
            `;
            
            feedContainer.appendChild(card);
        });
    }

    async function fetchAiTable() {
        showLoader();
        feedContainer.innerHTML = '';
        feedContainer.className = 'table-container';
        
        try {
            const startOf2026 = 1767225600;
            const endOf2026 = 1798761599;
            const numericFilters = `numericFilters=created_at_i>=${startOf2026},created_at_i<=${endOf2026}`;

            const fetchPromises = ONLY_AI_KEYWORDS.map(keyword => 
                fetch(`${ALGOLIA_BASE}/search_by_date?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=1000&${numericFilters}`)
                    .then(res => res.json())
                    .then(data => data.hits)
            );
            
            const results = await Promise.all(fetchPromises);
            let allHits = results.flat();
            
            const uniqueHits = [];
            const seenIds = new Set();
            for (const hit of allHits) {
                if (!seenIds.has(hit.objectID)) {
                    seenIds.add(hit.objectID);
                    uniqueHits.push(hit);
                }
            }
            
            uniqueHits.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const finalStories = uniqueHits.slice(0, ITEMS_PER_PAGE);
            
            renderTable(finalStories);
        } catch (error) {
            console.error('Failed to fetch AI news table:', error);
            feedContainer.innerHTML = '<p class="error">Failed to load news. Please try again later.</p>';
        } finally {
            hideLoader();
        }
    }

    function renderTable(stories) {
        if (stories.length === 0) {
            feedContainer.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-secondary);">No stories found.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'ai-news-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Source</th>
                    <th>Score</th>
                    <th>Author</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${stories.map(story => {
                    const domain = getDomain(story.url);
                    const storyUrl = story.url || ('https://news.ycombinator.com/item?id=' + story.objectID);
                    return '<tr>' +
                            '<td><a href="' + storyUrl + '" target="_blank" rel="noopener noreferrer">' + story.title + '</a></td>' +
                            '<td>' + domain + '</td>' +
                            '<td>' + (story.points || 0) + '</td>' +
                            '<td>' + story.author + '</td>' +
                            '<td>' + new Date(story.created_at).toLocaleDateString() + '</td>' +
                        '</tr>';
                }).join('')}
            </tbody>
        `;
        
        feedContainer.appendChild(table);
    }

    function showLoader() {
        loader.classList.remove('hidden');
        feedContainer.classList.add('hidden');
    }

    function hideLoader() {
        loader.classList.add('hidden');
        feedContainer.classList.remove('hidden');
    }

    // Event Listeners
    btnTop.addEventListener('click', () => {
        if (currentStoryType === 'top') return;
        currentStoryType = 'top';
        btnTop.classList.add('active');
        btnNew.classList.remove('active');
        btnAiTable.classList.remove('active');
        fetchAiNews(currentStoryType);
    });

    btnNew.addEventListener('click', () => {
        if (currentStoryType === 'new') return;
        currentStoryType = 'new';
        btnNew.classList.add('active');
        btnTop.classList.remove('active');
        btnAiTable.classList.remove('active');
        fetchAiNews(currentStoryType);
    });

    btnAiTable.addEventListener('click', () => {
        if (currentStoryType === 'ai-table') return;
        currentStoryType = 'ai-table';
        btnAiTable.classList.add('active');
        btnTop.classList.remove('active');
        btnNew.classList.remove('active');
        fetchAiTable();
    });

    // Initial Load
    fetchAiTable();
});
