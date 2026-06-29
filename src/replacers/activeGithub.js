const { getRomuloOsProfile, truncate } = require('../utils/romuloOsProfile');

function escapeMarkdown(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

module.exports = async function () {
  const profile = await getRomuloOsProfile();

  if (!profile.activeRepos.length) {
    return 'No recent public GitHub activity found. The system is probably building in private.';
  }

  const rows = profile.activeRepos.slice(0, 5).map((repo) => {
    const repoName = `[${escapeMarkdown(repo.fullName)}](${repo.url})`;
    const activity = escapeMarkdown(`${repo.latestEvent.verb} · ${repo.latestEvent.createdAt.slice(0, 10)}`);
    const description = escapeMarkdown(truncate(repo.description || 'recent GitHub activity', 92));
    const stack = escapeMarkdown([repo.language, ...(repo.topics || []).slice(0, 2)].filter(Boolean).join(' · '));

    return `| ${repoName} | ${activity} | ${description} | ${stack || 'mixed'} |`;
  });

  return `| repo | latest signal | why it shows up | stack |
| --- | --- | --- | --- |
${rows.join('\n')}`;
};
