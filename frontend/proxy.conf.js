const backendUrl = process.env.BACKEND_URL;

if (!backendUrl) {
  throw new Error('BACKEND_URL manquante (ex. http://localhost:<PORT du backend>)');
}

module.exports = {
  '/api': { target: backendUrl, secure: false },
};
