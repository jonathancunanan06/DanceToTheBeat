Stimulus.register(
  "game",
  class extends Controller {
    static FPS = 15;

    static values = {
      state: { type: String, default: "prepare" },
    };
    static targets = ["camera", "canvas", "statusLoader", "statusText"];
    static classes = ["prepare", "dance", "score"];

    async connect() {
      if (document.documentElement.hasAttribute("data-turbo-preview")) {
        return;
      }

      this.setPrepareStatus("Starting camera", true);
      await this.startCamera();

      if (this.element.dataset.referenceId === undefined) {
        await this.uploadVideo();
      }
      this.setPrepareStatus("Spread your arms wide to participate");
    }

    disconnect() {
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
      }
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
      if (!this.hasCanvasTarget) {
        return;
      }
      const canvas = this.canvasTarget;
      const context = canvas.getContext("2d");
      this.streamInterval = setInterval(() => {
        context.drawImage(this.cameraTarget, 0, 0, canvas.width, canvas.height);
      }, 1000 / this.constructor.FPS);
    }

    async uploadVideo() {
      const prepareTarget = JSON.parse(
        localStorage.getItem("prepare_page_target"),
      );

      if (!prepareTarget) {
        console.error("No video to upload");
        Turbo.visit("/");
        return;
      }
      localStorage.removeItem("prepare_page_target");

      const response = await fetch(prepareTarget.upload_file);
      if (!response.ok) {
        console.error("Video doesn't exist");
        Turbo.visit("/");
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
  },
);
