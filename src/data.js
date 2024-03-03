// This data is passed to be used in the replacers. Like a ".env" file.
// I opted to not use .env so it is possible to create custom objects, arrays and logic here.
// You can modify, create or delete any property you want.
const { colors } = require('./theme');

module.exports = {
  user: 'RomuloGatto',
  startedCoding: '20/03/2010',
  startedWorking: '01/02/2013',
  repoQuantity: 6,
  header: {
    styles: {
      align: 'center',
      style: 'for-the-badge',
      color: colors.lightSecondary.base,
      logoColor: colors.lightSecondary.over,
    },
    image: {
      src: 'src/resources/images/romulogatto.png',
      width: 600,
    },
    description: "👋 Heyyy! I'm Gatto, a Brazilian software engineer.",
    badges: [
      {
        type: 'badge',
        name: 'twitter',
        href: 'https://twitter.com/devgatto',
      },
      {
        type: 'badge',
        name: 'linkedin',
        href: 'https://linkedin.com/in/romulogatto',
      },
      {
        type: 'badge',
        name: 'website',
        href: 'https://romulogatto.github.io/',
        logo: 'esri',
      },
      {
        type: 'views',
      },
    ],
  },
  aboutme: {
    list: ['* Rômulo Gatto, 29 years', '* Senior Software Engineer', '* Full Cycle Engineer'],
  },
  skillswall: {
    styles: {
      style: 'for-the-badge',
      align: 'left',
      highlightColor: colors.primary,
      wallColors: [colors.secondary, colors.lightSecondary],
    },
    randomOrder: true,
    skills: [
      { name: 'Python', isHighlighted: true  },
      { name: 'Django' },
      { name: 'FastAPI', isHighlighted: true },
      { name: 'Flask' },
      { name: 'SQLAlchemy' },
      { name: 'Graphene' },
      { name: 'Pydantic' },
      { name: 'Pytest' },
      
      { name: 'JavaScript', isHighlighted: true },
      { name: 'Jest' },
      { name: 'React', isHighlighted: true },
      { name: 'React Native', logo: 'react' },
      { name: 'jQuery' },
      { name: 'TypeScript', isHighlighted: true },
      { name: 'Node.JS', isHighlighted: true },
      { name: 'Express.js', logo: 'express' },
      { name: 'NPM' },
      
      { name: 'Markdown' },
      
      { name: 'GraphQL', isHighlighted: true },
      { name: 'RestAPI', isHighlighted: true },
      { name: 'Postman' },
      { name: 'Swagger' },
      
      { name: 'GoLang', isHighlighted: true },
      { name: 'Gorm' },
      { name: 'Ruby' },
      { name: 'Delphi' },
      { name: 'Shell Script', logo: 'gnu-bash' },
      
      { name: 'SQLite', isHighlighted: true },
      { name: 'SQL Server', isHighlighted: true },
      { name: 'MySQL', isHighlighted: true },
      { name: 'PostgreSQL' },
      { name: 'MongoDB' },
      
      { name: 'Github Pages', logo: 'github', isHighlighted: true },
      
      { name: 'Photoshop', logo: 'adobe-photoshop' },
      { name: 'Illustrator', logo: 'adobe-illustrator' },
      { name: 'Figma' },
      
      { name: 'Git', isHighlighted: true },
      { name: 'GitHub' },
      { name: 'GitLab' },

      { name: 'Visual Studio Code' },
      { name: 'Docker', isHighlighted: true },
      
      { name: 'Jira', isHighlighted: true },
      { name: 'Asana' },
      
      { name: 'GitHub Actions', isHighlighted: true },
      { name: 'Jenkins' },
      { name: 'Rio' },

      { name: 'AWS', isHighlighted: true },
      { name: 'GCP' },
      { name: 'Hostinger', isHighlighted: true },
    ],
  },
  recentworks: {
    styles: {
      title_color: colors.secondary.over,
      text_color: colors.secondary.over,
      bg_color: colors.secondary.base,
      border_color: colors.secondary.base,
      icon_color: colors.secondary.over,
    },
  },
  socialMedias: {
    styles: {
      align: 'left',
      style: 'for-the-badge',
      color: colors.lightSecondary.base,
      logoColor: colors.lightSecondary.over,
    },
    links: [
      {
        name: 'twitter',
        href: 'https://twitter.com/devgatto',
      },
      {
        name: 'linkedin',
        href: 'https://linkedin.com/in/romulogatto',
      },
      {
        name: 'email',
        logo: 'gmail',
        href: 'mailto:romulo.gatto@gmail.com',
      },
    ],
  },
  githubStats: {
    styles: {
      style: 'for-the-badge',
      align: 'center',
      title_color: colors.secondary.over,
      text_color: colors.secondary.over,
      bg_color: colors.secondary.base,
      border_color: colors.secondary.base,
      show_icons: true,
      icon_color: colors.secondary.over,
      rank_icon: 'github',
    },
  },
};
