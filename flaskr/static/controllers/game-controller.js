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
    static targets = [
      "reference",
      "referenceBg",
      "camera",
      "statusLoader",
      "statusText",
      "retry",
      "score",
    ];
    static classes = ["prepare", "dance", "score"];

    initialize() {
      this.countdownTimer = new Countdown();
      this.dispose = [];

      this.canvas = document.createElement("canvas");

      this.debugCanvas = document.createElement("canvas");
      this.debugCanvas.id = "debug-canvas";
      this.isDebug = false;
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

      let url = "";
      if (this.element.dataset.referenceId === undefined) {
        const prepareTarget = JSON.parse(
          localStorage.getItem("prepare_page_target"),
        );

        if (!prepareTarget) {
          console.error("No video to upload");
          Turbo.visit("/", { action: "replace" });
          return;
        }
        localStorage.removeItem("prepare_page_target");
        url = prepareTarget.upload_file;
        this.referenceId = await this.uploadVideo(prepareTarget);
        history.replaceState(null, "Dance", "/dance/" + this.referenceId);
      } else {
        this.referenceId = this.element.dataset.referenceId;
        url = `/reference/${this.referenceId}`;
      }
      this.retryTarget.href = `/dance/${this.referenceId}`;

      this.setPrepareStatus("Loading reference video", true);
      await preloadVideo(this.referenceTarget, url);

      this.setPrepareStatus("Fetching dance steps", true);
      await this.fetchDanceSteps();

      this.socket = io("/dance");
      this.dispose.push(() => {
        this.socket.disconnect();
      });
      this.setPrepareStatus("Spread your arms wide to participate");

      /** @type {Map<number, {firstTPose: number, participating: boolean, img: string}>} */
      this.persons = new Map();

      this.socket.on("prepare_response", (response) => {
        const result = JSON.parse(response);
        this.findPlayers(result);
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

      this.countdownTimer.setOnFinish(() => {
        const dancers = [...this.persons.entries()]
          .filter((v) => v[1].participating)
          .map((v) => [v[0], v[1].img.replace("data:image/jpeg;base64,", "")]);
        this.socket.emit("register", this.referenceId, dancers);
        this.setPrepareStatus("Dance!", false);
        setTimeout(() => {
          this.startDance();
        }, 250);
      });
      this.countdownTimer.setOnSeconds((s) => {
        this.setPrepareStatus("Starting in " + s, false);
      });
      this.dispose.push(() => this.countdownTimer.stop());
    }

    startDance() {
      this.countdownTimer.stop();
      this.stateValue = "dance";
      this.referenceTarget.play();

      let i = 0;

      this.referenceTarget.addEventListener("timeupdate", () => {
        const currentTime = this.referenceTarget.currentTime;
        if (i < this.steps.length && currentTime > this.steps[i][0]) {
          this.sendDanceFrame(this.steps[i][0]);
          ++i;
        }
      });

      this.referenceTarget.addEventListener("ended", () => {
        this.showScore();
      });

      this.setupReferenceBg();
    }

    showScore() {
      this.stateValue = "score";
      const dancers = [...this.persons.entries()].filter(
        (v) => v[1].participating,
      );

      this.socket.on("scores", (scores) => {
        dancers.forEach(([trackId, data]) => {
          const clone = this.scoreTarget.content.cloneNode(true);

          if (data.img) {
            clone.querySelector(".-img").src = data.img;
          }
          clone.querySelector(".-score").innerText = Math.round(
            scores[trackId],
          );

          this.scoreTarget.parentElement.appendChild(clone);
        });
      });

      this.socket.emit("finished");
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

    async sendDanceFrame(timestamp) {
      if (this.stateValue !== "dance") return;

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

      this.socket.on("dance_response", (response) => {
        if (this.isDebug) this.drawDanceResult(response);
      });
      this.socket.emit("dance", data, timestamp);
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

    async uploadVideo({ upload_file, file_name }) {
      const response = await fetch(upload_file);
      if (!response.ok) {
        console.error("Video doesn't exist");
        Turbo.visit("/", { action: "replace" });
        return;
      }

      const blob = await response.blob();
      const formData = new FormData();
      formData.append("file", blob, file_name);

      this.setPrepareStatus("Uploading reference video", true);
      const resp = await fetch("/reference", {
        method: "POST",
        body: formData,
      });
      return (await resp.json()).reference_id;
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
        window.registerTrackId = (id) => {
          this.persons.set(id, {
            firstTPose: Date.now() - 3000,
            participating: true,
            img: null,
          });
          this.countdownTimer.start(3);
        };
      } else {
        document.body.removeChild(this.debugCanvas);
        delete window.registerTrackId;
      }
    }

    /**
     * @param {PoseEstimation} pose
     * @param {number} index
     * @returns {[x: number, y: number] | null}
     */
    getKeypoint(pose, index) {
      if (pose.keypoints.visible < 0.5) return null;
      return [pose.keypoints.x[index], pose.keypoints.y[index]];
    }

    /**
     * @param {PoseEstimation} pose
     * @param {number} from
     * @param {number} to
     * @returns {number|null}
     */
    getLength(pose, from, to) {
      const a = this.getKeypoint(pose, from);
      const b = this.getKeypoint(pose, to);
      if (a === null || b === null) return null;

      const difX = a[0] - b[0];
      const difY = a[1] - b[1];
      return Math.sqrt(difX * difX + difY * difY);
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

        if (!this.persons.has(obj.track_id)) {
          context.strokeStyle = "red";
        } else if (this.persons.get(obj.track_id).participating) {
          context.strokeStyle = "green";
        } else {
          context.strokeStyle = "yellow";
        }

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

    drawDanceResult(response) {
      this.debugCanvas.width = this.canvas.width;
      this.debugCanvas.height = this.canvas.height;

      const context = this.debugCanvas.getContext("2d");
      context.fillStyle = "white";
      context.fillRect(0, 0, this.debugCanvas.width, this.debugCanvas.height);

      drawStickFigure(context, response.step, 0, "green");
      const dancer = Object.values(response.dancers)[0];

      if (dancer) {
        drawStickFigure(
          context,
          dancer.pose,
          this.debugCanvas.width / 2,
          "green",
        );
      }
    }

    /**
     * @param {PoseEstimation[]} result
     */
    findPlayers(result) {
      result.forEach((obj) => {
        const turso = this.getLength(obj, 12, 6) ?? this.getLength(obj, 11, 5);
        if (!turso) return;

        const points = [10, 8, 6, 5, 7, 9]
          .map((i) => this.getKeypoint(obj, i))
          .filter((i) => i !== null);
        if (points.length === 0) return;

        const minX = Math.min(...points.map((a) => a[0]));
        const maxX = Math.max(...points.map((a) => a[0]));

        if (maxX - minX > turso * 1.5) {
          if (this.persons.has(obj.track_id)) {
            const person = this.persons.get(obj.track_id);
            if (Date.now() - person.firstTPose > 3000) {
              const center = this.getKeypoint(obj, 0);
              const halfLength = this.getLength(obj, 2, 1) * 1.5;

              const img = crop(this.canvas, {
                x: center[0] - halfLength,
                y: center[1] - halfLength,
                width: halfLength * 2,
                height: halfLength * 2,
              });

              this.persons.set(obj.track_id, {
                firstTPose: person.firstTPose,
                participating: true,
                img: img,
              });
              this.countdownTimer.start(3);
            }
          } else {
            this.persons.set(obj.track_id, {
              firstTPose: Date.now(),
              participating: false,
            });
          }
        } else {
          if (!this.persons.has(obj.track_id)) return;
          if (!this.persons.get(obj.track_id).participating) {
            this.persons.delete(obj.track_id);
          }
        }
      });
    }

    setupReferenceBg() {
      const canvas = this.referenceBgTarget;
      const video = this.referenceTarget;

      const ctx = canvas.getContext("2d");

      function drawBlurredBackground() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawBlurredBackground);
      }

      drawBlurredBackground();
    }

    async fetchDanceSteps() {
      const res = await fetch(`/reference/${this.referenceId}/steps`);
      this.steps = await res.json();
    }
  },
);
