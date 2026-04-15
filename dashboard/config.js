// This file is auto-used by dashboard and admin
// Change this one line when you deploy
const BUILDBOT_API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : 'https://buildbot-server.onrender.com/api'; // we'll update this after deploy

window.BB_API = BUILDBOT_API;