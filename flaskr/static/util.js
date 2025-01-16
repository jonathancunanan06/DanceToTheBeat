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

function crop(canvas, cropRegion) {
  let { x, y, width, height } = cropRegion;

  // Ensure the crop region is within the bounds of the canvas
  x = Math.max(0, Math.min(x, canvas.width - 1));
  y = Math.max(0, Math.min(y, canvas.height - 1));
  width = Math.max(0, Math.min(width, canvas.width - x));
  height = Math.max(0, Math.min(height, canvas.height - y));

  // Create a new canvas for the cropped image
  let croppedCanvas = document.createElement("canvas");
  let croppedContext = croppedCanvas.getContext("2d");

  // Set the cropped canvas size
  croppedCanvas.width = width;
  croppedCanvas.height = height;

  // Draw the cropped region from the original canvas
  croppedContext.drawImage(canvas, x, y, width, height, 0, 0, width, height);

  // Get the base64 encoded JPEG image
  return croppedCanvas
    .toDataURL("image/jpeg")
    .replace("data:image/jpeg;base64,", "");
}

function drawStickFigure(ctx, pose, offsetX, color) {
  const width = ctx.canvas.width / 2;
  const height = ctx.canvas.height;

  // Function to convert normalized coordinates to canvas coordinates
  const toCanvasCoords = (x, y) => [offsetX + x * width, y * height];

  // Set drawing styles
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  // Function to draw a line between two keypoints
  const drawLine = (point1, point2) => {
    if (point1[0] >= 0.5 && point2[0] >= 0.5) {
      // Only draw if confidence is high enough
      const [x1, y1] = toCanvasCoords(point1[1], point1[2]);
      const [x2, y2] = toCanvasCoords(point2[1], point2[2]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

  // Draw body connections
  // Face
  drawLine(pose[0], pose[1]); // nose to left eye
  drawLine(pose[0], pose[2]); // nose to right eye

  // Arms
  drawLine(pose[5], pose[7]); // left upper arm
  drawLine(pose[7], pose[9]); // left lower arm
  drawLine(pose[6], pose[8]); // right upper arm
  drawLine(pose[8], pose[10]); // right lower arm

  // Torso
  drawLine(pose[5], pose[6]); // shoulders
  drawLine(pose[5], pose[11]); // left torso
  drawLine(pose[6], pose[12]); // right torso
  drawLine(pose[11], pose[12]); // hips

  // Legs
  drawLine(pose[11], pose[13]); // left thigh
  drawLine(pose[13], pose[15]); // left calf
  drawLine(pose[12], pose[14]); // right thigh
  drawLine(pose[14], pose[16]); // right calf

  // Draw joints as circles
  ctx.fillStyle = color;
  pose.forEach((point) => {
    if (point[0] >= 0.5) {
      // Only draw if confidence is high enough
      const [x, y] = toCanvasCoords(point[1], point[2]);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}
