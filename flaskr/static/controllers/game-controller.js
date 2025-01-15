/**
 * @typedef {Object} PoseEstimation
 * @property {string} name - The name of the detected object.
 * @property {number} class - The class identifier.
 * @property {number} confidence - The confidence score of the detection.
 * @property {Object} box - The bounding box of the detected object.
 * @property {number} box.x1 - The x-coordinate of the top-left corner of the box.
 * @property {number} box.y1 - The y-coordinate of the top-left corner of the box.
 * @property {number} box.x2 - The x-coordinate of the bottom-right corner of the box.
 * @property {number} box.y2 - The y-coordinate of the bottom-right corner of the box.
 * @property {number} track_id - The tracking ID of the object.
 * @property {Object} keypoints - The keypoints data.
 * @property {number[]} keypoints.x - The x-coordinates of keypoints.
 * @property {number[]} keypoints.y - The y-coordinates of keypoints.
 * @property {number[]} keypoints.visible - The visibility scores of keypoints.
 */

Stimulus.register(
  "game",
  class extends Controller {
    static FPS = 15;

    static values = {
      state: { type: String, default: "prepare" },
    };
    static targets = ["camera", "statusLoader", "statusText"];
    static classes = ["prepare", "dance", "score"];

    initialize() {
      this.dispose = [];

      this.canvas = document.createElement("canvas");

      this.debugCanvas = document.createElement("canvas");
      this.debugCanvas.id = "debug-canvas";
      this.isDebug = false;
      this.toggleDebug();
    }

    connect() {
      if (document.documentElement.hasAttribute("data-turbo-preview")) {
        return;
      }

      this.startPrepare();
    }

    async startPrepare() {
      this.setPrepareStatus("Starting camera", true);
      await this.startCamera();
      this.socket = io("/dance");
      this.dispose.push(() => {
        this.socket.disconnect();
      });

      if (this.element.dataset.referenceId === undefined) {
        await this.uploadVideo();
      }

      this.setPrepareStatus("Spread your arms wide to participate");

      this.socket.on("prepare_response", (response) => {
        const result = JSON.parse(response);
        if (this.isDebug) this.drawResult(result);
        this.sendPrepareFrame();
      });
      this.socket.on("connect", () => {
        this.sendPrepareFrame();
      });

      const handlePress = (e) => {
        this.handleXPress(e);

        if (e.key === "d" || e.key === "D") {
          this.toggleDebug();
        }
      };

      document.addEventListener("keydown", handlePress);
      this.dispose.push(() =>
        document.removeEventListener("keydown", handlePress),
      );
    }

    async sendPrepareFrame() {
      if (this.stateValue !== "prepare") return;

      const context = this.canvas.getContext("2d");
      context.drawImage(
        this.cameraTarget,
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
      const data = this.canvas
        .toDataURL("image/jpeg")
        .replace("data:image/jpeg;base64,", "");

      this.socket.emit("prepare", data);
    }

    disconnect() {
      this.dispose.forEach((callback) => {
        callback();
      });
      this.dispose = [];
    }

    stateValueChanged() {
      this.element.classList.remove(
        this.prepareClass,
        this.danceClass,
        this.scoreClass,
      );

      if (this.stateValue === "dance") {
        this.element.classList.add(this.danceClass);
      } else if (this.stateValue === "score") {
        this.element.classList.add(this.scoreClass);
      } else {
        this.element.classList.add(this.prepareClass);
      }
    }

    /** @param {string} text */
    setPrepareStatus(text, isLoading = false) {
      this.statusTextTarget.innerHTML = text;
      this.statusLoaderTarget.style.display = isLoading
        ? "inline-block"
        : "none";
    }

    hidePrepareStatus() {
      this.setPrepareStatus("", false);
    }

    async startCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      this.stream = stream;
      this.cameraTarget.srcObject = this.stream;

      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      this.canvas.width = settings.width;
      this.canvas.height = settings.height;

      this.dispose.push(() => {
        this.stream.getTracks().forEach((track) => track.stop());
      });
    }

    async uploadVideo() {
      const prepareTarget = JSON.parse(
        localStorage.getItem("prepare_page_target"),
      );

      if (!prepareTarget) {
        console.error("No video to upload");
        Turbo.visit("/", { action: replace });
        return;
      }
      localStorage.removeItem("prepare_page_target");

      const response = await fetch(prepareTarget.upload_file);
      if (!response.ok) {
        console.error("Video doesn't exist");
        Turbo.visit("/", { action: replace });
        return;
      }

      const blob = await response.blob();
      const formData = new FormData();
      formData.append("file", blob, "reference.mp4");

      this.setPrepareStatus("Uploading reference video", true);
      return fetch("/reference", {
        method: "POST",
        data: formData,
      });
    }

    handleXPress(event) {
      if (this.stateValue !== "prepare") return;
      if (event.key === "x" || event.key === "X") {
        Turbo.visit("/");
      }
    }

    toggleDebug() {
      this.isDebug = !this.isDebug;

      if (this.isDebug) {
        document.body.insertBefore(this.debugCanvas, document.body.firstChild);
      } else {
        document.body.removeChild(this.debugCanvas);
      }
    }

    /**
     * @param {PoseEstimation[]} result
     */
    drawResult(result) {
      this.debugCanvas.width = this.canvas.width;
      this.debugCanvas.height = this.canvas.height;

      const context = this.debugCanvas.getContext("2d");
      context.drawImage(this.canvas, 0, 0);

      result.forEach((obj) => {
        const lines = [
          [4, 2], // right cheek
          [2, 0], // right eye
          [0, 1], // left eye
          [1, 3], // left cheek
          [10, 8], // right forearm
          [8, 6], // right arm
          [5, 7], // left arm
          [7, 9], // left forearm
          [6, 5], // chest
          [6, 12], // right turso
          [5, 11], // left turso
          [12, 11], // hip
          [12, 14], // right thigh
          [11, 13], // left thigh
          [14, 16], // right leg
          [13, 15], // left leg
        ];

        context.font = "32px serif";
        context.fillText("Track ID: " + obj.track_id, obj.box.x1, obj.box.y1);

        context.strokeStyle = "red";
        context.lineWidth = 8;
        context.strokeRect(
          obj.box.x1,
          obj.box.y1,
          obj.box.x2 - obj.box.x1,
          obj.box.y2 - obj.box.y1,
        );

        context.fillStyle = "blue";
        const r = 8;
        obj.keypoints.visible.forEach((conf, i) => {
          if (conf < 0.5) return;
          const x = obj.keypoints.x[i];
          const y = obj.keypoints.y[i];
          context.fillRect(x - r, y - r, 2 * r, 2 * r);
        });

        context.strokeStyle = "green";
        lines.forEach(([a, b]) => {
          if (obj.keypoints.visible[a] < 0.5) return;
          if (obj.keypoints.visible[b] < 0.5) return;

          context.moveTo(obj.keypoints.x[a], obj.keypoints.y[a]);
          context.lineTo(obj.keypoints.x[b], obj.keypoints.y[b]);
        });
        context.stroke();
      });
    }
  },
);
