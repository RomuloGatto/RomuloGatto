const fs = require('fs/promises');

const USER = 'RomuloGatto';
const PROFILE_REPO = `${USER}/${USER}`.toLowerCase();
const MAX_EVENT_REPOS = 5;
const CACHE_TTL_MS = 60 * 1000;
const DEFAULT_AI_TIMEOUT_MS = 20 * 1000;

let cachedProfile;
let cachedAt = 0;
let pendingProfile;

async function githubRequest(path) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'user-agent': 'romulo-os-readme-generator',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com/${path}`, { headers });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${path}: ${JSON.stringify(body).slice(0, 240)}`);
  }

  return body;
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanText(value, fallback = '') {
  return String(value ?? fallback)
    .replace(/\s+/g, ' ')
    .replace(/[\r\n|]/g, ' ')
    .trim();
}

function truncate(value, maxLength) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function eventVerb(event) {
  const action = event.payload?.action;

  switch (event.type) {
    case 'PushEvent':
      return 'pushed to';
    case 'PullRequestEvent':
      return `${action || 'updated'} PR in`;
    case 'IssuesEvent':
      return `${action || 'updated'} issue in`;
    case 'CreateEvent':
      return `created ${event.payload?.ref_type || 'thing'} in`;
    case 'ForkEvent':
      return 'forked';
    case 'ReleaseEvent':
      return `${action || 'updated'} release in`;
    case 'WatchEvent':
      return 'starred';
    default:
      return event.type.replace(/Event$/, '').toLowerCase();
  }
}

function activityWeight(event) {
  const weights = {
    PullRequestEvent: 10,
    PushEvent: 9,
    IssuesEvent: 7,
    ReleaseEvent: 7,
    CreateEvent: 5,
    ForkEvent: 4,
    WatchEvent: 1,
  };

  return weights[event.type] || 2;
}

function summarizeRepo(repo, latestEvent) {
  const fullName = repo.full_name || latestEvent.repo.name;
  const owner = fullName.split('/')[0];
  const shortName = fullName.split('/').pop();
  const description = cleanText(repo.description, 'recent GitHub activity');
  const pushedAt = repo.pushed_at || repo.updated_at || latestEvent.created_at;

  return {
    fullName,
    shortName,
    owner,
    url: repo.html_url || `https://github.com/${fullName}`,
    description,
    language: repo.language || 'mixed',
    fork: Boolean(repo.fork),
    stars: repo.stargazers_count || 0,
    topics: repo.topics || [],
    pushedAt,
    latestEvent: {
      type: latestEvent.type,
      verb: eventVerb(latestEvent),
      createdAt: latestEvent.created_at,
    },
  };
}

async function getRepoDetails(fullName, latestEvent) {
  try {
    const repo = await githubRequest(`repos/${fullName}`);
    return summarizeRepo(repo, latestEvent);
  } catch (error) {
    return summarizeRepo({ full_name: fullName }, latestEvent);
  }
}

function scoreEvents(events) {
  const scores = new Map();

  events
    .filter((event) => event.repo?.name)
    .filter((event) => event.repo.name.toLowerCase() !== PROFILE_REPO)
    .forEach((event, index) => {
      const current = scores.get(event.repo.name) || { score: 0, latestEvent: event, count: 0 };
      const recency = Math.max(1, 100 - index * 4);
      current.score += activityWeight(event) * recency;
      current.count += 1;

      if (new Date(event.created_at) > new Date(current.latestEvent.created_at)) {
        current.latestEvent = event;
      }

      scores.set(event.repo.name, current);
    });

  return [...scores.entries()]
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, MAX_EVENT_REPOS)
    .map(([fullName, entry]) => ({ fullName, ...entry }));
}

async function fallbackRepos() {
  const repos = await githubRequest(`users/${USER}/repos?per_page=100&sort=updated&type=owner`);
  return repos
    .filter((repo) => repo.full_name.toLowerCase() !== PROFILE_REPO)
    .slice(0, MAX_EVENT_REPOS)
    .map((repo) => summarizeRepo(repo, {
      type: 'Repository',
      created_at: repo.pushed_at || repo.updated_at,
      repo: { name: repo.full_name },
      payload: {},
    }));
}

