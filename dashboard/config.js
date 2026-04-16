const BUILDBOT_API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : 'https://buildbot-production.up.railway.app/api';

window.BB_API = BUILDBOT_API;