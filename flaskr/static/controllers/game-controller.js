Stimulus.register(
  "game",
  class extends Controller {
    static FPS = 15;

    static values = {
      state: { type: String, default: "prepare" },
    };
    static targets = ["camera", "canvas"];
    static classes = ["prepare", "dance", "score"];

    connect() {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" } })
        .then((stream) => {
          this.stream = stream;
          this.cameraTarget.srcObject = this.stream;

          const canvas = this.canvasTarget;
          if (!canvas) {
            throw new Error("Canvas target not found");
          }
          const context = canvas.getContext("2d");

          this.streamInterval = setInterval(() => {
            context.drawImage(
              this.cameraTarget,
              0,
              0,
              canvas.width,
              canvas.height,
            );
          }, 1000 / this.constructor.FPS);
        });
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
  },
);