function dedupeRelatedRepos(repos) {
  const byProjectName = new Map();

  for (const repo of repos) {
    const key = repo.shortName.toLowerCase();
    const current = byProjectName.get(key);

    if (!current) {
      byProjectName.set(key, repo);
      continue;
    }

    const currentIsUserFork = current.owner === USER && current.fork;
    const nextIsUpstream = repo.owner !== USER && !repo.fork;

    if (currentIsUserFork && nextIsUpstream) {
      byProjectName.set(key, repo);
    }
  }

  return [...byProjectName.values()];
}

function focusLine(repo) {
  const label = repo.fork ? `${repo.fullName} contribution` : repo.shortName;
  const desc = truncate(repo.description || repo.latestEvent.verb, 76);
  return `${label}: ${desc}`;
}

function bootLine(repo) {
  const name = truncate(repo.shortName, 24).padEnd(24, ' ');
  const verb = truncate(repo.latestEvent.verb, 12).padEnd(12, ' ');
  return `${name} ${verb}`;
}

function terminalName(repo) {
  return `${truncate(repo.shortName, 24)}.service`;
}

function aiProviderConfig() {
  const requested = (process.env.ROMULO_OS_AI_PROVIDER || '').toLowerCase();

  if ((requested === 'groq' || !requested) && process.env.GROQ_API_KEY) {
    return {
      provider: 'groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.ROMULO_OS_AI_MODEL || 'openai/gpt-oss-20b',
      headers: {},
    };
  }

  if ((requested === 'openrouter' || !requested) && process.env.OPENROUTER_API_KEY) {
    return {
      provider: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.ROMULO_OS_AI_MODEL || 'meta-llama/llama-3.1-8b-instruct:free',
      headers: {
        'HTTP-Referer': 'https://github.com/RomuloGatto/RomuloGatto',
        'X-Title': 'Romulo OS README',
      },
    };
  }

  if ((requested === 'github' || !requested) && process.env.GITHUB_TOKEN) {
    return {
      provider: 'github',
      url: 'https://models.github.ai/inference/chat/completions',
      apiKey: process.env.GITHUB_TOKEN,
      model: process.env.ROMULO_OS_AI_MODEL || 'openai/gpt-4.1-mini',
      headers: {},
    };
  }

  return null;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    const match = String(value).match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]);
    } catch (_) {
      return null;
    }
  }
}

