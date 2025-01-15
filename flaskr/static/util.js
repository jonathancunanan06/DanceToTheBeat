class Countdown {
  constructor() {
    this.onSecondsCallback = null;
    this.onFinishCallback = null;
    this.interval = null;
  }

  setOnSeconds(callback) {
    this.onSecondsCallback = callback;
  }

  setOnFinish(callback) {
    this.onFinishCallback = callback;
  }

  start(seconds) {
    if (this.interval) {
      this.stop();
    }

    let current = seconds;

    this.interval = setInterval(() => {
      if (current > 0) {
        if (this.onSecondsCallback) {
          this.onSecondsCallback(current);
        }
        current--;
      } else {
        this.stop();
        if (this.onFinishCallback) {
          this.onFinishCallback();
        }
      }
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

function preloadVideo(video, url) {
  return new Promise((resolve, reject) => {
    video.src = url;
    video.oncanplaythrough = () => resolve(video);
    video.onerror = (error) =>
      reject(new Error(`Failed to preload video: ${error.message}`));
  });
}
