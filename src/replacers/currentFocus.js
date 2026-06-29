const { getRomuloOsProfile, truncate } = require('../utils/romuloOsProfile');

module.exports = async function () {
  const profile = await getRomuloOsProfile();
  const lines = profile.focus.length
    ? profile.focus
    : ['Public GitHub activity is quiet right now; still building, experimenting and automating.'];

  return `\`\`\`yaml
source: ${profile.ai ? `${profile.ai.provider}_llm_wrapup + github_public_activity` : 'github_public_activity'}
generated_at: ${profile.generatedAt}
working_on:
${lines.map((line) => `  - ${truncate(line, 110)}`).join('\n')}

operating_mode:
  - read live signals from recent repos, pushes and pull requests
  - ask a low-temperature free-tier LLM for a concise wrapup when available
  - fall back to deterministic repo scoring when AI is unavailable
  - rebuild this profile automatically through GitHub Actions
\`\`\``;
};
