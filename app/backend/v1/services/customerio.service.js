const { TrackClient } = require("customerio-node");
const { API_KEY, SITE_ID } = process.env;

class CIOService {
  constructor() {
    this.cio = new TrackClient(SITE_ID, API_KEY, { timeout: 20000 });
  }

  triggerEvent(userId, eventName, data) {
    this.cio.track(userId, {
      name: eventName,
      data,
    });
  }
}

module.exports = new CIOService();