async function generateAiWrapup(activeRepos, events) {
  const config = aiProviderConfig();
  if (!config) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.ROMULO_OS_AI_TIMEOUT_MS || DEFAULT_AI_TIMEOUT_MS));

  const repoSignals = activeRepos.map((repo) => ({
    repo: repo.fullName,
    description: repo.description,
    language: repo.language,
    fork: repo.fork,
    stars: repo.stars,
    latestSignal: `${repo.latestEvent.verb} ${repo.latestEvent.createdAt}`,
    topics: repo.topics,
  }));

  const recentEvents = events.slice(0, 20).map((event) => ({
    type: event.type,
    repo: event.repo?.name,
    action: event.payload?.action,
    createdAt: event.created_at,
  }));

  const prompt = `Summarize this GitHub activity for a personal GitHub profile README named "Romulo OS".

Rules:
- Be specific to the supplied repos/events only.
- Do not invent projects, employers, clients, metrics, or private work.
- Prefer concise hacker/operator language.
- Avoid generic phrases like "passionate developer".
- For boot_log, use the real repo names and event verbs from latestSignal. Do not convert PRs/stars/forks into git commands.
- Output strict JSON only with this shape:
{
  "headline": "max 70 chars",
  "working_on": ["3-4 bullets, max 95 chars each"],
  "boot_log": ["3 short terminal-ish lines, max 34 chars each"]
}

Repository signals:
${JSON.stringify(repoSignals, null, 2)}

Recent public events:
${JSON.stringify(recentEvents, null, 2)}`;

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        ...config.headers,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: Number(process.env.ROMULO_OS_AI_TEMPERATURE || 0.2),
        max_tokens: 900,
        messages: [
          { role: 'system', content: 'You write concise, factual GitHub profile README summaries from structured public GitHub activity.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const body = await response.json();
    if (!response.ok) {
      console.warn(`Romulo OS AI wrapup skipped: ${config.provider} returned ${response.status}`);
      return null;
    }

    const parsed = safeJsonParse(body.choices?.[0]?.message?.content);
    if (!parsed) return null;

    const workingOn = Array.isArray(parsed.working_on)
      ? parsed.working_on.map((line) => truncate(line, 95)).filter(Boolean).slice(0, 4)
      : [];
    const bootLog = Array.isArray(parsed.boot_log)
      ? parsed.boot_log.map((line) => truncate(line, 34)).filter(Boolean).slice(0, 4)
      : [];

    return {
      provider: config.provider,
      model: config.model,
      headline: truncate(parsed.headline || 'GitHub activity powered profile', 70),
      workingOn,
      bootLog,
    };
  } catch (error) {
    console.warn(`Romulo OS AI wrapup skipped: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function buildProfile() {
  const events = await githubRequest(`users/${USER}/events/public?per_page=100`);
  const ranked = scoreEvents(events);

  let activeRepos = await Promise.all(ranked.map(({ fullName, latestEvent }) => getRepoDetails(fullName, latestEvent)));
  activeRepos = dedupeRelatedRepos(activeRepos);

  if (!activeRepos.length) {
    activeRepos = await fallbackRepos();
  }

  const topRepos = activeRepos.slice(0, 3);
  const ai = await generateAiWrapup(activeRepos, events);
  const focus = ai?.workingOn?.length ? ai.workingOn : activeRepos.slice(0, 4).map(focusLine);
  const boot = ai?.bootLog?.length ? ai.bootLog : topRepos.map(bootLine);

  return {
    user: USER,
    generatedAt: new Date().toISOString(),
    activeRepos,
    topRepos,
    focus,
    boot,
    ai,
  };
}

async function getRomuloOsProfile() {
  if (cachedProfile && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedProfile;
  }

  if (!pendingProfile) {
    pendingProfile = buildProfile()
      .then((profile) => {
        cachedProfile = profile;
        cachedAt = Date.now();
        return profile;
      })
      .finally(() => {
        pendingProfile = null;
      });
  }

  return pendingProfile;
}

function svgText(value, maxLength) {
  return escapeXml(truncate(value, maxLength));
}

function renderSvg(profile) {
  const daemons = profile.topRepos.length
    ? profile.topRepos
    : [
        { shortName: 'github-activity', latestEvent: { verb: 'active' } },
        { shortName: 'automation', latestEvent: { verb: 'active' } },
        { shortName: 'shipping', latestEvent: { verb: 'active' } },
      ];

  const boot = profile.boot.length ? profile.boot : ['github activity sync', 'repo signals loaded', 'profile rebuilt'];

  const daemonRows = daemons
    .slice(0, 3)
    .map((repo, index) => {
      const y = 450 + index * 31;
      return `    <text x="108" y="${y}" class="white" font-size="20">${svgText(terminalName(repo), 25)}</text>\n    <text x="430" y="${y}" class="green" font-size="20">active</text>`;
    })
    .join('\n');

  const bootRows = boot
    .slice(0, 4)
    .map((line, index) => {
      const y = 112 + index * 40;
      return `    <text x="28" y="${y}" class="mono muted" font-size="17">[ok]</text>\n    <text x="84" y="${y}" class="mono white" font-size="17">${svgText(line, 34)}</text>`;
    })
    .join('\n');

  const now = new Date(profile.generatedAt).toISOString().slice(0, 10);

  return `<svg width="1200" height="620" viewBox="0 0 1200 620" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">Romulo OS terminal dashboard</title>
  <desc id="desc">A dynamic terminal-inspired GitHub profile card generated from Romulo Gatto's recent public GitHub activity.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="620" gradientUnits="userSpaceOnUse">
      <stop stop-color="#06070D"/>
      <stop offset="0.48" stop-color="#09111F"/>
      <stop offset="1" stop-color="#13081B"/>
    </linearGradient>
    <radialGradient id="glowCyan" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(990 110) rotate(135) scale(620 360)">
      <stop stop-color="#00F5D4" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#00F5D4" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowPink" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(170 500) rotate(-25) scale(520 280)">
      <stop stop-color="#FF4FD8" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#FF4FD8" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <style>
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
      .muted { fill: #7F8EA3; }
      .green { fill: #6CFF8D; }
      .cyan { fill: #00F5D4; }
      .pink { fill: #FF4FD8; }
      .amber { fill: #FFD166; }
      .white { fill: #F4F7FB; }
      .line { stroke: #1F3348; stroke-width: 1; }
    </style>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#18263A" stroke-width="1" opacity="0.35"/>
    </pattern>
  </defs>

  <rect width="1200" height="620" rx="34" fill="url(#bg)"/>
  <rect width="1200" height="620" rx="34" fill="url(#grid)"/>
  <rect width="1200" height="620" rx="34" fill="url(#glowCyan)"/>
  <rect width="1200" height="620" rx="34" fill="url(#glowPink)"/>

  <g filter="url(#softShadow)">
    <rect x="70" y="62" width="1060" height="496" rx="24" fill="#08111D" stroke="#21344C" stroke-width="2"/>
    <rect x="70" y="62" width="1060" height="54" rx="24" fill="#101C2B"/>
    <path d="M70 92C70 75.4315 83.4315 62 100 62H1100C1116.57 62 1130 75.4315 1130 92V116H70V92Z" fill="#101C2B"/>
    <circle cx="104" cy="89" r="8" fill="#FF5F57"/>
    <circle cx="130" cy="89" r="8" fill="#FFBD2E"/>
    <circle cx="156" cy="89" r="8" fill="#28C840"/>
    <text x="600" y="95" text-anchor="middle" class="mono muted" font-size="18">romulo@miaulabs: ~/profile --sync-github</text>
  </g>

  <g class="mono">
    <text x="108" y="156" class="green" font-size="22">$ ./romulo-os --status</text>
    <text x="108" y="214" class="white" font-size="58" font-weight="800">ROMULO OS</text>
    <text x="108" y="250" class="muted" font-size="20">${svgText(profile.ai?.headline || 'github activity powered profile', 44)}</text>

    <text x="108" y="305" class="cyan" font-size="20">system.identity</text>
    <text x="108" y="337" class="white" font-size="23">Rômulo Gatto — Brazil</text>
    <text x="108" y="369" class="muted" font-size="18">${svgText(profile.ai ? `${profile.ai.provider} wrapup + GitHub signals → live README` : 'recent public GitHub signals → live README', 56)}</text>

    <text x="108" y="418" class="cyan" font-size="20">active.repositories</text>
${daemonRows}
  </g>

  <g transform="translate(650 154)">
    <rect width="410" height="320" rx="18" fill="#0D1726" stroke="#1E334A"/>
    <text x="28" y="48" class="mono amber" font-size="20">github.log</text>
    <line x1="28" y1="70" x2="382" y2="70" class="line"/>
${bootRows}
  </g>

  <g transform="translate(660 512)" class="mono">
    <text x="0" y="0" class="muted" font-size="18">synced</text>
    <text x="78" y="0" class="pink" font-size="18">${escapeXml(now)} · build &gt; automate &gt; repeat</text>
  </g>
</svg>
`;
}

async function writeRomuloOsSvg(profile, path = 'assets/romulo-os.svg') {
  const now = new Date(profile.generatedAt).toISOString().slice(0, 10);
  const shell = await fs.readFile('assets/romulo-os-shell.svg', 'utf-8');
  const svg = shell
    .replace('{{HEADLINE}}', svgText(profile.ai?.headline || 'github activity powered profile', 44))
    .replace('{{SUBLINE}}', svgText(profile.ai ? `${profile.ai.provider} wrapup + GitHub signals → live README` : 'recent public GitHub signals → live README', 56))
    .replace('{{SYNC_DATE}}', escapeXml(now));

  await fs.mkdir('assets', { recursive: true });
  await fs.writeFile(path, svg, 'utf-8');
}

module.exports = {
  getRomuloOsProfile,
  writeRomuloOsSvg,
  truncate,
  cleanText,
};
