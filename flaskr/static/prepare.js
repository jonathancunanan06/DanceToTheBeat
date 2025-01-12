function startPrepareCamera() {
  const prepareTarget = localStorage.getItem("prepare_page_target");

  if (!prepareTarget) {
    window.location.replace("/");
  }
  localStorage.removeItem("prepare_page_target");

  /** @type HTMLVideoElement */
  const video = document.getElementById("prepare-camera");

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "user" } })
    .then((stream) => {
      video.srcObject = stream;
    });
}

startPrepareCamera();
