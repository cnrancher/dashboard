export function options(issues, hideRancher) {
  if (!issues) {
    if (hideRancher) {
      return { };
    }
    issues = 'https://github.com/rancher/dashboard/issues/new';
  } else if (hideRancher) {
    return { 'footer.issue': issues };
  }

  return {
    'footer.docs':   'https://ee.docs.rancher.cn/',
    'footer.forums': 'https://forums.rancher.cn/',
    'footer.slack':  'https://slack.rancher.io',
    'footer.issue':  issues,
    'footer.mirror': 'https://mirror.rancher.cn/',
  };
}
